#!/usr/bin/env node
/**
 * Harnais des pages de contenu : chaque page publiee, dans un vrai Chromium.
 *
 * Pourquoi un harnais pour des pages statiques, alors que la construction les
 * ecrit elle-meme ? Parce que la construction verifie ce qu'elle ECRIT, pas ce
 * que le navigateur RECOIT. Entre les deux il y a la politique de securite du
 * site, les types MIME, le chargement de la feuille de style et des polices.
 * La premiere version du harnais de bout en bout servait deja les feuilles de
 * style en octet-stream sans que personne ne s'en apercoive : Chromium les
 * refusait en silence et les pages s'affichaient en Times New Roman.
 *
 * Ce harnais controle, pour chaque page :
 *   la page repond 200 et rend un titre de niveau 1 non vide ;
 *   la feuille de style est APPLIQUEE, verifie sur le style calcule, pas sur
 *     la presence de la balise, qui ne prouve rien ;
 *   la police Poppins est bien celle qui s'affiche, arbitrage de charte §8 ;
 *   le balisage structure est un JSON valide et porte un fil d'Ariane ;
 *   l'adresse canonique correspond a l'URL demandee ;
 *   chaque lien interne de la page repond 200 ;
 *   aucune erreur n'apparait dans la console.
 *
 * Le controle des liens est le plus rentable des sept. Une coquille dans un
 * href ne se voit jamais a la relecture et se decouvre des mois plus tard.
 */

const versionNode = Number(process.versions.node.split('.')[0]);
if (versionNode < 20) {
  console.log('');
  console.log('  HARNAIS DES PAGES : SAUTE, pas reussi.');
  console.log(`  Il demande Node 20 ou plus, cette machine est en Node ${process.versions.node}.`);
  console.log('  Netlify construit en Node 22 : c\'est la verification LOCALE qui manque.');
  console.log('');
  process.exit(0);
}

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { TYPES, ouvrirChromium } from './_navigateur.mjs';
import { entetesGlobales } from '../outils/entetes.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '..');
const PUBLIC = path.join(RACINE, 'public');
const PORT = 8232;
const BASE = `http://127.0.0.1:${PORT}`;

/**
 * La liste des pages n'est pas ecrite ici : elle est LUE dans le sitemap que
 * la construction vient de produire. Une liste tenue a la main dans un harnais
 * oublie exactement les pages qu'on vient d'ajouter, c'est-a-dire celles qui
 * ont le plus besoin d'etre verifiees.
 */
/**
 * Les pages ou une dimension en millimetres est legitime, et pourquoi.
 * La liste est volontairement minuscule : chaque ajout doit se justifier.
 */
const SANS_CONTROLE_DE_SEUIL = new Set([
  '/mentions-legales',   // adresses, capital, rien de technique
]);

const sitemap = path.join(PUBLIC, 'sitemap.xml');
if (!fs.existsSync(sitemap)) {
  console.error('  sitemap.xml absent. Lancer d\'abord : npm run site:construire');
  process.exit(1);
}
const URLS = [...fs.readFileSync(sitemap, 'utf-8').matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => new URL(m[1]).pathname);

function resoudre(url) {
  let fichier = path.join(PUBLIC, url === '/' ? 'index.html' : url);
  if (fs.existsSync(fichier) && fs.statSync(fichier).isDirectory()) {
    fichier = path.join(fichier, 'index.html');
  } else if (!fs.existsSync(fichier) && fs.existsSync(fichier + '/index.html')) {
    fichier = fichier + '/index.html';
  } else if (!fs.existsSync(fichier) && !path.extname(fichier)) {
    fichier = path.join(fichier, 'index.html');
  }
  return fichier;
}

function servir() {
  return new Promise((resolve) => {
    const serveur = http.createServer((requete, reponse) => {
      const url = decodeURIComponent(requete.url.split('?')[0]);
      const fichier = resoudre(url);
      if (!fichier.startsWith(PUBLIC) || !fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) {
        reponse.writeHead(404, { 'Content-Type': 'text/plain' });
        reponse.end('absent');
        return;
      }
      // Les MEMES entetes qu'en production, politique de securite comprise.
      reponse.writeHead(200, {
        'Content-Type': TYPES[path.extname(fichier)] || 'application/octet-stream',
        ...entetesGlobales(),
      });
      reponse.end(fs.readFileSync(fichier));
    });
    serveur.listen(PORT, () => resolve(serveur));
  });
}

const serveur = await servir();
const navigateur = await ouvrirChromium();
const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 900 } });

console.log('');
console.log('  HARNAIS DES PAGES DE CONTENU, dans Chromium');
console.log('  ' + '-'.repeat(66));

let echecs = 0;
const liensVus = new Map();
// La navigation de la premiere page lue fait reference pour toutes les
// suivantes. Peu importe laquelle est « juste » : ce qui compte est qu'elles
// soient identiques, et une divergence se voit alors immediatement.
let navAttendue = null;

