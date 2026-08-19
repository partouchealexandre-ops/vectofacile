#!/usr/bin/env node
/**
 * Copie la version NAVIGATEUR de pdf.js dans public/, pour l'audit des
 * fichiers deja vectoriels.
 *
 * POURQUOI CE CHEMIN EXISTE. Le 19/08, Alex a pose le doigt sur un defaut de
 * conception : « votre logo est-il bon a marquer » et « vectoriser mon logo »
 * etaient la meme page, donc quelqu'un qui arrive avec un .ai propre, fourni
 * par son graphiste, recevait un message rouge. Or c'est exactement la personne
 * a qui le diagnostic sert le plus : elle n'a rien a vectoriser, elle veut
 * savoir si son logo passe.
 *
 * POURQUOI PDF.JS ET PAS AUTRE CHOSE. Un .ai enregistre avec l'option « Creer
 * un fichier compatible PDF », qui est le reglage par defaut d'Illustrator, EST
 * un PDF : ses premiers octets sont %PDF. Un seul lecteur couvre donc les deux
 * formats. pdf.js tourne entierement dans le navigateur, ce qui est la
 * condition non negociable du projet : le fichier du visiteur ne part pas.
 *
 * CE QU'ON COPIE, ET CE QU'ON NE COPIE PAS.
 *   pdf.min.mjs et pdf.worker.min.mjs : indispensables.
 *   standard_fonts : un PDF peut appeler une police standard sans l'embarquer.
 *     Sans ces fichiers, le texte disparait du rendu et la mesure serait fausse
 *     SANS ERREUR VISIBLE, ce qui est le pire cas possible pour un outil de
 *     diagnostic.
 *   wasm : decodeurs JPEG 2000 et JBIG2. Rarement utiles sur un logo, mais un
 *     PDF qui en contient echouerait sinon avec un message incomprehensible.
 *   cmaps : polices asiatiques. NON copiees. Un PDF chinois ou japonais sans
 *     police embarquee sera refuse avec un message qui le dit.
 *
 * Licence verifiee a la source le 19/08 : Apache-2.0, Mozilla Foundation.
 * Compatible avec un projet destine a devenir public.
 *
 * Aucune transformation du code amont : pdf.js publie deja des modules ES.
 * Ce script COPIE, il ne traduit pas, et c'est pour cela qu'il ne verifie que
 * la presence des fichiers et leur version.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '..');
const PAQUET = path.join(RACINE, 'node_modules', 'pdfjs-dist');
const CIBLE = path.join(RACINE, 'public', 'pdfjs');

function exiger(condition, message) {
  if (!condition) {
    console.error('');
    console.error('  pdf.js a change de forme : ' + message);
    console.error('  Le script s\'arrete plutot que de livrer un lecteur incomplet.');
    console.error('');
    process.exit(1);
  }
}

exiger(fs.existsSync(PAQUET), `paquet introuvable : ${PAQUET}`);
const version = JSON.parse(fs.readFileSync(path.join(PAQUET, 'package.json'), 'utf-8')).version;

fs.rmSync(CIBLE, { recursive: true, force: true });
fs.mkdirSync(CIBLE, { recursive: true });

let octets = 0;
/**
 * LES DEUX MODULES SONT COPIES EN .js, PAS EN .mjs, ET C'EST DELIBERE.
 *
 * Le contenu ne change pas d'un octet, seul le nom change. Raison : un module
 * ES servi avec un type MIME que le navigateur ne reconnait pas est REFUSE,
 * avec le message « Strict MIME type checking is enforced for module scripts ».
 * Le harnais l'a produit des le premier essai, parce que son serveur ne
 * connaissait pas .mjs. Un serveur de production peut avoir le meme trou, et on
 * ne le decouvrirait que chez un visiteur.
 *
 * L'extension .js est comprise partout, sans exception. On ne parie pas la
 * lecture des fichiers des visiteurs sur une table MIME.
 */
function copier(relatif, sousDossier = '', nomCible = null) {
  const source = path.join(PAQUET, relatif);
  exiger(fs.existsSync(source), `fichier attendu absent : ${relatif}`);
  const destination = path.join(CIBLE, sousDossier, nomCible || path.basename(relatif));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  octets += fs.statSync(destination).size;
}

/**
 * LA CONSTRUCTION « LEGACY », ET C'EST UN CHOIX, PAS UN REPLI.
 *
 * La construction moderne de pdf.js 6 utilise des methodes de tres recente
 * date, comme Map.prototype.getOrInsertComputed. Sur un Chromium d'il y a
 * quelques versions, elle tombe avec « getOrInsertComputed is not a function »,
 * ce que le harnais a produit des le premier essai reel.
 *
 * Un outil public destine a des visiteurs qu'on ne choisit pas ne peut pas
 * exiger le navigateur du mois. La construction legacy est transpilee et
 * couvre largement plus de monde, pour quelques centaines de kilo-octets de
 * plus, telecharges uniquement par ceux qui deposent un PDF.
 */
copier('legacy/build/pdf.min.mjs', '', 'pdf.min.js');
copier('legacy/build/pdf.worker.min.mjs', '', 'pdf.worker.min.js');
copier('LICENSE');

for (const dossier of ['standard_fonts', 'wasm']) {
  const source = path.join(PAQUET, dossier);
  exiger(fs.existsSync(source), `dossier attendu absent : ${dossier}`);
  for (const nom of fs.readdirSync(source)) {
    if (fs.statSync(path.join(source, nom)).isDirectory()) continue;
    // quickjs-eval sert au JavaScript embarque dans les formulaires PDF.
    // Un logo n'en a pas, et on ne veut pas d'un moteur JS de plus.
    if (nom.startsWith('quickjs')) continue;
    copier(path.join(dossier, nom), dossier);
  }
}

fs.writeFileSync(path.join(CIBLE, 'VERSION'), `pdfjs-dist ${version}\n`);

console.log('');
console.log(`  pdf.js ${version} copie dans public/pdfjs/, ${(octets / 1024 / 1024).toFixed(2)} Mo`);
console.log('  Charge uniquement quand un visiteur depose un PDF ou un AI.');
console.log('');
