#!/usr/bin/env node
/**
 * Fabrique les pages de contenu depuis les donnees de contenu/.
 *
 * Un gabarit unique, des donnees separees. Le site visera cinquante a quatre
 * vingts URL : chaque changement d'entete, de pied de page ou de balisage doit
 * s'appliquer partout d'un coup. Une page ecrite a la main est une page qu'on
 * oubliera de mettre a jour.
 *
 * Trois regles d'hygiene, apprises ailleurs et appliquees ici des le depart :
 *
 *   UNE SEULE SOURCE POUR LES META. Aucun doublon entre un balisage statique et
 *   un balisage dynamique : les robots prennent la PREMIERE occurrence, et un
 *   doublon se paie en silence pendant des mois.
 *
 *   JAMAIS DE MILLESIME DANS UNE URL. Une refonte annuelle se fait a URL
 *   constante, sinon on jette son referencement chaque janvier.
 *
 *   LE SITEMAP EST TENU A JOUR A CHAQUE PAGE PUBLIEE, pas par campagne. Il est
 *   donc genere ici, jamais ecrit a la main.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STYLE } from '../contenu/style.mjs';
import { RUBRIQUES, PIED, EN_ATTENTE } from '../contenu/pages.mjs';
import { DOMAINE, partage } from './entetes.mjs';
import { LEGENDE, VITRINE, partsDeHauteur } from '../contenu/vitrine.mjs';
import { CONFIDENTIALITE } from '../contenu/confidentialite.mjs';
import { QUI_SOMMES_NOUS, MENTIONS } from '../contenu/institution.mjs';
import { QUESTIONS } from '../contenu/questions/vectoriel.mjs';
import { QUESTIONS_JPEG } from '../contenu/questions/jpeg.mjs';
import { QUESTIONS_COULEURS } from '../contenu/questions/couleurs.mjs';
import { QUESTIONS_FORMATS } from '../contenu/questions/formats.mjs';
import { QUESTIONS_OUVERTURE } from '../contenu/questions/ouverture.mjs';
import { TECHNIQUES } from '../contenu/guide/techniques.mjs';
import { ARTICLES } from '../contenu/blog/articles.mjs';

/**
 * LES MINIMUMS SOURCES ENTRENT DANS LES GUIDES, 20/08/2026.
 *
 * Le plan contenu du Fil meta a pose le constat : les guides etaient
 * entierement en prose, sans un chiffre, alors que la these GEO du projet est
 * que les moteurs de reponse citent la donnee factuelle et ignorent la prose.
 * Il n'y avait rien a citer.
 *
 * Ce qui a change depuis que cette regle avait ete posee : P0.3 est arbitre,
 * et les valeurs SOURCEES servent deja le diagnostic de l'outil. Les publier
 * dans les guides n'est donc pas une nouvelle decision, c'est la MEME donnee,
 * affichee au deuxieme endroit ou on la cherche.
 *
 * UNE SEULE SOURCE DE VERITE : le tableau est genere depuis
 * src/verdict/valeurs_sourcees.json, le fichier exact que le diagnostic lit.
 * Une valeur corrigee la-bas se corrige ici a la construction suivante. Un
 * tableau recopie a la main aurait diverge a la premiere correction.
 *
 * CE QUE CE N'EST PAS : un seuil par technique. Chaque ligne porte SA matiere
 * et SA source, l'intro le dit, et le harnais interdit toujours un millimetre
 * hors de ce tableau.
 */
import { fileURLToPath as _furl } from 'node:url';
const VALEURS = JSON.parse(fs.readFileSync(
  path.join(path.dirname(_furl(import.meta.url)), '..', 'src', 'verdict', 'valeurs_sourcees.json'),
  'utf-8'));

const CLE_PAR_URL = {
  '/guide/serigraphie': 'serigraphie',
  '/guide/tampographie': 'tampographie',
  '/guide/gravure-laser': 'gravure_laser',
  '/guide/broderie': 'broderie',
  '/guide/impression-numerique-uv': 'numerique_uv',
  '/guide/transfert-dtf': 'transfert_dtf',
  '/guide/marquage-a-chaud': 'marquage_a_chaud',
};

const mmTexte = (v) => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');

