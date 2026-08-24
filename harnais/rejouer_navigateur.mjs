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
      // Une URL de dossier sert son index.html, comme le ferait l'hebergeur.
      // Necessaire depuis que /vectoriser/ existe a cote de /.
      let chemin = url === '/' ? 'index.html' : url;
      if (chemin.endsWith('/')) chemin += 'index.html';
      const fichier = url.startsWith('/apercus/')
        ? path.join(IMAGES, url.slice('/apercus/'.length))
        : path.join(PUBLIC, chemin);
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
    // DEPUIS LE 24/08/2026 les boutons de telechargement sont caches tant que
    // personne ne les demande : l'action que l'avertissement doit preceder
    // n'est plus le bouton, c'est l'APPEL qui y mene. On verifie les deux, dans
    // l'ordre reel du parcours : l'alerte au dessus de l'appel, puis, une fois
    // l'appel clique, l'alerte toujours au dessus des boutons.
    const appel = document.querySelector('a[href="#telechargements"]');
    const avantL_appel = Boolean(alerte && appel
      && alerte.getBoundingClientRect().top < appel.getBoundingClientRect().top);
    appel?.click();
    const bouton = document.getElementById('telecharger_eps');
    return {
      alerte: Boolean(alerte && alerte.offsetParent !== null),
      remede: Boolean(document.querySelector('.alerte-remede')),
      appelPresent: Boolean(appel),
      avantL_appel,
      avantLeBouton: Boolean(alerte && bouton && bouton.offsetParent !== null
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
    ['un appel au fichier existe bien : le controle a quelque chose a mesurer',
      constat.appelPresent],
    ['l\'avertissement apparait AVANT l\'appel au fichier', constat.avantL_appel],
    ['et toujours avant les boutons, une fois l\'appel clique', constat.avantLeBouton],
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
    const visible = () => document.getElementById('telechargements').offsetParent !== null;
    await globalThis.vecto.traiter(fichier(b1, 'bon.png'));
    // ARBITRAGE ALEX DU 24/08/2026 : le fichier est PRET, il n'est pas MONTRE.
    // La personne est venue savoir si son logo etait bon a marquer, pas
    // repartir avec un .eps qu'elle n'a pas reclame.
    const avantDemande = visible();
    const pret = Boolean(globalThis.vecto.etat().programme);
    document.querySelector('a[href="#telechargements"]')?.click();
    const apresDemande = visible();
    await globalThis.vecto.traiter(fichier(b2, 'refuse.png'));
    const apres2 = visible();
    return { avantDemande, pret, apresDemande, apres2,
             programme: Boolean(globalThis.vecto.etat().programme) };
  }, [bon.toString('base64'), refuse.toString('base64')]);
  await page.close();

  console.log('');
  console.log('  LE FICHIER SE DEMANDE, ET NE SURVIT PAS AU FICHIER SUIVANT');
  console.log('  ' + '-'.repeat(66));
  for (const [libelle, ok] of [
    ['rien ne se telecharge tant que personne ne l\'a demande',
      constat.avantDemande === false],
    ['mais le fichier est deja fabrique : le clic ne fait pas attendre',
      constat.pret === true],
    ['un clic sur l\'appel a l\'action fait apparaitre les boutons',
      constat.apresDemande === true],
    ['ils DISPARAISSENT sur le fichier refuse suivant', constat.apres2 === false],
    ['le trace du fichier precedent ne survit pas en memoire', constat.programme === false],
  ]) {
    console.log(`  ${ok ? 'ok   ' : 'ECHEC'} ${libelle}`);
    if (!ok) echecs++;
  }
  console.log('  ' + '-'.repeat(66));
  console.log('');
}

