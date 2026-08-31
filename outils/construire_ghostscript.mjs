#!/usr/bin/env node
/**
 * Copie l'interprete PostScript dans public/, pour l'audit des EPS.
 *
 * POURQUOI CE CHEMIN EXISTE. Le 24/08, la sonde sur vingt cinq EPS reels avait
 * conclu qu'il n'y avait pas de demi-mesure : pour savoir ce qu'un EPS dessine,
 * il faut executer du PostScript. Le 31/08, un EPS de client est arrive qui ne
 * tracait rien et collait une image, et le site lui repondait qu'il etait
 * vectoriel. La demi-mesure a ete tentee, elle disait vrai sur la nature du
 * contenu et rien sur le dessin : ni les couleurs, ni la finesse, ni de quoi
 * poser le logo sur un objet. Alex a tranche le 31/08 : on prend l'interprete.
 *
 * CE QUE CA DEBLOQUE, ET C'EST TOUT A LA FOIS. L'EPS devient un PDF, et toute
 * la chaine existe deja derriere : le lecteur PDF le rend dans un canevas, le
 * moteur mesure ces pixels, les sept feux sortent, et le simulateur a de quoi
 * poser le logo. Le diagnostic complet et le positionnement sur goodies
 * n'etaient pas deux chantiers, c'etait le meme.
 *
 * CE QUI A ETE MESURE AVANT D'ECRIRE UNE LIGNE, le 31/08 :
 *   trente trois fichiers sur trente trois convertis, de 40 a 288 ms, zero
 *     echec. Vingt sept EPS de clients reels, six EPS raster fabriques par
 *     ImageMagick, Pillow et le peripherique eps2write de Ghostscript.
 *   dans un vrai Chromium, module instancie en 570 ms, memes octets en sortie
 *     qu'en natif, au timestamp pres.
 *   15,5 Mo bruts, 11,1 en gzip, 10,5 en brotli, ce que sert Netlify.
 *
 * LA LICENCE, ET C'EST ELLE QUI A DECIDE. Ghostscript est en double licence,
 * AGPL v3 ou commerciale. Le front qui le charge devient une oeuvre combinee
 * avec lui. Le patch 0100 a donc pose l'AGPL sur le depot AVANT ce patch ci,
 * et l'offre de source dans les mentions legales. Une licence se pose avant le
 * code qui l'exige, jamais apres.
 *
 * Aucune transformation du code amont. Ce script COPIE, comme celui de pdf.js.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '..');
const PAQUET = path.join(RACINE, 'node_modules', '@okathira', 'ghostpdl-wasm');
const CIBLE = path.join(RACINE, 'public', 'gs');

function exiger(condition, message) {
  if (!condition) {
    console.error('');
    console.error('  L\'interprete PostScript a change de forme : ' + message);
    console.error('  Le script s\'arrete plutot que de livrer un lecteur incomplet.');
    console.error('');
    process.exit(1);
  }
}

// LE PAQUET ABSENT N'EST PAS UNE ANOMALIE, C'EST UN OUBLI DE npm install.
// Meme message que pour pdf.js, et pour la meme raison : le 20/08, un patch
// apportait une dependance et la construction echouait sur une trace de pile
// illisible au lieu de dire la seule chose utile.
if (!fs.existsSync(PAQUET)) {
  console.error('');
  console.error('  @okathira/ghostpdl-wasm n\'est pas installe.');
  console.error('  Lancez : npm install');
  console.error('');
  process.exit(1);
}

const version = JSON.parse(
  fs.readFileSync(path.join(PAQUET, 'package.json'), 'utf-8')).version;

fs.mkdirSync(CIBLE, { recursive: true });
let octets = 0;

// LES DEUX FICHIERS RESTENT COTE A COTE, ET CE N'EST PAS DU RANGEMENT.
// Le module Emscripten cherche gs.wasm a cote de gs.js, par import.meta.url,
// quand on ne lui donne pas de locateFile. Les separer casserait le chargement
// sans erreur lisible.
for (const nom of ['gs.js', 'gs.wasm']) {
  const source = path.join(PAQUET, 'dist', nom);
  exiger(fs.existsSync(source), `fichier attendu absent : dist/${nom}`);
  fs.copyFileSync(source, path.join(CIBLE, nom));
  octets += fs.statSync(source).size;
}

// LA LICENCE VOYAGE AVEC LE CODE. L'AGPL demande que les notices legales
// accompagnent la copie ; le fichier LICENSE du paquet part donc avec lui.
const licence = path.join(PAQUET, 'LICENSE');
if (fs.existsSync(licence)) fs.copyFileSync(licence, path.join(CIBLE, 'LICENSE'));

fs.writeFileSync(path.join(CIBLE, 'VERSION'),
  `@okathira/ghostpdl-wasm ${version}\nGhostPDL, AGPL-3.0-or-later, Artifex Software\n`);

console.log('');
console.log(`  interprete PostScript ${version} copie dans public/gs/, `
  + `${(octets / 1024 / 1024).toFixed(2)} Mo`);
console.log('  Charge uniquement quand un visiteur depose un EPS.');
console.log('');
