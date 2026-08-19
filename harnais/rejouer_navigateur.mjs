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
import { TYPES, ouvrirChromium } from './_navigateur.mjs';
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


// ---------------------------------------------------------------------------
// LE CAS HORS LIGNE : la promesse du site, verifiee par la seule methode qui
// ne demande ni terminal ni confiance.
//
// On charge la page, on COUPE le reseau, puis on depose un logo. Si la mesure,
// le verdict et la vectorisation aboutissent encore, alors rien de tout cela
// ne passe par un serveur. Ce n'est plus une promesse ecrite dans une page de
// confidentialite, c'est une propriete observable.
//
// Ce controle a une deuxieme vertu : il echouera le jour ou quelqu'un ajoutera
// un appel reseau dans la chaine, meme innocent, meme une police, meme une
// mesure d'audience. C'est le genre d'ajout qui se fait sans mauvaise
// intention et qui detruit la seule chose que ce site ait a vendre.
{
  const contexte = await navigateur.newContext();
  const page = await contexte.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  // Laisser le prechargement de fond aboutir avant de couper.
  await page.waitForTimeout(1200);
  await contexte.setOffline(true);

  const cas = 'couleurs_09_plat';
  const png = fs.readFileSync(path.join(IMAGES, `${cas}.png`));
  const resultat = await page.evaluate(async (base64) => {
    const binaire = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const fichier = new File([binaire], 'hors_ligne.png', { type: 'image/png' });
    try {
      await globalThis.vecto.traiter(fichier);
      const e = globalThis.vecto.etat();
      return { ok: true, couleurs: e.mesures?.m2Couleurs?.couleursReelles ?? null,
               svg: Boolean(e.svg && e.svg.length > 100) };
    } catch (err) {
      return { ok: false, message: String(err && err.message || err) };
    }
  }, png.toString('base64'));
  await contexte.setOffline(false);
  await contexte.close();

  console.log('');
  console.log('  HORS LIGNE, reseau coupe apres chargement de la page');
  console.log('  ' + '-'.repeat(66));
  // On compare a la VERITE TERRAIN du cas, pas a un nombre recopie. Mon
  // premier ecrit attendait 10 et le harnais a sorti 9 : 10 est le nombre de
  // FORMES tracees (neuf aplats plus le fond), 9 le nombre de couleurs du
  // DESSIN. Deux grandeurs voisines, un chiffre faux, et l'echec venait de
  // l'assertion, pas du produit.
  const attendu = verite.cas.find((c) => c.nom === cas);
  const couleursAttendues = attendu?.attendus
    ?.find((a) => a.chemin === 'm2Couleurs.couleursReelles')?.valeur;
  if (couleursAttendues === undefined) {
    console.error(`  Le cas ${cas} n'a pas de verite sur les couleurs.`);
    process.exit(1);
  }
  const bon = resultat.ok && resultat.couleurs === couleursAttendues && resultat.svg;
  if (bon) {
    console.log(`  ok    mesure (${resultat.couleurs} couleurs, conforme a la verite`
      + ') et vectorisation aboutissent sans reseau');
  } else {
    console.log(`  ECHEC attendu ${couleursAttendues} couleurs, obtenu `
      + `${JSON.stringify(resultat)}`);
    echecs++;
  }
  if (erreurs.length > 0) console.log(`  ECHEC erreur de page : ${erreurs[0]}`);
  console.log('  ' + '-'.repeat(66));
  console.log('');
}


