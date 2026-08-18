#!/usr/bin/env node
/**
 * Fabrique la version NAVIGATEUR de VTracer a partir du paquet npm officiel.
 *
 * Le probleme. @visioncortex/vtracer est publie avec une glue wasm-bindgen
 * compilee pour la cible nodejs : elle est en CommonJS et charge le .wasm par
 * require('fs'). Telle quelle, elle ne tourne pas dans un navigateur, et le
 * produit tout entier repose sur le fait que la vectorisation se passe chez le
 * visiteur, jamais sur un serveur.
 *
 * Trois voies etaient possibles :
 *   recompiler VTracer avec wasm-pack --target web, ce qui ajoute une chaine
 *     Rust complete a la construction du site ;
 *   prendre un portage tiers, ce qui ajoute un mainteneur inconnu entre nous et
 *     le code que le visiteur execute ;
 *   transformer la glue officielle, ce qui est fait ici.
 *
 * La troisieme est retenue parce qu'elle garde la version OFFICIELLE du wasm,
 * octet pour octet, et ne touche qu'a la couche de chargement, qui tient en six
 * lignes. La transformation est mecanique, versionnee, et surtout : chaque
 * motif attendu est verifie. Si le paquet amont change de forme, ce script
 * s'arrete avec un message clair au lieu de produire un fichier a moitie
 * traduit.
 *
 * Licence verifiee a la source le 17/08 : MIT OR Apache-2.0, VTracer,
 * visioncortex. Compatible avec un projet destine a devenir public.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '..');
const PAQUET = path.join(RACINE, 'node_modules', '@visioncortex', 'vtracer');
const SOURCE = path.join(PAQUET, 'pkg', 'vtracer_wasm.js');
const WASM = path.join(PAQUET, 'pkg', 'vtracer_wasm_bg.wasm');
const CIBLE = path.join(RACINE, 'src', 'vectorisation', 'vtracer_web.js');
const CIBLE_WASM = path.join(RACINE, 'public', 'vtracer_wasm_bg.wasm');

function exiger(condition, message) {
  if (!condition) {
    console.error('');
    console.error('  La glue amont a change de forme : ' + message);
    console.error('  Le script s\'arrete plutot que de produire un module a moitie traduit.');
    console.error('  Verifier la version de @visioncortex/vtracer et reprendre la transformation.');
    console.error('');
    process.exit(1);
  }
}

exiger(fs.existsSync(SOURCE), `fichier introuvable : ${SOURCE}`);
let code = fs.readFileSync(SOURCE, 'utf-8');
const version = JSON.parse(fs.readFileSync(path.join(PAQUET, 'package.json'), 'utf-8')).version;

// 1. Les exports CommonJS deviennent des exports ES.
const attendus = ['vectorize_bytes', 'vectorize_rgba'];
for (const nom of attendus) {
  const motif = `exports.${nom} = ${nom};`;
  exiger(code.includes(motif), `export CommonJS absent pour ${nom}`);
  code = code.replace(motif, `export { ${nom} };`);
}
exiger(!/\bexports\./.test(code), 'il reste des exports CommonJS non traites');

// 2. Le chargement par le systeme de fichiers devient un chargement explicite.
const chargeurNode = `const wasmPath = \`\${__dirname}/vtracer_wasm_bg.wasm\`;
const wasmBytes = require('fs').readFileSync(wasmPath);
const wasmModule = new WebAssembly.Module(wasmBytes);
let wasmInstance = new WebAssembly.Instance(wasmModule, __wbg_get_imports());
let wasm = wasmInstance.exports;
wasm.__wbindgen_start();`;
exiger(code.includes(chargeurNode), 'le chargeur wasm de la cible nodejs n\'a pas ete retrouve tel quel');

const chargeurWeb = `let wasm;

/**
 * Charge le module WebAssembly. A appeler UNE fois avant toute vectorisation.
 * @param {string|URL|ArrayBuffer|ArrayBufferView} source
 */
export async function initialiser(source = new URL('/vtracer_wasm_bg.wasm', import.meta.url)) {
  if (wasm) return;
  let octets;
  if (source instanceof ArrayBuffer || ArrayBuffer.isView(source)) {
    octets = source;
  } else {
    const reponse = await fetch(source);
    if (!reponse.ok) throw new Error('chargement du moteur de vectorisation impossible : ' + reponse.status);
    octets = await reponse.arrayBuffer();
  }
  const module = await WebAssembly.compile(octets);
  const instance = await WebAssembly.instantiate(module, __wbg_get_imports());
  wasm = instance.exports;
  wasm.__wbindgen_start();
}

/** Le module est il pret. */
export function estPret() { return Boolean(wasm); }`;

code = code.replace(chargeurNode, chargeurWeb);
exiger(!/require\(/.test(code), 'il reste un appel a require dans le module produit');
exiger(!/__dirname/.test(code), 'il reste une reference a __dirname dans le module produit');

const entete = `/* MODULE GENERE, NE PAS MODIFIER A LA MAIN.
 *
 * Produit par outils/construire_vtracer_web.mjs a partir de
 * @visioncortex/vtracer ${version}, licence MIT OR Apache-2.0.
 * Le WebAssembly est celui du paquet officiel, inchange. Seule la couche de
 * chargement a ete traduite de CommonJS et systeme de fichiers vers ES et
 * fetch, pour que la vectorisation tourne dans le navigateur du visiteur.
 *
 * Pour regenerer : npm run vtracer:web
 */

`;

fs.mkdirSync(path.dirname(CIBLE), { recursive: true });
fs.writeFileSync(CIBLE, entete + code);
fs.mkdirSync(path.dirname(CIBLE_WASM), { recursive: true });
fs.copyFileSync(WASM, CIBLE_WASM);

const tailleWasm = fs.statSync(CIBLE_WASM).size;
console.log('');
console.log(`  vtracer_web.js ecrit depuis @visioncortex/vtracer ${version}`);
console.log(`  vtracer_wasm_bg.wasm copie dans public/, ${(tailleWasm / 1024).toFixed(0)} ko`);
console.log('');
