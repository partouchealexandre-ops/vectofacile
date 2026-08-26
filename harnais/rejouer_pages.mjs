#!/usr/bin/env node
/**
 * Harnais des pages de contenu : chaque page publiee, dans un vrai Chromium.
 *
 * Pourquoi un harnais pour des pages statiques, alors que la construction les
 * ecrit elle-meme ? Parce que la construction verifie ce qu'elle ECRIT, pas ce
 * que le navigateur RECOIT. Entre les deux il y a la politique de securite du
 * site, les types MIME, le chargement de la feuille de style et des polices.
 * La premiere version du harnais de bout en bout servait deja les feuilles de
 * style en octet-stream sans que personne ne s'en apercoive : Chromium les
 * refusait en silence et les pages s'affichaient en Times New Roman.
 *
 * Ce harnais controle, pour chaque page :
 *   la page repond 200 et rend un titre de niveau 1 non vide ;
 *   la feuille de style est APPLIQUEE, verifie sur le style calcule, pas sur
 *     la presence de la balise, qui ne prouve rien ;
 *   la police Poppins est bien celle qui s'affiche, arbitrage de charte §8 ;
 *   le balisage structure est un JSON valide et porte un fil d'Ariane ;
 *   l'adresse canonique correspond a l'URL demandee ;
 *   chaque lien interne de la page repond 200 ;
 *   aucune erreur n'apparait dans la console.
 *
 * Le controle des liens est le plus rentable des sept. Une coquille dans un
 * href ne se voit jamais a la relecture et se decouvre des mois plus tard.
 */

const versionNode = Number(process.versions.node.split('.')[0]);
if (versionNode < 20) {
  console.log('');
  console.log('  HARNAIS DES PAGES : SAUTE, pas reussi.');
  console.log(`  Il demande Node 20 ou plus, cette machine est en Node ${process.versions.node}.`);
  console.log('  Netlify construit en Node 22 : c\'est la verification LOCALE qui manque.');
  console.log('');
  process.exit(0);
}

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { TYPES, ouvrirChromium } from './_navigateur.mjs';
import { entetesGlobales } from '../outils/entetes.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '..');
const PUBLIC = path.join(RACINE, 'public');
const PORT = 8232;
const BASE = `http://127.0.0.1:${PORT}`;

/**
 * La liste des pages n'est pas ecrite ici : elle est LUE dans le sitemap que
 * la construction vient de produire. Une liste tenue a la main dans un harnais
 * oublie exactement les pages qu'on vient d'ajouter, c'est-a-dire celles qui
 * ont le plus besoin d'etre verifiees.
 */
/**
 * Les pages ou une dimension en millimetres est legitime, et pourquoi.
 * La liste est volontairement minuscule : chaque ajout doit se justifier.
 */
const SANS_CONTROLE_DE_SEUIL = new Set([
  '/mentions-legales',   // adresses, capital, rien de technique
]);

const sitemap = path.join(PUBLIC, 'sitemap.xml');
if (!fs.existsSync(sitemap)) {
  console.error('  sitemap.xml absent. Lancer d\'abord : npm run site:construire');
  process.exit(1);
}
const URLS = [...fs.readFileSync(sitemap, 'utf-8').matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => new URL(m[1]).pathname);

function resoudre(url) {
  let fichier = path.join(PUBLIC, url === '/' ? 'index.html' : url);
  if (fs.existsSync(fichier) && fs.statSync(fichier).isDirectory()) {
    fichier = path.join(fichier, 'index.html');
  } else if (!fs.existsSync(fichier) && fs.existsSync(fichier + '/index.html')) {
    fichier = fichier + '/index.html';
  } else if (!fs.existsSync(fichier) && !path.extname(fichier)) {
    fichier = path.join(fichier, 'index.html');
  }
  return fichier;
}

