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
import { mesurer } from './moteur/mesures.js';
import { juger } from './verdict/juger.js';
import { rendreVerdict } from './verdict/rendu.js';
import { preparerVectorisation, FORMES_MAXIMALES } from './vectorisation/options.js';
import { construireProgramme, inventaire } from './vectorisation/programme.js';
import { versEps } from './vectorisation/eps.js';
import { versPdf } from './vectorisation/pdf.js';
import { versSvg } from './vectorisation/svg.js';
import { initialiser, vectorize_rgba } from './vectorisation/vtracer_web.js';

const $ = (id) => document.getElementById(id);

let etat = { nom: null, mesures: null, programme: null, avertissements: [] };

function texte(valeur, unite = '') {
  if (valeur === null || valeur === undefined) return 'non mesuré';
  if (typeof valeur === 'number') {
    return (Number.isInteger(valeur) ? valeur : valeur.toFixed(2)) + unite;
  }
  return String(valeur);
}

function encadrement(e, unite = ' px') {
  if (!e) return 'non mesuré';
  const a = Math.round(e.basse * 100) / 100;
  const b = Math.round(e.haute * 100) / 100;
  return a === b ? a + unite : `${a} à ${b}${unite}`;
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
      <span class="part">${(100 * c.part).toFixed(1)} % de l'encre</span>
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
    ${ligne('Dimensions', `${m.m1Dimensions.largeurPx} × ${m.m1Dimensions.hauteurPx} px`)}
    ${ligne('Fond', m.fond.type === 'transparent' ? 'transparent' : `couleur ${m.fond.rvb.join(', ')}`)}
    ${ligne('Couleurs réelles', `${m.m2Couleurs.couleursReelles} ${palette}`,
        `le fichier en contient ${m.m2Couleurs.couleursBrutes} au total`)}
    ${ligne('Halo et salissures', `${m.m3Halo.pourcentBoite.toFixed(2)} %`,
        `${m.m3Halo.pixelsImpurs} pixels ni fond ni couleur du logo`)}
    ${ligne('Pixels orphelins retirés', `${m.proprete.pixelsRetires}`,
        `${m.proprete.composantesRetirees} amas isolés`)}
    ${ligne('Trait le plus fin', encadrement(m.m5TraitLePlusFin.encadrementPx))}
    ${ligne('Écart le plus étroit', encadrement(m.m6ContreFormes.ecartMinimalPx))}
    ${ligne('Plus petite contre forme', encadrement(m.m6ContreFormes.plusPetiteContreFormePx),
        `${m.m6ContreFormes.nombreContreFormes} contre formes fermées`)}
    ${ligne('Hauteur de capitale', m.m7HauteurDeCapitale.hauteurPx === null
        ? `non mesurée (${m.m7HauteurDeCapitale.motif})`
        : texte(m.m7HauteurDeCapitale.hauteurPx, ' px'))}
    ${ligne('Plus grand aplat', `${m.m8PlusGrandAplat.airePx} px²`,
        `${(100 * m.m8PlusGrandAplat.partDeLEncre).toFixed(0)} % de l'encre`)}
    ${ligne('Dégradé ou photo', m.m10IndicesExport.partInterieurVariable === null
        ? 'non mesuré'
        : `${(100 * m.m10IndicesExport.partInterieurVariable).toFixed(1)} % de l'intérieur`)}
    ${ligne('Transparence partielle', m.m4Transparence.aTransparencePartielle
        ? `oui, ${m.m4Transparence.pixelsSemiTransparents} pixels` : 'non')}
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
  $('apercu').innerHTML = '';
  etat = { nom: null, mesures: null, programme: null, svg: null, avertissements: [] };
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
    const image = await lireImage(fichier);

    etape = 'mesure';
    $('travail').textContent = 'Mesure';
    const mesures = mesurer(image);
    etat.mesures = mesures;
    etat.nom = (fichier.name || 'logo').replace(/\.[^.]+$/, '');
    afficherMesures(mesures, image);
    await afficherVerdict(mesures);

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
      ${ligne('Formes', inv.formes)}
      ${ligne('Couleurs du fichier livré', inv.couleurs)}
      ${ligne('Segments', inv.segments)}
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
    if (e instanceof FichierNonSupporte) {
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
    console.error('[vecto] etape', etape, e);
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