// ---------------------------------------------------------------------------
// L'AVERTISSEMENT ARRIVE AVANT L'ACTION.
//
// Cas venu du premier vrai logo passe dans la chaine, le 19/08 : une cible
// avec une ligne de texte, en 101 par 57 pixels. Le moteur avait mesure juste,
// trait a 1 pixel, l'avertissement disait vrai, et l'outil a quand meme livre
// un .eps ou le texte etait fondu en une seule tache. Personne n'a lu
// l'avertissement parce qu'il s'affichait en petit gris SOUS les boutons de
// telechargement.
//
// On verifie donc deux choses, et la seconde est la vraie : que
// l'avertissement existe, et qu'il apparaisse PLUS HAUT dans la page que le
// bouton de telechargement. Un avertissement place apres l'action n'est pas un
// avertissement.
{
  const page = await navigateur.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const petit = fs.readFileSync(path.join(IMAGES, 'capitales_20px.png'));
  const constat = await page.evaluate(async (base64) => {
    // On reduit volontairement l'image pour tomber sous le seuil de 2 pixels.
    const binaire = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const source = await createImageBitmap(new Blob([binaire], { type: 'image/png' }));
    const toile = document.createElement('canvas');
    toile.width = Math.round(source.width / 6);
    toile.height = Math.round(source.height / 6);
    toile.getContext('2d').drawImage(source, 0, 0, toile.width, toile.height);
    const blob = await new Promise((ok) => toile.toBlob(ok, 'image/png'));
    await globalThis.vecto.traiter(new File([blob], 'reduit.png', { type: 'image/png' }));
    const alerte = document.querySelector('.alerte');
    const bouton = document.getElementById('telecharger_eps');
    return {
      alerte: Boolean(alerte && alerte.offsetParent !== null),
      remede: Boolean(document.querySelector('.alerte-remede')),
      avantLeBouton: Boolean(alerte && bouton
        && alerte.getBoundingClientRect().top < bouton.getBoundingClientRect().top),
    };
  }, petit.toString('base64'));
  await page.close();

  console.log('');
  console.log('  IMAGE TROP PETITE : l\'avertissement precede l\'action');
  console.log('  ' + '-'.repeat(66));
  for (const [libelle, ok] of [
    ['un avertissement est affiche', constat.alerte],
    ['il dit quoi faire, pas seulement ce qui ne va pas', constat.remede],
    ['il apparait AVANT le bouton de telechargement', constat.avantLeBouton],
  ]) {
    console.log(`  ${ok ? 'ok   ' : 'ECHEC'} ${libelle}`);
    if (!ok) echecs++;
  }
  console.log('  ' + '-'.repeat(66));
  console.log('');
}


// ---------------------------------------------------------------------------
// UN FICHIER REFUSE NE SE TELECHARGE PAS, MEME APRES UN FICHIER REUSSI.
//
// C'est le defaut le plus grave trouve le 19/08, et il a produit un fichier
// reel entre les mains d'Alex : un .eps de 5 174 formes pour un logo a
// degrade. Le plafond de formes avait REFUSE ce fichier et l'a dit a l'ecran.
// Les boutons de telechargement, eux, sont restes visibles et fonctionnels,
// parce qu'une regle CSS ecrasait leur attribut hidden et que rien ne remettait
// l'ecran a zero entre deux fichiers.
//
// Un outil qui affiche « pas de fichier vectoriel pour celui-ci » et laisse un
// bouton « telecharger le .eps » juste en dessous ne refuse rien du tout.
//
// On enchaine donc deliberement : un fichier qui passe, puis un fichier
// refuse, et on verifie que les boutons du premier ont disparu.
{
  const page = await navigateur.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const bon = fs.readFileSync(path.join(IMAGES, 'couleurs_09_plat.png'));
  const refuse = fs.readFileSync(path.join(IMAGES, 'bruit_photographique.png'));
  const constat = await page.evaluate(async ([b1, b2]) => {
    const fichier = (b64, nom) => new File(
      [Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], nom, { type: 'image/png' });
    await globalThis.vecto.traiter(fichier(b1, 'bon.png'));
    const apres1 = document.getElementById('telechargements').offsetParent !== null;
    await globalThis.vecto.traiter(fichier(b2, 'refuse.png'));
    const apres2 = document.getElementById('telechargements').offsetParent !== null;
    return { apres1, apres2, programme: Boolean(globalThis.vecto.etat().programme) };
  }, [bon.toString('base64'), refuse.toString('base64')]);
  await page.close();

  console.log('');
  console.log('  UN FICHIER REFUSE NE SE TELECHARGE PAS');
  console.log('  ' + '-'.repeat(66));
  for (const [libelle, ok] of [
    ['les boutons apparaissent sur un fichier accepte', constat.apres1 === true],
    ['ils DISPARAISSENT sur le fichier refuse suivant', constat.apres2 === false],
    ['le trace du fichier precedent ne survit pas en memoire', constat.programme === false],
  ]) {
    console.log(`  ${ok ? 'ok   ' : 'ECHEC'} ${libelle}`);
    if (!ok) echecs++;
  }
  console.log('  ' + '-'.repeat(66));
  console.log('');
}

await navigateur.close();
serveur.close();
process.exit(echecs === 0 ? 0 : 1);
