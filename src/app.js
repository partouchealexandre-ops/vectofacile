/**
 * Assemblage de l'application, cote navigateur.
 *
 * Etat du chantier au 18/08/2026 : la couche VERDICT n'existe pas, et son
 * absence est affichee telle quelle au visiteur. Elle attend seuils.json, qui
 * attend les arbitrages d'Alex, qui attendent la contre lecture du referentiel.
 *
 * Ce fichier ne contient donc AUCUN seuil. Pas un chiffre de marquage, pas une
 * comparaison, pas un feu vert. Il montre des mesures, qui sont des faits, et
 * il dit ce qu'il ne sait pas encore dire. C'est la regle du projet : une
 * valeur inferee n'entre jamais dans un verdict servi a un visiteur, et le plus
 * sur moyen de ne pas en servir est de ne pas en ecrire.
 */

import { lireImage, telecharger, FichierNonSupporte } from './adaptateurs/image_navigateur.js';
import { lireVectoriel, reconnaitre, FichierVectorielNonLu } from './adaptateurs/pdf_navigateur.js';
import { mesurer } from './moteur/mesures.js';
import { juger } from './verdict/juger.js';
import { rendreVerdict } from './verdict/rendu.js';
import { conseiller } from './conseils/conseils.js';
import { preparerVectorisation, FORMES_MAXIMALES } from './vectorisation/options.js';
import { construireProgramme, inventaire } from './vectorisation/programme.js';
import { versEps } from './vectorisation/eps.js';
import { versPdf } from './vectorisation/pdf.js';
import { versSvg } from './vectorisation/svg.js';
import { initialiser, vectorize_rgba } from './vectorisation/vtracer_web.js';

const $ = (id) => document.getElementById(id);

let etat = { nom: null, image: null, fiche: null, mesures: null, programme: null, avertissements: [] };

function texte(valeur, unite = '') {
  if (valeur === null || valeur === undefined) return 'non mesuré';
  if (typeof valeur === 'number') {
    return nb(valeur, Number.isInteger(valeur) ? 0 : 2) + unite;
  }
  return String(valeur);
}

/**
 * FORMAT FRANCAIS. Le 19/08, la page affichait « 0.34 mm » et « 23322 pixels »
 * dans les mesures, et « 1,18 % » et « 18 607 pixels » dans les conseils, sur
 * le meme ecran. Un outil qui n'ecrit pas ses nombres de la meme facon d'un
 * bloc a l'autre a l'air de ne pas savoir ce qu'il mesure.
 *
 * Une seule regle desormais : virgule decimale, espace insecable des milliers,
 * partout, par ces deux fonctions et pas autrement.
 */
function nb(valeur, decimales = 0) {
  if (valeur === null || valeur === undefined || !Number.isFinite(valeur)) return 'non mesuré';
  return valeur.toLocaleString('fr-FR', {
    minimumFractionDigits: decimales, maximumFractionDigits: decimales,
  });
}

function pourcent(part, decimales = 1) {
  if (part === null || part === undefined || !Number.isFinite(part)) return 'non mesuré';
  return `${nb(100 * part, decimales)} %`;
}

function encadrement(e, unite = ' px') {
  if (!e) return 'non mesuré';
  const dec = unite.includes('mm') ? 2 : 0;
  const a = Math.round(e.basse * 100) / 100;
  const b = Math.round(e.haute * 100) / 100;
  return a === b ? nb(a, dec) + unite : `${nb(a, dec)} à ${nb(b, dec)}${unite}`;
}

/**
 * Une mesure de longueur, en pixels et, quand le visiteur a donne une largeur
 * de marquage, en millimetres. Les millimetres passent devant : c'est l'unite
 * dans laquelle un atelier repond. Le pixel reste affiche parce que c'est lui
 * qui a ete mesure, et qu'il ne depend d'aucune saisie.
 */
function longueur(encadrementPx, encadrementMm) {
  const px = encadrement(encadrementPx, ' px');
  if (!encadrementMm || encadrementMm.basse === null || encadrementMm.basse === undefined) {
    return px;
  }
  const mm = encadrement(encadrementMm, ' mm');
  return `${mm} <span class="secondaire">soit ${px}</span>`;
}