function sectionMinimums(url) {
  const cle = CLE_PAR_URL[url];
  const t = cle && VALEURS.techniques[cle];
  const valeurs = t?.criteres?.trait_minimal?.valeurs;
  if (!valeurs?.length) return null;
  const lignes = valeurs.map((v) => `<tr>
<td>${mmTexte(v.mm)}&nbsp;mm</td>
<td>${echapper(v.support)}</td>
<td>${v.url
  ? `<a href="${echapper(v.url)}" rel="noopener">${echapper(v.source)}</a>`
  : `${echapper(v.source)} <span class="sans-lien">document fournisseur, pas d'URL publique</span>`}</td>
<td>${echapper(v.date)}</td>
</tr>`).join('\n');
  const min = mmTexte(valeurs[0].mm);
  const max = mmTexte(valeurs[valeurs.length - 1].mm);
  return {
    h2: 'Les épaisseurs minimales que publient les fabricants',
    html: `
<p>Il n'existe pas UN seuil pour cette technique, et ce tableau le montre : les
minimums publiés vont de <b>${min} à ${max}&nbsp;mm selon la matière</b>. Chaque ligne
vient d'un fabricant ou d'un atelier qui la publie, avec le support qu'il nomme, et le
lien pour vérifier sans nous croire quand cette source est en ligne. Quand elle ne l'est
pas, la ligne le dit : le chiffre vient alors d'un document remis par le fournisseur, que
nous ne pouvons pas republier. <a href="/">Déposez votre logo</a> pour savoir où son
trait le plus fin se situe dans ces valeurs.</p>
<table class="minimums-sources">
<thead><tr><th>trait minimal</th><th>matière nommée par la source</th><th>source</th><th>relevé le</th></tr></thead>
<tbody>
${lignes}
</tbody>
</table>
<div class="encadre-info">
<p>Relevé du référentiel Bon à Marquer. Une valeur dont la source ne nomme aucun support
n'entre pas dans ce tableau, quelle que soit sa notoriété : une règle de préparation de
fichier d'imprimerie n'est pas une contrainte de marquage d'objet.</p>
</div>`,
  };
}

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(RACINE, 'public');
// LE DOMAINE VIT DANS outils/entetes.mjs, une seule fois pour tout le site :
// canonicals, sitemap, JSON-LD et metadonnees de partage basculent ensemble.

const symbole = fs.readFileSync(path.join(RACINE, 'identite', 'symbole.svg'), 'utf-8')
  .replace(/<\?xml[^>]*\?>\s*/, '')
  .replace(/\s(width|height)="[\d.]+"/g, '')
  .replace(/<title>[^<]*<\/title>/, '<title>Bon à Marquer</title>')
  .replace(/\n/g, '');

const echapper = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * LES DEUX ACTIONS DE L'ENTETE, ECRITES UNE SEULE FOIS.
 *
 * Elles l'etaient QUATRE fois jusqu'au 25/08 au soir : ici, et en dur dans
 * chacun des trois gabarits d'outil. La navigation avait ete generee apres
 * l'incident du 19/08, ou la rubrique /guide/ manquait sur l'accueil et sur
 * l'accueil seulement. Les boutons, eux, etaient restes recopies. Le meme
 * defaut attendait donc au meme endroit, sous une autre forme.
 *
 * ARBITRAGE ALEX DU 25/08 AU SOIR, deuxieme tour d'entete :
 *
 * « Mon logo sur des goodies » monte de la navigation vers les boutons. Une
 * rubrique se cherche, une promesse se clique.
 *
 * « Vectoriser mon logo » descend des boutons vers la navigation, en pilule
 * navy. C'est l'appat qui amene au diagnostic, pas la destination du site : il
 * garde un relief, il ne garde pas la premiere place.
 *
 * UN SEUL BOUTON ORANGE VISIBLE A LA FOIS, arbitrage du 18/08 precise le
 * 31/08. La formule d'origine disait « par ecran », et elle etait deja
 * enfreinte sans que personne l'ait vu : chaque page de contenu porte un appel
 * orange en pied de corps depuis toujours, en plus de celui de l'entete. Les
 * deux ne se voient jamais ensemble, separes par huit cents mots, et c'est ce
 * qui rendait la faute invisible. La regle dit donc ce qu'elle a toujours
 * voulu dire : deux oranges ne se regardent pas.
 *
 * L'orange n'est plus ecrit sur un bouton, il se CALCULE, et le corps de la
 * page peut le reprendre. Le detail est dans le commentaire de la liste,
 * plus bas.
 *
 * Le simulateur ne valide rien, master prompt §8 : il ne peut pas etre la
 * porte d'entree du site, et il ne prend donc l'orange que sur l'accueil, ou
 * le diagnostic est deja sous les yeux du visiteur.
 *
 * L'orange reste le dernier element de la ligne, comme depuis le 18/08.
 */
function actionsEntete(urlCourante, orangeDansLeCorps = false) {
  // UN BOUTON NE SE REND PAS SUR LA PAGE VERS LAQUELLE IL POINTE, decisions 1
  // et 2 du brief navigation, arbitrees par Alex le 26/08/2026.
  //
  // Sur l'accueil, « Évaluer votre logo » surplombait la zone de depot qui EST
  // l'evaluation : on demandait de cliquer pour faire ce qu'on etait deja en
  // train de faire. Le meme defaut, a l'identique, que le « Décrivez votre
  // besoin » releve sur un autre site du groupe la semaine derniere.
  //
  // La regle est generale, pas une exception d'accueil : un composant de lien
  // qui refuse de fabriquer un lien mort refuse aussi de fabriquer un lien
  // vers soi-meme. Elle vaut donc aussi pour « Mon logo sur des goodies » sur
  // /voir-mon-logo. C'est le composant qui porte la garantie, pas le relecteur.
  //
  // L'ORANGE SE CALCULE, IL N'EST PLUS ECRIT SUR UN BOUTON, 31/08/2026.
  //
  // Il etait attache a « Évaluer votre logo ». Sur l'accueil, ou ce bouton est
  // justement retire parce qu'il pointerait vers la page courante, il ne restait
  // donc AUCUN orange : le seul appel de l'entete y etait un contour, et il ne
  // se voyait pas. Un attribut fixe ne peut pas suivre une regle conditionnelle.
  //
  // La regle est desormais : l'orange revient au bouton restant de plus haute
  // priorite. Le diagnostic passe devant la simulation, parce qu'il est
  // l'entree du produit ; quand il est retire, la simulation prend l'orange.
  //
  // ET IL SE REND QUAND LE CORPS EN PORTE UN. Sur les trois pages dont le texte
  // appelle un outil a quelques lignes du titre, deux oranges se verraient d'un
  // seul coup d'oeil. L'entete cede alors la place a celui du corps, qui est
  // plus proche de la raison d'agir.
  const boutons = [
    { rang: 2, classe: 'cta-secondaire', href: '/voir-mon-logo', texte: 'Mon logo sur des goodies' },
    { rang: 1, classe: 'cta-secondaire', href: '/', texte: 'Évaluer votre logo' },
  ].filter((b) => b.href !== urlCourante);

  // SAUF SUR L'ACCUEIL, ET C'EST UNE DECISION, PAS UN OUBLI, 26/08/2026.
  //
  // Le patch du 31/08 a defait cette decision en croyant reparer un defaut.
  // Il avait raison sur le constat, l'entete de l'accueil ne portait aucun
  // orange, et tort sur la cause : c'est voulu. Sur cette page la conversion
  // EST la zone de depot, et un bouton de menu orange lui volerait son poids.
  // Le raisonnement etait ecrit, en toutes lettres, dans le harnais des pages,
  // trois lignes au-dessus du controle qui l'aurait arrete.
  //
  // Partout ailleurs, l'entete garde l'orange : sur /vectoriser et sur
  // /voir-mon-logo il pointe vers un AUTRE produit que celui de la page, il
  // n'entre donc pas en concurrence avec le depot qui s'y trouve.
  if (!orangeDansLeCorps && urlCourante !== '/' && boutons.length > 0) {
    const principal = boutons.reduce((a, b) => (b.rang < a.rang ? b : a));
    principal.classe = 'cta-entete';
  }

  return '<div class="droite">'
    + boutons.map((b) => `<a class="${b.classe}" href="${b.href}">${b.texte}</a>`).join('')
    + '</div>';
}

/**
 * LA VITRINE DE L'ACCUEIL.
 *
 * Les images sont composees hors construction, par outils/composer_vitrine.mjs,
 * et versionnees. Netlify n'a pas de navigateur : ce qui a besoin d'un moteur
 * de rendu se fabrique en local et se commit, comme les photos du lot.
 *
 * Les attributs width et height ne sont pas decoratifs : ils reservent la
 * place avant que l'image arrive. Sans eux, le texte sous les images saute au
 * chargement, ce que les moteurs mesurent et sanctionnent.
 */
function vitrine() {
  const parts = partsDeHauteur();
  const images = VITRINE.map((v) =>
    `<img src="/vitrine/${v.image}" width="${v.largeurPx}" height="${v.hauteurPx}"`
    + ` style="--part:${parts.get(v.image).toFixed(4)}"`
    + ` alt="${echapper(v.alt)}" decoding="async">`).join('');
  return `<figure class="vitrine">${images}<figcaption>${echapper(LEGENDE)}</figcaption></figure>`;
}

function entete(urlCourante, publiees, orangeDansLeCorps = false) {
  const liens = RUBRIQUES.filter((r) => publiees.has(r.url)).map((r) =>
    `<a href="${r.url}"${urlCourante.startsWith(r.url) && r.url !== '/' ? ' aria-current="page"' : ''}>${r.titre}</a>`
  ).join('');
  // LA VECTORISATION SORT DE L'ENTETE, decision 2 du 26/08/2026, arbitree par
  // Alex. Vectoriser un logo est une commodite que des dizaines de sites
  // rendent, souvent bien ; le verdict par technique n'a aucun equivalent. En
  // faire une porte d'entree de meme rang, c'etait se placer sur le terrain le
  // plus dispute du sujet. La page /vectoriser RESTE : elle vise une requete
  // tres recherchee et garde son referencement. Elle entre desormais par le
  // pied de page, par la FAQ de l'accueil et par le corps des pages qui
  // parlent de fichiers, plus par le menu.
  return `<header class="entete">
  <a class="lockup" href="/">${symbole}<span class="mot">Bon à<br>Marquer</span></a>
  <nav class="nav-site">${liens}</nav>
  ${actionsEntete(urlCourante, orangeDansLeCorps)}
</header>`;
}

/**
 * LE PIED DE PAGE SE DERIVE DES PAGES PUBLIEES, IL NE SE RECOPIE PLUS.
 *
 * Trouvaille du tour de site du 21/08 : le pied listait trois guides sur sept
 * et trois questions sur sept. La broderie, le DTF, l'UV et le marquage a chaud
 * etaient orphelins, c'est-a-dire quasi invisibles pour un moteur. La cause
 * n'est pas un oubli, c'est une table tenue a la main a cote d'une autre source
 * de verite : elle diverge le jour ou quelqu'un ajoute une page sans penser au
 * pied.
 *
 * Les colonnes de rubriques se calculent donc a partir des memes pages que le
 * sitemap. Les deux colonnes qui n'ont pas de rubrique, l'outil et l'editeur,
 * restent declarees dans contenu/pages.mjs : ce sont des choix editoriaux, pas
 * une liste a tenir.
 */
function colonnesDerivees(pages) {
  const parPrefixe = [
    ['Techniques de marquage', '/guide/'],
    ['Questions fréquentes', '/questions/'],
    ['Journal', '/blog/'],
  ];
  return parPrefixe.map(([titre, prefixe]) => ({
    titre,
    // La page d'index de la rubrique n'est pas un de ses articles.
    liens: pages.filter((p) => p.url.startsWith(prefixe) && p.url !== prefixe)
      .map((p) => ({ titre: p.titreCourt ?? p.h1 ?? p.titre, url: p.url })),
  })).filter((c) => c.liens.length);
}

function pied(publiees, pagesPubliees = []) {
  const derivees = colonnesDerivees(pagesPubliees);
  // L'ordre reste celui de la table : l'outil, les rubriques derivees a leur
  // place, l'editeur en dernier.
  const toutes = PIED.flatMap((c) => {
    const remplacante = derivees.find((d) => d.titre === c.titre);
    return remplacante ? [remplacante] : [c];
  });
  const colonnes = toutes.map((c) => {
    const liens = c.liens.filter((l) => publiees.has(l.url));
    if (liens.length === 0) return '';
    return `<div><b>${c.titre}</b>${liens.map((l) => `<a href="${l.url}">${l.titre}</a>`).join('')}</div>`;
  }).join('');
  return `<footer class="pied-site">
  <div class="colonnes">${colonnes}</div>
  <p class="mention">Bon à Marquer est une initiative Bytouch. Votre logo n'est jamais
  envoyé : l'analyse se fait dans votre navigateur.</p>
</footer>`;
}

/**
 * Le balisage structure, en UN SEUL bloc.
 *
 * Deux <script type="application/ld+json"> separes seraient techniquement
 * valides, mais fabriqueraient deux endroits a tenir a jour. Un graphe unique
 * porte le fil d'Ariane et, quand la page a de vraies questions, la FAQ.
 *
 * Les questions vivent dans le champ faq et NULLE PART AILLEURS : les repeter
 * dans le corps de la page fabriquerait un doublon que les moteurs signalent.
 */
function balises(page) {
  const morceaux = [page.url.replace(/^\/|\/$/g, '')].filter(Boolean);
  const fil = [{ '@type': 'ListItem', position: 1, name: 'Bon à Marquer', item: `${DOMAINE}/` }];
  if (morceaux.length > 0) {
    const parts = morceaux[0].split('/');
    let chemin = '';
    parts.forEach((part, i) => {
      chemin += '/' + part;
      const dernier = i === parts.length - 1;
      fil.push({
        '@type': 'ListItem',
        position: i + 2,
        name: dernier ? page.titre : (RUBRIQUE_LIBELLE[chemin + '/'] ?? chemin),
        item: `${DOMAINE}${dernier ? page.url : chemin + '/'}`,
      });
    });
  }
  const graphe = [{ '@type': 'BreadcrumbList', itemListElement: fil }];
  // UN ARTICLE SE DATE, ET LA DATE PART DANS LE BALISAGE COMME A L'ECRAN. Un
  // seul champ, deux sorties : c'est ce qui evite qu'une page affiche une date
  // et en declare une autre.
  if (page.date) {
    graphe.push({
      '@type': 'BlogPosting',
      headline: page.titre,
      description: page.meta,
      datePublished: page.date,
      dateModified: page.dateModifiee ?? page.date,
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${DOMAINE}${page.url}` },
      author: { '@type': 'Organization', name: 'Bon à Marquer' },
      publisher: { '@type': 'Organization', name: 'Bon à Marquer' },
    });
  }
  if (page.faq && page.faq.length > 0) {
    graphe.push({
      '@type': 'FAQPage',
      mainEntity: page.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.r },
      })),
    });
  }
  const donnees = { '@context': 'https://schema.org', '@graph': graphe };
  return `<script type="application/ld+json">${JSON.stringify(donnees)}</script>`;
}

