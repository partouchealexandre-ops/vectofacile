#!/usr/bin/env node
/**
 * Harnais SEO et GEO : il lit le HTML SERVI, pas les sources.
 *
 * Pourquoi un harnais plutot qu'une relecture. Le referencement se joue sur
 * une dizaine de proprietes mecaniques, repetees sur chaque page, qu'un humain
 * verifie parfaitement la premiere fois et de moins en moins ensuite. A dix
 * huit pages c'est encore tenable, a quatre vingts ce ne l'est plus. Ces
 * controles coutent deux secondes et ne se fatiguent pas.
 *
 * Ce qu'il verifie relève de deux familles.
 *
 * SEO CLASSIQUE : longueur du titre et de la description, unicite de l'un et
 * de l'autre, un seul h1, adresse canonique coherente, balisage structure
 * valide, volume de texte.
 *
 * GEO, c'est-a-dire etre CITABLE par un moteur de reponse. Les criteres sont
 * differents et souvent ignores : une page doit repondre des ses premieres
 * lignes, porter des faits denses plutot que de la prose, et chaque phrase
 * doit rester vraie SORTIE DE SON CONTEXTE, puisqu'un moteur en cite un
 * paragraphe sans le reste. D'ou le controle des renvois internes du type
 * « comme vu plus haut », qui produisent une citation incomprehensible.
 *
 * Les bornes ci-dessous sont des PARAMETRES D'INSTRUMENT : elles disent ce
 * qu'on considere comme lisible, jamais ce qui est vrai. Elles n'ont rien a
 * voir avec les seuils de marquage et ne vivent pas dans seuils.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// LA SEULE CHOSE QU'ON IMPORTE DE LA SOURCE, et c'est volontaire : le harnais
// lit le HTML servi, mais il lui faut une ATTENTE a quoi le comparer. Le
// domaine attendu ne peut pas etre recopie ici, sinon il vit a deux endroits,
// exactement le defaut que la constante existe pour empecher.
import { ADRESSE_DE_DEPLOIEMENT, DOMAINE } from '../outils/entetes.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ICI, '..', 'public');
const HOTE = new URL(DOMAINE).host;

/** L'hote d'une adresse, ou null si elle est illisible. */
const hoteDe = (adresse) => { try { return new URL(adresse).host; } catch { return null; } };

const TITRE_MIN = 30, TITRE_MAX = 65;
const DESCRIPTION_MIN = 110, DESCRIPTION_MAX = 165;
const MOTS_MINIMUM = 300;
const MOTS_MINIMUM_ACCUEIL = 250;

/** Renvois qui rendent une phrase incomprehensible une fois citee seule. */
const RENVOIS = /\b(comme (vu|dit|indiqué|expliqué) (plus haut|ci-dessus|précédemment)|voir plus haut|ci-dessus|le paragraphe précédent)\b/i;

const pages = [];
(function parcourir(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (!['src', 'polices', 'apercus'].includes(e.name)) parcourir(p);
    } else if (e.name === 'index.html') pages.push(p);
  }
})(PUBLIC);