function ligne(intitule, valeur, precision = '') {
  return `<div class="ligne"><span class="intitule">${intitule}</span>`
    + `<span class="valeur">${valeur}</span>`
    + (precision ? `<span class="precision">${precision}</span>` : '')
    + '</div>';
}

/**
 * La palette, lisible et copiable.
 *
 * Un carre de couleur avec une infobulle ne sert a rien : il ne se lit pas au
 * doigt sur un telephone, et il ne se copie pas dans un mail au marqueur. On
 * ecrit donc l'hexadecimal et le RVB en clair.
 *
 * Ces deux valeurs sont des FAITS du fichier, elles ne demandent aucun
 * arbitrage. La reference Pantone, elle, n'en est pas un : la correspondance
 * depend de l'encre, du support et de l'eclairage. On ne l'affiche pas, et on
 * dit pourquoi plutot que de la passer sous silence.
 */
function rendrePalette(palette) {
  if (!palette.length) return '';
  const lignes = palette.map((c) => `<li class="teinte">
      <span class="pastille" style="background:${c.hex}"></span>
      <code class="hex">${c.hex.toUpperCase()}</code>
      <span class="rvb">R ${c.rvb[0]} V ${c.rvb[1]} B ${c.rvb[2]}</span>
      <span class="part">${pourcent(c.part)} de l'encre</span>
    </li>`).join('');
  return `<h3>Vos couleurs, à donner à votre marqueur</h3>
    <ul class="palette">${lignes}</ul>
    <p class="note">Ces codes sont ceux de votre fichier, tels que nous les y avons
    lus. Nous ne les traduisons pas en référence Pantone : la correspondance
    dépend de l'encre et du support, et c'est votre marqueur qui la choisit.</p>`;
}