/**
 * LE LIBELLE D'UNE RUBRIQUE SE LIT ICI, ET NULLE PART AILLEURS.
 *
 * Il servait a trois endroits, le fil visible, le fil structure et le pied, et
 * chacun le recopiait. Une rubrique de plus, c'etait trois lignes a retrouver ;
 * la troisieme oubliee ne se voit que dans le balisage, ou personne ne regarde.
 *
 * L'ADRESSE ET LE LIBELLE NE SONT PAS LE MEME MOT, et c'est voulu. `/blog/` est
 * la convention que tout le monde reconnait dans une adresse, y compris les
 * moteurs ; « Journal » est le mot qui se lit sur la page, et il promet ce que
 * le corpus tient vraiment : des textes dates.
 */
const RUBRIQUE_LIBELLE = {
  '/guide/': 'Techniques de marquage',
  '/questions/': 'Questions fréquentes',
  '/blog/': 'Journal',
};

/**
 * LA DUREE DE LECTURE SE CALCULE, ELLE NE S'ECRIT PAS.
 *
 * Ecrite a la main dans le champ d'un article, elle serait fausse a la
 * premiere correction, et fausse en silence : personne ne relit une duree.
 * Elle se compte donc sur le texte REELLEMENT rendu, chapo et questions
 * comprises, a chaque construction.
 *
 * Deux cents mots par minute : c'est la fourchette basse des mesures publiees
 * pour un adulte lisant du francais sur ecran, et la fourchette basse est la
 * bonne ici. Annoncer sept minutes pour un texte qui en prend neuf fait
 * abandonner en cours de route ; l'inverse ne coute rien.
 */
