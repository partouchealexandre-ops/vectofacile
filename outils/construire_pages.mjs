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
import { CONFIDENTIALITE } from '../contenu/confidentialite.mjs';
import { QUI_SOMMES_NOUS, MENTIONS } from '../contenu/institution.mjs';
import { QUESTIONS } from '../contenu/questions/vectoriel.mjs';
import { QUESTIONS_JPEG } from '../contenu/questions/jpeg.mjs';
import { QUESTIONS_COULEURS } from '../contenu/questions/couleurs.mjs';
import { QUESTIONS_FORMATS } from '../contenu/questions/formats.mjs';
import { TECHNIQUES } from '../contenu/guide/techniques.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(RACINE, 'public');
const DOMAINE = 'https://vectofacile.netlify.app';

const symbole = fs.readFileSync(path.join(RACINE, 'identite', 'symbole.svg'), 'utf-8')
  .replace(/<\?xml[^>]*\?>\s*/, '')
  .replace(/\s(width|height)="[\d.]+"/g, '')
  .replace(/<title>[^<]*<\/title>/, '<title>Vecto Facile</title>')
  .replace(/\n/g, '');

const echapper = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function entete(urlCourante, publiees) {
  const liens = RUBRIQUES.filter((r) => publiees.has(r.url)).map((r) =>
    `<a href="${r.url}"${urlCourante.startsWith(r.url) && r.url !== '/' ? ' aria-current="page"' : ''}>${r.titre}</a>`
  ).join('');
  return `<header class="entete">
  <a class="lockup" href="/">${symbole}<span class="mot">Vecto<br>Facile</span></a>
  <nav class="nav-site">${liens}</nav>
  <div class="droite"><a class="cta-entete" href="/">Vectoriser mon logo</a></div>
</header>`;
}

function pied(publiees) {
  const colonnes = PIED.map((c) => {
    const liens = c.liens.filter((l) => publiees.has(l.url));
    if (liens.length === 0) return '';
    return `<div><b>${c.titre}</b>${liens.map((l) => `<a href="${l.url}">${l.titre}</a>`).join('')}</div>`;
  }).join('');
  return `<footer class="pied-site">
  <div class="colonnes">${colonnes}</div>
  <p class="mention">Vecto Facile est une initiative Bytouch. Votre logo n'est jamais
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
  const fil = [{ '@type': 'ListItem', position: 1, name: 'Vecto Facile', item: `${DOMAINE}/` }];
  if (morceaux.length > 0) {
    const parts = morceaux[0].split('/');
    let chemin = '';
    parts.forEach((part, i) => {
      chemin += '/' + part;
      const dernier = i === parts.length - 1;
      fil.push({
        '@type': 'ListItem',
        position: i + 2,
        name: dernier ? page.titre
          : (chemin === '/guide' ? 'Techniques de marquage' : 'Questions fréquentes'),
        item: `${DOMAINE}${dernier ? page.url : chemin + '/'}`,
      });
    });
  }
  const graphe = [{ '@type': 'BreadcrumbList', itemListElement: fil }];
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

function faqVisible(page) {
  if (!page.faq || page.faq.length === 0) return '';
  const items = page.faq.map((f) =>
    `<h3>${echapper(f.q)}</h3><p>${echapper(f.r)}</p>`
  ).join('');
  return `<h2>Questions fréquentes</h2>${items}`;
}

function filVisible(page, publiees) {
  const morceaux = ['<a href="/">Vecto Facile</a>'];
  const parent = page.url.replace(/[^/]+$/, '');
  if (parent !== '/' && publiees.has(parent) && parent !== page.url) {
    const nomRubrique = parent === '/guide/' ? 'Techniques de marquage'
      : parent === '/questions/' ? 'Questions fréquentes' : parent;
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
    : page.url.startsWith('/questions/') ? '/questions/' : null;
  if (!rubrique || page.url === rubrique) return '';
  const bassin = rubrique === '/guide/' ? TECHNIQUES : questions;
  const autres = bassin.filter((q) => q.url !== page.url).slice(0, 3);
  if (autres.length === 0) return '';
  const items = autres.map((q) => `<li><a href="${q.url}">${echapper(q.titre)}</a></li>`).join('');
  return `<h2>À lire aussi</h2><ul class="voisines">${items}</ul>`;
}

function rendre(page, publiees, questions = []) {
  const corps = page.sections.map((s) => `<h2>${echapper(s.h2)}</h2>${s.html.trim()}`).join('\n');
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${echapper(page.titre)} | Vecto Facile</title>
<meta name="description" content="${echapper(page.meta)}">
<link rel="canonical" href="${DOMAINE}${page.url}">
<link rel="icon" href="/favicon.svg">
<link rel="stylesheet" href="/vecto.css">
${balises(page)}
</head>
<body>
<div class="page-contenu">
${entete(page.url, publiees)}
<p class="fil">${filVisible(page, publiees)}</p>
<h1>${echapper(page.h1)}</h1>
<p class="chapo">${echapper(page.chapo)}</p>
${corps}
${faqVisible(page)}
${voisines(page, questions)}
<div class="appel"><a href="/">Diagnostiquer mon logo, gratuitement</a></div>
</div>
${pied(publiees)}
</body>
</html>
`;
}

// -------------------------------------------------- assemblage et controles

const QUESTIONS_TOUTES = [...QUESTIONS, ...QUESTIONS_JPEG, ...QUESTIONS_COULEURS, ...QUESTIONS_FORMATS];

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
    titre: 'Les techniques de marquage, expliquées par leur mécanique',
    meta: "Sérigraphie, tampographie, gravure laser, broderie, numérique UV, transfert "
      + "DTF, marquage à chaud. Ce que chaque procédé réussit, ce qu'il rate, et le "
      + "fichier qu'il réclame.",
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
    titre: 'Questions fréquentes sur la vectorisation et le marquage',
    meta: "Les questions que se posent ceux qui doivent faire marquer un logo : fichier "
      + "vectoriel, vectorisation d'un JPEG, nombre réel de couleurs. Réponses mesurées, "
      + "outil gratuit sans envoi de fichier.",
    h1: 'Questions fréquentes',
    chapo: "Les questions qui bloquent une commande d'objets marqués, et les réponses, "
      + "vérifiables plutôt qu'affirmées.",
    sections: [{ h2: 'Toutes les questions', html: items }],
    faq: [],
  };
}

const candidates = [
  CONFIDENTIALITE,
  indexTechniques(TECHNIQUES),
  ...TECHNIQUES,
  indexQuestions(QUESTIONS_TOUTES),
  ...QUESTIONS_TOUTES,
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

const publiees = new Set([...vues, '/']);

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

fs.writeFileSync(path.join(PUBLIC, 'vecto.css'), STYLE);
fs.writeFileSync(path.join(PUBLIC, 'favicon.svg'), symbole + '\n');

// Les liens ECRITS DANS LE CORPS des pages sont verifies au meme titre que la
// navigation. Une coquille dans un href de paragraphe ne se voit jamais a la
// relecture, et se decouvre six mois plus tard dans un rapport d'exploration.
const casses = [];
for (const page of pages) {
  const rendu = rendre(page, publiees, QUESTIONS_TOUTES);
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
fs.writeFileSync(path.join(PUBLIC, '404.html'), rendre(page404, publiees, QUESTIONS_TOUTES));

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
