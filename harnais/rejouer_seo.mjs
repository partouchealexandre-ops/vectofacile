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

const ICI = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ICI, '..', 'public');

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
