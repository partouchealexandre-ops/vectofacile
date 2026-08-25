/**
 * LE PANNEAU DU SIMULATEUR : l'organe, monte dans une page.
 *
 * Il assemble le module de mesure et le module de dessin. Il ne contient
 * AUCUNE liste de produits, de zones ou de techniques : tout vient du lot.
 *
 * POSTURE, validee le 25/08/2026 : figee en position, reglable en taille.
 * La position est imposee par le fabricant, ce n'est pas une liberte a
 * offrir. La taille est la seule variable qui deplace le diagnostic, donc la
 * reglette n'est pas un jouet, c'est ce qui relie l'apercu aux millimetres.
 *
 * `surChangement` recoit la donnee de sortie a chaque mouvement. C'est par la
 * que la taille choisie voyage : sans elle, la seule decision du visiteur se
 * perdrait entre l'ecran et la demande de devis.
 */
import { produits, vuesDuProduit, restituer, plafondsDe } from './simulateur.js';
import { dessiner, mesurerTraitPx, luminanceDeLEncre } from './rendu_simulation.js';
import { auditerBlanc, retirerBlanc } from './detourage.js';

/**
 * PART PAR DEFAUT, ARBITREE le 25/08/2026 faute de preference exprimee.
 *
 * 70 % de la largeur de zone donne 210 mm sur un tote bag et 196 mm sur un
 * devant de t-shirt : ce sont des marquages courants, pas des exagerations.
 * Une largeur fixe plus petite produirait un logo perdu au milieu d'une zone
 * de 30 cm, et surtout des traits plus fins, donc des refus la ou le marquage
 * passe. Sur ce produit, un faux rouge coute plus cher qu'un faux vert.
 *
 * Ce n'est PAS un seuil de marquage. C'est un reglage d'interface, et il se
 * change ici, a un seul endroit.
 */
export const PART_PAR_DEFAUT = 0.70;

/**
 * DECLENCHEMENT DE L'ALERTE DE CONTRASTE, PARAMETRE DE MAQUETTE.
 *
 * Il n'est source de rien et il est affiche comme tel. Mesures du lot : tote
 * bag ecru 6,3 pour 1, planche a decouper 6,0, serviette marine 1,1. Aucune
 * valeur entre 2 et 5 ne changerait le verdict sur ces trois produits ; le
 * jour ou un produit tombe dans la zone grise, il faudra une vraie source.
 */
export const CONTRASTE_ALERTE = 1.6;

/** L'echelle au dela de laquelle l'apercu ment par defaut, en mm par pixel. */
export const APERCU_GROSSIER = 1.0;

const el = (balise, classe, texte) => {
  const n = document.createElement(balise);
  if (classe) n.className = classe;
  if (texte !== undefined) n.textContent = texte;
  return n;
};