// ---------------------------------------------------------------------------
// LA PALETTE SE LIT ET SE COPIE, ET ELLE N'INVENTE PAS DE PANTONE.
//
// Une pastille de couleur avec une infobulle ne se lit pas au doigt et ne se
// colle pas dans un mail. Les codes doivent donc etre du TEXTE dans la page.
//
// Le deuxieme controle est une assertion de propriete, pas de contenu : on ne
// peut pas verifier la formulation exacte d'une phrase, mais on peut verifier
// qu'un numero Pantone n'apparait JAMAIS. La correspondance RVB vers Pantone
// depend de l'encre, du support et de l'eclairage : ce serait une valeur
// inferee servie comme un fait, et la doctrine l'interdit. Citer le mot pour
// dire qu'on ne le traduit pas est permis, publier « Pantone 186 C » ne l'est
// pas. Ce controle echouera le jour ou quelqu'un ajoutera une table de
// correspondance en croyant bien faire.
{
  const page = await navigateur.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const octets = fs.readFileSync(path.join(IMAGES, 'couleurs_09_plat.png'));
  const constat = await page.evaluate(async (b64) => {
    const fichier = new File(
      [Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], 'plat.png', { type: 'image/png' });
    await globalThis.vecto.traiter(fichier);
    const hex = [...document.querySelectorAll('.teinte .hex')].map((e) => e.textContent.trim());
    const rvb = [...document.querySelectorAll('.teinte .rvb')].map((e) => e.textContent.trim());
    const reelles = globalThis.vecto.etat().mesures.m2Couleurs.couleursReelles;
    return {
      nombre: hex.length,
      reelles,
      tousValides: hex.length > 0 && hex.every((h) => /^#[0-9A-F]{6}$/.test(h)),
      rvbLisible: rvb.length === hex.length && rvb.every((t) => /^R \d+ V \d+ B \d+$/.test(t)),
      pantone: /PANTONE\s*\d|PMS\s*\d/i.test(document.body.innerText),
    };
  }, octets.toString('base64'));
  await page.close();

  console.log('');
  console.log('  LA PALETTE SE LIT, SE COPIE, ET N\'INVENTE PAS DE PANTONE');
  console.log('  ' + '-'.repeat(66));
  for (const [libelle, ok] of [
    ['un code par couleur reelle mesuree', constat.nombre === constat.reelles],
    ['les codes sont du texte hexadecimal valide', constat.tousValides === true],
    ['le RVB est ecrit en clair a cote', constat.rvbLisible === true],
    ['aucun numero Pantone n\'est publie', constat.pantone === false],
  ]) {
    console.log(`  ${ok ? 'ok   ' : 'ECHEC'} ${libelle}`);
    if (!ok) echecs++;
  }
  console.log('  ' + '-'.repeat(66));
  console.log('');
}

// ---------------------------------------------------------------------------
// LES MILLIMETRES ARRIVENT PAR LE VISITEUR, ET LE CALCUL EST JUSTE.
//
// Defaut trouve le 19/08, et il valait plus cher que tous les autres : le
// moteur savait convertir en millimetres depuis le debut, mais RIEN ne lui
// donnait jamais la largeur de marquage. Toutes les mesures en mm valaient
// donc null en production, et le verdict repondait « nous ne savons pas
// encore » sur chaque critere, y compris ceux qui auraient eu un seuil.
//
// Le harnais du verdict etait vert pendant ce temps, parce qu'il fabrique ses
// propres objets de mesures avec des millimetres dedans. Il testait la regle,
// pas le chemin. Meme famille de faute que la police livree avec son garde-fou.
//
// Ce controle passe par le VRAI chemin : on depose un fichier, on tape une
// largeur dans le champ, et on verifie que le millimetre obtenu est celui de
// la regle de trois. Aucun seuil de marquage n'intervient ici.
{
  const page = await navigateur.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const octets = fs.readFileSync(path.join(IMAGES, 'trait_09px.png'));
  const constat = await page.evaluate(async (b64) => {
    const fichier = new File(
      [Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], 'trait.png', { type: 'image/png' });
    await globalThis.vecto.traiter(fichier);
    const avant = globalThis.vecto.etat().mesures;
    // Depuis la structure C du 21/08, le champ vit dans le volet des mesures,
    // replie par defaut : on l'ouvre comme le ferait un visiteur, sinon on
    // remplit un champ que personne ne voit et le controle ne prouve rien.
    for (const v of document.querySelectorAll('details.volet')) v.open = true;
    const champ = document.getElementById('largeur_mm');
    const visible = document.getElementById('largeur').offsetParent !== null;
    champ.value = '40';
    champ.dispatchEvent(new Event('input', { bubbles: true }));
    const apres = globalThis.vecto.etat().mesures;
    // Le tableau des mesures vit derriere un repli depuis le 20/08. On
    // l'ouvre comme le ferait un visiteur : innerText d'un details ferme est
    // vide, et un controle qui lit du texte invisible ne controle rien.
    for (const d of document.querySelectorAll('#mesures details')) d.open = true;
    return {
      visible,
      mmAvant: avant.m5TraitLePlusFin.encadrementMm,
      mmApres: apres.m5TraitLePlusFin.encadrementMm,
      pxApres: apres.m5TraitLePlusFin.encadrementPx,
      largeurPx: apres.m1Dimensions.largeurPx,
      texteAffiche: document.getElementById('mesures').innerText,
    };
  }, octets.toString('base64'));
  await page.close();

  const attendu = constat.pxApres && constat.largeurPx
    ? (constat.pxApres.basse * 40) / constat.largeurPx : null;
  const obtenu = constat.mmApres ? constat.mmApres.basse : null;
  const justeAuMillieme = attendu !== null && obtenu !== null
    && Math.abs(attendu - obtenu) < 1e-9;

  console.log('');
  console.log('  LES MILLIMETRES ARRIVENT PAR LE VISITEUR');
  console.log('  ' + '-'.repeat(66));
  for (const [libelle, ok] of [
    ['le champ de largeur apparait des qu\'un fichier est mesure', constat.visible === true],
    ['sans largeur donnee, les millimetres valent null', constat.mmAvant === null],
    ['une largeur saisie produit des millimetres', obtenu !== null],
    ['et le calcul est exactement la regle de trois', justeAuMillieme],
    ['la page affiche bien des mm apres saisie', /\bmm\b/.test(constat.texteAffiche)],
    // Assertion de propriete sur le FORMAT. Le 19/08 la meme page ecrivait
    // « 0.34 mm » dans les mesures et « 1,18 % » dans les conseils. On ne peut
    // pas assertionner qu'un texte est bien redige, on peut assertionner qu'il
    // ne contient jamais de point decimal anglais.
    ['aucun point decimal anglais dans les mesures',
      !/\d[.]\d/.test(constat.texteAffiche)],
  ]) {
    console.log(`  ${ok ? 'ok   ' : 'ECHEC'} ${libelle}`);
    if (!ok) echecs++;
  }
  if (obtenu !== null) {
    console.log(`         trait ${constat.pxApres.basse} px sur ${constat.largeurPx} px de large,`
      + ` marque sur 40 mm : ${obtenu.toFixed(3)} mm`);
  }
  console.log('  ' + '-'.repeat(66));
  console.log('');
}


// ---------------------------------------------------------------------------
// LES CONSEILS N'ONT BESOIN D'AUCUN SEUIL, ET N'EN CONTIENNENT AUCUN.
//
// Les conseils croisent un fait mesure avec une mecanique de procede. Ni l'un
// ni l'autre ne demande d'arbitrage, c'est pourquoi ils s'affichent alors que
// le verdict attend encore P0.7.
//
// Le deuxieme controle est l'assertion de propriete qui garde le module
// honnete : un conseil ne doit JAMAIS porter une valeur de marquage en
// millimetres. Le jour ou quelqu'un ecrit « il faut au moins 0,3 mm » dans
// conseils.js, il a fabrique un seuil sans arbitrage, et ce controle tombe.
{
  const page = await navigateur.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const octets = fs.readFileSync(path.join(IMAGES, 'couleurs_09_jpeg.jpg'));
  const constat = await page.evaluate(async (b64) => {
    const fichier = new File(
      [Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], 'jpeg.jpg', { type: 'image/jpeg' });
    await globalThis.vecto.traiter(fichier);
    const bloc = document.getElementById('conseils');
    return {
      visible: bloc.offsetParent !== null,
      nombre: bloc.querySelectorAll('.conseil').length,
      // Le titre d'un conseil est un <b> depuis le 24/08 : un conseil tient sur
      // une ligne, il n'a plus de bloc a lui, donc plus de <h3>.
      titres: [...bloc.querySelectorAll('.conseil b')].map((e) => e.textContent.trim()),
      // On assertionne sur les CONSEILS eux memes, pas sur le chapeau. Le
      // chapeau contient la phrase « nous ne vous disons pas encore si votre
      // logo passe », et il doit la contenir : c'est la mise en garde. La
      // premiere version de ce controle lisait tout le bloc et tombait sur
      // cette phrase la, ce qui aurait pousse a supprimer un avertissement
      // utile pour faire plaisir a un test.
      texte: [...bloc.querySelectorAll('.conseil')].map((e) => e.innerText).join('\n'),
    };
  }, octets.toString('base64'));
  await page.close();

  const porteUnSeuil = /\d+([.,]\d+)?\s?(mm|cm|pt)\b/.test(constat.texte);
  // Bornes de mot obligatoires : sans elles, « passages a caler » declenchait
  // le controle sur le mot « passe ». Une premiere version de ce harnais est
  // tombee sur son propre faux positif, ce qui est la bonne facon de decouvrir
  // qu'une regex trop large ne prouve rien.
  const porteUnVerdict = /\b(passe|passera|impossible|infaisable|refus\w*|interdit\w*)\b/i
    .test(constat.texte);

  console.log('');
  console.log('  LES CONSEILS S\'AFFICHENT, ET NE PORTENT AUCUN SEUIL');
  console.log('  ' + '-'.repeat(66));
  for (const [libelle, ok] of [
    ['des conseils sont affiches sur un fichier reel', constat.visible === true],
    ['chacun croise un fait et une mecanique', constat.nombre >= 2],
    ['aucune valeur de marquage en mm, cm ou pt', porteUnSeuil === false],
    ['aucun verdict deguise en conseil', porteUnVerdict === false],
  ]) {
    console.log(`  ${ok ? 'ok   ' : 'ECHEC'} ${libelle}`);
    if (!ok) echecs++;
  }
  for (const t of constat.titres) console.log(`         ${t}`);
  console.log('  ' + '-'.repeat(66));
  console.log('');
}

// ---------------------------------------------------------------------------
// L'ECRAN DE RESULTAT EST LA GRILLE DES SEPT FEUX.
//
// LOT 1 du 21/08, et c'est un renversement. La grille de PRODUITS a ete
// retiree de l'ecran principal apres un test rate en conditions reelles : sur
// le logo d'une chaine de creches, elle a propose un powerbank et un stylo en
// aluminium, sans un seul textile. Elle ne savait pas a qui elle parlait, et
// elle ne pouvait pas le savoir en montrant un echantillon de matieres.
//
// Sept techniques, c'est tout le metier. Ce bloc verifie ce que la page MONTRE,
// par le vrai chemin du visiteur ; la semantique des feux, elle, est jugee cas
// par cas dans le harnais du verdict.
{
  const page = await navigateur.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const octets = fs.readFileSync(path.join(IMAGES, 'monochrome_fusion.png'));
  const constat = await page.evaluate(async (b64) => {
    const fichier = new File(
      [Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], 'logo.png', { type: 'image/png' });
    await globalThis.vecto.traiter(fichier);
    const bloc = document.getElementById('verdict');
    const lignes = [...bloc.querySelectorAll('.feu')];
    return {
      texte: bloc.innerText,
      lignes: lignes.length,
      feux: lignes.map((l) => (l.className.match(/feu-(vert|orange|rouge)/) ?? [])[1]),
      // Chaque ligne DOIT porter sa traduction en produits : c'est elle qui
      // rend la technique comprehensible a qui n'est pas du metier.
      produits: lignes.filter((l) => l.querySelector('.feu-produits')?.textContent.trim()).length,
      definitions: lignes.filter((l) => l.querySelector('.feu-definition')?.textContent.trim()).length,
      // Une raison n'apparait QUE si le feu n'est pas vert.
      vertsAvecRaison: lignes.filter((l) => l.classList.contains('feu-vert')
        && l.querySelector('.feu-raison')).length,
      // Sous un rouge, le brief du graphiste et son bouton de copie.
      briefs: bloc.querySelectorAll('.feu-brief').length,
      copiables: bloc.querySelectorAll('.feu-copier[data-copier]').length,
      rouges: lignes.filter((l) => l.classList.contains('feu-rouge')).length,
      // L'action du format ne se propose QUE sur un orange de format.
      actionsFormat: bloc.querySelectorAll('.feu-orange .feu-action').length,
      // LA REPONSE a quitte #verdict le 24/08 : elle ouvre la page, au dessus
      // du volet des couleurs, qui est au dessus de la grille.
      tete: document.getElementById('fait_principal')?.innerText ?? '',
      teteClasse: document.querySelector('#fait_principal .verdict-tete')?.className ?? '',
      points: bloc.querySelectorAll('.points-attention li').length,
      // Ce qui ne doit PLUS exister sur cet ecran.
      cartesProduits: bloc.querySelectorAll('.produit').length,
      ordre: [...document.querySelectorAll(
        '#fait_principal, #volet_couleurs, #verdict, #volet_mesures')].map((e) => e.id),
    };
  }, octets.toString('base64'));
  await page.close();

  const JARGON = /tient les minimums publiés|tient sur une partie des matières|donnez une largeur/i;

  console.log('');
  console.log('  L\'ECRAN DE RESULTAT EST LA GRILLE DES SEPT FEUX');
  console.log('  ' + '-'.repeat(66));
  for (const [libelle, ok] of [
    ['les sept techniques du metier sont affichees', constat.lignes === 7],
    ['chacune porte un feu, vert, orange ou rouge',
      constat.feux.filter(Boolean).length === 7],
    ['chacune porte sa definition en une ligne', constat.definitions === 7],
    ['chacune traduit la technique en produits reconnaissables', constat.produits === 7],
    ['un vert ne porte aucune raison : il n\'y a rien a lire',
      constat.vertsAvecRaison === 0],
    // Le cas de corpus est un logo qui se referme en monochrome : la gravure et
    // le marquage a chaud doivent virer au rouge, et eux seuls.
    ['le logo qui se referme en monochrome produit des rouges',
      constat.rouges >= 1, `${constat.rouges} rouge(s)`],
    ['chaque rouge ecrit le brief du graphiste',
      constat.briefs === constat.rouges && constat.briefs > 0],
    ['et chaque brief se copie en un clic', constat.copiables === constat.briefs],
    ['le bouton de vectorisation ne s\'affiche que sur un orange de format',
      constat.actionsFormat >= 1],
    // LA PREMIERE LIGNE REPOND A LA QUESTION POSEE, elle ne mesure pas. Le
    // visiteur a lu « Votre logo est-il bon a marquer ? » avant de deposer.
    ['la premiere ligne repond a la question, elle ne mesure pas',
      /technique|retouche|définie|format/i.test(constat.tete), constat.tete.slice(0, 70)],
    ['et elle porte l\'etat qu\'elle annonce, pas une couleur au hasard',
      /reponse-(oui|format|definition|retouche)/.test(constat.teteClasse),
      constat.teteClasse],
    // « Bonne nouvelle » ne s'ecrit QUE s'il existe au moins un vert. Le cas de
    // corpus n'en a aucun : la phrase ne doit pas apparaitre.
    ['« bonne nouvelle » ne s\'ecrit pas quand aucune technique ne passe',
      constat.feux.includes('vert') || !/bonne nouvelle/i.test(constat.tete)],
    ['le compte de couleurs reste, en second', /couleurs? réelles?/.test(constat.tete)],
    ['les points d\'attention suivent la grille, et restent courts',
      constat.points >= 1 && constat.points <= 5, `${constat.points} points`],
    ['la grille de produits a quitte l\'ecran principal', constat.cartesProduits === 0],
    ['la reponse ouvre la page, les codes couleur suivent, puis la grille',
      constat.ordre.join(' ') === 'fait_principal volet_couleurs verdict volet_mesures',
      constat.ordre.join(' ')],
    ['aucune etiquette jargon du 19/08', !JARGON.test(constat.texte)],
    ['(temoin) le detecteur de jargon detecte bien',
      JARGON.test(`${constat.texte} tient les minimums publiés`)],
    ['une image nette ne se voit refuser nulle part',
      !/refusée en l'état/i.test(constat.texte)],
    ['la vignette du logo remplace la zone de depot',
      constat.texte !== null],
  ]) {
    console.log(`  ${ok ? 'ok   ' : 'ECHEC'} ${libelle}`);
    if (!ok) echecs++;
  }
  console.log(`         feux rendus : ${constat.feux.join(' ')}`);
  console.log('  ' + '-'.repeat(66));
  console.log('');
}

// L'ACCUEIL N'ANNONCE PLUS AUCUN VERDICT AVANT MESURE.
//
// L'exemple a ete retire le 24/08/2026, arbitrage Alex : la zone de depot dit
// deja ce qu'il y a a faire, et le visiteur comprend en deposant son logo, pas
// en regardant celui d'un autre.
//
// Ce qui part avec lui : sept pastilles ecrites en dur et le controle qui
// verifiait qu'elles ne mentaient pas. Ce controle la reste, retourne : la page
// d'accueil ne doit plus porter UN SEUL verdict recopie a la main. Une couleur
// de feu ecrite en dur dans une page ne se corrige pas toute seule, et c'est
// exactement la faute que l'ancien harnais surveillait.
{
  const page = await navigateur.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const petit = fs.readFileSync(path.join(IMAGES, 'couleurs_09_plat.png'));
  const constat = await page.evaluate(async (b64) => {
    const avant = {
      pastilles: document.querySelectorAll('.pastilles, [data-exemple]').length,
      boutonExemple: document.getElementById('voir_exemple') !== null,
      imageExemple: document.querySelectorAll('img[src*="logo-exemple"]').length,
      depot: document.getElementById('depot') !== null,
      verdictVide: (document.getElementById('verdict')?.innerHTML ?? '').trim() === '',
      // La presentation repond a qui HESITE a deposer : elle doit etre la.
      presentation: document.getElementById('presentation')?.offsetParent !== null,
    };
    const f = new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))],
      'logo.png', { type: 'image/png' });
    await globalThis.vecto.traiter(f);
    return { ...avant,
      // Une fois le fichier depose, elle se lit comme du remplissage derriere
      // un verdict : elle sort de l'ecran, sans quitter le HTML servi.
      presentationApres: document.getElementById('presentation')?.offsetParent !== null,
      motsServis: (document.getElementById('presentation')?.innerText ?? '').length };
  }, petit.toString('base64'));
  await page.close();

  console.log('');
  console.log('  L\'ACCUEIL N\'ANNONCE AUCUN VERDICT AVANT MESURE');
  console.log('  ' + '-'.repeat(66));
  for (const [libelle, ok] of [
    ['aucune pastille de verdict ecrite en dur', constat.pastilles === 0],
    ['le bouton d\'exemple a disparu', constat.boutonExemple === false],
    ['le logo de demonstration n\'est plus servi', constat.imageExemple === 0],
    ['la zone de depot, elle, est bien la : c\'est elle qui explique', constat.depot === true],
    ['le bloc de verdict arrive vide', constat.verdictVide === true],
    ['la presentation est la pour qui hesite a deposer', constat.presentation === true],
    ['elle sort de l\'ecran une fois le logo analyse', constat.presentationApres === false],
    ['mais elle reste dans le document, mot pour mot', constat.motsServis > 200,
      `${constat.motsServis} caracteres`],
  ]) {
    console.log(`  ${ok ? 'ok   ' : 'ECHEC'} ${libelle}`);
    if (!ok) echecs++;
  }
  console.log('  ' + '-'.repeat(66));
  console.log('');
}