function servir() {
  return new Promise((resolve) => {
    const serveur = http.createServer((requete, reponse) => {
      const url = decodeURIComponent(requete.url.split('?')[0]);
      const fichier = resoudre(url);
      if (!fichier.startsWith(PUBLIC) || !fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) {
        reponse.writeHead(404, { 'Content-Type': 'text/plain' });
        reponse.end('absent');
        return;
      }
      // Les MEMES entetes qu'en production, politique de securite comprise.
      reponse.writeHead(200, {
        'Content-Type': TYPES[path.extname(fichier)] || 'application/octet-stream',
        ...entetesGlobales(),
      });
      reponse.end(fs.readFileSync(fichier));
    });
    serveur.listen(PORT, () => resolve(serveur));
  });
}

const serveur = await servir();
const navigateur = await ouvrirChromium();
const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 900 } });

console.log('');
console.log('  HARNAIS DES PAGES DE CONTENU, dans Chromium');
console.log('  ' + '-'.repeat(66));

let echecs = 0;
const liensVus = new Map();
// La navigation de la premiere page lue fait reference pour toutes les
// suivantes. Peu importe laquelle est « juste » : ce qui compte est qu'elles
// soient identiques, et une divergence se voit alors immediatement.
let navAttendue = null;

for (const url of URLS) {
  const fautes = [];
  const page = await contexte.newPage();
  const erreursConsole = [];
  page.on('console', (m) => { if (m.type() === 'error') erreursConsole.push(m.text()); });
  page.on('pageerror', (e) => erreursConsole.push(String(e)));

  const reponse = await page.goto(BASE + url, { waitUntil: 'networkidle' });
  if (!reponse || reponse.status() !== 200) fautes.push(`statut ${reponse ? reponse.status() : 'sans reponse'}`);

  const constat = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const corps = document.body;
    const style = getComputedStyle(corps);
    const titreStyle = h1 ? getComputedStyle(h1) : null;
    return {
      h1: h1 ? h1.textContent.trim() : '',
      // Si la feuille n'est pas appliquee, la marge du corps vaut 8px et la
      // couleur du texte est le noir par defaut. C'est le controle qui aurait
      // attrape le octet-stream du premier jour.
      styleApplique: style.getPropertyValue('--navy') !== '' || parseFloat(style.marginTop) !== 8,
      policeTitre: titreStyle ? titreStyle.fontFamily : '',
      canonique: (document.querySelector('link[rel=canonical]') || {}).href || '',
      description: (document.querySelector('meta[name=description]') || {}).content || '',
      balises: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
      liens: [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')),
      titre: document.title,
    };
  });

  if (!constat.h1) fautes.push('pas de h1');
  if (!constat.styleApplique) fautes.push('feuille de style NON appliquee');
  if (!/Poppins/i.test(constat.policeTitre)) fautes.push(`titre en ${constat.policeTitre}`);
  if (!constat.canonique.endsWith(url)) fautes.push(`canonique ${constat.canonique}`);
  if (!constat.description) fautes.push('pas de meta description');
  if (constat.balises.length !== 1) fautes.push(`${constat.balises.length} blocs de balisage, il en faut un`);
  else {
    try {
      const donnees = JSON.parse(constat.balises[0]);
      const types = (donnees['@graph'] || []).map((n) => n['@type']);
      // Un fil d'Ariane d'un seul maillon n'a aucun sens : l'accueil porte
      // l'identite du site, les autres pages portent leur chemin.
      const attendu = url === '/' ? 'WebSite' : 'BreadcrumbList';
      if (!types.includes(attendu)) fautes.push(`balisage sans ${attendu}`);
    } catch (e) { fautes.push('balisage JSON invalide'); }
  }

  for (const lien of new Set(constat.liens)) {
    if (!liensVus.has(lien)) {
      const r = await fetch(BASE + lien, { method: 'GET' });
      liensVus.set(lien, r.status);
    }
    if (liensVus.get(lien) !== 200) fautes.push(`lien mort ${lien}`);
  }

  // AUCUN SEUIL DE MARQUAGE DANS UNE PAGE PUBLIEE.
  //
  // Les fiches techniques sont ecrites en forme honnete : elles decrivent la
  // mecanique d'un procede, jamais ce qui est marquable. Le risque n'est pas
  // theorique, il est humain : au fil des relectures, quelqu'un ajoutera « 0,3
  // mm minimum » parce que ca rend la page plus utile, et cette valeur sera
  // servie a des visiteurs alors qu'aucun arbitrage ne l'a rendue.
  //
  // On cherche donc un CHIFFRE accole a une unite de marquage dans le corps.
  // Les exceptions sont explicites et courtes : la page confidentialite parle
  // de commandes, les mentions legales d'un capital et d'un code postal.
  if (!SANS_CONTROLE_DE_SEUIL.has(url)) {
    const corps = await page.evaluate(() => {
      const c = document.querySelector('.page-contenu');
      if (!c) return '';
      // Le tableau des minimums SOURCES est la seule zone ou un millimetre a
      // le droit d'exister : chaque ligne y porte sa matiere, sa source et
      // son URL, et il est genere depuis le meme fichier que le diagnostic.
      // Tout millimetre HORS de ce tableau reste une faute : ce serait un
      // chiffre sans provenance, exactement ce que ce controle existe pour
      // interdire. On retire donc le tableau du texte examine, ainsi que le
      // paragraphe d'introduction qui annonce sa plage.
      const copie = c.cloneNode(true);
      for (const table of copie.querySelectorAll('.minimums-sources')) {
        const intro = table.previousElementSibling;
        if (intro && intro.tagName === 'P') intro.remove();
        table.remove();
      }
      return copie.innerText;
    });
    const seuils = [...corps.matchAll(/(\d+(?:[.,]\d+)?)\s?(mm|cm)\b/gi)]
      .map((m) => m[0]);
    if (seuils.length > 0) {
      fautes.push(`seuil de marquage publie : ${[...new Set(seuils)].join(', ')}`);
    }
  }

  // CHAQUE GUIDE TECHNIQUE PORTE SON TABLEAU DE MINIMUMS SOURCES : c'est la
  // these GEO du projet, la donnee citable, et une page de guide qui la perd
  // regresse vers la prose que les moteurs de reponse ignorent.
  if (/^\/guide\/[a-z-]+$/.test(url)) {
    const table = await page.evaluate(() => {
      const t = document.querySelector('.minimums-sources');
      return t ? { lignes: t.querySelectorAll('tbody tr').length,
                   liens: t.querySelectorAll('a[href^="https://"]').length } : null;
    });
    if (!table) fautes.push('le tableau des minimums sources manque');
    else if (table.lignes < 5) fautes.push(`tableau des minimums trop court : ${table.lignes} lignes`);
    else if (table.liens < 3) fautes.push(`tableau des minimums sans sources cliquables : ${table.liens} liens`);
  }

  // L'ENTETE TIENT SUR UNE LIGNE, et c'est une mesure, pas un gout.
  //
  // Trouve le 25/08 en ajoutant une quatrieme rubrique : l'entete passait de
  // 79 a 135 pixels et se cassait en deux lignes, a 1280 comme a 1440. Le
  // libelle n'y etait pour rien, meme raccourci a douze caracteres. C'est le
  // NOMBRE d'elements qui ne tient pas a cote du logotype et des deux actions.
  //
  // Une navigation qui se casse ne casse rien d'autre : aucun test ne tombe,
  // aucune erreur ne sort, et le defaut part en production sur les vingt et
  // une pages a la fois. Ce controle existe pour que la cinquieme rubrique se
  // heurte a un mur ici plutot que chez un visiteur.
  //
  // ET ON MESURE DEUX LARGEURS DEPUIS LE 25/08 AU SOIR. Ce controle ne
  // regardait que 1280. A 1024, l'entete se cassait deja en deux lignes, a
  // 135 px, depuis des jours, et le harnais etait au vert. Un controle qui ne
  // regarde qu'une largeur ne controle pas une mise en page qui depend de la
  // largeur, exactement comme une mesure de trait qui ne balaie qu'une
  // direction ne mesure pas une epaisseur.
  //
  // ET LA FAUTE DIT DE COMBIEN, pas seulement que. Le 26/08, ce controle a
  // rejete un entete vingt-deux fois en repetant « 114 px » sans dire ce qui
  // debordait. Il a fallu deviner, et j'ai devine faux une fois. Un controle
  // qui refuse sans chiffrer coute un aller-retour a chaque tentative.
  const mesurerEntete = async () => page.evaluate(() => {
    const e = document.querySelector('.entete');
    if (!e) return null;
    const l = (s) => {
      const n = document.querySelector(s);
      return n ? Math.round(n.getBoundingClientRect().width) : 0;
    };
    return {
      hauteur: Math.round(e.getBoundingClientRect().height),
      lockup: l('.lockup'), nav: l('.nav-site'), droite: l('.entete .droite'),
      cadre: Math.round(e.getBoundingClientRect().width),
    };
  });
  const juger = (m, largeur) => {
    if (!m || m.hauteur <= 100) return;
    const somme = m.lockup + m.nav + m.droite;
    fautes.push(`entete sur deux lignes a ${largeur} de large : ${m.hauteur} px. `
      + `Logotype ${m.lockup} + navigation ${m.nav} + actions ${m.droite} = ${somme} px `
      + `demandes pour ${m.cadre} px de cadre, soit ${somme - m.cadre} px de trop `
      + `avant les gouttieres.`);
  };
  juger(await mesurerEntete(), '1280');
  await page.setViewportSize({ width: 1024, height: 900 });
  juger(await mesurerEntete(), '1024');
  await page.setViewportSize({ width: 1280, height: 900 });

  // UN SEUL BOUTON ORANGE DANS L'ENTETE, arbitrage Alex du 18/08.
  //
  // La regle est ecrite dans la charte depuis une semaine et n'etait tenue par
  // rien. Elle a failli tomber le 25/08 au soir : l'entete passait a deux
  // gros boutons, et deux boutons de meme importance appellent deux fois la
  // meme couleur. Des que l'orange apparait deux fois, il ne signale plus
  // rien et la conversion perd son repere.
  //
  // Le controle compte la couleur SERVIE, calculee par le navigateur, pas la
  // classe CSS : une regle ajoutee ailleurs qui repeindrait un bouton en
  // orange serait invisible a un controle qui lirait les classes.
  //
  // Il ne peut pas passer au vert sur rien : zero orange echoue aussi.
  const orangesEntete = await page.evaluate(() => {
    const e = document.querySelector('.entete');
    if (!e) return null;
    return [...e.querySelectorAll('a, button')].filter((n) => {
      const f = getComputedStyle(n).backgroundColor;
      return f === 'rgb(255, 106, 0)';
    }).length;
  });
  if (orangesEntete !== null && orangesEntete !== 1) {
    fautes.push(`${orangesEntete} bouton(s) orange dans l'entete, il en faut exactement un`);
  }

  // ET LES DEUX ACTIONS SONT BIEN GENEREES. Les reperes existent depuis le
  // 25/08 ; un gabarit qui les garderait en laissant le bloc vide passerait
  // le garde-fou de construction, qui ne verifie que la presence des reperes.
  const actions = await page.evaluate(() =>
    [...document.querySelectorAll('.entete .droite a')].map((a) => a.getAttribute('href')));
  if (actions.length !== 2) {
    fautes.push(`${actions.length} action(s) dans l'entete, il en faut deux`);
  }

  // LA VITRINE DE L'ACCUEIL, et surtout ce qu'elle declare.
  //
  // Trois controles, et le troisieme est le seul qui compte vraiment.
  //
  // 1. Les images sont la, et chacune porte un texte de remplacement. Une
  //    image sans alt sur la page la plus vue est invisible pour qui n'y voit
  //    pas, et muette pour un moteur.
  // 2. Elles ne sont pas etirees : la largeur naturelle doit couvrir la
  //    largeur affichee, sinon on sert du flou en croyant servir une photo.
  // 3. LA LEGENDE PORTE LA DISTINCTION. Master prompt §8 : un ecran qui
  //    montre un logo sur un objet ne sert jamais de preuve de marquabilite.
  //    Cette phrase peut sauter d'une relecture sans que rien ne casse, et
  //    trois belles images sans elle disent exactement le contraire du site.
  if (url === '/') {
    const vue = await page.evaluate(() => {
      const f = document.querySelector('figure.vitrine');
      if (!f) return null;
      return {
        images: [...f.querySelectorAll('img')].map((i) => ({
          alt: i.getAttribute('alt') || '',
          naturelle: i.naturalWidth,
          affichee: Math.round(i.getBoundingClientRect().width),
        })),
        legende: (f.querySelector('figcaption')?.textContent || '').trim(),
      };
    });
    if (!vue) {
      fautes.push('la vitrine de l\'accueil a disparu');
    } else {
      if (vue.images.length !== 3) {
        fautes.push(`${vue.images.length} image(s) de vitrine, il en faut trois`);
      }
      for (const [rang, i] of vue.images.entries()) {
        if (i.alt.length < 20) {
          fautes.push(`image de vitrine ${rang + 1} sans texte de remplacement utile`);
        }
        if (i.naturelle === 0) {
          fautes.push(`image de vitrine ${rang + 1} : le fichier ne se charge pas`);
        } else if (i.affichee > 0 && i.naturelle < i.affichee) {
          fautes.push(`image de vitrine ${rang + 1} etiree : ${i.naturelle} px servis `
            + `pour ${i.affichee} px affiches`);
        }
      }
      if (!/simulation/i.test(vue.legende) || !/validation/i.test(vue.legende)) {
        fautes.push('la legende de la vitrine ne distingue plus la simulation de la validation');
      }
    }
  }

  // LA NAVIGATION EST LA MEME SUR TOUTES LES PAGES, accueil compris.
  //
  // Controle ajoute apres l'incident du 19/08 : la rubrique /guide/ manquait
  // sur l'accueil et sur l'accueil seulement, parce que sa navigation etait
  // ecrite a la main. Le defaut est passe en production, il est reste
  // invisible aux quatre autres harnais, et c'est Alex qui l'a vu en ouvrant
  // le site. Un controle de coherence entre pages l'aurait attrape avant.
  const nav = await page.evaluate(() =>
    [...document.querySelectorAll('.nav-site a')].map((a) => a.getAttribute('href')));
  if (navAttendue === null) {
    navAttendue = nav;
  } else if (nav.join('|') !== navAttendue.join('|')) {
    fautes.push(`navigation differente des autres pages : ${nav.join(', ')} `
      + `au lieu de ${navAttendue.join(', ')}`);
  }

  // L'ETAT INITIAL DE L'OUTIL. Rien qui promette un resultat avant qu'il y en
  // ait un. Trouve en production le 19/08 : les trois boutons de
  // telechargement s'affichaient sur une page fraiche, parce qu'une regle
  // « display: flex » ecrasait l'attribut hidden. Un visiteur pouvait cliquer
  // sur « Telecharger le .eps » sans avoir depose quoi que ce soit.
  if (url === '/') {
    const premature = await page.evaluate(() =>
      ['telechargements', 'mesures', 'verdict', 'resultat', 'erreur']
        .filter((id) => {
          const e = document.getElementById(id);
          return e && e.offsetParent !== null;
        }));
    if (premature.length > 0) {
      fautes.push(`visible avant tout depot de fichier : ${premature.join(', ')}`);
    }
  }

  if (erreursConsole.length > 0) fautes.push(`console : ${erreursConsole[0]}`);
  await page.close();

  if (fautes.length === 0) {
    console.log(`  ok    ${url.padEnd(50)} ${constat.liens.length} liens`);
  } else {
    echecs++;
    console.log(`  ECHEC ${url}`);
    for (const f of fautes) console.log(`          ${f}`);
  }
}

