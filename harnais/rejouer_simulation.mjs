#!/usr/bin/env node
/**
 * Harnais du simulateur.
 *
 * Il ne verifie pas que le simulateur sait poser un logo. Il verifie qu'il ne
 * ment pas sur ce qu'il pose, et qu'il refuse ce qu'il ne sait pas lire.
 *
 *   ZERO N'EST PAS null. La source code la quadrichromie par 0, le site par
 *   null. Si un 0 franchit la derivation, `3 <= 0` est faux et la technique la
 *   plus permissive devient la plus fermee : un logo parfaitement marquable
 *   s'entend dire non. C'est la faute la plus couteuse de ce produit, et elle
 *   arriverait par un chemin que personne ne regarde.
 *
 *   LE PLAFOND APPARTIENT A LA POSITION. Un controle verifie que la
 *   derivation n'a PAS aplati la realite : sur le carnet, le meme identifiant
 *   S3 doit encore valoir 4 couleurs en haut et 1 en bas. Un lot ou chaque
 *   identifiant porterait un plafond unique serait un lot faux.
 *
 *   UNE TECHNIQUE ABSENTE N'EST PAS AUTORISEE. Le lot cite des noms ; s'il en
 *   cite un que la table du verdict ignore, le harnais echoue et quelqu'un
 *   tranche.
 *
 * Chaque controle qui pourrait passer au vert sur rien porte son TEMOIN.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifierLotDerive, produits, vuesDuProduit, echelleMmParPixel, poserLogo,
         plafondsDe, techniquesQuiAcceptent, restituer, luminanceRelative,
         rapportDeContraste } from '../src/simulation/simulateur.js';
import { TECHNIQUES } from '../src/verdict/techniques.js';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LOT = JSON.parse(fs.readFileSync(
  path.join(ICI, '..', 'src', 'simulation', 'lot1.json'), 'utf-8'));

const resultats = [];
const controle = (libelle, ok, detail) => resultats.push({ libelle, ok, detail });

const vueOu = (predicat) => LOT.vues.find(predicat);

// ------------------------------------------------------------------------ 1
// LE LOT DERIVE NE PORTE AUCUN ZERO.
{
  const fautes = verifierLotDerive(LOT);
  controle('le lot derive ne porte aucun plafond a 0', fautes.length === 0,
           fautes.slice(0, 3).join(' | '));
}

// ------------------------------------------------------------------------ 2
// TEMOIN DU PRECEDENT. Un controle qui passe au vert sur tout ne controle rien.
{
  const faux = { vues: [{ produit: 'x', zone: 'z',
                          techniques: [{ id: 'TD1', nom: 'Transfert numérique', couleursMax: 0 }] }] };
  const fautes = verifierLotDerive(faux);
  controle('temoin : un lot portant 0 est refuse', fautes.length === 1, fautes.join(' | '));
}

// ------------------------------------------------------------------------ 3
// L'ECHELLE SE LIT SUR LA PLUS GRANDE DIMENSION DE LA ZONE.
{
  const verticale = { largeurMm: 5, hauteurMm: 80,
                      zonePx: { x: 0, y: 0, largeur: 17, hauteur: 264 } };
  const attendu = 80 / 264;
  const lu = echelleMmParPixel(verticale);
  const parLaLargeur = 5 / 17;
  controle('l\'echelle se lit sur la plus grande dimension',
           Math.abs(lu - attendu) < 1e-9 && Math.abs(lu - parLaLargeur) > 0.005,
           `lu=${lu.toFixed(4)} grande=${attendu.toFixed(4)} petite=${parLaLargeur.toFixed(4)}`);
}

// ------------------------------------------------------------------------ 4
// LE CALCUL EST EN MILLIMETRES. Un logo carre dans une bande de 5 mm de haut
// fait 5 mm, pas 5,2 : l'arrondi du rectangle en pixels ne remonte pas dans la
// mesure.
{
  const bande = { largeurMm: 80, hauteurMm: 5,
                  zonePx: { x: 0, y: 0, largeur: 264, hauteur: 17 } };
  const pose = poserLogo({ vue: bande, logo: { largeurPx: 100, hauteurPx: 100 }, part: 1 });
  controle('un logo carre dans une bande de 5 mm mesure 5 mm',
           Math.abs(pose.largeurMm - 5) < 1e-9 && pose.borneParHauteur === true,
           `largeur=${pose.largeurMm.toFixed(3)} mm`);
}

// ------------------------------------------------------------------------ 5
// LE LOGO NE SORT JAMAIS DE LA ZONE, sur aucune vue du lot, a aucune taille.
{
  let dehors = null;
  for (const vue of LOT.vues) {
    for (const part of [0.05, 0.3, 0.7, 1, 2]) {
      for (const rapport of [[100, 100], [300, 40], [40, 300]]) {
        const p = poserLogo({ vue, logo: { largeurPx: rapport[0], hauteurPx: rapport[1] }, part });
        const z = vue.zonePx;
        const marge = 0.001;
        if (p.boite.x < z.x - marge || p.boite.y < z.y - marge
            || p.boite.x + p.boite.largeur > z.x + z.largeur + marge
            || p.boite.y + p.boite.hauteur > z.y + z.hauteur + marge
            || p.largeurMm > vue.largeurMm + 1e-9 || p.hauteurMm > vue.hauteurMm + 1e-9) {
          dehors = `${vue.produit} ${vue.zone} part=${part}`;
        }
      }
    }
  }
  controle('le marquage ne sort jamais de la zone, quelle que soit la taille',
           dehors === null, dehors);
}

// ------------------------------------------------------------------------ 6
// LE PLAFOND N'EST JAMAIS UN CHIFFRE UNIQUE dans ce qui sort du module.
{
  const vue = LOT.vues[0];
  const sortie = restituer({ vue, pose: null });
  controle('la sortie ne porte aucun plafond agrege',
           sortie.plafondUnique === null && typeof sortie.plafondFourchette === 'object'
             && Array.isArray(sortie.techniques),
           JSON.stringify(sortie.plafondFourchette));
}

// ------------------------------------------------------------------------ 7
// LA DERIVATION N'A PAS APLATI LA REALITE : le meme identifiant porte encore
// deux plafonds selon la position. Si ce controle passe au vert le jour ou il
// n'y a plus qu'un plafond par identifiant, c'est que quelqu'un a normalise.
{
  const parId = new Map();
  for (const vue of LOT.vues) {
    for (const t of vue.techniques) {
      if (!parId.has(t.id)) parId.set(t.id, new Set());
      parId.get(t.id).add(t.couleursMax);
    }
  }
  const ambigus = [...parId].filter(([, v]) => v.size > 1);
  controle('un identifiant porte encore plusieurs plafonds selon la position',
           ambigus.length > 0,
           ambigus.map(([k, v]) => `${k}=${[...v].join('/')}`).join(' ') || 'aucun, la realite a ete aplatie');
}

// ------------------------------------------------------------------------ 8
// TOUTE TECHNIQUE CITEE EST CONNUE DE LA TABLE DU VERDICT.
{
  const noms = [...new Set(LOT.vues.flatMap((v) => v.techniques.map((t) => t.nom)))];
  const inconnues = noms.filter((n) => !TECHNIQUES[n]);
  controle('toute technique du lot est classee dans la table du verdict',
           inconnues.length === 0, inconnues.join(', '));
}

// ------------------------------------------------------------------------ 9
// TEMOIN DU PRECEDENT.
{
  const inconnues = ['Sérigraphie', 'Zorglubage'].filter((n) => !TECHNIQUES[n]);
  controle('temoin : une technique inventee est bien signalee',
           inconnues.length === 1 && inconnues[0] === 'Zorglubage', inconnues.join(', '));
}

// ----------------------------------------------------------------------- 10
// LA QUADRICHROMIE ACCEPTE, LE MONOCHROME REFUSE. Les deux, pas l'un.
{
  const vue = vueOu((v) => v.techniques.some((t) => t.couleursMax === null)
                        && v.techniques.some((t) => t.couleursMax === 1));
  const ouvertes = vue ? techniquesQuiAcceptent(vue, 9).map((t) => t.id) : [];
  const quadri = vue ? vue.techniques.filter((t) => t.couleursMax === null).map((t) => t.id) : [];
  const mono = vue ? vue.techniques.filter((t) => t.couleursMax === 1).map((t) => t.id) : [];
  controle('a neuf couleurs, la quadri ouvre et le monochrome ferme',
           Boolean(vue) && quadri.every((id) => ouvertes.includes(id))
             && mono.every((id) => !ouvertes.includes(id)),
           `quadri=${quadri} mono=${mono} ouvertes=${ouvertes}`);
}

// ----------------------------------------------------------------------- 11
// L'ABSENCE DE MESURE N'AUTORISE RIEN. Sans nombre de couleurs, on n'invente
// pas un refus : on laisse ouvert, parce qu'un faux rouge coute plus cher
// qu'un faux vert sur ce produit.
{
  const vue = LOT.vues[0];
  const sansMesure = techniquesQuiAcceptent(vue, null).length;
  controle('sans nombre de couleurs mesure, aucune technique n\'est fermee',
           sansMesure === vue.techniques.length, `${sansMesure}/${vue.techniques.length}`);
}

// ----------------------------------------------------------------------- 12
// LE CONTRASTE EST UN INSTRUMENT, ET IL DOIT REPONDRE AUX DEUX EXTREMES.
{
  const noirSurBlanc = rapportDeContraste(luminanceRelative(255, 255, 255),
                                          luminanceRelative(0, 0, 0));
  const navySurNavy = rapportDeContraste(luminanceRelative(10, 45, 77),
                                         luminanceRelative(10, 45, 77));
  controle('le contraste vaut 21 au maximum et 1 quand les deux se confondent',
           Math.abs(noirSurBlanc - 21) < 0.01 && Math.abs(navySurNavy - 1) < 1e-9,
           `noir/blanc=${noirSurBlanc.toFixed(2)} navy/navy=${navySurNavy.toFixed(2)}`);
}

// ----------------------------------------------------------------------- 13
// LA ZONE TIENT DANS LA PHOTO, sur toutes les vues.
{
  const dehors = LOT.vues.filter((v) => v.zonePx.x < 0 || v.zonePx.y < 0
    || v.zonePx.x + v.zonePx.largeur > v.imagePx.largeur + 1
    || v.zonePx.y + v.zonePx.hauteur > v.imagePx.hauteur + 1);
  controle('la zone tient dans la photo sur toutes les vues', dehors.length === 0,
           dehors.map((v) => `${v.produit} ${v.zone}`).join(', '));
}

// ----------------------------------------------------------------------- 14
// LES DIMENSIONS DECLAREES ET LES COORDONNEES RESTENT COHERENTES. On mesure
// l'ecart, on ne le corrige pas : sur une bande de 5 mm portee par dix-sept
// pixels, l'arrondi du fournisseur atteint 3 % et ce n'est pas une faute.
{
  let pire = 0, ou = null;
  for (const v of LOT.vues) {
    const attendu = v.largeurMm / v.hauteurMm;
    const lu = v.zonePx.largeur / v.zonePx.hauteur;
    const ecart = Math.abs(lu - attendu) / attendu;
    if (ecart > pire) { pire = ecart; ou = `${v.produit} ${v.zone}`; }
  }
  controle('l\'ecart de rapport de forme reste sous 5 %, arrondi fournisseur compris',
           pire < 0.05, `pire ${(pire * 100).toFixed(1)} % sur ${ou}`);
}

// ----------------------------------------------------------------------- 15
// AUCUNE TRACE DE LA SOURCE COMMERCIALE dans les donnees servies.
{
  const brut = JSON.stringify(LOT.vues).toLowerCase();
  const trouves = ['midocean', 'mid ocean', 'pf concept', 'xd connects', 'http',
                   'cdn.', 'gabarit', 'printposition'].filter((m) => brut.includes(m));
  controle('aucun nom de fournisseur, aucune URL dans les donnees servies',
           trouves.length === 0, trouves.join(', '));
}

// ----------------------------------------------------------------------- 16
// LES PHOTOS CITEES EXISTENT. Un lot qui promet une image absente affiche un
// cadre vide, et un cadre vide se lit comme un produit sans marquage possible.
{
  const dossier = path.join(ICI, '..', 'public', 'simulation');
  const absentes = LOT.vues.map((v) => v.image)
    .filter((f) => !fs.existsSync(path.join(dossier, f)));
  controle('toutes les photos citees par le lot existent', absentes.length === 0,
           absentes.slice(0, 4).join(', '));
}

// ------------------------------------------------------------------------
// LE LOGO TEMOIN, 400 par 400, avec une barre de 8 pixels de haut : c'est
// elle qui donne au trait le plus fin une valeur qu'on peut predire a la main.
// Il est ecrit ici plutot que lu sur le disque pour que le harnais ne depende
// d'aucun fichier qu'un nettoyage pourrait emporter.
const LOGO_TEMOIN = [
  'iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQCAYAAACAvzbMAAADj0lEQVR42u3VQQ3AIBBFQeCIF6RgpIJqBCl44Uod9NDT',
  'Nswo2OQn+1ICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'APgmRz+wtr7NBJxozRH6RxcTASAgAAgIAAICgIAAgIAAICAACAgAAgKAgACAgAAgIAAICAACAoCAAICAACAgAAgIAAIC',
  'gIAAgIAAICAACAgAAgKAgACAgAAgIAAICAACAoCAAICAACAgAAgIAAICgIAAgIAAICAACAgAAgIAAgKAgAAgIAAICAAC',
  'AgACAoCAACAgAAgIAAICAAICgIAAICAACAgAAgIAAgKAgAAgIAAICAACAgACAoCAACAgAAgIAAICAAICgIAAICAACAgA',
  'AgIAAgKAgAAgIAAICAACAgACAoCAACAgAAgIAAgIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALHk6AfW1reZgBOtOUL/',
  '6GIiAAQEAAEBQEAAEBAAEBAABAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgXY5+4L7SNhNw5IO+Y//oYiIABAQAAQFAQAAQEAAQEAAEBAAB',
  'AUBAABAQABAQAAQEAAEBQEAAEBAAEBAABAQAAQFAQAAQEAAQEAAEBAABAUBAABAQABAQAAQEAAEBQEAAEBAAEBAABAQA',
  'AQFAQAAQEAAQEAAEBAABAUBAAEBAABAQAAQEAAEBQEAAQEAAEBAABAQAAQFAQABAQAAQEAAEBAABAUBAAEBAABAQAAQE',
  'AAEBQEAAQEAAEBAABAQAAQFAQABAQAAQEAAEBAABAUBAAEBAABAQAAQEAAEBQEAAQEAAEBAABAQAAQEAAQEAAAAAAAAA',
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4D8ekYQMTkK7ISIAAAAASUVORK5C',
  'YII=',
].join('');

// LA PAGE, DANS CHROMIUM. Les seize controles ci-dessus portent sur les
// donnees et sur le module ; ils passeraient au vert sur une page qui ne monte
// rien. Ce qui suit ouvre le HTML SERVI et regarde ce qu'un visiteur voit.
async function controlerLaPage() {
  const dossier = path.join(ICI, '..', 'public');
  const page = path.join(dossier, 'voir-mon-logo', 'index.html');
  if (!fs.existsSync(page)) {
    controle('la page /voir-mon-logo est construite', false,
             'public/voir-mon-logo/index.html absent, lancer npm run site:construire');
    return;
  }
  const { TYPES, ouvrirChromium } = await import('./_navigateur.mjs');
  const http = (await import('node:http')).default;
  const PORT = 8241;
  const serveur = await new Promise((resoudre) => {
    const s = http.createServer((requete, reponse) => {
      let chemin = decodeURIComponent(requete.url.split('?')[0]);
      if (chemin.endsWith('/')) chemin += 'index.html';
      const fichier = path.join(dossier, chemin);
      if (!fichier.startsWith(dossier) || !fs.existsSync(fichier)
          || fs.statSync(fichier).isDirectory()) {
        reponse.writeHead(404); reponse.end('non'); return;
      }
      reponse.writeHead(200, { 'Content-Type': TYPES[path.extname(fichier)]
        || 'application/octet-stream' });
      reponse.end(fs.readFileSync(fichier));
    });
    s.listen(PORT, () => resoudre(s));
  });

  const navigateur = await ouvrirChromium();
  const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 900 } });
  const onglet = await contexte.newPage();
  const erreurs = [];
  onglet.on('pageerror', (e) => erreurs.push(e.message));
  // On ecarte les echecs de CHARGEMENT DE RESSOURCE : une police absente n'est
  // pas une erreur de script, et les ressources servies sont deja controlees
  // par le harnais des pages. Melanger les deux rendrait ce controle bruyant,
  // et un controle bruyant finit par etre ignore.
  onglet.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
      erreurs.push(m.text());
    }
  });
  await onglet.goto(`http://127.0.0.1:${PORT}/voir-mon-logo/`);
  await onglet.waitForTimeout(1200);

  controle('la page se charge sans erreur de script', erreurs.length === 0,
           erreurs.slice(0, 2).join(' | '));

  const monte = await onglet.evaluate(() => ({
    canvas: Boolean(document.querySelector('.simu-scene canvas')),
    puces: document.querySelectorAll('.simu-puce').length,
    zones: document.querySelectorAll('#simulateur select option').length,
    attente: Boolean(document.querySelector('.simu-attente')),
  }));
  const panneauMonte = monte.canvas && monte.puces >= 6 && monte.zones >= 1 && !monte.attente;
  controle('le panneau est monte : une scene, des objets, des emplacements',
           panneauMonte, JSON.stringify(monte));

  // SI LE PANNEAU N'EST PAS MONTE, ON S'ARRETE ICI ET ON LE DIT. Continuer
  // ferait planter le harnais sur un element absent, et un harnais qui plante
  // cache ses autres resultats : on ne saurait plus si l'echec est le seul.
  if (!panneauMonte) {
    for (const restant of ['la distinction simulation contre validation est visible',
                           'un seul bouton orange sur la page',
                           'la reglette deplace les millimetres',
                           'le trait le plus fin est mesure dans les deux sens']) {
      controle(restant, false, 'non controle : le panneau n\'est pas monte');
    }
    await navigateur.close();
    serveur.close();
    return;
  }

  // LA MENTION EST AU DESSUS DE L'IMAGE, pas en note de bas de page. Charte
  // §11 : un ecran de simulation ne sert jamais de preuve de marquabilite, et
  // la distinction se dit avant que le visiteur ait vu son logo sur un objet.
  const mention = await onglet.evaluate(() => {
    const m = document.querySelector('.mention-simulation');
    const scene = document.querySelector('.simu-scene');
    if (!m || !scene) return null;
    return { texte: m.innerText, haut: m.getBoundingClientRect().top,
             image: scene.getBoundingClientRect().top,
             visible: m.offsetParent !== null };
  });
  controle('la distinction simulation contre validation est visible, et avant l\'image',
           Boolean(mention) && mention.visible && mention.haut < mention.image
             && /pas une validation/i.test(mention.texte),
           mention ? `haut=${Math.round(mention.haut)} image=${Math.round(mention.image)}` : 'absente');

  // UN SEUL BOUTON ORANGE PAR ECRAN, arbitrage de charte du 18/08. Les
  // commandes du simulateur sont des reglages, pas des conversions.
  const oranges = await onglet.evaluate(() => [...document.querySelectorAll('a, button')]
    .filter((n) => {
      const f = getComputedStyle(n).backgroundColor;
      return f === 'rgb(255, 106, 0)';
    }).map((n) => n.textContent.trim().slice(0, 30)));
  controle('un seul bouton orange sur la page', oranges.length === 1, oranges.join(' | '));

  // LA REGLETTE CHANGE LES MILLIMETRES. Une reglette qui bouge sans rien
  // deplacer serait exactement l'illustration decorative qu'on refuse.
  // ON DEPOSE UN LOGO. La page n'en affiche aucun par defaut, et c'est
  // voulu : rien ne s'invente avant que le visiteur ait donne quelque chose,
  // la meme regle que sur l'accueil. Un controle qui mesurerait sans deposer
  // mesurerait donc le vide.
  await onglet.setInputFiles('#fichier', {
    name: 'temoin.png', mimeType: 'image/png',
    buffer: Buffer.from(LOGO_TEMOIN, 'base64'),
  });
  await onglet.waitForTimeout(500);

  const millimetres = async () => onglet.evaluate(() => {
    const l = [...document.querySelectorAll('.simu-mesures li')]
      .find((n) => /en vrai/.test(n.textContent));
    return l ? l.querySelector('b').textContent : null;
  });
  const avant = await millimetres();
  await onglet.evaluate(() => {
    const r = document.querySelector('#simulateur input[type=range]');
    r.value = '25';
    r.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await onglet.waitForTimeout(300);
  const apres = await millimetres();
  controle('la reglette deplace les millimetres, elle n\'illustre pas',
           Boolean(avant) && Boolean(apres) && avant !== apres, `${avant} puis ${apres}`);

  // LE TRAIT LE PLUS FIN EST CELUI QU'ON A DESSINE. Le logo temoin porte une
  // barre de 8 pixels de haut sur 320 de large : elle n'est fine que dans un
  // sens, et c'est exactement le cas qu'un balayage par lignes seules ratait.
  const trait = await onglet.evaluate(() => {
    const l = [...document.querySelectorAll('.simu-mesures li')]
      .find((n) => /trait le plus fin/.test(n.textContent));
    return l ? l.querySelector('b').textContent : null;
  });
  const largeur = await millimetres();
  const attendu = largeur ? (8 / 400) * parseFloat(largeur) : null;
  const lu = trait ? parseFloat(trait.replace(',', '.')) : null;
  controle('le trait le plus fin est mesure dans les deux sens',
           lu !== null && attendu !== null && Math.abs(lu - attendu) < 0.06,
           `lu ${trait} pour ${largeur}, attendu ${attendu ? attendu.toFixed(2) : '?'} mm`);

  // LE TABLEAU DES OBJETS DIT LA MEME CHOSE QUE LE LOT.
  //
  // Il est genere depuis lot1.json, donc il ne peut pas mentir aujourd'hui.
  // Mais rien n'empeche quelqu'un de le figer dans le gabarit un jour ou la
  // construction genera, et deux verites cote a cote sur le meme ecran sont
  // pires qu'une page sans tableau. On compare les totaux.
  const tableau = await onglet.evaluate(() => {
    const t = document.querySelector('.objets-simulation');
    if (!t) return null;
    const lignes = [...t.querySelectorAll('tbody tr')];
    return {
      objets: lignes.length,
      emplacements: lignes.reduce((n, l) => n + Number(l.children[2].textContent), 0),
    };
  });
  controle('le tableau des objets compte comme le lot',
           Boolean(tableau) && tableau.objets === produits(LOT).length
             && tableau.emplacements === LOT.vues.length,
           tableau ? `${tableau.objets} objets et ${tableau.emplacements} emplacements `
             + `contre ${produits(LOT).length} et ${LOT.vues.length}` : 'tableau absent');

  // AUCUN POINT DECIMAL ANGLAIS dans ce qui s'affiche.
  const anglais = await onglet.evaluate(() =>
    [...document.querySelectorAll('.simu-mesures b')].map((n) => n.textContent)
      .filter((t) => /\d\.\d/.test(t)));
  controle('aucun point decimal anglais dans les mesures', anglais.length === 0,
           anglais.join(', '));

  await navigateur.close();
  serveur.close();
}

await controlerLaPage();

// ------------------------------------------------------------------------
console.log('');
console.log('  HARNAIS DU SIMULATEUR');
console.log('  ' + '-'.repeat(66));
let echecs = 0;
for (const r of resultats) {
  console.log(`  ${r.ok ? 'ok   ' : 'ECHEC'} ${r.libelle}`
    + (r.detail && !r.ok ? `\n          ${r.detail}` : ''));
  if (!r.ok) echecs++;
}
console.log('  ' + '-'.repeat(66));
console.log('');
console.log(`  Lot : ${produits(LOT).length} objets, ${LOT.vues.length} vues, `
  + `${LOT.vues.reduce((n, v) => n + v.techniques.length, 0)} offres position-technique.`);
const ech = LOT.vues.map(echelleMmParPixel).filter(Number.isFinite);
console.log(`  Echelle de l'apercu : de ${Math.min(...ech).toFixed(2)} a `
  + `${Math.max(...ech).toFixed(2)} mm par pixel.`);
console.log('');
console.log(`  ${resultats.length} controles, ${echecs} echec(s).`);
console.log('');
process.exit(echecs === 0 ? 0 : 1);
