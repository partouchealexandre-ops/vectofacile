#!/usr/bin/env node
/**
 * Construction du site : copie des modules dans le dossier publie.
 *
 * Pas de bundler, et c'est un choix. Le site est fait de modules ES que le
 * navigateur charge directement ; le seul travail de construction est de mettre
 * dans public/ ce qui doit y etre. Moins il y a de machinerie entre le code
 * ecrit et le code execute, moins il y a d'endroits ou une difference peut se
 * cacher entre ce que le harnais teste et ce que le visiteur recoit.
 *
 * Le jour ou la taille ou le nombre de requetes deviennent un probleme, un
 * bundler s'ajoutera ici, et le harnais devra alors tester le paquet produit,
 * pas la source.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fichierHeaders, fichierRedirections, fichierRobots, INDEXABLE } from './entetes.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(RACINE, 'src');
const CIBLE = path.join(RACINE, 'public', 'src');

fs.rmSync(CIBLE, { recursive: true, force: true });
fs.cpSync(SOURCE, CIBLE, { recursive: true });

let fichiers = 0;
const compter = (dossier) => {
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (entree.isDirectory()) compter(path.join(dossier, entree.name));
    else fichiers++;
  }
};
compter(CIBLE);

// Entetes et robots : generes, jamais ecrits a la main, pour qu'ils ne
// puissent pas diverger de ce que le harnais teste.
fs.writeFileSync(path.join(RACINE, 'public', '_headers'), fichierHeaders());
fs.writeFileSync(path.join(RACINE, 'public', 'robots.txt'), fichierRobots());
fs.writeFileSync(path.join(RACINE, 'public', '_redirects'), fichierRedirections());

if (!fs.existsSync(path.join(RACINE, 'public', 'vtracer_wasm_bg.wasm'))) {
  console.error('  Le WebAssembly manque dans public/. Lancer : npm run vtracer:web');
  process.exit(1);
}

for (const attendu of ['polices/poppins-400.woff2', 'polices/poppins-700.woff2']) {
  if (!fs.existsSync(path.join(RACINE, 'public', attendu))) {
    console.error(`  Police manquante dans public/ : ${attendu}`);
    console.error('  Le logotype tomberait sur une police de substitution, ce qui');
    console.error('  contredirait l\'arbitrage de charte du master prompt §8.');
    process.exit(1);
  }
}

console.log(`  ${fichiers} modules copies dans public/src/`);
console.log(`  _headers, robots.txt et _redirects generes, indexation ${INDEXABLE ? 'OUVERTE' : 'FERMEE'}`);