const MOTS_PAR_MINUTE = 200;
function dureeLecture(page) {
  const morceaux = [page.chapo ?? '', ...(page.sections ?? []).map((x) => x.html ?? ''),
                    ...(page.faq ?? []).flatMap((f) => [f.q, f.r])];
  const texte = morceaux.join(' ').replace(/<[^>]+>/g, ' ');
  const mots = texte.split(/\s+/).filter((m) => /[\p{L}\p{N}]/u.test(m)).length;
  return Math.max(1, Math.round(mots / MOTS_PAR_MINUTE));
}

/** La ligne de service d'un article : sa date, et le temps qu'il demande. */
function ligneService(page) {
  if (!page.date) return '';
  return `<p class="jour-service"><time datetime="${page.date}">${dateLisible(page.date)}</time>`
    + ` <span aria-hidden="true">·</span> ${dureeLecture(page)} min de lecture</p>`;
}

/** La date d'un article, telle qu'elle se lit. */
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
              'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function dateLisible(iso) {
  const [a, m, j] = String(iso).split('-').map(Number);
  if (!a || !m || !j) return '';
  return `${j} ${MOIS[m - 1]} ${a}`;
}

/**
 * LES MOTS-CLES, EN PILULES, ET SANS LIEN.
 *
 * Ils donnent au lecteur la matiere de l'article en un coup d'oeil, et ils
 * n'emmenent nulle part : une pilule cliquable promet une page par mot-cle,
 * et vingt-six articles feraient cent pages de listes quasi vides. Le jour ou
 * une famille aura assez d'articles pour meriter sa page, elle l'aura.
 */
function motsCles(page) {
  if (!page.mots?.length) return '';
  const items = page.mots.map((m) => `<li>${echapper(m)}</li>`).join('');
  return `<ul class="jour-mots">${items}</ul>`;
}

function faqVisible(page) {
  if (!page.faq || page.faq.length === 0) return '';
  const items = page.faq.map((f) =>
    `<h3>${echapper(f.q)}</h3><p>${echapper(f.r)}</p>`
  ).join('');
  return `<h2>Questions fréquentes</h2>${items}`;
}

function filVisible(page, publiees) {
  const morceaux = ['<a href="/">Bon à Marquer</a>'];
  const parent = page.url.replace(/[^/]+$/, '');
  if (parent !== '/' && publiees.has(parent) && parent !== page.url) {
    const nomRubrique = RUBRIQUE_LIBELLE[parent] ?? parent;
    morceaux.push('<a href="' + parent + '">' + echapper(nomRubrique) + '</a>');
  }
  morceaux.push(echapper(page.titre));
  return morceaux.join(' / ');
}

function voisines(page, questions) {
  // Le maillage suit la RUBRIQUE de la page : une fiche technique renvoie vers
  // d'autres fiches techniques, une question vers d'autres questions. Melanger
  // les deux fabriquerait des liens sans rapport, que les moteurs lisent comme
  // du remplissage et que le lecteur ne suit pas.
  const rubrique = page.url.startsWith('/guide/') ? '/guide/'
    : page.url.startsWith('/questions/') ? '/questions/'
    : page.url.startsWith('/blog/') ? '/blog/' : null;
  if (!rubrique || page.url === rubrique) return '';
  const bassin = rubrique === '/guide/' ? TECHNIQUES
    : rubrique === '/blog/' ? ARTICLES : questions;
  const autres = bassin.filter((q) => q.url !== page.url).slice(0, 3);
  if (autres.length === 0) return '';
  const items = autres.map((q) => `<li><a href="${q.url}">${echapper(q.titre)}</a></li>`).join('');
  return `<h2>À lire aussi</h2><ul class="voisines">${items}</ul>`;
}

