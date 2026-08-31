#!/usr/bin/env node
/**
 * PREVENIR LES MOTEURS QU'UNE PAGE A CHANGE, protocole IndexNow.
 *
 * POURQUOI CE SCRIPT EXISTE. Un moteur passe quand il veut. Sur un site neuf
 * et sans lien entrant, ce « quand il veut » se compte en jours, parfois en
 * semaines : Bing affichait « decouvert, pas explore » sur nos pages le jour
 * meme ou il lisait notre sitemap. IndexNow renverse le sens : on annonce, et
 * le moteur vient, en general dans l'heure. Ce raccourci vaut plus que tout
 * le reste ici, parce que les moteurs de reponse s'appuient largement sur
 * l'index de Bing.
 *
 * POURQUOI IL N'EST PAS DANS LA CONSTRUCTION. Annoncer une URL avant qu'elle
 * soit en ligne fait venir le moteur sur l'ancienne version, et c'est celle-la
 * qu'il garde. La construction produit, le deploiement publie, et l'annonce
 * vient APRES : trois moments distincts, donc trois commandes distinctes.
 *
 * POURQUOI IL N'EST PAS DANS `npm run verifier`. Le verificateur doit tourner
 * hors ligne et rendre le meme resultat a chaque passage. Un appel reseau vers
 * un tiers n'a ni l'une ni l'autre de ces proprietes.
 *
 * Usage :
 *   npm run indexnow              toutes les URL du sitemap
 *   npm run indexnow -- /blog/    seulement celles qui commencent par /blog/
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOMAINE, CLE_INDEXNOW, URL_CLE_INDEXNOW, INDEXABLE } from './entetes.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POINT_DE_DEPOT = 'https://api.indexnow.org/indexnow';

const echouer = (message, remede) => {
  console.error(`\n  ${message}`);
  if (remede) console.error(`  ${remede}`);
  console.error('');
  process.exit(1);
};

// UN SITE FERME NE S'ANNONCE PAS. Le meme booleen qui ferme le robots.txt
// ferme cette porte-ci : sans ca, on inviterait un moteur a lire des pages
// qu'on vient de lui interdire, ce qui est au mieux inutile et au pire lu
// comme une contradiction.
if (!INDEXABLE) {
  echouer('L\'indexation est fermee (INDEXABLE vaut faux) : rien a annoncer.');
}

// LES URL VIENNENT DU SITEMAP CONSTRUIT, pas d'une liste tenue a la main.
// Une deuxieme liste finirait par diverger de la premiere, et c'est la
// deuxieme qu'on oublierait de mettre a jour.
const sitemap = path.join(RACINE, 'public', 'sitemap.xml');
if (!fs.existsSync(sitemap)) {
  echouer('public/sitemap.xml est absent.', 'Lancer d\'abord : npm run site:construire');
}
const filtre = process.argv[2] ?? '';
const toutes = [...fs.readFileSync(sitemap, 'utf-8').matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1]);
const urls = filtre
  ? toutes.filter((u) => u.startsWith(`${DOMAINE}${filtre}`))
  : toutes;

if (urls.length === 0) {
  echouer(`Aucune URL ne commence par ${DOMAINE}${filtre}.`);
}

// LA CLE SE VERIFIE EN LIGNE AVANT D'ETRE ANNONCEE. Un ping dont la cle est
// absente ou fausse est refuse par le moteur, et il l'est en silence : la
// requete repond 200, rien ne se passe, et on croit avoir prevenu. Le seul
// moment ou ce defaut se voit, c'est des semaines plus tard, en constatant
// qu'on n'est pas indexe. On mesure donc au lieu de croire.
console.log('');
console.log('  ANNONCE INDEXNOW');
console.log('  ' + '-'.repeat(64));
process.stdout.write(`  cle servie sur ${URL_CLE_INDEXNOW} ... `);
let servie;
try {
  const reponse = await fetch(URL_CLE_INDEXNOW, { cache: 'no-store' });
  servie = reponse.ok ? (await reponse.text()).trim() : null;
} catch (e) {
  console.log('injoignable');
  echouer(`Le domaine ne repond pas : ${e.message}`);
}
if (servie === null) {
  console.log('absente');
  echouer('Le fichier de cle n\'est pas servi par le site EN LIGNE.',
    'Construire et deployer d\'abord : le fichier est genere par npm run site:construire.');
}
if (servie !== CLE_INDEXNOW) {
  console.log('differente');
  echouer(`Le site sert « ${servie.slice(0, 40)} », le code attend « ${CLE_INDEXNOW} ».`,
    'Le deploiement en ligne est plus ancien que le code : pousser, puis reessayer.');
}
console.log('oui');

const charge = {
  host: new URL(DOMAINE).host,
  key: CLE_INDEXNOW,
  keyLocation: URL_CLE_INDEXNOW,
  urlList: urls,
};
const envoi = await fetch(POINT_DE_DEPOT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(charge),
});

console.log(`  ${urls.length} URL annoncee(s), reponse ${envoi.status} ${envoi.statusText}`);
console.log('  ' + '-'.repeat(64));

// CE QUE CHAQUE CODE VEUT DIRE, parce qu'un numero seul ne dit rien et qu'on
// ne va pas rouvrir la documentation a chaque fois.
const lecture = {
  200: 'accepte, les URL sont en file',
  202: 'accepte, la cle sera verifiee de leur cote',
  400: 'requete mal formee',
  403: 'cle refusee : elle ne correspond pas a ce que le site sert',
  422: 'une URL n\'appartient pas au domaine annonce',
  429: 'trop d\'annonces, attendre',
};
console.log(`  ${lecture[envoi.status] ?? 'code inattendu, voir la documentation IndexNow'}`);
console.log('');
if (envoi.status >= 400) process.exit(1);