function afficherMesures(m, image) {
  const palette = m.m2Couleurs.palette
    .map((c) => `<span class="pastille" style="background:${c.hex}" title="${c.hex} : ${(100 * c.part).toFixed(1)} %"></span>`)
    .join('');

  const reduction = image.reduction < 1
    ? `mesuré sur une version réduite à ${image.largeur} px de large, l'original fait ${image.largeurOrigine} px`
    : '';

  $('mesures').innerHTML = `
    <h2>Ce que votre fichier contient</h2>
    ${reduction ? `<p class="note">${reduction}</p>` : ''}
    ${ligne('Dimensions', `${nb(m.m1Dimensions.largeurPx)} × ${nb(m.m1Dimensions.hauteurPx)} px`)}
    ${ligne('Fond', m.fond.type === 'transparent' ? 'transparent' : `couleur ${m.fond.rvb.join(', ')}`)}
    ${ligne('Couleurs réelles', `${nb(m.m2Couleurs.couleursReelles)} ${palette}`,
        `le fichier en contient ${nb(m.m2Couleurs.couleursBrutes)} au total`)}
    ${ligne('Halo et salissures', pourcent(m.m3Halo.partBoite, 2),
        `${nb(m.m3Halo.pixelsImpurs)} pixels ni fond ni couleur du logo`)}
    ${ligne('Pixels orphelins retirés', nb(m.proprete.pixelsRetires),
        `${nb(m.proprete.composantesRetirees)} amas isolés`)}
    ${ligne('Trait le plus fin',
        longueur(m.m5TraitLePlusFin.encadrementPx, m.m5TraitLePlusFin.encadrementMm))}
    ${ligne('Écart le plus étroit',
        longueur(m.m6ContreFormes.ecartMinimalPx, m.m6ContreFormes.ecartMinimalMm))}
    ${ligne('Plus petite contre forme', encadrement(m.m6ContreFormes.plusPetiteContreFormePx),
        `${m.m6ContreFormes.nombreContreFormes} contre formes fermées`)}
    ${ligne('Hauteur de capitale', m.m7HauteurDeCapitale.hauteurPx === null
        ? `non mesurée (${m.m7HauteurDeCapitale.motif})`
        : (m.m7HauteurDeCapitale.hauteurMm != null
            ? `${texte(m.m7HauteurDeCapitale.hauteurMm, ' mm')} <span class="secondaire">soit `
              + `${texte(m.m7HauteurDeCapitale.hauteurPx, ' px')}</span>`
            : texte(m.m7HauteurDeCapitale.hauteurPx, ' px')))}
    ${ligne('Plus grand aplat', `${nb(m.m8PlusGrandAplat.airePx)} px²`,
        `${pourcent(m.m8PlusGrandAplat.partDeLEncre, 0)} de l'encre`)}
    ${ligne('Dégradé ou photo', m.m10IndicesExport.partInterieurVariable === null
        ? 'non mesuré'
        : `${pourcent(m.m10IndicesExport.partInterieurVariable)} de l'intérieur`)}
    ${ligne('Transparence partielle', m.m4Transparence.aTransparencePartielle
        ? `oui, ${nb(m.m4Transparence.pixelsSemiTransparents)} pixels` : 'non')}
    ${rendrePalette(m.m2Couleurs.palette)}
  `;
  $('mesures').hidden = false;
}

/**
 * Le verdict. Les seuils sont charges au moment ou on en a besoin, et un
 * echec de chargement N'EST PAS silencieux : sans seuils, la page dit qu'elle
 * n'a pas pu les lire, elle ne montre pas un diagnostic vide qui ressemblerait
 * a « rien a signaler ».
 */
let promesseSeuils = null;
function chargerSeuils() {
  if (!promesseSeuils) {
    promesseSeuils = fetch('/src/verdict/seuils.json').then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  }
  return promesseSeuils;
}

/**
 * Les avertissements s'affichent AVANT le resultat, avec le poids de ce
 * qu'ils disent.
 *
 * Ils etaient rendus en petit gris SOUS les boutons de telechargement. Le
 * 19/08, le premier vrai logo passe dans la chaine, une cible de 101 par 57
 * pixels, a produit un .eps ou le texte etait fondu en une tache : le
 * moteur avait mesure juste, l'avertissement disait vrai, et personne ne
 * l'a lu parce qu'il arrivait apres l'action.
 *
 * Un avertissement qui arrive apres le bouton n'est pas un avertissement,
 * c'est une note de bas de page.
 */
function afficherAvertissements(liste) {
  const bloc = $('avertissements');
  if (!liste || liste.length === 0) { bloc.hidden = true; return; }
  bloc.innerHTML = liste.map((a) => {
    if (typeof a === 'string') return `<div class="alerte"><p>${a}</p></div>`;
    return `<div class="alerte alerte-${a.gravite}">
      <p class="alerte-titre">${a.titre}</p>
      <p>${a.texte}</p>
      ${a.remede ? `<p class="alerte-remede">${a.remede}</p>` : ''}
    </div>`;
  }).join('');
  bloc.hidden = false;
}

async function afficherVerdict(mesures) {
  let seuils;
  try {
    seuils = await chargerSeuils();
  } catch (e) {
    $('verdict').innerHTML = `
      <h2>Le diagnostic par technique</h2>
      <p class="gris">Nous n'avons pas pu charger nos seuils de marquage
      (${String(e.message)}). Vos mesures ci-dessus restent valables : elles
      décrivent votre fichier et ne dépendent d'aucun seuil.</p>`;
    $('verdict').hidden = false;
    return;
  }
  $('verdict').innerHTML = rendreVerdict(juger({ mesures, seuils }));
  $('verdict').hidden = false;
}

/**
 * REMISE A ZERO DE L'ECRAN ET DE L'ETAT, avant chaque fichier.
 *
 * Elle manquait, et son absence a produit le pire defaut de la journee.
 *
 * Le 19/08, Alex a recupere un .eps de 5 174 formes pour un logo a degrade.
 * Ce fichier avait ete REFUSE par le plafond de formes : le message de refus
 * s'est bien affiche. Mais les boutons de telechargement restaient visibles,
 * et `etat.programme` etait deja rempli au moment du refus. Le visiteur
 * pouvait donc telecharger un fichier que l'outil venait de declarer
 * inexploitable.
 *
 * Deux causes se sont additionnees : une regle CSS qui ecrasait l'attribut
 * hidden, corrigee par ailleurs, et l'absence de toute remise a zero ici. La
 * seconde suffisait a elle seule : apres un fichier reussi, un second fichier
 * refuse laissait les boutons du PREMIER a l'ecran, prets a livrer le mauvais
 * fichier sous le mauvais nom.
 *
 * La regle : rien de ce qui concerne le fichier precedent ne survit au depot
 * du suivant. Ni a l'ecran, ni en memoire.
 */
