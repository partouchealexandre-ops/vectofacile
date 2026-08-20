#!/usr/bin/env node
/**
 * Harnais du chemin VECTORIEL : les fichiers deja vectoriels, PDF et AI.
 *
 * POURQUOI CE HARNAIS EXISTE. Le 19/08, Alex a depose un .ai sur le site en
 * production et a recu un message rouge. Le defaut n'etait pas un bogue, c'en
 * etait un de conception : « votre logo est-il bon a marquer » et « vectoriser
 * mon logo » etaient la meme page, donc la personne qui a deja un vectoriel
 * propre, celle a qui le diagnostic sert le PLUS, etait refusee a l'entree.
 *
 * Ce que ce harnais protege, dans l'ordre de ce que ca coute si ca casse :
 *
 *   UN FICHIER VECTORIEL NE SE FAIT PAS VECTORISER. Lui rendre une version
 *   tracee de son propre dessin serait lui rendre une copie degradee de ce
 *   qu'il a deja. Aucun bouton de telechargement ne doit apparaitre.
 *
 *   LE FAUX VECTORIEL EST DETECTE. Un PDF qui ne contient qu'une image collee
 *   dedans est le probleme le plus frequent des ateliers, et il est invisible :
 *   le fichier s'ouvre, il porte la bonne extension, il est inexploitable. Un
 *   outil qui le laisse passer sans rien dire est pire qu'inutile.
 *
 *   LA TAILLE REELLE EST LUE DANS LE FICHIER. C'est ce qu'un PDF sait et
 *   qu'une image ignore. Si elle est fausse, tous les millimetres le sont.
 *
 *   RIEN NE PART. pdf.js, son worker et ses polices sont servis depuis notre
 *   domaine. Le controle hors ligne le verifie pour de vrai.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { TYPES, ouvrirChromium } from './_navigateur.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '..');
const PUBLIC = path.join(RACINE, 'public');
const SORTIES = path.join(ICI, 'sorties');
const PORT = 4323;

/**
 * Fabrique un FAUX VECTORIEL : un PDF dont le contenu est une seule image.
 *
 * Ecrit a la main, sans bibliotheque, pour deux raisons. D'abord un harnais qui
 * depend d'un outil externe ne tourne pas partout. Ensuite, et c'est la vraie
 * raison, un fichier piege doit etre EXACTEMENT piege : ici on sait qu'il n'y a
 * aucun trace, parce qu'on ecrit chaque octet du flux de contenu.
 */
function fabriquerFauxVectoriel() {
  const l = 64, h = 64;
  const pixels = Buffer.alloc(l * h * 3);
  for (let i = 0; i < l * h; i++) {
    pixels[i * 3] = (i % l) * 4;
    pixels[i * 3 + 1] = 40;
    pixels[i * 3 + 2] = 200;
  }
  const image = zlib.deflateSync(pixels);
  const contenu = Buffer.from('q 288 0 0 288 0 0 cm /Im0 Do Q');

  const objets = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 288 288] '
      + '/Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>',
    { flux: contenu, dico: `<< /Length ${contenu.length} >>` },
    { flux: image, dico: `<< /Type /XObject /Subtype /Image /Width ${l} /Height ${h} `
      + `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode `
      + `/Length ${image.length} >>` },
  ];

  const morceaux = [Buffer.from('%PDF-1.4\n')];
  const positions = [];
  let position = morceaux[0].length;
  objets.forEach((o, i) => {
    const numero = i + 1;
    positions.push(position);
    const tete = typeof o === 'string'
      ? Buffer.from(`${numero} 0 obj\n${o}\nendobj\n`)
      : Buffer.from(`${numero} 0 obj\n${o.dico}\nstream\n`);
    morceaux.push(tete); position += tete.length;
    if (typeof o !== 'string') {
      morceaux.push(o.flux); position += o.flux.length;
      const pied = Buffer.from('\nendstream\nendobj\n');
      morceaux.push(pied); position += pied.length;
    }
  });
  const debutTable = position;
  let table = `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
  for (const p of positions) table += String(p).padStart(10, '0') + ' 00000 n \n';
  table += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${debutTable}\n%%EOF\n`;
  morceaux.push(Buffer.from(table));
  return Buffer.concat(morceaux);
}