function rendre(page, publiees, questions = [], toutesPages = []) {
  // LE TITRE DE SECTION DEVIENT FACULTATIF. L'index du journal est une LISTE
  // d'articles dont chacun porte son propre titre : lui coiffer un « Les
  // articles » ferait deux niveaux de titre pour une seule liste, et le
  // second, le vrai, se retrouverait au troisieme rang.
  const corps = page.sections
    .map((s) => `${s.h2 ? `<h2>${echapper(s.h2)}</h2>` : ''}${s.html.trim()}`).join('\n');
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${echapper(page.titre)} | Bon à Marquer</title>
<meta name="description" content="${echapper(page.meta)}">
<link rel="canonical" href="${DOMAINE}${page.url}">
${partage({ titre: echapper(page.titre), description: echapper(page.meta), url: page.url })}
<link rel="icon" href="/favicon.svg">
<link rel="stylesheet" href="/vecto.css">
${balises(page)}
</head>
<body>
<div class="page-contenu">
${entete(page.url, publiees, corps.includes('cta-corps'))}
<p class="fil">${filVisible(page, publiees)}</p>
${page.axe ? `<p class="jour-axe">${echapper(page.axe)}</p>` : ''}
<h1>${echapper(page.h1)}</h1>
${ligneService(page)}
<p class="chapo">${echapper(page.chapo)}</p>
${corps}
${faqVisible(page)}
${motsCles(page)}
${voisines(page, questions)}
<div class="appel"><a href="/">Diagnostiquer mon logo, gratuitement</a></div>
</div>
${pied(publiees, toutesPages)}
</body>
</html>
`;
}

// -------------------------------------------------- assemblage et controles

const QUESTIONS_TOUTES = [...QUESTIONS, ...QUESTIONS_JPEG, ...QUESTIONS_COULEURS, ...QUESTIONS_FORMATS, ...QUESTIONS_OUVERTURE];

/**
 * L'index de rubrique est GENERE depuis les pages qu'il liste, jamais ecrit a
 * la main : une liste tenue a la main se desynchronise des la deuxieme page
 * ajoutee, et personne ne s'en apercoit avant de lire le sitemap.
 */
function indexTechniques(techniques) {
  const items = techniques.map((t) =>
    `<h3><a href="${t.url}">${echapper(t.h1)}</a></h3><p>${echapper(t.chapo)}</p>`
  ).join('');
  return {
    url: '/guide/',
    titre: 'Les techniques de marquage sur objet',
    meta: "Sérigraphie, tampographie, gravure laser, broderie, numérique UV, transfert "
      + "DTF, marquage à chaud. Ce que chaque procédé réussit, ce qu'il rate.",
    h1: 'Les techniques de marquage',
    chapo: "Sept procédés, sept mécaniques différentes. Comprendre celle qui vous "
      + "concerne évite la plupart des mauvaises surprises, et ça se comprend sans "
      + "être du métier.",
    sections: [
      {
        h2: 'Comment lire ces fiches',
        html: `<p>Chaque fiche part du <b>principe physique</b> du procédé, parce que
c'est de là que découlent toutes ses limites. Une fois qu'on a compris qu'un
écran de sérigraphie est une toile à mailles ou qu'un laser ne dépose rien, on
n'a plus besoin de retenir des règles : elles se déduisent.</p>
<p>Vous n'y trouverez ni taille maximale ni nombre de couleurs admis. Ces
valeurs varient d'un atelier à l'autre, les sources publiées se contredisent, et
nous ne les afficherons qu'une fois tranchées. Nous préférons dire
<b>nous ne savons pas encore</b> plutôt qu'un chiffre plausible.</p>`,
      },
      { h2: 'Les sept techniques', html: items },
      {
        h2: 'Choisir en une ligne',
        html: `<ul>
<li><b>Un objet bombé, creux ou irrégulier</b> oriente vers la tampographie.</li>
<li><b>Un métal, et un marquage qui ne doit jamais s'effacer</b> orientent vers la gravure laser.</li>
<li><b>Un textile</b> ouvre la sérigraphie, le transfert DTF et la broderie.</li>
<li><b>Un dégradé ou une photo</b> imposent une technique numérique.</li>
<li><b>Un effet métallisé sur du papier ou du cuir</b> appelle le marquage à chaud.</li>
<li><b>Un grand aplat de couleur opaque</b> est le terrain de la sérigraphie.</li>
</ul>
<p>Votre fabricant tranche, parce qu'il connaît son parc machines. Ces fiches vous
permettent de comprendre sa réponse, et de poser la bonne question quand elle vous
surprend.</p>`,
      },
    ],
    faq: [
      {
        q: 'Quelle technique de marquage choisir pour mon logo ?',
        r: "Cela dépend d'abord de l'objet et de sa matière, ensuite du dessin. Un objet "
          + "bombé oriente vers la tampographie, un métal vers la gravure, un textile vers "
          + "la sérigraphie ou le transfert, une photo vers le numérique UV. Votre "
          + "fabricant tranche, mais connaître la mécanique vous permet de comprendre sa "
          + "réponse.",
      },
      {
        q: 'Quelle technique accepte un logo en dégradé ?',
        r: "Les techniques numériques, impression UV et transfert DTF, qui impriment en "
          + "quadrichromie. La sérigraphie rend un dégradé par une trame de points visible, "
          + "et la gravure comme le marquage à chaud sont monochromes par nature.",
      },
      {
        q: 'Quelle est la technique la plus durable ?',
        r: "La gravure laser, parce que le marquage fait partie de l'objet au lieu d'être "
          + "posé dessus : rien ne s'écaille ni ne se lave. En contrepartie, elle est "
          + "monochrome et prend la couleur que la matière lui donne.",
      },
    ],
  };
}

function indexQuestions(questions) {
  const items = questions.map((q) =>
    `<h3><a href="${q.url}">${echapper(q.titre)}</a></h3><p>${echapper(q.chapo)}</p>`
  ).join('');
  return {
    url: '/questions/',
    titre: 'Questions fréquentes sur les fichiers',
    meta: "Fichier vectoriel réclamé, vectorisation d'un JPEG, nombre réel de couleurs : "
      + "les questions qui bloquent une commande d'objets marqués, et les réponses.",
    h1: 'Questions fréquentes',
    chapo: "Les questions qui bloquent une commande d'objets marqués, et les réponses, "
      + "vérifiables plutôt qu'affirmées.",
    sections: [
      { h2: 'Toutes les questions', html: items },
      {
        h2: 'Par où commencer selon votre situation',
        html: `<ul>
<li><b>On vous réclame un fichier vectoriel et vous ne savez pas ce que c'est :</b>
commencez par la première question.</li>
<li><b>Vous n'avez qu'un JPEG et personne pour le retravailler :</b> la question sur la
vectorisation d'un JPEG dit ce que l'automatique sait faire, et ce qu'elle rate.</li>
<li><b>Votre devis a explosé à cause du nombre de couleurs :</b> la question sur les
couleurs explique d'où vient l'écart entre les trois couleurs de votre charte et les
milliers que voit la machine.</li>
<li><b>Vous avez un PDF et vous ignorez ce qu'il contient :</b> trois vérifications de
trente secondes suffisent à trancher.</li>
</ul>`,
      },
    ],
    faq: [],
  };
}

/**
 * L'INDEX DU JOURNAL, genere depuis les articles publies.
 *
 * Meme regle que les deux autres index : une liste tenue a la main se
 * desynchronise des le deuxieme article ajoute, et personne ne s'en apercoit
 * avant de lire le sitemap.
 *
 * LES ARTICLES SONT RANGES DU PLUS RECENT AU PLUS ANCIEN, ce qui est la seule
 * chose qu'un lecteur attend d'un journal. A date egale, l'ordre de declaration
 * fait foi : deux articles ecrits le meme jour n'ont pas de raison de changer
 * de place a chaque construction.
 */