function reinitialiser() {
  // Ces blocs sont REMPLIS par le traitement : on les vide.
  for (const id of ['erreur', 'avertissements', 'mesures', 'verdict', 'resultat']) {
    const e = $(id);
    if (e) { e.hidden = true; e.innerHTML = ''; }
  }
  // Celui-ci porte un balisage STATIQUE, dont les trois boutons et leurs
  // ecouteurs poses au demarrage. Le vider les supprimerait du document, et
  // les ecouteurs partiraient avec eux. On le masque, on n'y touche pas.
  // Erreur commise puis corrigee dans la meme minute : le harnais a signale
  // que l'avertissement n'etait plus au-dessus du bouton, parce qu'il n'y
  // avait plus de bouton du tout.
  $('telechargements').hidden = true;
  // Meme raison pour la largeur de marquage : son champ et son ecouteur sont
  // poses une seule fois au demarrage. On masque la section, on ne la vide pas.
  $('largeur').hidden = true;
  $('fiche').hidden = true;
  $('fiche').innerHTML = '';
  $('conseils').hidden = true;
  $('conseils').innerHTML = '';
  $('apercu').innerHTML = '';
  etat = { nom: null, image: null, fiche: null, mesures: null, programme: null, svg: null, avertissements: [] };
}

/**
 * LA LARGEUR DE MARQUAGE, en millimetres.
 *
 * Le moteur mesure en pixels. Un seuil de marquage, lui, est en millimetres.
 * Sans cette donnee, la conversion est impossible et TOUTES les mesures en mm
 * valent null : c'est la raison pour laquelle le verdict repondait « nous ne
 * savons pas encore » meme sur les criteres qui auraient eu un seuil. Le
 * chainon manquant n'etait pas seulement dans le referentiel, il etait ici.
 *
 * Aucune valeur par defaut. Une taille de marquage inventee produirait des
 * millimetres faux, qui ont l'air justes.
 */