const serveur = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(PUBLIC, u);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  // Le serveur du harnais interdit le cache : le controle « reseau coupe »
  // doit prouver que le CODE ne re-telecharge rien, pas que le cache du
  // navigateur a eu de la chance. C'est la difference entre ma machine, ou le
  // test passait, et celle d'Alex, ou il echouait : meme code, autre cache.
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream',
    'cache-control': 'no-store' });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => serveur.listen(PORT, r));

const VRAI = path.join(SORTIES, 'capitales_20px.pdf');
if (!fs.existsSync(VRAI)) {
  console.error('');
  console.error(`  ECHEC : ${VRAI} manque. Lancer d'abord npm run harnais:vectorisation.`);
  console.error('');
  serveur.close();
  process.exit(1);
}
const FAUX = fabriquerFauxVectoriel();

const navigateur = await ouvrirChromium();
let echecs = 0;
const messages = [];

async function deposer(page, octets, nom, type) {
  return page.evaluate(async ([b64, n, t]) => {
    const f = new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], n, { type: t });
    await globalThis.vecto.traiter(f);
    const e = globalThis.vecto.etat();
    return {
      erreur: document.getElementById('erreur').hidden ? null
        : document.getElementById('erreur').textContent,
      fiche: e.fiche,
      couleurs: e.mesures?.m2Couleurs?.couleursReelles ?? null,
      programme: Boolean(e.programme),
      telechargements: document.getElementById('telechargements').offsetParent !== null,
      ficheVisible: document.getElementById('fiche').offsetParent !== null,
      titreFiche: document.querySelector('#fiche h2')?.textContent ?? null,
      conseils: [...document.querySelectorAll('#conseils .conseil h3')].map((x) => x.textContent),
      verdict: document.getElementById('verdict').offsetParent !== null,
    };
  }, [octets.toString('base64'), nom, type]);
}

function bloc(titre, controles, detail) {
  console.log('');
  console.log('  ' + titre);
  console.log('  ' + '-'.repeat(66));
  for (const [libelle, ok] of controles) {
    console.log(`  ${ok ? 'ok   ' : 'ECHEC'} ${libelle}`);
    if (!ok) echecs++;
  }
  if (detail) for (const d of detail) console.log(`         ${d}`);
  console.log('  ' + '-'.repeat(66));
}

const page = await navigateur.newPage();
page.on('console', (m) => { if (m.type() === 'error') messages.push(m.text()); });
page.on('pageerror', (e) => messages.push('pageerror: ' + e.message));
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

// 1. UN VRAI VECTORIEL, celui que notre propre chaine produit. Le boucler sur
//    lui meme est le controle le plus honnete qui soit : si nous ne savons pas
//    relire ce que nous ecrivons, personne d'autre n'a de raison de le faire.
{
  const r = await deposer(page, fs.readFileSync(VRAI), 'vrai.pdf', 'application/pdf');
  bloc('UN PDF VECTORIEL EST AUDITE, PAS VECTORISE', [
    ['il est lu sans erreur', r.erreur === null],
    ['sa fiche apparait', r.ficheVisible === true],
    ['sa taille reelle est lue dans le fichier',
      r.fiche?.largeurMm > 100 && r.fiche?.largeurMm < 200],
    ['ses traces sont comptes', r.fiche?.traces > 0],
    ['il n\'est PAS pris pour un faux vectoriel', r.fiche?.faux_vectoriel === false],
    ['aucun bouton de telechargement n\'apparait', r.telechargements === false],
    ['aucun trace n\'a ete produit en memoire', r.programme === false],
    ['le diagnostic par technique s\'affiche quand meme', r.verdict === true],
  ], [`${r.fiche?.largeurMm} x ${r.fiche?.hauteurMm} mm, ${r.fiche?.traces} traces, `
      + `${r.fiche?.images} image(s), ${r.couleurs} couleur(s)`]);
}

