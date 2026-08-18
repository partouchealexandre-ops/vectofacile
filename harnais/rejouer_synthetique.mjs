#!/usr/bin/env node
/**
 * Harnais du moteur de mesure : rejoue le corpus synthetique et compare la
 * sortie a la verite terrain.
 *
 * Ce que ce harnais garantit : que M1 a M10 rendent, sur des images dont la
 * reponse est connue par construction, exactement la reponse connue.
 *
 * Ce qu'il ne garantit PAS, et c'est important de l'ecrire ici plutot que de le
 * laisser croire :
 *   il ne dit rien de la justesse d'un SEUIL de marquage, qui vient du
 *   referentiel et de l'arbitrage d'Alex, pas du code ;
 *   il ne dit rien du comportement sur un vrai logo client, qui est de la
 *   recette et attend le corpus reel ;
 *   il ne dit rien de la plausibilite d'un verdict, qui n'existe pas encore.
 * Un harnais vert n'est pas un produit juste. Il dit seulement que la regle
 * qu'on a ecrite est bien celle qui s'execute.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mesurer } from '../src/moteur/mesures.js';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const IMAGES = path.join(ICI, 'corpus_synthetique', 'images');
const FICHIER_VERITE = path.join(IMAGES, 'verite_terrain.json');

if (!fs.existsSync(FICHIER_VERITE)) {
  console.error("Corpus absent. Lancer d'abord : npm run corpus:generer");
  process.exit(2);
}

const verite = JSON.parse(fs.readFileSync(FICHIER_VERITE, 'utf-8'));

function lireChemin(objet, chemin) {
  let courant = objet;
  for (const cle of chemin.split('.')) {
    if (courant === null || courant === undefined) return undefined;
    courant = courant[cle];
  }
  return courant;
}

function formater(valeur) {
  if (valeur === null) return 'null';
  if (valeur === undefined) return 'ABSENT';
  if (typeof valeur === 'number') return Number.isInteger(valeur) ? String(valeur) : valeur.toFixed(4);
  return JSON.stringify(valeur);
}

function evaluer(attendu, obtenu) {
  switch (attendu.operateur) {
    case 'egal':
      return { ok: obtenu === attendu.valeur, attendu: `= ${formater(attendu.valeur)}` };
    case 'proche':
      return {
        ok: typeof obtenu === 'number' && Math.abs(obtenu - attendu.valeur) <= attendu.tolerance,
        attendu: `= ${attendu.valeur} a ${attendu.tolerance} pres`,
      };
    case 'entre':
      return {
        ok: typeof obtenu === 'number' && obtenu >= attendu.min && obtenu <= attendu.max,
        attendu: `entre ${attendu.min} et ${attendu.max}`,
      };
    case 'au_moins':
      return { ok: typeof obtenu === 'number' && obtenu >= attendu.valeur, attendu: `>= ${attendu.valeur}` };
    case 'au_plus':
      return { ok: typeof obtenu === 'number' && obtenu <= attendu.valeur, attendu: `<= ${attendu.valeur}` };
    case 'est_nul':
      return { ok: obtenu === null, attendu: 'null' };
    case 'non_nul':
      return { ok: obtenu !== null && obtenu !== undefined, attendu: 'non null' };
    default:
      return { ok: false, attendu: `operateur inconnu : ${attendu.operateur}` };
  }
}

let totalAttendus = 0;
let totalEchecs = 0;
const echecs = [];
const chrono = [];

console.log('');
console.log('  HARNAIS DU MOTEUR DE MESURE, corpus synthetique');
console.log('  ' + '-'.repeat(60));

for (const cas of verite.cas) {
  const donnees = new Uint8ClampedArray(fs.readFileSync(path.join(IMAGES, cas.fichier)));
  const attendu = cas.largeur * cas.hauteur * 4;
  if (donnees.length !== attendu) {
    console.error(`  ${cas.nom} : taille de fichier incoherente, ${donnees.length} octets pour ${attendu} attendus`);
    totalEchecs++;
    continue;
  }

  const depart = process.hrtime.bigint();
  const resultat = mesurer({ largeur: cas.largeur, hauteur: cas.hauteur, donnees });
  const duree = Number(process.hrtime.bigint() - depart) / 1e6;
  chrono.push({ nom: cas.nom, pixels: cas.largeur * cas.hauteur, ms: duree });

  let echecsCas = 0;
  for (const a of cas.attendus) {
    totalAttendus++;
    const obtenu = lireChemin(resultat, a.chemin);
    const verdict = evaluer(a, obtenu);
    if (!verdict.ok) {
      echecsCas++;
      totalEchecs++;
      echecs.push({ cas: cas.nom, chemin: a.chemin, attendu: verdict.attendu, obtenu: formater(obtenu), commentaire: cas.commentaire });
    }
  }

  const marque = echecsCas === 0 ? 'ok  ' : 'ECHEC';
  console.log(`  ${marque}  ${cas.nom.padEnd(22)} ${cas.attendus.length} controles  ${duree.toFixed(0)} ms`);

  if (process.env.VERBEUX) {
    console.log('        ' + JSON.stringify({
      couleurs: `${resultat.m2Couleurs.couleursReelles} reelles / ${resultat.m2Couleurs.couleursBrutes} brutes`,
      trait: resultat.m5TraitLePlusFin.encadrementPx,
      ecart: resultat.m6ContreFormes.ecartMinimalPx,
      contreForme: resultat.m6ContreFormes.plusPetiteContreFormePx,
      halo: resultat.m3Halo.pourcentBoite.toFixed(3) + ' %',
      capitale: resultat.m7HauteurDeCapitale.hauteurPx,
      aplat: resultat.m8PlusGrandAplat.airePx,
      variation: resultat.m10IndicesExport.partInterieurVariable?.toFixed(3) ?? 'non mesure',
      salissures: resultat.proprete.composantesRetirees,
      trous: resultat.proprete.trousBouches,
    }));
  }
}

console.log('  ' + '-'.repeat(60));

if (echecs.length) {
  console.log('');
  console.log('  DETAIL DES ECHECS');
  for (const e of echecs) {
    console.log('');
    console.log(`  ${e.cas}  ->  ${e.chemin}`);
    console.log(`    attendu : ${e.attendu}`);
    console.log(`    obtenu  : ${e.obtenu}`);
    console.log(`    le cas  : ${e.commentaire.replace(/\s+/g, ' ').slice(0, 200)}`);
  }
}

const plusLent = chrono.slice().sort((a, b) => b.ms / b.pixels - a.ms / a.pixels)[0];
console.log('');
console.log(`  ${verite.cas.length} cas, ${totalAttendus} controles, ${totalEchecs} echec(s).`);
if (plusLent) {
  const parMegapixel = (plusLent.ms / plusLent.pixels) * 1e6;
  console.log(`  Cas le plus lent au pixel : ${plusLent.nom}, ${parMegapixel.toFixed(0)} ms par megapixel.`);
}
console.log('');

process.exit(totalEchecs === 0 ? 0 : 1);
