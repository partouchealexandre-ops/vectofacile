#!/usr/bin/env node
/**
 * Rasterise un SVG en PNG, a la taille demandee.
 *
 *   node outils/rendre_svg.mjs entree.svg sortie.png 800
 *
 * Sert a controler un dessin a l'oeil, et surtout a le repasser ensuite dans
 * diagnostiquer.mjs : c'est ainsi que le symbole du projet est verifie contre
 * son propre outil.
 */
import fs from 'node:fs'; import { chromium } from 'playwright';
const [entree, sortie, taille] = process.argv.slice(2);
const svg = fs.readFileSync(entree, 'utf-8');
let nav; try { nav = await chromium.launch(); } catch { nav = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}); }
const page = await nav.newPage({viewport:{width:+taille, height:+taille}});
await page.setContent(`<style>html,body{margin:0;background:#fff}svg{width:${taille}px;height:${taille}px;display:block}</style>${svg}`);
await page.screenshot({path: sortie});
await nav.close();