for (const url of URLS) {
  const fautes = [];
  const page = await contexte.newPage();
  const erreursConsole = [];
  page.on('console', (m) => { if (m.type() === 'error') erreursConsole.push(m.text()); });
  page.on('pageerror', (e) => erreursConsole.push(String(e)));

  const reponse = await page.goto(BASE + url, { waitUntil: 'networkidle' });
  if (!reponse || reponse.status() !== 200) fautes.push(`statut ${reponse ? reponse.status() : 'sans reponse'}`);

  const constat = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const corps = document.body;
    const style = getComputedStyle(corps);
    const titreStyle = h1 ? getComputedStyle(h1) : null;
    return {
      h1: h1 ? h1.textContent.trim() : '',
      // Si la feuille n'est pas appliquee, la marge du corps vaut 8px et la
      // couleur du texte est le noir par defaut. C'est le controle qui aurait
      // attrape le octet-stream du premier jour.
      styleApplique: style.getPropertyValue('--navy') !== '' || parseFloat(style.marginTop) !== 8,
      policeTitre: titreStyle ? titreStyle.fontFamily : '',
      canonique: (document.querySelector('link[rel=canonical]') || {}).href || '',
      description: (document.querySelector('meta[name=description]') || {}).content || '',
      balises: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
      liens: [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')),
      titre: document.title,
    };
  });

  if (!constat.h1) fautes.push('pas de h1');
  if (!constat.styleApplique) fautes.push('feuille de style NON appliquee');
  if (!/Poppins/i.test(constat.policeTitre)) fautes.push(`titre en ${constat.policeTitre}`);
  if (!constat.canonique.endsWith(url)) fautes.push(`canonique ${constat.canonique}`);
  if (!constat.description) fautes.push('pas de meta description');
  if (constat.balises.length !== 1) fautes.push(`${constat.balises.length} blocs de balisage, il en faut un`);
  else {
    try {
      const donnees = JSON.parse(constat.balises[0]);
      const types = (donnees['@graph'] || []).map((n) => n['@type']);
      // Un fil d'Ariane d'un seul maillon n'a aucun sens : l'accueil porte
      // l'identite du site, les autres pages portent leur chemin.
      const attendu = url === '/' ? 'WebSite' : 'BreadcrumbList';
      if (!types.includes(attendu)) fautes.push(`balisage sans ${attendu}`);
    } catch (e) { fautes.push('balisage JSON invalide'); }
  }

  for (const lien of new Set(constat.liens)) {
    if (!liensVus.has(lien)) {
      const r = await fetch(BASE + lien, { method: 'GET' });
      liensVus.set(lien, r.status);
    }
    if (liensVus.get(lien) !== 200) fautes.push(`lien mort ${lien}`);
  }

  // AUCUN SEUIL DE MARQUAGE DANS UNE PAGE PUBLIEE.
  //
  // Les fiches techniques sont ecrites en forme honnete : elles decrivent la
  // mecanique d'un procede, jamais ce qui est marquable. Le risque n'est pas
  // theorique, il est humain : au fil des relectures, quelqu'un ajoutera « 0,3
  // mm minimum » parce que ca rend la page plus utile, et cette valeur sera
  // servie a des visiteurs alors qu'aucun arbitrage ne l'a rendue.
  //
  // On cherche donc un CHIFFRE accole a une unite de marquage dans le corps.
  // Les exceptions sont explicites et courtes : la page confidentialite parle
  // de commandes, les mentions legales d'un capital et d'un code postal.
  if (!SANS_CONTROLE_DE_SEUIL.has(url)) {
    const corps = await page.evaluate(() => {
      const c = document.querySelector('.page-contenu');
      return c ? c.innerText : '';
    });
    const seuils = [...corps.matchAll(/(\d+(?:[.,]\d+)?)\s?(mm|cm)\b/gi)]
      .map((m) => m[0]);
    if (seuils.length > 0) {
      fautes.push(`seuil de marquage publie : ${[...new Set(seuils)].join(', ')}`);
    }
  }

  // LA NAVIGATION EST LA MEME SUR TOUTES LES PAGES, accueil compris.
  //
  // Controle ajoute apres l'incident du 19/08 : la rubrique /guide/ manquait
  // sur l'accueil et sur l'accueil seulement, parce que sa navigation etait
  // ecrite a la main. Le defaut est passe en production, il est reste
  // invisible aux quatre autres harnais, et c'est Alex qui l'a vu en ouvrant
  // le site. Un controle de coherence entre pages l'aurait attrape avant.
  const nav = await page.evaluate(() =>
    [...document.querySelectorAll('.nav-site a')].map((a) => a.getAttribute('href')));
  if (navAttendue === null) {
    navAttendue = nav;
  } else if (nav.join('|') !== navAttendue.join('|')) {
    fautes.push(`navigation differente des autres pages : ${nav.join(', ')} `
      + `au lieu de ${navAttendue.join(', ')}`);
  }

  if (erreursConsole.length > 0) fautes.push(`console : ${erreursConsole[0]}`);
  await page.close();

  if (fautes.length === 0) {
    console.log(`  ok    ${url.padEnd(50)} ${constat.liens.length} liens`);
  } else {
    echecs++;
    console.log(`  ECHEC ${url}`);
    for (const f of fautes) console.log(`          ${f}`);
  }
}

console.log('  ' + '-'.repeat(66));
console.log('');
console.log(`  ${URLS.length} pages, ${echecs} echec(s). ${liensVus.size} liens internes distincts controles.`);
console.log('');

await navigateur.close();
serveur.close();
process.exit(echecs === 0 ? 0 : 1);