function indexJournal(articles) {
  const ranges = articles.map((a, i) => ({ a, i }))
    .sort((x, y) => (x.a.date < y.a.date ? 1 : x.a.date > y.a.date ? -1 : x.i - y.i))
    .map((x) => x.a);
  const items = ranges.map((a) => `<article class="jour-item">`
    + (a.axe ? `<p class="jour-axe">${echapper(a.axe)}</p>` : '')
    + ligneService(a)
    + `<h2 class="jour-titre"><a href="${a.url}">${echapper(a.titreCourt ?? a.h1)}</a></h2>`
    + `<p class="jour-chapo">${echapper(a.chapo)}</p>`
    + motsCles(a)
    + `</article>`).join('');
  return {
    url: '/blog/',
    titre: 'Le journal du marquage sur objet',
    meta: "Ce qui arrive vraiment quand on fait marquer un logo : un fichier refusé, un "
      + "objet qui ne pardonne rien, un arbitrage à rendre. Expliqué par le métier.",
    h1: 'Le journal',
    chapo: "Les guides expliquent les techniques, les questions fréquentes expliquent les "
      + "gestes. Ici, on part d'une situation que vous êtes en train de vivre, et on dit "
      + "quoi faire ensuite.",
    sections: [
      { h2: null, html: `<div class="jour-liste">${items}</div>` },
      // LE CADRE QUI CASSE LE RYTHME, arbitrage d'Alex du 31/08 : « ça vient
      // vraiment alourdir le bloc, il faudrait l'allonger pour qu'il soit
      // moins haut, et peut-être qu'il soit dans un cadre, pour casser un peu
      // le rythme ».
      //
      // Le bloc etait rendu comme une section d'article de plus : meme
      // largeur, meme allure, meme colonne de lecture. Il se lisait donc comme
      // un troisieme article, en trois puces empilees qui ajoutaient deux
      // cents pixels de hauteur a la fin d'une page dont ce n'est pas le
      // sujet. Il devient un panneau gris qui prend TOUTE la largeur du cadre
      // et range ses trois points en colonnes : plus large, donc plus court,
      // et visiblement d'une autre nature que ce qui precede.
      //
      // Le titre entre DANS le panneau, ce qui n'etait possible que depuis que
      // le titre de section est facultatif.
      {
        h2: null,
        html: `<aside class="jour-cadre">
<h2>Ce que vous ne trouverez pas ici</h2>
<p class="note">Trois choses que ce journal ne fera pas, et c'est volontaire.</p>
<div class="jour-cadre-colonnes">
<div><b>Aucun seuil chiffré présenté comme une règle du métier.</b>
<p>Les sources professionnelles se contredisent sur la plupart de ces valeurs, et une
moyenne calculée sur des sources qui divergent est une donnée inventée. Quand nous ne
savons pas, nous l'écrivons.</p></div>
<div><b>Aucun conseil qui vous engage sans vous le dire.</b>
<p>Une mesure n'est pas une validation, et rien ici ne remplace le bon à tirer de votre
fournisseur.</p></div>
<div><b>Aucun jugement sur votre logo.</b>
<p>Un fichier se mesure, un dessin se discute, et les deux appartiennent à celui qui les
a payés.</p></div>
</div>
</aside>`,
      },
    ],
    faq: [],
  };
}

const candidates = [
  CONFIDENTIALITE,
  indexTechniques(TECHNIQUES),
  ...TECHNIQUES.map((t) => {
    const minimums = sectionMinimums(t.url);
    if (!minimums) return t;
    // Le tableau s'insere AVANT la derniere section, qui est la note « ce que
    // nous ne publions pas encore » : les faits d'abord, la doctrine ensuite.
    const sections = [...t.sections];
    sections.splice(Math.max(sections.length - 1, 0), 0, minimums);
    return { ...t, sections };
  }),
  indexQuestions(QUESTIONS_TOUTES),
  ...QUESTIONS_TOUTES,
  indexJournal(ARTICLES),
  ...ARTICLES,
  QUI_SOMMES_NOUS,
  MENTIONS,
];

// Une page a qui il manque un fait ne se publie pas. Des mentions legales
// incompletes valent moins que pas de mentions : elles affirment une identite
// en laissant un trou, et le trou passe inapercu une fois la page en ligne.
const pages = [];
const retenues = [];
for (const p of candidates) {
  if (p.manquants && p.manquants.length > 0) retenues.push(p);
  else pages.push(p);
}

// Une URL en double serait deux pages qui se cannibalisent. On refuse.
const vues = new Set();
for (const p of pages) {
  if (vues.has(p.url)) {
    console.error(`  URL en double : ${p.url}`);
    process.exit(1);
  }
  vues.add(p.url);
  if (/20\d\d/.test(p.url)) {
    console.error(`  Millesime dans une URL : ${p.url}. Une refonte se fait a URL constante.`);
    process.exit(1);
  }
}

// /vectoriser est, comme l'accueil, une page d'outil : elle a son gabarit dans
// contenu/ et n'entre pas dans `pages`, mais elle est bien publiee, et les
// liens qui pointent vers elle sont legitimes.
const publiees = new Set([...vues, '/', '/vectoriser', '/voir-mon-logo']);

// Integrite des liens de navigation. Un lien d'entete ou de pied vers une 404
// est la faute la plus visible d'un site. On tolere le lien vers une page non
// encore publiee, il est simplement retire et signale ; on refuse le lien vers
// une URL que personne n'a jamais declaree, qui est une faute de frappe.
const declarees = new Set([
  ...publiees,
  ...retenues.map((p) => p.url),
  ...EN_ATTENTE.map((r) => r.url),
]);
const retires = [];
for (const lien of [...RUBRIQUES, ...PIED.flatMap((c) => c.liens)]) {
  if (publiees.has(lien.url)) continue;
  if (!declarees.has(lien.url)) {
    console.error(`  Lien de navigation vers une URL inconnue : ${lien.url}`);
    console.error('  Ni page publiee, ni page retenue, ni rubrique declaree en attente.');
    process.exit(1);
  }
  retires.push(lien.url);
}

// ------------------------------------------------------------------ ecriture

/**
 * L'accueil devient une page GENEREE, comme les autres.
 *
 * Elle etait le dernier fichier HTML ecrit a la main, et le 19/08 elle a
 * produit exactement le defaut que le generateur existe pour empecher : la
 * rubrique /guide/ a ete ajoutee dans contenu/pages.mjs, les dix-sept pages
 * generees l'ont affichee, et l'accueil ne l'a pas affichee. En production,
 * sur la page la plus vue du site.
 *
 * Le gabarit vit desormais dans contenu/accueil.html et ne contient plus la
 * navigation : elle est injectee entre deux reperes, depuis la meme source que
 * partout ailleurs. Une seule verite par sujet.
 */