console.log('  ' + '-'.repeat(66));

// ---------------------------------------------------------------------------
// DEUX PROMESSES QUI SE SURVEILLENT ELLES MEMES.
//
// 1. L'EN-TETE NE REPETE PAS SA PROMESSE. Il portait a la fois la rubrique
//    « Votre logo reste chez vous » et un cadenas « Vos fichiers restent chez
//    vous », a dix centimetres l'un de l'autre. Repeter une promesse
//    l'affaiblit, et surtout ca occupait la place de ce que le visiteur vient
//    faire. Ce controle empechera de la remettre par reflexe.
//
// 2. LA PAGE QUI PROMET LE TEST HORS LIGNE DOIT NOMMER SON EXCEPTION.
//    Le jour ou le site a su lire les PDF, la promesse « coupez votre
//    connexion, deposez un logo » est devenue fausse pour les PDF : leur
//    lecteur se telecharge au premier depot. Une promesse qu'un visiteur peut
//    prendre en defaut en dix secondes, sur la page meme qui la porte, est
//    pire que pas de promesse. Ce controle tombera si quelqu'un raccourcit la
//    page en supprimant la nuance.
{
  const page = await navigateur.newPage();
  const fautes = [];

  // ON LIT LE FICHIER SERVI, PAS LE DOM.
  //
  // La premiere version passait par le navigateur, et son controle negatif a
  // echoue deux fois de suite : le HTML contenait bien deux promesses, et la
  // lecture par le DOM n'en rapportait qu'une. Plutot que de continuer a
  // chercher pourquoi, on lit l'artefact lui meme, celui qui part chez le
  // visiteur. C'est plus simple, c'est deterministe, et un controle qu'on ne
  // sait pas expliquer ne protege personne.
  const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf-8');
  const blocEntete = (html.match(/<header[\s\S]*?<\/header>/) || [''])[0];
  const promesses = (blocEntete.match(/restent? chez vous/gi) || []).length;
  if (promesses > 1) fautes.push(`l'en-tete repete sa promesse ${promesses} fois`);

  const vieP = fs.readFileSync(path.join(PUBLIC, 'confidentialite', 'index.html'), 'utf-8');
  if (/coupez votre connexion/i.test(vieP) && !/\bPDF\b/.test(vieP)) {
    fautes.push('la page promet le test hors ligne sans nommer l\'exception des PDF');
  }
  await page.close();

  console.log('');
  console.log('  LES PROMESSES DE L\'EN-TETE ET DE LA PAGE VIE PRIVEE');
  console.log('  ' + '-'.repeat(66));
  for (const [libelle, ok] of [
    ['l\'en-tete ne repete pas sa promesse', promesses === 1 || promesses === 0],
    ['le test hors ligne nomme l\'exception des PDF', !fautes.some((f) => /exception/.test(f))],
  ]) {
    console.log(`  ${ok ? 'ok   ' : 'ECHEC'} ${libelle}`);
    if (!ok) echecs++;
  }
  console.log('  ' + '-'.repeat(66));
}

console.log('');
console.log(`  ${URLS.length} pages, ${echecs} echec(s). ${liensVus.size} liens internes distincts controles.`);
console.log('');

await navigateur.close();
serveur.close();
process.exit(echecs === 0 ? 0 : 1);
