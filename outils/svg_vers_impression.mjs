#!/usr/bin/env node
/**
 * Convertit un SVG en EPS et en PDF par la chaine du projet.
 *
 *   node outils/svg_vers_impression.mjs entree.svg base_sortie [largeur_mm]
 *
 * Les deux fichiers sortent du meme programme de trace, donc ils ne peuvent
 * pas diverger. Si une largeur en millimetres est donnee, ils sont emis a cette
 * taille physique exacte, ce qu'un marqueur peut verifier a la regle.
 */
import fs from 'node:fs';
import { construireProgramme, inventaire } from '../src/vectorisation/programme.js';
import { versEps } from '../src/vectorisation/eps.js';
import { versPdf } from '../src/vectorisation/pdf.js';
const [entree, base, mmStr] = process.argv.slice(2);
const svg = fs.readFileSync(entree, 'utf-8');
const programme = construireProgramme(svg);
const mm = Number(mmStr) || null;
const options = { titre: 'Vecto Facile symbole', date: '2026-08-18T00:00:00Z', largeurMm: mm };
fs.writeFileSync(base + '.eps', versEps(programme, options));
fs.writeFileSync(base + '.pdf', versPdf(programme, options));
console.log(JSON.stringify(inventaire(programme)), mm ? `livre a ${mm} mm de large` : '');