const accueil = fs.readFileSync(path.join(RACINE, 'contenu', 'accueil.html'), 'utf-8');
const REPERES = /<!-- nav-site:debut[\s\S]*?nav-site:fin -->/;
// Le second repere, pose le 25/08 au soir : les deux boutons de droite etaient
// le dernier morceau d'entete encore recopie a la main dans les gabarits.
const REPERES_ACTIONS = /<!-- actions-entete:debut[\s\S]*?actions-entete:fin -->/;
const laNavDe = (url) => entete(url, publiees).match(/<nav class="nav-site">[\s\S]*?<\/nav>/)[0];
if (!REPERES.test(accueil)) {
  console.error('  contenu/accueil.html ne porte plus ses reperes de navigation.');
  console.error('  Sans eux, l\'accueil garderait une navigation figee.');
  process.exit(1);
}
if (!REPERES_ACTIONS.test(accueil)) {
  console.error('  contenu/accueil.html ne porte plus ses reperes d\'actions d\'entete.');
  process.exit(1);
}
const REPERES_VITRINE = /<!-- vitrine:debut[\s\S]*?vitrine:fin -->/;
if (!REPERES_VITRINE.test(accueil)) {
  console.error('  contenu/accueil.html ne porte plus ses reperes de vitrine.');
  process.exit(1);
}
// LES IMAGES DOIVENT EXISTER AVANT D'ETRE ANNONCEES. Une balise img vers un
// fichier absent ne casse rien : elle affiche un cadre vide, et personne ne
// s'en apercoit avant un visiteur. La construction, elle, s'en apercoit ici.
for (const v of VITRINE) {
  if (!fs.existsSync(path.join(PUBLIC, 'vitrine', v.image))) {
    console.error(`  Image de vitrine manquante : public/vitrine/${v.image}`);
    console.error('  Elle se compose en local, avec le moteur : npm run vitrine:composer');
    process.exit(1);
  }
}
fs.writeFileSync(path.join(PUBLIC, 'index.html'),
  accueil.replace(REPERES, laNavDe('/'))
    .replace(REPERES_ACTIONS, actionsEntete('/'))
    .replace(REPERES_VITRINE, vitrine())
    .replaceAll('{{DOMAINE}}', DOMAINE));

// L'IMAGE DE PARTAGE, celle qu'un lien emporte avec lui sur LinkedIn ou dans
// une conversation. Sans elle, les meta og: annoncent une image qui n'existe
// pas, ce qui est pire que pas d'image du tout.
fs.copyFileSync(path.join(RACINE, 'contenu', 'exemple', 'partage.png'),
                path.join(PUBLIC, 'partage.png'));

/**
 * LA PAGE /VECTORISER, seconde page d'outil, generee comme l'accueil.
 *
 * Arbitrage Alex du 20/08 : vectoriser et evaluer sont deux promesses
 * differentes, donc deux pages. Celle-ci est epuree, elle ne fait que
 * vectoriser ; c'est son body data-mode="vectoriser" que src/app.js lit pour
 * ne pas afficher le diagnostic. Meme discipline que l'accueil : la
 * navigation est injectee entre les memes reperes, depuis la meme source.
 */
const vectoriser = fs.readFileSync(path.join(RACINE, 'contenu', 'vectoriser.html'), 'utf-8');
if (!REPERES.test(vectoriser)) {
  console.error('  contenu/vectoriser.html ne porte plus ses reperes de navigation.');
  process.exit(1);
}
if (!REPERES_ACTIONS.test(vectoriser)) {
  console.error('  contenu/vectoriser.html ne porte plus ses reperes d\'actions d\'entete.');
  process.exit(1);
}
if (!/data-mode="vectoriser"/.test(vectoriser)) {
  console.error('  contenu/vectoriser.html a perdu son data-mode="vectoriser" :');
  console.error('  la page afficherait le diagnostic complet qu\'elle promet de ne pas faire.');
  process.exit(1);
}
fs.mkdirSync(path.join(PUBLIC, 'vectoriser'), { recursive: true });
fs.writeFileSync(path.join(PUBLIC, 'vectoriser', 'index.html'),
  vectoriser.replace(REPERES, laNavDe('/vectoriser'))
    .replace(REPERES_ACTIONS, actionsEntete('/vectoriser'))
    .replaceAll('{{DOMAINE}}', DOMAINE));

/**
 * LA PAGE /VOIR-MON-LOGO, troisieme page d'outil.
 *
 * Elle pose un logo sur une photo de produit, aux dimensions declarees par le
 * fabricant. Meme discipline que les deux autres : gabarit dans contenu/,
 * navigation injectee entre les memes reperes, une seule source.
 *
 * DEUX GARDE-FOUS, et le second est le plus important. Le premier verifie que
 * la page charge bien le simulateur. Le second verifie qu'elle porte encore la
 * mention qui distingue une simulation d'une validation : master prompt §8, un
 * ecran de simulation ne sert JAMAIS de preuve de marquabilite. Cette phrase
 * peut disparaitre d'une relecture sans que rien ne casse, et c'est
 * exactement pour ca qu'un controle la garde.
 */
const voirMonLogo = fs.readFileSync(path.join(RACINE, 'contenu', 'voir-mon-logo.html'), 'utf-8');
if (!REPERES.test(voirMonLogo)) {
  console.error('  contenu/voir-mon-logo.html ne porte plus ses reperes de navigation.');
  process.exit(1);
}
if (!REPERES_ACTIONS.test(voirMonLogo)) {
  console.error('  contenu/voir-mon-logo.html ne porte plus ses reperes d\'actions d\'entete.');
  process.exit(1);
}
if (!/src\/simulation\/page\.js/.test(voirMonLogo)) {
  console.error('  contenu/voir-mon-logo.html ne charge plus le simulateur :');
  console.error('  la page promettrait un apercu qu\'elle ne rendrait pas.');
  process.exit(1);
}
if (!/class="mention-simulation"/.test(voirMonLogo)
    || !/simulation, pas une validation/i.test(voirMonLogo)) {
  console.error('  contenu/voir-mon-logo.html a perdu sa mention de simulation.');
  console.error('  Un ecran de simulation ne sert jamais de preuve de marquabilite,');
  console.error('  et la distinction se dit A L\'ECRAN, pas en note de bas de page.');
  process.exit(1);
}
/*
 * LE TABLEAU DES OBJETS, GENERE depuis le lot, jamais ecrit a la main.
 *
 * C'est la these GEO du projet appliquee a une page d'outil : de la prose se
 * cite mal, des faits denses se citent. Et une table ecrite a la main
 * divergerait du simulateur des le premier objet ajoute, ce qui serait pire
 * qu'une page sans table : deux verites cote a cote sur le meme ecran.
 *
 * Aucun millimetre ici. Les dimensions d'une zone appartiennent a l'apercu,
 * qui les affiche avec le produit choisi ; les publier en tableau les
 * transformerait en promesse detachee de son contexte.
 */