// 2. LE FAUX VECTORIEL. Un PDF sans aucun trace, une image collee dedans.
{
  const r = await deposer(page, FAUX, 'faux.pdf', 'application/pdf');
  bloc('UN FAUX VECTORIEL EST NOMME POUR CE QU\'IL EST', [
    ['il est lu sans erreur', r.erreur === null],
    ['il est reconnu comme faux vectoriel', r.fiche?.faux_vectoriel === true],
    ['zero trace, au moins une image', r.fiche?.traces === 0 && r.fiche?.images >= 1],
    ['le titre ne dit PAS « deja vectoriel »',
      Boolean(r.titreFiche) && !/déjà vectoriel/.test(r.titreFiche)],
    ['un conseil le dit en clair',
      r.conseils.some((c) => /n'en est pas un/.test(c))],
    ['aucun bouton de telechargement n\'apparait', r.telechargements === false],
  ], [r.titreFiche, ...r.conseils]);
}

// 3. UN EPS EST REFUSE, ET LE MESSAGE DIT QUOI FAIRE. Un refus qui n'explique
//    pas laisse le visiteur devant un mur : ici il repart avec une action.
{
  const eps = Buffer.from('%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 10 10\nshowpage\n');
  const r = await deposer(page, eps, 'logo.eps', 'application/postscript');
  bloc('UN EPS EST REFUSE AVEC UNE SORTIE', [
    ['il est refuse', typeof r.erreur === 'string' && r.erreur.length > 0],
    ['le message nomme le format', /EPS|PostScript/i.test(r.erreur || '')],
    ['il dit quoi faire, pas seulement ce qui ne va pas',
      /PDF/i.test(r.erreur || '') && /enregistr/i.test(r.erreur || '')],
    ['rien n\'est propose au telechargement', r.telechargements === false],
  ]);
}

// 4. RIEN NE PART, ET C'EST CA QU'IL FAUT PROUVER.
//
// La premiere version de ce controle coupait le reseau avant de deposer le
// PDF, comme le fait le harnais du chemin image. Il echouait, et il avait
// tort : pdf.js pese quelques centaines de kilo-octets et n'est charge qu'au
// moment ou un PDF arrive. Couper le reseau avant, c'est empecher le
// TELECHARGEMENT d'un outil, pas prouver l'absence d'ENVOI d'un fichier.
//
// La promesse du site n'a jamais ete « ca marche sans internet ». Elle est
// « votre fichier ne part pas ». On la teste donc pour ce qu'elle est : on
// enregistre CHAQUE requete reseau pendant l'audit, et on verifie que toutes
// visent notre propre domaine, et qu'aucune ne sort en POST ou en PUT.
//
// Puis, une fois pdf.js charge, on coupe vraiment le reseau et on redepose un
// PDF : s'il s'audite encore, c'est qu'aucune etape ne passait par un serveur.
{
  const contexte = await navigateur.newContext();
  const p2 = await contexte.newPage();
  const requetes = [];
  p2.on('request', (r) => requetes.push({ url: r.url(), methode: r.method() }));
  await p2.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await p2.waitForTimeout(900);
  requetes.length = 0;

  const premier = await deposer(p2, fs.readFileSync(VRAI), 'vrai.pdf', 'application/pdf');
  const notre = `http://127.0.0.1:${PORT}/`;
  const etrangeres = requetes.filter((r) => !r.url.startsWith(notre) && !r.url.startsWith('data:')
    && !r.url.startsWith('blob:'));
  const ecritures = requetes.filter((r) => !['GET', 'HEAD'].includes(r.methode));

  await contexte.setOffline(true);
  const second = await deposer(p2, fs.readFileSync(VRAI), 'vrai2.pdf', 'application/pdf');
  await contexte.close();

  bloc('AUCUN FICHIER NE PART', [
    ['aucune requete ne sort de notre domaine', etrangeres.length === 0],
    ['aucune requete d\'ecriture, ni POST ni PUT', ecritures.length === 0],
    ['le premier audit aboutit', premier.erreur === null && premier.fiche !== null],
    ['une fois l\'outil charge, un second PDF s\'audite reseau coupe',
      second.erreur === null && second.fiche !== null && second.couleurs !== null],
  ], [`${requetes.length} requetes pendant l'audit, toutes vers notre domaine, toutes en lecture`,
      ...(etrangeres.length ? etrangeres.slice(0, 3).map((r) => `  ETRANGERE ${r.methode} ${r.url}`) : [])]);
}

await page.close();
if (messages.length) {
  console.log('');
  console.log('  Messages d\'erreur de la console :');
  for (const m of messages.slice(0, 6)) console.log('    ' + m);
  echecs += messages.length;
}
console.log('');
console.log(`  chemin vectoriel : ${echecs} echec(s).`);
console.log('');
await navigateur.close();
serveur.close();
process.exit(echecs === 0 ? 0 : 1);