// LA PAGE /VECTORISER NE FAIT QU'UNE CHOSE, ET ELLE LA FAIT.
//
// Arbitrage Alex du 20/08 : « la page vectoriser mon logo doit être épurée et
// délivrer juste son but ». On depose une image sur /vectoriser : les
// telechargements apparaissent, et RIEN du diagnostic n'existe dans la page,
// ni fiche, ni couleurs, ni verdict, ni mesures. Pas seulement caches :
// absents du document.
{
  const page = await navigateur.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/vectoriser/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const octets = fs.readFileSync(path.join(IMAGES, 'trait_09px.png'));
  const constat = await page.evaluate(async (b64) => {
    const fichier = new File(
      [Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], 'trait.png', { type: 'image/png' });
    await globalThis.vecto.traiter(fichier);
    return {
      mode: document.body.dataset.mode,
      telechargements: document.getElementById('telechargements').hidden === false,
      apercu: document.getElementById('apercu').querySelector('svg') !== null,
      blocsDiagnostic: ['fiche', 'couleurs', 'verdict', 'conseils', 'mesures', 'largeur']
        .filter((id) => document.getElementById(id) !== null),
      programme: globalThis.vecto.etat().programme !== null,
      // PARTIE D du brief du 21/08 : la decouverte, APRES la remise du
      // fichier. Deux cartes, pas huit : c'est une porte vers le diagnostic,
      // pas le diagnostic.
      decouverte: document.getElementById('decouverte')?.hidden === false,
      cartesDecouverte: document.querySelectorAll('#decouverte .produit').length,
      lienEvaluation: document.querySelectorAll('#decouverte a[href="/"]').length,
      texteDecouverte: document.getElementById('decouverte')?.innerText ?? '',
    };
  }, octets.toString('base64'));
  await page.close();

  console.log('');
  console.log('  LA PAGE /VECTORISER NE FAIT QU\'UNE CHOSE');
  console.log('  ' + '-'.repeat(66));
  for (const [libelle, ok] of [
    ['la page porte son mode vectoriser', constat.mode === 'vectoriser'],
    ['une image deposee est vectorisee et les telechargements apparaissent',
      constat.telechargements === true && constat.programme === true],
    ['l\'apercu du trace est affiche', constat.apercu === true],
    ['aucun bloc de diagnostic n\'existe dans le document',
      constat.blocsDiagnostic.length === 0],
    // La decouverte n'est pas un diagnostic : elle arrive APRES la remise du
    // fichier, elle tient en deux cartes, et elle mene a l'evaluation.
    ['la decouverte apparait une fois le fichier remis', constat.decouverte === true],
    ['elle tient en deux cartes, pas en huit', constat.cartesDecouverte === 2],
    ['elle mene a l\'evaluation complete', constat.lienEvaluation >= 1],
    ['et elle dit ce que le fichier vient d\'ouvrir',
      /passe aussi sur/i.test(constat.texteDecouverte)],
  ]) {
    console.log(`  ${ok ? 'ok   ' : 'ECHEC'} ${libelle}`);
    if (!ok) echecs++;
  }
  if (constat.blocsDiagnostic.length) {
    console.log(`         blocs trouves : ${constat.blocsDiagnostic.join(', ')}`);
  }
  console.log('  ' + '-'.repeat(66));
  console.log('');
}

await navigateur.close();
serveur.close();
process.exit(echecs === 0 ? 0 : 1);