const LOT_SIMULATION = JSON.parse(fs.readFileSync(
  path.join(RACINE, 'src', 'simulation', 'lot1.json'), 'utf-8'));
const REPERES_OBJETS = /<!-- objets:debut[\s\S]*?objets:fin -->/;
if (!REPERES_OBJETS.test(voirMonLogo)) {
  console.error('  contenu/voir-mon-logo.html ne porte plus ses reperes de tableau.');
  console.error('  Sans eux, la page perdrait le seul contenu citable qu\'elle ait.');
  process.exit(1);
}
const parObjet = new Map();
for (const vue of LOT_SIMULATION.vues) {
  if (!parObjet.has(vue.produit)) {
    parObjet.set(vue.produit, { objet: vue.objet, matiere: vue.matiere,
                                emplacements: 0, techniques: new Set() });
  }
  const o = parObjet.get(vue.produit);
  o.emplacements += 1;
  for (const t of vue.techniques) o.techniques.add(t.nom);
}
const tableauObjets = '<table class="objets-simulation">'
  + '<thead><tr><th>Objet</th><th>Matière</th><th>Emplacements</th>'
  + '<th>Techniques proposées</th></tr></thead><tbody>'
  + [...parObjet.values()].map((o) => `<tr><td>${echapper(o.objet)}</td>`
      + `<td>${echapper(o.matiere)}</td><td>${o.emplacements}</td>`
      + `<td>${echapper([...o.techniques].sort().join(', '))}</td></tr>`).join('')
  + '</tbody></table>';

fs.mkdirSync(path.join(PUBLIC, 'voir-mon-logo'), { recursive: true });
fs.writeFileSync(path.join(PUBLIC, 'voir-mon-logo', 'index.html'),
  voirMonLogo.replace(REPERES, laNavDe('/voir-mon-logo'))
    .replace(REPERES_ACTIONS, actionsEntete('/voir-mon-logo'))
    .replace(REPERES_OBJETS, tableauObjets)
    .replaceAll('{{DOMAINE}}', DOMAINE));

fs.writeFileSync(path.join(PUBLIC, 'vecto.css'), STYLE);
fs.writeFileSync(path.join(PUBLIC, 'favicon.svg'), symbole + '\n');

// Les liens ECRITS DANS LE CORPS des pages sont verifies au meme titre que la
// navigation. Une coquille dans un href de paragraphe ne se voit jamais a la
// relecture, et se decouvre six mois plus tard dans un rapport d'exploration.
const casses = [];
for (const page of pages) {
  const rendu = rendre(page, publiees, QUESTIONS_TOUTES, pages);
  for (const [, href] of rendu.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    if (/^(https?:|mailto:|#)/.test(href)) continue;
    if (!publiees.has(href)) casses.push(`${page.url} -> ${href}`);
  }
  const dossier = path.join(PUBLIC, page.url.replace(/^\//, ''));
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(path.join(dossier, 'index.html'), rendu);
}
if (casses.length > 0) {
  console.error('  Liens internes casses :');
  for (const c of casses) console.error(`    ${c}`);
  process.exit(1);
}

const page404 = {
  url: '/404',
  titre: 'Page introuvable',
  meta: 'Cette page n\'existe pas ou plus.',
  h1: 'Cette page n\'existe pas',
  chapo: "L'adresse est peut-être erronée, ou la page a changé de nom. Voici par où repartir.",
  sections: [{
    h2: 'Par où continuer',
    html: `<ul><li><a href="/">Diagnostiquer un logo</a>, c'est l'outil et c'est gratuit</li>
<li><a href="/questions/">Les questions fréquentes</a> sur les fichiers et le marquage</li>
<li><a href="/confidentialite">Comment vérifier que votre logo reste chez vous</a></li></ul>`,
  }],
  faq: [],
};
fs.writeFileSync(path.join(PUBLIC, '404.html'), rendre(page404, publiees, QUESTIONS_TOUTES, pages));

/**
 * Toute page generee doit etre ignoree par git.
 *
 * L'oubli est arrive le 19/08 : la rubrique /guide/ a ete ajoutee, sept pages
 * se sont ecrites dans public/guide/, et personne n'a pense au .gitignore. Le
 * dossier serait parti dans un commit comme s'il etait du code, avec une
 * garantie de conflit a la construction suivante puisqu'il se reecrit a chaque
 * fois. Ce n'est pas une faute d'attention isolee : elle se reproduira a chaque
 * nouvelle rubrique, donc elle se verifie a la construction.
 */
// Les lignes de commentaire ne comptent PAS. Premier ecrit de ce controle :
// une recherche de sous-chaine dans le fichier entier. Elle trouvait la regle
// dans « # public/guide/ », c'est-a-dire dans une ligne desactivee, et le
// controle passait au vert sur exactement le cas qu'il devait attraper. Trouve
// par le controle negatif, qui existe pour ca.
const gitignore = fs.existsSync(path.join(RACINE, '.gitignore'))
  ? fs.readFileSync(path.join(RACINE, '.gitignore'), 'utf-8')
      .split('\n').map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
  : [];
const nonIgnorees = [...new Set(pages
  .map((p) => p.url.replace(/^\//, '').split('/')[0])
  .filter(Boolean))]
  .filter((racine) => !gitignore.includes(`public/${racine}/`)
                   && !gitignore.includes(`public/${racine}.html`));
if (nonIgnorees.length > 0) {
  console.error('  Sortie generee absente du .gitignore :');
  for (const r of nonIgnorees) console.error(`    public/${r}/`);
  console.error('  Ajouter ces lignes, sinon la sortie part dans un commit et');
  console.error('  entre en conflit a chaque construction.');
  process.exit(1);
}

const sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  `<url><loc>${DOMAINE}/</loc></url>`,
  `<url><loc>${DOMAINE}/vectoriser</loc></url>`,
  `<url><loc>${DOMAINE}/voir-mon-logo</loc></url>`,
  ...pages.map((p) => `<url><loc>${DOMAINE}${p.url}</loc></url>`),
  '</urlset>', ''].join('\n');
fs.writeFileSync(path.join(PUBLIC, 'sitemap.xml'), sitemap);

console.log(`  ${pages.length} pages de contenu, vecto.css et sitemap.xml ecrits`);
for (const p of pages) console.log(`    ${p.url}`);
for (const p of retenues) {
  console.log(`  RETENUE ${p.url} : il manque ${p.manquants.join(', ')}`);
}
for (const r of EN_ATTENTE) console.log(`  EN ATTENTE ${r.url} : ${r.raison}`);
if (retires.length > 0) console.log(`  liens de navigation retires : ${retires.join(', ')}`);
