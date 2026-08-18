#!/usr/bin/env node
/**
 * Harnais de bout en bout : la chaine complete, DANS un navigateur.
 *
 * Les deux autres harnais tournent dans node. Ils prouvent que les regles
 * ecrites sont celles qui s'executent, ce qui est deja beaucoup, mais ils ne
 * prouvent pas que ca marche la ou ca doit marcher : chez le visiteur, dans un
 * onglet, avec un WebAssembly charge par fetch et un canvas pour decoder
 * l'image.
 *
 * Ce harnais ouvre donc une vraie page dans un vrai Chromium, y depose un vrai
 * fichier, et verifie trois choses :
 *   la mesure faite dans le navigateur est IDENTIQUE a celle faite dans node,
 *     sinon les deux moities du produit ne disent pas la meme chose ;
 *   la vectorisation aboutit et le .eps produit dans le navigateur s'ouvre ;
 *   aucune erreur n'est apparue dans la console.
 *
 * Le premier controle est le plus important. Le decodage passe par un canvas
 * dans le navigateur et par un fichier brut dans node : c'est exactement le
 * genre d'endroit ou deux resultats divergent sans que personne ne le voie.
 */

/**
 * Ce harnais demande Node 20 ou plus, parce que Playwright le demande. Sur une
 * version anterieure il s'arretait par un plantage brut, ce qui est le pire des
 * comportements : celui qui lance le harnais ne sait pas s'il a casse quelque
 * chose ou s'il lui manque un outil, et il cesse de le lancer. Un controle
 * SAUTE doit le dire fort et ne pas se faire passer pour un echec.
 */
const versionNode = Number(process.versions.node.split('.')[0]);
if (versionNode < 20) {
  console.log('');
  console.log('  HARNAIS DE BOUT EN BOUT : SAUTE, pas reussi.');
  console.log(`  Il demande Node 20 ou plus, cette machine est en Node ${process.versions.node}.`);
  console.log('  Netlify construit en Node 22, la production n'
    + "'est donc pas concernee : c'est la verification LOCALE qui manque.");
  console.log('  Pour l\'avoir : installer Node 22, puis relancer npm ci.');
  console.log('');
  process.exit(0);
}

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { mesurer } from '../src/moteur/mesures.js';
import { entetesGlobales } from '../outils/entetes.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '..');
const PUBLIC = path.join(RACINE, 'public');
const IMAGES = path.join(ICI, 'corpus_synthetique', 'images');
const SORTIES = path.join(ICI, 'sorties', 'navigateur');
const PORT = 8231;

/** Cas retenus : un dessin a aplats, un JPEG sale, un fond transparent. */
const CAS = ['couleurs_09_plat', 'couleurs_09_jpeg', 'transparence_bord', 'capitales_20px'];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function servir() {
  return new Promise((resolve) => {
    const serveur = http.createServer((requete, reponse) => {
      const url = decodeURIComponent(requete.url.split('?')[0]);

      // Les apercus du corpus sont servis depuis LEUR SOURCE, pas depuis une
      // copie dans public/.
      //
      // Faute payee le 18/08, et c'est la plus grave du projet a ce jour. Le
      // harnais lisait /apercus/, un dossier cree a la main des mois plus tot
      // sur la machine du fil, ignore par git et regenere par rien. Il
      // n'existait donc nulle part ailleurs : chez Alex, les quatre cas
      // recevaient une page 404 a la place d'une image, et le site repondait
      // tres correctement "ce fichier ne s'ouvre pas comme une image".
      //
      // Autrement dit ce harnais n'avait jamais ete vert que sur une seule
      // machine, et son vert ne prouvait rien pour personne d'autre. Un
      // harnais qui depend d'un etat local n'est pas un harnais, c'est une
      // habitude. Il lit maintenant le dossier que le generateur ecrit, celui
      // la meme que les deux autres harnais utilisent.
      const fichier = url.startsWith('/apercus/')
        ? path.join(IMAGES, url.slice('/apercus/'.length))
        : path.join(PUBLIC, url === '/' ? 'index.html' : url);
      const autorise = fichier.startsWith(PUBLIC) || fichier.startsWith(IMAGES);
      if (!autorise || !fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) {
        // Un 404 sur une ressource du harnais est une faute du harnais, pas un
        // resultat de test. On le dit tout de suite, au lieu de laisser le site
        // rendre une erreur parfaitement correcte sur une page HTML recue a la
        // place d'une image.
        console.error(`  RESSOURCE MANQUANTE : ${url}`);
        reponse.writeHead(404); reponse.end('absent'); return;
      }
      // Les MEMES entetes qu'en production, politique de securite comprise.
      // Un site qui ne tourne que sous une politique de developpement
      // permissive n'est pas teste : la surprise arrive le jour de la mise en
      // ligne, sur le domaine public.
      reponse.writeHead(200, {
        'Content-Type': TYPES[path.extname(fichier)] || 'application/octet-stream',
        ...entetesGlobales(),
      });
      reponse.end(fs.readFileSync(fichier));
    });
    serveur.listen(PORT, () => resolve(serveur));
  });
}