function largeurDeMarquage() {
  const brut = $('largeur_mm')?.value;
  const n = Number.parseFloat(brut);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Re-mesure a partir de l'image deja lue, sans redemander le fichier. */
function remesurer() {
  if (!etat.image) return;
  const mesures = mesurer(etat.image, { largeurImprimeeMm: largeurDeMarquage() });
  etat.mesures = mesures;
  afficherMesures(mesures, etat.image);
  afficherConseils(mesures, etat.fiche);
  afficherVerdict(mesures);
}

/**
 * LA FICHE D'UN FICHIER DEJA VECTORIEL.
 *
 * Un PDF sait des choses qu'une image ignore : combien il mesure en
 * millimetres, et de quoi il est fait. On les affiche AVANT les mesures,
 * parce que « votre PDF ne contient qu'une image » rend toutes les mesures
 * suivantes secondaires.
 */
function afficherFiche(fiche) {
  if (!fiche) { $('fiche').hidden = true; return; }
  const pluriel = (n, singulier, plur) => `${nb(n)} ${n > 1 ? plur : singulier}`;
  const compo = fiche.traces === null
    ? ''
    : ligne('Contenu',
        `${pluriel(fiche.traces, 'tracé', 'tracés')}, ${pluriel(fiche.images, 'image', 'images')}`
        + (fiche.texte ? `, ${pluriel(fiche.texte, 'bloc de texte', 'blocs de texte')}` : ''),
        fiche.texte ? 'du texte non vectorisé demande la police au marqueur' : '');
  // Le titre ne peut pas annoncer « deja vectoriel » sur un fichier qui ne
  // l'est pas : ce serait exactement le mensonge que la carte est la pour
  // defaire.
  const titre = fiche.faux_vectoriel
    ? 'Votre fichier a l\'extension d\'un vectoriel'
    : 'Votre fichier est déjà vectoriel';
  $('fiche').innerHTML = `
    <h2>${titre}</h2>
    <p class="note">Nous ne le vectorisons pas : ${fiche.faux_vectoriel
      ? 'notre vectoriseur ne ferait que retracer l\'image qu\'il contient, et vous auriez une approximation de plus'
      : 'il n\'y a rien à tracer'}. Nous le mesurons et nous le
    diagnostiquons, ce qui est l'autre moitié du travail.</p>
    ${ligne('Format', 'PDF' + (fiche.pages > 1 ? `, ${nb(fiche.pages)} pages, la première est mesurée` : ''))}
    ${ligne('Taille réelle du dessin',
        `${nb(fiche.largeurMm, 1)} × ${nb(fiche.hauteurMm, 1)} mm`,
        'écrite dans le fichier, contrairement à une image')}
    ${compo}
    ${fiche.faux_vectoriel ? `<div class="alerte grave">
      <b>Attention, ce fichier n'est pas réellement vectoriel.</b>
      Il porte l'extension d'un vectoriel, il s'ouvre comme un vectoriel, mais
      il ne contient aucun tracé : seulement une image posée dedans. Agrandi, il
      pixellisera exactement comme un JPEG. Un atelier vous le refusera, ou le
      retracera à la main et vous le facturera.</div>` : ''}
  `;
  $('fiche').hidden = false;
}

/**
 * Les conseils d'impression : un fait mesure, une mecanique de procede.
 * Ils ne dependent d'AUCUN seuil arbitre, c'est pour cela qu'ils peuvent
 * s'afficher aujourd'hui alors que le verdict, lui, attend encore.
 */
function afficherConseils(mesures, fiche) {
  const liste = conseiller(mesures, fiche);
  if (!liste.length) { $('conseils').hidden = true; return; }
  $('conseils').innerHTML = `
    <h2>Ce que votre fichier implique au marquage</h2>
    <p class="note">Chaque point ci-dessous croise une mesure de votre fichier avec
    une mécanique de procédé. Ce ne sont pas des verdicts : nous ne vous disons pas
    encore si votre logo passe, nous vous disons ce qu'il implique.</p>
    ${liste.map((c) => `<div class="conseil">
      <h3>${c.titre}</h3>
      <p class="fait">${c.fait}</p>
      <p class="mecanique">${c.mecanique}</p>
    </div>`).join('')}`;
  $('conseils').hidden = false;
}

async function traiter(fichier) {
  reinitialiser();
  $('travail').hidden = false;
  // L'etape courante est suivie explicitement : quand quelque chose casse chez
  // un visiteur, savoir A QUEL MOMENT vaut plus que le message d'erreur lui
  // meme. Le 18/08, un rapport disant seulement "TextDecoder" a coute une heure
  // de recherche faute de savoir si la lecture, la mesure ou la vectorisation
  // avait echoue.
  let etape = 'lecture du fichier';
  $('travail').textContent = 'Lecture du fichier';

  try {
    // DEUX CHEMINS, ET LE VISITEUR N'A PAS A CHOISIR.
    //
    // On lit les premiers octets du fichier, pas son extension ni son type
    // MIME : le systeme d'Alex annonce un .ai comme `application/postscript`
    // alors que son contenu commence par %PDF. Se fier a l'etiquette aurait
    // refuse le fichier pour la raison exactement inverse de la vraie.
    //
    // Fichier deja vectoriel : on l'audite, on ne le vectorise pas. Il n'y a
    // rien a tracer, et le tracer degraderait un dessin exact.
    const nature = reconnaitre(await fichier.slice(0, 1024).arrayBuffer());

    let image;
    if (nature === 'pdf') {
      etape = 'lecture du fichier vectoriel';
      $('travail').textContent = 'Lecture du fichier vectoriel';
      const lu = await lireVectoriel(fichier);
      image = lu.image;
      etat.fiche = lu.fiche;
    } else if (nature === 'postscript') {
      throw new FichierVectorielNonLu(
        'ce fichier est un EPS, c\'est à dire du PostScript. Nous savons lire les '
        + 'PDF et les fichiers Illustrator enregistrés avec l\'option « Créer un '
        + 'fichier compatible PDF », qui est le réglage par défaut. Réenregistrez '
        + 'votre logo en PDF depuis votre logiciel, le diagnostic sera le même.');
    } else {
      image = await lireImage(fichier);
    }

    etape = 'mesure';
    $('travail').textContent = 'Mesure';
    const mesures = mesurer(image, { largeurImprimeeMm: largeurDeMarquage() });
    etat.image = image;
    etat.mesures = mesures;
    etat.nom = (fichier.name || 'logo').replace(/\.[^.]+$/, '');
    $('largeur').hidden = false;
    afficherFiche(etat.fiche);
    afficherMesures(mesures, image);
    afficherConseils(mesures, etat.fiche);
    await afficherVerdict(mesures);

    // UN FICHIER DEJA VECTORIEL S'ARRETE ICI, et c'est le coeur de la
    // separation des deux metiers. Il a ete mesure, situe, conseille. On ne
    // lui propose aucun telechargement : lui rendre une version tracee de son
    // propre vectoriel serait lui rendre une copie degradee de ce qu'il a
    // deja.
    if (nature === 'pdf') {
      $('travail').hidden = true;
      return;
    }

    // Le refus se decide sur les MESURES, avant de charger le vectoriseur et
    // avant de lui donner un seul pixel. Un fichier qui ne sera pas vectorise
    // ne doit pas faire telecharger 650 ko de WebAssembly au visiteur.
    const prepare = preparerVectorisation(image, mesures);
    if (prepare.refus) {
      $('resultat').innerHTML = `
        <h2>Pas de fichier vectoriel pour celui-ci</h2>
        <p class="gris">${prepare.refus.texte}</p>`;
      $('resultat').hidden = false;
      $('travail').hidden = true;
      return;
    }

    etape = 'chargement du vectoriseur';
    $('travail').textContent = 'Chargement du vectoriseur';
    await chargerVectoriseur();

    etape = 'vectorisation';
    $('travail').textContent = 'Vectorisation';
    const svg = vectorize_rgba(new Uint8Array(prepare.pixels.buffer), image.largeur, image.hauteur, prepare.options);
    etape = 'lecture des chemins';
    etat.programme = construireProgramme(svg);
    // On n'affiche ni ne livre JAMAIS le SVG brut du vectoriseur : il contient
    // des chemins que la grammaire SVG interdit. Voir vectorisation/svg.js.
    etat.svg = versSvg(etat.programme, { titre: etat.nom });
    etat.avertissements = prepare.avertissements;
    afficherAvertissements(etat.avertissements);

    const inv = inventaire(etat.programme);
    if (inv.formes > FORMES_MAXIMALES) {
      $('resultat').innerHTML = `
        <h2>Pas de fichier vectoriel pour celui-ci</h2>
        <p class="gris">Le tracé de ce fichier compte ${inv.formes.toLocaleString('fr-FR')} formes.
        Aucune technique de marquage ne sait rendre ça, et aucun atelier n'ouvrira
        le fichier. Le diagnostic ci-dessus reste valable, il décrit bien votre fichier.</p>`;
      $('resultat').hidden = false;
      $('travail').hidden = true;
      return;
    }
    $('apercu').innerHTML = etat.svg;
    $('resultat').innerHTML = `
      <h2>Votre fichier vectoriel</h2>
      ${ligne('Formes', nb(inv.formes))}
      ${ligne('Couleurs du fichier livré', nb(inv.couleurs))}
      ${ligne('Segments', nb(inv.segments))}
      <p class="note">
        Les fabricants de goodies demandent du .eps ou du .ai, et refusent le
        SVG dans la plupart des cas. Le SVG reste téléchargeable, pour votre
        site web.
      </p>
    `;
    $('resultat').hidden = false;
    $('telechargements').hidden = false;
    $('travail').hidden = true;
  } catch (e) {
    $('travail').hidden = true;
    $('erreur').hidden = false;
    if (e instanceof FichierNonSupporte || e instanceof FichierVectorielNonLu) {
      $('erreur').textContent = e.message;
    } else {
      // On montre l'etape ET la pile. Un visiteur qui rapporte un probleme nous
      // donne alors de quoi le reproduire, au lieu d'une phrase seule.
      $('erreur').innerHTML = `Le traitement s'est arrêté pendant l'étape « ${etape} ».`
        + `<br><br>Si vous voulez nous aider à corriger, copiez ce qui suit :`
        + `<pre style="white-space:pre-wrap;font-size:12px;margin:8px 0 0">`
        + `${etape} | ${(e && e.message) || e}\n${((e && e.stack) || '').split('\n').slice(0, 4).join('\n')}`
        + `</pre>`;
    }
    // Un format qu'on ne lit pas N'EST PAS une erreur de programme : c'est une
    // reponse, et elle est deja affichee au visiteur. La journaliser en
    // console.error salit le journal de bord et, plus concretement, faisait
    // echouer le harnais sur un comportement correct.
    if (!(e instanceof FichierNonSupporte) && !(e instanceof FichierVectorielNonLu)) {
      console.error('[vecto] etape', etape, e);
    }
  }
}

function brancher() {
  const zone = $('depot');
  const champ = $('fichier');

  zone.addEventListener('click', () => champ.click());
  champ.addEventListener('change', () => { if (champ.files[0]) traiter(champ.files[0]); });
  ['dragenter', 'dragover'].forEach((n) => zone.addEventListener(n, (e) => {
    e.preventDefault(); zone.classList.add('survol');
  }));
  ['dragleave', 'drop'].forEach((n) => zone.addEventListener(n, (e) => {
    e.preventDefault(); zone.classList.remove('survol');
  }));
  zone.addEventListener('drop', (e) => {
    const f = e.dataTransfer.files[0];
    if (f) traiter(f);
  });

  // La largeur de marquage re-mesure a la volee. On ecoute `input` et non
  // `change` : le visiteur voit ses millimetres bouger pendant qu'il tape, ce
  // qui est la seule facon de comprendre du premier coup que ce champ commande
  // toutes les valeurs en dessous.
  $('largeur_mm').addEventListener('input', () => remesurer());

  $('telecharger_eps').addEventListener('click', () => {
    telecharger(versEps(etat.programme, { titre: etat.nom }), `${etat.nom}.eps`, 'application/postscript');
  });
  $('telecharger_pdf').addEventListener('click', () => {
    telecharger(versPdf(etat.programme, { titre: etat.nom }), `${etat.nom}.pdf`, 'application/pdf');
  });
  $('telecharger_svg').addEventListener('click', () => {
    telecharger(etat.svg, `${etat.nom}.svg`, 'image/svg+xml');
  });
}

/**
 * PRECHARGEMENT DE FOND, et il porte une promesse autant qu'un confort.
 *
 * Les seuils et le vectoriseur etaient charges au moment ou on en avait
 * besoin, ce qui evitait 650 ko a un visiteur dont le fichier allait etre
 * refuse. Le raisonnement etait bon et il avait un cout cache : la page
 * dependait encore du reseau APRES son affichage.
 *
 * Or la promesse du site est « rien ne quitte votre machine », et la
 * verification la plus convaincante qu'un visiteur puisse en faire ne demande
 * aucun terminal : charger la page, COUPER SA CONNEXION, puis deposer un logo.
 * Si tout fonctionne encore, plus rien n'est a demontrer. Ce test n'etait pas
 * vrai tant que le vectoriseur arrivait apres le depot.
 *
 * On precharge donc en tache de fond, sans bloquer quoi que ce soit : la page
 * est utilisable immediatement, et une seconde plus tard elle est autonome.
 * Un echec de prechargement n'est pas une erreur, le chargement a la demande
 * reprend la main.
 */
let promesseVectoriseur = null;
function chargerVectoriseur() {
  if (!promesseVectoriseur) {
    promesseVectoriseur = initialiser(new URL('./vtracer_wasm_bg.wasm', document.baseURI));
  }
  return promesseVectoriseur;
}

function prechargerEnFond() {
  const lancer = () => {
    chargerSeuils().catch(() => { promesseSeuils = null; });
    chargerVectoriseur().catch(() => { promesseVectoriseur = null; });
  };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(lancer, { timeout: 2500 });
  else setTimeout(lancer, 400);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { brancher(); prechargerEnFond(); });
} else {
  brancher();
  prechargerEnFond();
}

// Exposé pour le test de bout en bout, qui pilote la page sans souris.
globalThis.vecto = { traiter, etat: () => etat };