const sansBalises = (h) => h
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z]+;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const lignes = [];
for (const f of pages.sort()) {
  const h = fs.readFileSync(f, 'utf-8');
  const url = '/' + path.relative(PUBLIC, f).replace(/index\.html$/, '');
  const titre = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const description = (h.match(/name="description" content="([^"]*)"/) || [])[1] || '';
  const h1 = [...h.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)];
  const corps = sansBalises(h);
  const canonique = (h.match(/rel="canonical" href="([^"]*)"/) || [])[1] || '';
  const blocs = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let types = [], jsonValide = true;
  for (const m of blocs) {
    try {
      const d = JSON.parse(m[1]);
      types.push(...(d['@graph'] || [d]).map((n) => n['@type']));
    } catch { jsonValide = false; }
  }
  lignes.push({
    url, titre, description, h1: h1.length, canonique, types, jsonValide,
    blocs: blocs.length,
    mots: corps ? corps.split(' ').length : 0,
    partage: [...h.matchAll(/<meta (?:property|name)="((?:og|twitter):[^"]+)"/g)].map((m) => m[1]),
    partageUrl: (h.match(/<meta property="og:url" content="([^"]+)"/) ?? [])[1] ?? '',
    tableaux: (h.match(/<table/g) || []).length,
    listes: (h.match(/<[ou]l/g) || []).length,
    chapo: /class="chapo"/.test(h) || /class="accroche"/.test(h),
    // L'ANCIEN NOM, dans le HTML SERVI et pas dans le code source. Un
    // renommage se rate toujours au meme endroit : une metadonnee que
    // personne ne relit, un JSON-LD, un attribut alt. Le visiteur ne le voit
    // pas, le moteur si, et le site s'annonce alors sous deux noms.
    //
    // ET LE MOTIF TRAVERSE LES BALISES, parce que la premiere version ne le
    // faisait pas et a laisse passer exactement ce qu'elle devait attraper :
    // le logotype s'ecrit « Vecto<br>Facile » sur deux lignes, et un \s+ ne
    // franchit pas un <br>. Trois pages d'outil sont parties en production
    // sous l'ancien nom, avec un controle au vert.
    //
    // ET LE SEPARATEUR EST OBLIGATOIRE, un + et non un * : avec un *, le
    // motif attrapait « vectofacile » tout court, donc le domaine en
    // service, donc les vingt-deux canoniques. Le temoin l'a vu.
    //
    // `vectofacile.netlify.app` reste legitime tant que le site y repond :
    // c'est le NOM et l'ancien domaine en .fr qu'on traque.
    ancienNom: [...h.matchAll(/Vecto(?:\s|&nbsp;|<[^>]{1,12}>)+Facile|vectofacile\.fr/gi)].map((m) => m[0]),
    renvoi: (corps.match(RENVOIS) || [])[0] || null,
  });
}

const fautes = [];
const ajouter = (url, texte) => fautes.push(`${url} : ${texte}`);

for (const l of lignes) {
  const accueil = l.url === '/';
  if (l.titre.length < TITRE_MIN || l.titre.length > TITRE_MAX) {
    ajouter(l.url, `titre de ${l.titre.length} caracteres, viser ${TITRE_MIN} a ${TITRE_MAX}`);
  }
  if (l.description.length < DESCRIPTION_MIN || l.description.length > DESCRIPTION_MAX) {
    ajouter(l.url, `description de ${l.description.length} caracteres, viser ${DESCRIPTION_MIN} a ${DESCRIPTION_MAX}`);
  }
  if (l.h1 !== 1) ajouter(l.url, `${l.h1} balise h1, il en faut exactement une`);
  if (!l.canonique.endsWith(l.url) && !l.canonique.endsWith(l.url.replace(/\/$/, ''))) {
    ajouter(l.url, `adresse canonique incoherente : ${l.canonique || 'absente'}`);
  }
  // ET SUR LE BON HOTE. Le controle ci-dessus ne regarde que la FIN de
  // l'adresse : le 25/08, au moment de basculer le domaine, une canonique
  // juste en chemin et fausse en domaine serait passee au vert sur les vingt
  // deux pages. Une canonique qui designe un autre hote que le sitemap est la
  // faute qui se corrige en une ligne et se paie en mois de reindexation.
  if (l.canonique && hoteDe(l.canonique) !== HOTE) {
    ajouter(l.url, `canonique sur ${hoteDe(l.canonique) || 'une adresse illisible'}, attendu ${HOTE}`);
  }
  // METADONNEES DE PARTAGE, trouvaille de l'audit du 21/08 : aucune page n'en
  // portait. Un lien envoye sur LinkedIn ou dans une conversation sortait NU,
  // sans titre ni image. Pour un outil dont on attend qu'il circule entre
  // acheteurs, c'est la difference entre un lien qu'on clique et un lien qu'on
  // ignore.
  for (const balise of ['og:title', 'og:description', 'og:image', 'og:url', 'og:locale']) {
    if (!l.partage.includes(balise)) ajouter(l.url, `pas de ${balise}`);
  }
  if (!l.partage.includes('twitter:card')) ajouter(l.url, 'pas de twitter:card');
  // ET LE DOMAINE EST LE MEME PARTOUT. Une canonique qui pointe ailleurs que le
  // sitemap est la faute qui coute le plus longtemps : elle se corrige en une
  // ligne et se paie en mois de reindexation.
  if (l.partageUrl && l.canonique && l.partageUrl !== l.canonique) {
    ajouter(l.url, `og:url ${l.partageUrl} et canonique ${l.canonique} divergent`);
  }
  if (!l.jsonValide) ajouter(l.url, 'balisage structure JSON invalide');
  if (l.blocs !== 1) ajouter(l.url, `${l.blocs} blocs de balisage, il en faut un seul`);
  if (!accueil && !l.types.includes('BreadcrumbList')) ajouter(l.url, 'pas de fil d\'Ariane balise');
  if (accueil && !l.types.includes('WebSite')) ajouter(l.url, 'pas de balisage WebSite');
  const minimum = accueil ? MOTS_MINIMUM_ACCUEIL : MOTS_MINIMUM;
  if (l.mots < minimum) ajouter(l.url, `${l.mots} mots, minimum ${minimum}`);
  // GEO : une page qui ne porte ni tableau ni liste est de la prose, et la
  // prose se cite mal. Les faits denses se citent.
  if (!accueil && l.tableaux + l.listes === 0) ajouter(l.url, 'aucun tableau ni liste, contenu peu citable');
  if (!l.chapo) ajouter(l.url, 'pas de chapeau : la reponse n\'arrive pas des les premieres lignes');
  // GEO : une phrase citee hors contexte doit rester vraie.
  if (l.renvoi) ajouter(l.url, `renvoi interne « ${l.renvoi} » : illisible une fois cite seul`);
  if (l.ancienNom.length > 0) {
    ajouter(l.url, `ancien nom servi : ${[...new Set(l.ancienNom)].join(', ')}`);
  }
}