/** Ne comparer que ce qui doit etre identique des deux cotes. */
function empreinte(m) {
  return {
    largeur: m.m1Dimensions.largeurPx,
    hauteur: m.m1Dimensions.hauteurPx,
    fond: m.fond.type,
    couleursReelles: m.m2Couleurs.couleursReelles,
    couleursBrutes: m.m2Couleurs.couleursBrutes,
    palette: m.m2Couleurs.palette.map((c) => c.hex),
    halo: Math.round(m.m3Halo.pourcentBoite * 100) / 100,
    trait: m.m5TraitLePlusFin.encadrementPx,
    ecart: m.m6ContreFormes.ecartMinimalPx,
    contreForme: m.m6ContreFormes.plusPetiteContreFormePx,
    capitale: m.m7HauteurDeCapitale.hauteurPx,
    aplat: m.m8PlusGrandAplat.airePx,
    salissures: m.proprete.composantesRetirees,
  };
}

const verite = JSON.parse(fs.readFileSync(path.join(IMAGES, 'verite_terrain.json'), 'utf-8'));
fs.mkdirSync(SORTIES, { recursive: true });

const serveur = await servir();
/**
 * Chromium peut venir de Playwright ou d'une installation deja presente sur la
 * machine. On essaie le chemin normal, puis on cherche : un harnais qui refuse
 * de demarrer pour une histoire de chemin d'executable ne serait pas lance, et
 * un harnais qu'on ne lance pas ne sert a rien.
 */
async function ouvrirChromium() {
  try {
    return await chromium.launch();
  } catch (premiereErreur) {
    const racines = ['/opt/pw-browsers', process.env.PLAYWRIGHT_BROWSERS_PATH].filter(Boolean);
    for (const racine of racines) {
      if (!fs.existsSync(racine)) continue;
      for (const entree of fs.readdirSync(racine)) {
        for (const suffixe of ['chrome-linux/chrome', 'chrome-linux/headless_shell']) {
          const chemin = path.join(racine, entree, suffixe);
          if (fs.existsSync(chemin)) {
            return await chromium.launch({ executablePath: chemin });
          }
        }
      }
    }
    // Playwright installe mais SANS navigateur : c'est le cas normal apres un
    // npm ci lance avec PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD, qui est justement ce
    // qu'on recommande pour ne pas telecharger des centaines de mega octets a
    // chaque construction. En local, le navigateur se pose une fois, a la main.
    if (/Executable doesn't exist|playwright install/i.test(premiereErreur.message || '')) {
      console.log('');
      console.log('  HARNAIS DE BOUT EN BOUT : SAUTE, pas reussi.');
      console.log('  Playwright est installe, mais aucun navigateur ne l\'accompagne.');
      console.log('  Pour l\'avoir, une seule fois : npx playwright install chromium');
      console.log('');
      process.exit(0);
    }
    throw premiereErreur;
  }
}

const navigateur = await ouvrirChromium();
const page = await navigateur.newPage();

const messages = [];
const bruitAttendu = /favicon/i;
page.on('console', (m) => {
  if (m.type() === 'error' && !bruitAttendu.test(m.text())) messages.push(m.text());
});
page.on('pageerror', (e) => messages.push('erreur de page : ' + e.message));