export function monterPanneau({ hote, lot, cheminImages = '/simulation/',
                                surChangement = null }) {
  const objets = produits(lot);
  if (!objets.length) throw new Error('lot de simulation vide');

  const etat = { produit: objets[0].id, vue: 0, part: PART_PAR_DEFAUT,
                 logo: null, logoOrigine: null, traitPx: null, photo: null,
                 detourage: 'aucun', blanc: null };

  hote.innerHTML = '';
  const scene = el('div', 'simu-scene');
  const toile = el('canvas');
  toile.id = 'simu-toile';
  scene.append(toile);

  const panneau = el('div', 'simu-panneau');

  // LE BLOC DU FOND BLANC. Il n'existe a l'ecran QUE si le logo depose porte
  // du blanc qui touche le bord : proposer de retirer un fond qui n'existe pas
  // ferait douter le visiteur de ce qu'il voit.
  const blocBlanc = el('div', 'simu-bloc');
  blocBlanc.hidden = true;
  blocBlanc.append(el('h2', null, 'Le fond blanc de votre logo'));
  const choixBlanc = el('div', 'simu-puces');
  blocBlanc.append(choixBlanc, el('p', 'simu-note',
    'Sur un objet écru ou foncé, un fond blanc se voit. « Autour du dessin » '
    + 'ne retire que le blanc qui touche le bord ; « partout » retire aussi '
    + 'celui qui est enfermé dans le dessin, et troue les contre-formes. '
    + 'Votre fichier n’est pas modifié : cela ne change que cet aperçu.'));

  const blocObjet = el('div', 'simu-bloc');
  blocObjet.append(el('h2', null, 'Objet'));
  const puces = el('div', 'simu-puces');
  blocObjet.append(puces);

  const blocZone = el('div', 'simu-bloc');
  blocZone.append(el('h2', null, 'Emplacement'));
  const choixZone = el('select');
  const etiquette = el('label', null, 'Largeur du marquage');
  const reglette = el('input');
  reglette.type = 'range';
  reglette.min = '10';
  reglette.max = '100';
  reglette.value = String(Math.round(PART_PAR_DEFAUT * 100));
  const bornes = el('div', 'simu-bornes');
  const borneBasse = el('span');
  const borneHaute = el('span');
  bornes.append(borneBasse, borneHaute);
  blocZone.append(choixZone, etiquette, reglette, bornes);

  const blocMesures = el('div', 'simu-bloc');
  blocMesures.append(el('h2', null, 'Ce que ça donne, en vrai'));
  const mesures = el('ul', 'simu-mesures');
  const avertContraste = el('div');
  const avertApercu = el('div');
  const mention = el('p', 'simu-note', 'Simulation. Le placement et les dimensions '
    + 'sont ceux déclarés par le fabricant ; le rendu ne suit pas les plis du tissu. '
    + 'À confirmer auprès de votre fabricant avant production.');
  blocMesures.append(mesures, avertContraste, avertApercu, mention);

  const blocTechniques = el('div', 'simu-bloc');
  blocTechniques.append(el('h2', null, 'Techniques possibles ici'));
  const listeTechniques = el('ul', 'simu-mesures');
  blocTechniques.append(listeTechniques, el('p', 'simu-note',
    'Le plafond de couleurs appartient à cet emplacement, pas au nom de la '
    + 'technique : le même mot peut plafonner à quatre couleurs ici et à une '
    + 'seule ailleurs sur le même objet.'));

  panneau.append(blocBlanc, blocObjet, blocZone, blocMesures, blocTechniques);
  hote.append(scene, panneau);

  const MODES = [
    ['aucun', 'Le garder'],
    ['contour', 'Retirer autour du dessin'],
    ['complet', 'Retirer partout'],
  ];

  function majBlanc() {
    blocBlanc.hidden = !(etat.blanc && etat.blanc.toucheLeBord);
    choixBlanc.innerHTML = '';
    for (const [mode, libelle] of MODES) {
      const b = el('button', 'simu-puce', libelle);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(mode === etat.detourage));
      b.onclick = () => { etat.detourage = mode; appliquerDetourage(); };
      choixBlanc.append(b);
    }
  }

  /**
   * REMESURER APRES DETOURAGE, et pas seulement redessiner.
   *
   * Retirer un fond blanc change le trait le plus fin : ce qui n'etait qu'une
   * frontiere entre deux aplats devient un bord de dessin. Garder l'ancienne
   * mesure afficherait un millimetre qui ne correspond plus a l'image posee.
   */
  function appliquerDetourage() {
    if (!etat.logoOrigine) return;
    etat.logo = etat.detourage === 'aucun'
      ? etat.logoOrigine
      : retirerBlanc(etat.logoOrigine, etat.detourage);
    etat.traitPx = mesurerTrait(etat.logo);
    majBlanc();
    rendre();
  }

  /** Le trait le plus fin, mesure sur une reduction pour rester rapide. */
  function mesurerTrait(source) {
    const t = document.createElement('canvas');
    t.width = Math.min(source.width, 400);
    t.height = Math.max(1, Math.round(t.width * source.height / source.width));
    const c = t.getContext('2d', { willReadFrequently: true });
    c.drawImage(source, 0, 0, t.width, t.height);
    try {
      const brut = mesurerTraitPx(c.getImageData(0, 0, t.width, t.height));
      return brut === null ? null : brut * (source.width / t.width);
    } catch (e) { return null; }
  }

  function vueCourante() {
    return vuesDuProduit(lot, etat.produit)[etat.vue] ?? null;
  }

  function majPuces() {
    puces.innerHTML = '';
    for (const o of objets) {
      const b = el('button', 'simu-puce', o.objet);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(o.id === etat.produit));
      b.onclick = () => {
        etat.produit = o.id;
        etat.vue = 0;
        majPuces();
        majZones();
        chargerPhoto();
      };
      puces.append(b);
    }
  }

  function majZones() {
    const vues = vuesDuProduit(lot, etat.produit);
    choixZone.innerHTML = '';
    vues.forEach((v, i) => {
      const o = el('option', null,
        `${v.zone}  (${Math.round(v.largeurMm)} × ${Math.round(v.hauteurMm)} mm)`);
      o.value = String(i);
      choixZone.append(o);
    });
    choixZone.value = String(etat.vue);
  }

  function ligne(a, b) {
    const li = el('li');
    li.append(el('span', null, a), el('b', null, b));
    return li;
  }

  const nombre = (n, d) => n.toFixed(d).replace('.', ',');

  function rendre() {
    const vue = vueCourante();
    if (!vue) return;
    const r = dessiner({ toile, vue, photo: etat.photo, logo: etat.logo,
                         part: etat.part, traitPx: etat.traitPx });
    const sortie = restituer({ vue, pose: r.pose, contraste: r.contraste });

    mesures.innerHTML = '';
    mesures.append(ligne('Zone autorisée',
      `${Math.round(vue.largeurMm)} × ${Math.round(vue.hauteurMm)} mm`));
    if (sortie.marquageMm) {
      mesures.append(ligne('Votre logo, en vrai',
        `${Math.round(sortie.marquageMm.largeur)} mm de large`));
    }
    if (sortie.traitLePlusFinMm) {
      mesures.append(ligne('Son trait le plus fin', nombre(sortie.traitLePlusFinMm, 2) + ' mm'));
    }
    mesures.append(ligne('Échelle de l’aperçu',
      nombre(sortie.mmParPixelApercu, 2) + ' mm par pixel'));
    if (sortie.contrasteSurSupport) {
      mesures.append(ligne('Contraste sur le support',
        nombre(sortie.contrasteSurSupport, 1) + ' pour 1'));
    }

    // LE CONTRASTE SE DIT AVANT L'ECHELLE : un logo invisible sur son support
    // appelle une decision, l'apercu grossier n'appelle qu'une precaution.
    avertContraste.innerHTML = '';
    if (sortie.contrasteSurSupport && sortie.contrasteSurSupport < CONTRASTE_ALERTE) {
      const d = el('div', 'simu-avert');
      d.append(el('b', null, 'Sur ce support, votre logo disparaît.'));
      d.append(document.createTextNode(' Le rapport de contraste est de '
        + nombre(sortie.contrasteSurSupport, 1) + ' pour 1. Ce n’est pas un défaut '
        + 'de l’aperçu : ce sera pareil sur l’objet. La version claire du même '
        + 'produit réglerait le problème.'));
      avertContraste.append(d);
    }

    avertApercu.innerHTML = '';
    if (sortie.mmParPixelApercu > APERCU_GROSSIER) {
      const d = el('div', 'simu-avert');
      d.append(document.createTextNode('Sur cette photo, un pixel vaut '
        + nombre(sortie.mmParPixelApercu, 2) + ' mm. Un trait fin mais parfaitement '
        + 'imprimable peut être invisible ici. '));
      d.append(el('b', null, 'L’aperçu est plus grossier que le marquage : '
        + 'ne concluez rien de son flou.'));
      avertApercu.append(d);
    }

    listeTechniques.innerHTML = '';
    for (const t of plafondsDe(vue).parTechnique) {
      listeTechniques.append(ligne(t.nom, t.couleursMax === null ? 'toutes vos couleurs'
        : t.couleursMax === 1 ? 'une seule couleur' : `${t.couleursMax} couleurs`));
    }

    borneBasse.textContent = Math.round(vue.largeurMm * 0.10) + ' mm';
    borneHaute.textContent = Math.round(vue.largeurMm) + ' mm';

    if (surChangement) surChangement(sortie, r.toile);
  }

  function chargerPhoto() {
    const vue = vueCourante();
    if (!vue) return;
    const i = new Image();
    i.onload = () => { etat.photo = i; rendre(); };
    i.onerror = () => { etat.photo = null; rendre(); };
    i.src = cheminImages + vue.image;
  }

  choixZone.onchange = (e) => { etat.vue = Number(e.target.value); chargerPhoto(); };
  reglette.oninput = (e) => { etat.part = Number(e.target.value) / 100; rendre(); };

  majPuces();
  majZones();
  majBlanc();
  chargerPhoto();

  return {
    /** Pose le logo du visiteur. `source` est une URL, un data: ou un Blob. */
    poserLogo(source) {
      const i = new Image();
      i.onload = () => {
        etat.logoOrigine = i;
        etat.detourage = 'aucun';
        // On regarde le blanc sur une reduction : la reponse est la meme et
        // elle arrive tout de suite, meme sur un logo de quatre mille pixels.
        const t = document.createElement('canvas');
        t.width = Math.min(i.width, 400);
        t.height = Math.max(1, Math.round(t.width * i.height / i.width));
        const c = t.getContext('2d', { willReadFrequently: true });
        c.drawImage(i, 0, 0, t.width, t.height);
        try { etat.blanc = auditerBlanc(c.getImageData(0, 0, t.width, t.height)); }
        catch (e) { etat.blanc = null; }
        appliquerDetourage();
      };
      i.src = source;
    },
    /** Ce que le visiteur a choisi de faire du blanc. */
    detourage: () => etat.detourage,
    /** Le logo tel qu'il est pose, detourage compris. */
    logoPose: () => etat.logo,
    /** La donnee de sortie a l'instant present. */
    etat: () => restituer({ vue: vueCourante(),
                            pose: dessiner({ toile, vue: vueCourante(), photo: etat.photo,
                                             logo: etat.logo, part: etat.part,
                                             traitPx: etat.traitPx }).pose }),
    /** Le bitmap, pour qui veut le joindre a une demande. */
    toile: () => toile,
  };
}