const grouper = (cle) => {
  const vus = new Map();
  for (const l of lignes) {
    const v = l[cle];
    if (!vus.has(v)) vus.set(v, []);
    vus.get(v).push(l.url);
  }
  for (const [, urls] of vus) {
    if (urls.length > 1) fautes.push(`${cle} en double sur : ${urls.join(', ')}`);
  }
};
grouper('titre');
grouper('description');

console.log('');
console.log('  HARNAIS SEO ET GEO, sur le HTML SERVI');
console.log('  ' + '-'.repeat(74));
// TEMOIN. Une garde qui ne regarde pas au bon endroit passe au vert en ne
// trouvant rien : on lui donne une page sans metadonnees de partage et on
// verifie qu'elle la refuse. Sans ce controle, la ligne precedente ne prouve
// rien le jour ou le selecteur change.
{
  const nue = '<html><head><title>x</title></head><body></body></html>';
  const trouvees = [...nue.matchAll(/<meta (?:property|name)="((?:og|twitter):[^"]+)"/g)];
  if (trouvees.length !== 0) {
    ajouter('(temoin)', 'le detecteur de metadonnees de partage ne detecte pas');
  }
  const pleine = '<meta property="og:title" content="x">';
  if ([...pleine.matchAll(/<meta (?:property|name)="((?:og|twitter):[^"]+)"/g)].length !== 1) {
    ajouter('(temoin)', 'le detecteur de metadonnees de partage ne trouve pas');
  }
  // TEMOIN DU DETECTEUR D'ANCIEN NOM. Le jour ou plus aucune page ne le porte,
  // ce controle passe au vert sans rien regarder : il faut donc lui prouver
  // qu'il sait encore voir. On lui donne les deux formes qu'il traque, et une
  // troisieme qui doit le laisser indifferent.
  const essai = 'Vecto Facile, Vecto<br>Facile et contact@vectofacile.fr, '
    + 'mais vectofacile.netlify.app est legitime';
  const vus = [...essai.matchAll(/Vecto(?:\s|&nbsp;|<[^>]{1,12}>)+Facile|vectofacile\.fr/gi)].map((m) => m[0]);
  if (vus.length !== 3) {
    ajouter('(temoin)', `le detecteur d'ancien nom voit ${vus.length} formes au lieu de 3`);
  }
  // ET IL NE CONFOND PAS LE NOM AVEC LE VERBE : « vectoriser » commence
  // pareil, et le site en est plein.
  if (/Vecto(?:\s|&nbsp;|<[^>]{1,12}>)+Facile/i.test('Vectoriser un logo, vectoriel, vectorisation')) {
    ajouter('(temoin)', 'le detecteur d\'ancien nom se declenche sur « vectoriser »');
  }
  if (/Vecto(?:\s|&nbsp;|<[^>]{1,12}>)+Facile|vectofacile\.fr/i.test('https://vectofacile.netlify.app/')) {
    ajouter('(temoin)', 'le detecteur d\'ancien nom se declenche sur le domaine en service');
  }
  // TEMOIN DU CONTROLE D'HOTE, dans les deux sens. Il doit REFUSER une adresse
  // dont le chemin est juste et le domaine faux, et RECONNAITRE le sien : un
  // controle qui ne fait que l'un des deux est soit aveugle, soit bavard.
  if (hoteDe('https://vectofacile.netlify.app/vectoriser') === HOTE) {
    ajouter('(temoin)', 'le controle d\'hote canonique ne distingue plus les domaines');
  }
  if (hoteDe(`${DOMAINE}/vectoriser`) !== HOTE) {
    ajouter('(temoin)', 'le controle d\'hote canonique ne reconnait pas son propre domaine');
  }
  if (hoteDe('pas une adresse') !== null) {
    ajouter('(temoin)', 'le lecteur d\'hote ne signale pas une adresse illisible');
  }

  // L'ADRESSE DE DEPLOIEMENT NE SERT PLUS LE SITE, elle y renvoie.
  //
  // Releve a l'audit du 25/08 au soir : bonamarquer.netlify.app repondait avec
  // le meme contenu que le domaine. Les canoniques disaient deja laquelle
  // compte, ce qui attenue, mais un moteur qui trouve les deux voit d'abord un
  // site en double et decide ensuite.
  //
  // Le controle lit le fichier SERVI, comme tout le reste de ce harnais, et il
  // verifie les trois choses qui peuvent se tromper separement : que la regle
  // existe, qu'elle part bien de l'adresse de deploiement, et qu'elle arrive
  // sur le domaine.
  const cheminRedirections = path.join(PUBLIC, '_redirects');
  if (!fs.existsSync(cheminRedirections)) {
    ajouter('_redirects', 'le fichier n\'est pas produit par la construction');
  } else {
    const regles = fs.readFileSync(cheminRedirections, 'utf-8');
    const ligne = regles.split('\n').find((l) => l.trim() && !l.startsWith('#'));
    if (!ligne) {
      ajouter('_redirects', 'aucune regle, seulement des commentaires');
    } else {
      const [source, cible, code] = ligne.trim().split(/\s+/);
      if (hoteDe(source) !== hoteDe(ADRESSE_DE_DEPLOIEMENT)) {
        ajouter('_redirects', `la regle part de ${hoteDe(source)}, attendu ${hoteDe(ADRESSE_DE_DEPLOIEMENT)}`);
      }
      if (hoteDe(cible) !== HOTE) {
        ajouter('_redirects', `la regle arrive sur ${hoteDe(cible)}, attendu ${HOTE}`);
      }
      if (!String(code).startsWith('301')) {
        ajouter('_redirects', `la regle repond ${code}, attendu une redirection permanente`);
      }
    }
  }

  // TEMOIN, et il ne regarde pas le fichier : il regarde les DEUX CONSTANTES.
  // Une redirection d'un hote vers lui-meme est une boucle, et c'est
  // exactement ce que produirait quelqu'un qui alignerait les deux constantes
  // en croyant bien faire le jour d'un changement de domaine.
  if (hoteDe(ADRESSE_DE_DEPLOIEMENT) === HOTE) {
    ajouter('(temoin)', 'l\'adresse de deploiement et le domaine sont le meme hote : la redirection boucle');
  }
}

console.log('  url'.padEnd(56) + 'titre  desc   mots  balisage');
for (const l of lignes) {
  console.log(`  ${l.url.padEnd(53)}${String(l.titre.length).padStart(4)}`
    + `${String(l.description.length).padStart(6)}${String(l.mots).padStart(7)}  ${l.types.join('+')}`);
}
console.log('  ' + '-'.repeat(74));
console.log('');
for (const f of fautes) console.log(`  ECHEC ${f}`);
console.log(`  ${lignes.length} pages, ${fautes.length} faute(s).`);
console.log('');
process.exit(fautes.length === 0 ? 0 : 1);