console.log('');
console.log('  HARNAIS DE BOUT EN BOUT, dans Chromium');
console.log('  ' + '-'.repeat(66));

let echecs = 0;
await page.goto(`http://127.0.0.1:${PORT}/`);

for (const nom of CAS) {
  const cas = verite.cas.find((c) => c.nom === nom);
  const problemes = [];

  // Reference : la meme image mesuree dans node, depuis les pixels bruts.
  const donnees = new Uint8ClampedArray(fs.readFileSync(path.join(IMAGES, cas.fichier)));
  const attendu = empreinte(mesurer({ largeur: cas.largeur, hauteur: cas.hauteur, donnees }));

  const resultat = await page.evaluate(async ({ apercu }) => {
    const reponse = await fetch('/apercus/' + apercu);
    const blob = await reponse.blob();
    const fichier = new File([blob], apercu, { type: blob.type });
    await globalThis.vecto.traiter(fichier);
    const etat = globalThis.vecto.etat();
    if (!etat.mesures) return { erreur: document.getElementById('erreur').textContent };
    const { versEps } = await import('/src/vectorisation/eps.js');
    const { versPdf } = await import('/src/vectorisation/pdf.js');
    const { inventaire } = await import('/src/vectorisation/programme.js');
    return {
      mesures: etat.mesures,
      inventaire: inventaire(etat.programme),
      eps: versEps(etat.programme, { titre: 'test', date: '2026-08-18T00:00:00Z' }),
      pdf: versPdf(etat.programme, { titre: 'test', date: '2026-08-18T00:00:00Z' }),
      // Le SVG livre est INSERE dans le document : s'il contient un chemin que
      // la grammaire SVG interdit, Chromium le signale dans la console, et la
      // console est relevee plus bas. C'est le seul juge qui compte : ce qui
      // fait echouer le navigateur du visiteur doit faire echouer le harnais.
      cheminsInseres: (() => {
        const conteneur = document.createElement('div');
        document.body.appendChild(conteneur);
        conteneur.innerHTML = etat.svg;
        const nombre = conteneur.querySelectorAll('path').length;
        conteneur.remove();
        return nombre;
      })(),
    };
  }, { apercu: cas.apercu });

  if (resultat.erreur) {
    problemes.push(`la page a rendu une erreur : ${resultat.erreur}`);
  } else {
    const obtenu = empreinte(resultat.mesures);
    for (const cle of Object.keys(attendu)) {
      const a = JSON.stringify(attendu[cle]);
      const b = JSON.stringify(obtenu[cle]);
      if (a !== b) problemes.push(`${cle} : node dit ${a}, le navigateur dit ${b}`);
    }

    fs.writeFileSync(path.join(SORTIES, nom + '.eps'), resultat.eps);
    fs.writeFileSync(path.join(SORTIES, nom + '.pdf'), resultat.pdf);
    for (const extension of ['.eps', '.pdf']) {
      const fichier = path.join(SORTIES, nom + extension);
      try {
        execFileSync('gs', ['-dSAFER', '-dBATCH', '-dNOPAUSE', '-dQUIET', '-sDEVICE=nullpage', fichier], { stdio: 'pipe' });
      } catch (e) {
        problemes.push(`le ${extension} produit par le navigateur ne s'ouvre pas`);
      }
    }
  }

  const marque = problemes.length ? 'ECHEC' : 'ok   ';
  console.log(`  ${marque} ${nom.padEnd(22)} ${resultat.inventaire
    ? `${resultat.inventaire.formes} formes, ${resultat.inventaire.couleurs} couleurs` : ''}`);
  for (const p of problemes) console.log(`         ${p}`);
  if (problemes.length) echecs++;
}

if (messages.length) {
  console.log('');
  console.log('  Messages d\'erreur de la console du navigateur :');
  for (const m of messages.slice(0, 10)) console.log('    ' + m);
  echecs += messages.length;
}

console.log('  ' + '-'.repeat(66));
console.log('');
console.log(`  ${CAS.length} cas, ${echecs} echec(s).`);
console.log('');

await navigateur.close();
serveur.close();
process.exit(echecs === 0 ? 0 : 1);
