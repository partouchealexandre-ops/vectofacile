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
import { lireEnteteEps } from './adaptateurs/eps_entete.js';
import { mesurer } from './moteur/mesures.js';
import { juger } from './verdict/juger.js';
import { jugerFeux } from './verdict/feux.js';
import { CONTACT, rendreDecouverte } from './verdict/rendu_grille.js';
import { programmeVersPng } from './vectorisation/toile.js';
import { deposerLogo } from './simulation/passage.js';
import { rendreVerdict } from './verdict/rendu.js';
import { rendreFaitPrincipal, logoClair } from './verdict/rendu_feux.js';
import { conseiller } from './conseils/conseils.js';
import { preparerVectorisation, FORMES_MAXIMALES } from './vectorisation/options.js';
import { construireProgramme, inventaire } from './vectorisation/programme.js';
import { versEps } from './vectorisation/eps.js';
import { versPdf } from './vectorisation/pdf.js';
import { versSvg } from './vectorisation/svg.js';
import { largeurLivreeMm } from './vectorisation/geometrie.js';
import { initialiser, vectorize_rgba } from './vectorisation/vtracer_web.js';

const $ = (id) => document.getElementById(id);

/**
 * DEUX PAGES, UN SEUL SCRIPT, arbitrage Alex du 20/08.
 *
 * « Vectoriser mon logo » et « Évaluer votre logo » sont deux promesses
 * differentes, donc deux pages. La page /vectoriser porte
 * data-mode="vectoriser" sur son body : elle depose, vectorise, livre les
 * fichiers, et RIEN d'autre. Pas de fiche, pas de couleurs, pas de verdict,
 * pas de mesures : ce serait re-melanger ce qu'on vient de separer.
 *
 * Le script reste unique parce que la chaine de traitement est la meme ; seule
 * la restitution change. Les blocs de diagnostic n'existent pas dans le HTML
 * de /vectoriser, et chaque acces a un bloc est donc garde : un identifiant
 * absent est un choix de page, pas une erreur.
 */
const modeVectoriser = () => document.body?.dataset?.mode === 'vectoriser';

let etat = { nom: null, image: null, fiche: null, mesures: null, programme: null, svg: null,
             verdict: null, selection: null, fichierEtat: null, grille: null,
             telechargementDemande: false, avertissements: [] };

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
      <span class="part">${pourcent(c.part)} de la surface du logo</span>
    </li>`).join('');
  // §7.4 du brief du 20/08 : « à donner à votre marqueur » se disait deux fois
  // sur le meme ecran, dans le titre de la section ET dans celui de la palette.
  // Une phrase repetee ne renforce pas, elle dilue.
  return `<ul class="palette">${lignes}</ul>
    <p class="note">Ces codes sont ceux de votre fichier, tels que nous les y avons
    lus. Nous ne les traduisons pas en référence Pantone : la correspondance
    dépend de l'encre et du support, et c'est votre marqueur qui la choisit.</p>`;
}

/**
 * LES COULEURS, EN PREMIER ET REGROUPEES. Arbitrage Alex du 20/08 : le compte
 * de couleurs vivait dans le tableau des mesures et les codes dans une autre
 * section, alors que c'est UNE information, et l'une des deux que le visiteur
 * vient chercher. Une seule section desormais : combien, lesquelles, quoi en
 * faire.
 */
function afficherCouleurs(m) {
  const n = m.m2Couleurs.couleursReelles;
  // Le titre vit dans le <summary> du volet : « un fait ne se dit qu'une fois »,
  // regle d'ecriture du brief du 21/08. Le compte de couleurs apparaissait
  // trois fois sur l'ecran, ici, dans les conseils et dans le tableau.
  // LE COMPTE EST DIT JUSTE AU DESSUS, dans la reponse. Le repeter dans le
  // resume du volet le dirait deux fois a dix pixels d'intervalle, et la
  // mecanique du cout se dit une seule fois, dans les points d'attention.
  // Ici, il ne reste que ce que ce volet est seul a savoir : les codes, et
  // pourquoi le fichier en contient davantage.
  const volet = document.querySelector('#volet_couleurs > summary');
  if (volet) volet.textContent = 'Voir les codes couleur, à donner à votre marqueur';
  const brutes = m.m2Couleurs.couleursBrutes;
  const ecart = brutes > n
    ? `<p class="note">Le fichier contient ${nb(brutes)} teintes au total, mais
      ${n > 1 ? `ces ${nb(n)} couleurs portent` : 'cette couleur porte'} le dessin :
      le reste est du lissage de bord.</p>`
    : '';
  $('couleurs').innerHTML = `${ecart}${rendrePalette(m.m2Couleurs.palette)}`;
  devoiler('couleurs');
}

function afficherMesures(m, image) {

  const reduction = image.reduction < 1
    ? `mesuré sur une version réduite à ${image.largeur} px de large, l'original fait ${image.largeurOrigine} px`
    : '';

  // DEUX ETAGES, arbitrage Alex du 24/08/2026. Un seul tableau de treize
  // lignes melangeait ce qu'un responsable com comprend et ce qui n'a de sens
  // que pour un atelier : « contre forme », « hauteur de capitale »,
  // « pixels orphelins ». Il se lisait comme un bilan sanguin.
  //
  // Le premier etage dit ce que le fichier EST, en francais courant. Le second
  // garde les mesures fines, et il DIT POURQUOI elles ne produisent aucun
  // verdict : vingt trois valeurs sourcees de 0,13 a 1,00 mm ne font pas un
  // seuil, et tant qu'Alex n'a pas tranche, la mesure reste une mesure. C'est
  // la difference entre cacher un trou et le declarer.
  $('mesures').innerHTML = `
    <details class="mesures-detail">
    <summary>Plus de détails : ce que contient votre fichier</summary>
    ${reduction ? `<p class="note">${reduction}</p>` : ''}
    ${ligne('Dimensions', `${nb(m.m1Dimensions.largeurPx)} × ${nb(m.m1Dimensions.hauteurPx)} px`)}
    ${ligne('Fond', m.fond.type === 'transparent' ? 'transparent'
        : (m.fond.rvb?.every((c) => c > 245) ? 'blanc, pas transparent'
           : `opaque, RVB ${m.fond.rvb.join(', ')}`))}
    ${ligne('Couleurs réelles', nb(m.m2Couleurs.couleursReelles),
        `le fichier en contient ${nb(m.m2Couleurs.couleursBrutes)} au total ; les codes sont en haut de page`)}
    ${ligne('Dégradé ou photo', m.m10IndicesExport.partInterieurVariable === null
        ? 'non mesuré'
        : `${pourcent(m.m10IndicesExport.partInterieurVariable)} de l'intérieur`)}
    ${ligne('Zones à demi transparentes', m.m4Transparence.aTransparencePartielle
        ? `oui, ${nb(m.m4Transparence.pixelsSemiTransparents)} pixels` : 'non')}
    ${ligne('Résidus de compression', pourcent(m.m3Halo.partBoite, 2),
        `${nb(m.m3Halo.pixelsImpurs)} pixels ni fond ni couleur du logo`)}

    <details class="mesures-fines">
    <summary>Les mesures fines du dessin</summary>
    <p class="note">Elles sont exactes, et elles ne produisent aucun verdict. Le trait
    minimal accepté va de 0,13 à 1,00 mm selon la source et la matière : un écart pareil
    ne fait pas un seuil, et nous préférons vous donner la mesure plutôt qu'un chiffre
    que nous aurions moyenné.</p>
    ${ligne('Le trait le plus fin du dessin',
        longueur(m.m5TraitLePlusFin.encadrementPx, m.m5TraitLePlusFin.encadrementMm))}
    ${ligne('Le plus petit écart entre deux formes',
        longueur(m.m6ContreFormes.ecartMinimalPx, m.m6ContreFormes.ecartMinimalMm))}
    ${ligne('Le plus petit trou fermé du dessin',
        encadrement(m.m6ContreFormes.plusPetiteContreFormePx),
        `${m.m6ContreFormes.nombreContreFormes} trous fermés, comme l'intérieur d'un o`)}
    ${ligne('La hauteur des capitales', m.m7HauteurDeCapitale.hauteurPx === null
        ? `non mesurée (${m.m7HauteurDeCapitale.motif})`
        : (m.m7HauteurDeCapitale.hauteurMm != null
            ? `${texte(m.m7HauteurDeCapitale.hauteurMm, ' mm')} <span class="secondaire">soit `
              + `${texte(m.m7HauteurDeCapitale.hauteurPx, ' px')}</span>`
            : texte(m.m7HauteurDeCapitale.hauteurPx, ' px')))}
    ${ligne('La plus grande surface d\'un seul tenant', `${nb(m.m8PlusGrandAplat.airePx)} px²`,
        `${pourcent(m.m8PlusGrandAplat.partDeLEncre, 0)} de l'encre`)}
    ${ligne('Points isolés retirés avant mesure', nb(m.proprete.pixelsRetires),
        `${nb(m.proprete.composantesRetirees)} amas isolés`)}
    </details>
    </details>
  `;
  devoiler('mesures');
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
 * Les VALEURS SOURCEES, distinctes des seuils et chargees a part.
 *
 * Deux fichiers, deux statuts, et le melange serait une faute :
 *   seuils.json          un seuil UNIQUE par technique, arbitre par Alex.
 *                        Vide aujourd'hui, il attend P0.7.
 *   valeurs_sourcees.json les valeurs PUBLIEES par des fabricants, chacune
 *                        avec sa matiere, sa source, sa date et son URL.
 *                        Elles servent depuis l'arbitrage P0.3 du 19/08.
 *
 * Le deuxieme ne remplace pas le premier : il repond a une autre question. Un
 * seuil dit « la limite est X ». Les valeurs disent « voici ce que publient
 * vingt-et-un fabricants, et voici ou vous vous situez parmi eux ».
 */
let promesseValeurs = null;
function chargerValeurs() {
  if (!promesseValeurs) {
    promesseValeurs = fetch('/src/verdict/valeurs_sourcees.json').then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  }
  return promesseValeurs;
}

/**
 * LA TAXONOMIE PRODUITS, arbitrage Alex du 20/08 : le client part d'un
 * produit, pas d'une technique. Chargee a part, comme les valeurs, et son
 * echec n'est pas bloquant : sans elle, la page retombe sur la vue par
 * technique, qui reste juste.
 */
let promesseProduits = null;
function chargerProduits() {
  if (!promesseProduits) {
    promesseProduits = fetch('/src/verdict/produits.json').then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  }
  return promesseProduits;
}

/**
 * LA GRILLE, source principale depuis le pivot du 20/08/2026, et des
 * ARCHETYPES depuis le 21/08.
 *
 * Elle est DERIVEE de la base de travail fournisseurs par
 * outils/deriver_archetypes.py : la base brute reste hors du depot, seul ce
 * fichier y entre, sans code interne ni nom de grossiste.
 *
 * Ce ne sont plus huit references de catalogue mais douze couples FAMILLE x
 * MATIERE. La raison est au §2 du brief du 20/08 : « sac shopping coton
 * 140 g/m² » laisse croire qu'on vend ce produit et n'enseigne rien de
 * general, alors que « sac shopping en coton » enseigne, parce que la
 * contrainte de marquage tient d'abord a la matiere. La gravure laser
 * travaille le metal, le bois et le cuir, jamais le coton ; la broderie
 * n'existe que sur textile ; la sublimation exige du polyester.
 */
let promesseGrille = null;
function chargerGrille() {
  if (!promesseGrille) {
    promesseGrille = fetch('/src/verdict/archetypes.json').then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  }
  return promesseGrille;
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
  let valeurs = null;
  let produits = null;
  let grille = null;
  try {
    seuils = await chargerSeuils();
    // Un echec de chargement des valeurs ou des produits n'est PAS silencieux
    // non plus, mais il n'empeche pas le reste : sans eux la page retombe sur
    // une vue plus pauvre, qui reste juste. Elle ne fabrique rien.
    valeurs = await chargerValeurs().catch(() => null);
    produits = await chargerProduits().catch(() => null);
    grille = await chargerGrille().catch(() => null);
  } catch (e) {
    $('verdict').innerHTML = `
      <h2>Sur quoi marquer ce logo ?</h2>
      <p class="gris">Nous n'avons pas pu charger nos seuils de marquage
      (${String(e.message)}). Vos mesures ci-dessus restent valables : elles
      décrivent votre fichier et ne dépendent d'aucun seuil.</p>`;
    $('verdict').hidden = false;
    return;
  }
  etat.verdict = juger({ mesures, seuils, valeurs, produits });
  etat.grille = grille;
  // Les seuils servent maintenant DIRECTEMENT a la grille de feux : le plafond
  // de couleurs d'une technique n'y entre que s'il est SOURCÉ ou ARBITRÉ.
  etat.seuils = seuils;
  rendreLeVerdict();
}

/**
 * LE RENDU DU VERDICT : la grille des sept feux.
 *
 * LOT 1 du 21/08/2026. La grille de PRODUITS a cede la place a la grille de
 * TECHNIQUES, et la raison est un test rate en conditions reelles : sur le logo
 * d'une chaine de creches, le site a propose un powerbank et un stylo en
 * aluminium, sans un seul textile. Il ne savait pas a qui il parlait, et il ne
 * pouvait pas le savoir en montrant un echantillon de matieres.
 *
 * Sept techniques, c'est tout le metier. Les produits restent, en traduction :
 * personne ne sait ce qu'est la tampographie, tout le monde comprend « stylo,
 * gourde, powerbank ».
 */
function rendreLeVerdict() {
  const m = etat.mesures;
  // Sur /vectoriser il n'y a pas de bloc de verdict, et c'est voulu : la page
  // ne promet qu'une chose. Sans cette garde, l'appel jetait une exception qui
  // interrompait le flux AVANT la remise du fichier, et la decouverte du §D ne
  // s'affichait plus. Un bloc absent n'est pas une panne.
  if (!m || !$('verdict')) return;
  const feux = jugerFeux({
    nCouleurs: m.m2Couleurs?.couleursReelles ?? null,
    // Un fichier deja vectoriel passe partout ; une image ne passe que la ou la
    // technique imprime une image.
    fichierVectoriel: etat.fichierEtat?.origine === 'vectoriel'
      ? true
      : etat.fichierEtat ? false : null,
    // La largeur en pixels du DESSIN, pas du fichier : ce sont les pixels de
    // l'encre qui seront imprimes, pas ceux des marges.
    largeurPx: m.boiteEncre?.largeurPx ?? m.m1Dimensions?.largeurPx ?? null,
    // Ce que le logo perd en une seule couleur : la mesure qui distingue « il
    // sortira en monochrome, c'est normal » de « en monochrome, il se referme ».
    fusion: m.m11FusionMonochrome ?? null,
    degrade: Boolean(etat.verdict?.degrade ?? m.m10IndicesExport?.degradeDetecte),
    seuils: etat.seuils ?? null,
    nomsParFamille: NOMS_PAR_FAMILLE,
  }, etat.grille);
  etat.feux = feux;
  // DEUX BLOCS, DEPUIS LE 24/08/2026. La reponse ouvre la page, et le volet des
  // couleurs se glisse ENTRE elle et la grille : le compte de couleurs se lit
  // juste au dessus, donc c'est la, et nulle part ailleurs, qu'on a envie de
  // voir les codes. Il etait relegue sous les telechargements, ou personne
  // n'allait le chercher.
  const tete = $('fait_principal');
  if (tete) {
    tete.innerHTML = rendreFaitPrincipal(m?.m2Couleurs?.couleursReelles ?? null, feux, m);
    tete.hidden = false;
  }
  $('verdict').innerHTML = rendreVerdict(m, feux, etat.fichierEtat);
  $('verdict').hidden = false;
}

/**
 * Les noms commerciaux des techniques, par famille du referentiel. Ils servent
 * a lire la taille courante d'un marquage dans les archetypes : une seule
 * source de donnees pour toute la page.
 */
const NOMS_PAR_FAMILLE = Object.freeze({
  serigraphie: ['Sérigraphie', 'Sérigraphie circulaire', 'Transfert sérigraphique'],
  tampographie: ['Tampographie'],
  gravure_laser: ['Gravure laser', 'Gravure laser 360'],
  broderie: ['Broderie'],
  numerique_uv: ['Impression numérique', 'Impression numérique 360', 'Étiquette numérique', 'Doming'],
  transfert_dtf: ['Transfert numérique', 'Sublimation'],
  marquage_a_chaud: ['Embossage', 'Marquage à chaud'],
});

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
/**
 * LA DECOUVERTE DE /VECTORISER, partie D du brief du 21/08, REECRITE LE
 * 26/08/2026 (arbitrage Alex).
 *
 * Elle n'existe que sur cette page, et seulement une fois le fichier remis.
 * Elle ne montre plus deux cartes de matieres : elle propose le simulateur,
 * et elle y envoie le fichier qu'on vient de fabriquer.
 *
 * L'ORDRE COMPTE, ET IL EST L'INVERSE DE CELUI QU'ON ECRIRAIT SPONTANEMENT.
 * On depose le logo D'ABORD, on ecrit la phrase ENSUITE, parce que la phrase
 * depend du depot : elle ne promet que le rendu de la toile a tenu et que le
 * stockage a accepte. Ecrire d'abord et deposer apres, c'est risquer un ecran
 * qui annonce un transport qui n'a pas eu lieu.
 *
 * LE LOGO NE PART PAS SUR UN SERVEUR. Il passe par le stockage de session,
 * qui appartient a l'onglet et meurt avec lui : voir `simulation/passage.js`.
 */
function afficherDecouverte() {
  if (!modeVectoriser() || !$('decouverte')) return;
  let suit = false;
  try {
    const png = etat.programme ? programmeVersPng(etat.programme) : null;
    suit = png ? deposerLogo(png, etat.nom) : false;
  } catch (e) {
    // Une toile qui ne se dessine pas ne doit pas emporter la remise du
    // fichier avec elle : le visiteur a deja son .eps et son .pdf. On lui
    // propose alors le simulateur sans lui promettre que son logo suit.
    suit = false;
  }
  $('decouverte').innerHTML = rendreDecouverte(suit);
  $('decouverte').hidden = false;
}

/**
 * MONTRER UNE SECTION, ET LE VOLET QUI LA CONTIENT.
 *
 * Structure C du brief du 21/08 : tout ce qui n'est pas le verdict est de la
 * PREUVE, et la preuve se replie. Les sections vivent donc dans des <details>
 * qui restent caches tant que leur contenu n'existe pas : un volet vide qui
 * s'ouvre sur rien est pire qu'un volet absent.
 */
function devoiler(id) {
  const e = $(id);
  if (!e) return;
  e.hidden = false;
  const volet = e.closest('details.volet');
  if (volet) volet.hidden = false;
}

/**
 * LA VIGNETTE DU LOGO REMPLACE LA ZONE DE DEPOT, §7.1 du brief du 20/08.
 *
 * Une fois l'analyse faite, la zone de depot n'a plus de raison d'occuper le
 * premier ecran : elle demande une action deja accomplie, et elle repousse le
 * resultat sous la ligne de flottaison. Le logo depose prend sa place, en
 * petit. Ca confirme QUEL fichier a ete analyse, ce qu'aucun texte ne fait
 * aussi bien, et ca libere la place.
 *
 * ELLE NE QUITTE PAS LE NAVIGATEUR. La vignette est peinte depuis les pixels
 * deja en memoire, dans un canvas local : aucun envoi, aucune trace, la
 * promesse de la page d'accueil tient mot pour mot.
 *
 * Le bloc reste cliquable : c'est lui qui porte l'ecouteur de depot depuis le
 * demarrage, et on ne le remplace pas, on change ce qu'il montre.
 */
let depotOrigine = null;

/**
 * L'ATTENTE SE VOIT, arbitrage Alex du 26/08/2026.
 *
 * CE QUI N'ALLAIT PAS. Entre le depot et le verdict il se passe parfois
 * plusieurs secondes : lecture, mesure, chargement du vectoriseur, trace. La
 * page ne montrait rien pendant ce temps la, sinon une ligne grise de 14 px
 * posee SOUS la zone de depot, hors du champ ou le regard vient de se poser.
 * Un visiteur qui depose un fichier et ne voit rien bouger croit que le site
 * n'a pas pris son fichier, et il redepose.
 *
 * OU L'INDICATEUR SE POSE. Dans la zone de depot elle meme, a l'endroit exact
 * ou la personne vient de lacher son fichier. C'est le meme raisonnement que
 * la vignette du 20/08 : la zone de depot montre l'etat courant du fichier au
 * lieu de reclamer une action deja accomplie.
 *
 * CE QU'IL DIT. L'etape en cours, parce qu'une attente nommee se supporte, et
 * la promesse de confidentialite, parce que c'est la seconde exacte ou
 * quelqu'un se demande ou part son logo. La ligne #travail reste en place et
 * garde le meme texte : elle sert aux rapports de panne.
 */
let attenteEnCours = false;

function poserAttente(texte) {
  const zone = $('depot');
  if (!zone) return;
  if (depotOrigine === null) depotOrigine = zone.innerHTML;
  attenteEnCours = true;
  zone.classList.remove('depot-analyse');
  zone.classList.add('depot-attente');
  zone.setAttribute('aria-busy', 'true');
  zone.innerHTML = `<span class="sablier" aria-hidden="true"></span>
    <strong id="attente_etape">${echapperTexte(texte)}</strong>
    <span>Tout se passe dans votre navigateur. Le fichier ne part nulle part.</span>`;
}

/** L'etape courante, dite aux DEUX endroits : la zone de depot et #travail. */
function direEtape(texte) {
  const suivi = $('travail');
  if (suivi) suivi.textContent = texte;
  const etiquette = $('attente_etape');
  if (etiquette) etiquette.textContent = texte;
}

/**
 * FIN D'ATTENTE. Elle ne touche la zone de depot QUE si l'attente y est encore
 * affichee : quand la vignette a deja pris la place, la restaurer effacerait le
 * logo que le visiteur vient de voir apparaitre.
 */
function terminerAttente() {
  const suivi = $('travail');
  if (suivi) suivi.hidden = true;
  const zone = $('depot');
  if (!zone || !attenteEnCours) return;
  attenteEnCours = false;
  zone.removeAttribute('aria-busy');
  zone.classList.remove('depot-attente');
  if (depotOrigine !== null) zone.innerHTML = depotOrigine;
}

function poserVignette(image, mesures = null) {
  const zone = $('depot');
  if (!zone || !image) return;
  if (depotOrigine === null) depotOrigine = zone.innerHTML;
  attenteEnCours = false;
  zone.classList.remove('depot-attente');
  zone.removeAttribute('aria-busy');
  const COTE = 150;

  // DEUX DEFAUTS CUMULES, CORRIGES LE 24/08/2026. La vignette sortait
  // pixelisee, et c'etait la premiere chose qu'un visiteur voyait de notre
  // travail sur SON logo.
  //
  // 1. LA DENSITE D'ECRAN. La toile faisait 150 pixels pour une case affichee
  //    a 150 pixels CSS. Sur un ecran Retina, 150 px CSS valent 300 pixels
  //    reels : le navigateur agrandissait donc notre vignette d'un facteur
  //    deux. On peint a la densite REELLE, et le CSS la ramene a 150.
  //
  // 2. LA REDUCTION D'UN SEUL COUP. Passer de 1270 px a 150 en un seul
  //    drawImage fait echantillonner un pixel sur huit : les traits fins et
  //    le texte circulaire se hachent. Le lissage du navigateur ne rattrape
  //    pas un facteur pareil. On descend PAR MOITIES, ce qui moyenne les
  //    pixels a chaque passe, et la derniere marche finit au format voulu.
  const densite = Math.min(globalThis.devicePixelRatio || 1, 3);
  const echelle = Math.min(COTE / image.largeur, COTE / image.hauteur, 1) * densite;
  const toile = document.createElement('canvas');
  toile.width = Math.max(1, Math.round(image.largeur * echelle));
  toile.height = Math.max(1, Math.round(image.hauteur * echelle));
  const source = document.createElement('canvas');
  source.width = image.largeur;
  source.height = image.hauteur;
  const octets = new Uint8ClampedArray(image.donnees);
  // UN LOGO BLANC EST INVISIBLE SUR NOTRE CARTE BLANCHE, et le visiteur croit
  // que le site n'a rien lu. On le TEINTE pour le montrer, arbitrage Alex du
  // 24/08/2026, et on ecrit sous la vignette que la couleur n'est pas la
  // sienne : une image trafiquee sans legende est un mensonge, la meme avec sa
  // legende est un instrument de mesure.
  const teinte = mesures ? teinterSiClair(octets, mesures) : false;
  const données = new ImageData(octets, image.largeur, image.hauteur);
  source.getContext('2d').putImageData(données, 0, 0);
  const pinceau = toile.getContext('2d');
  pinceau.imageSmoothingEnabled = true;
  pinceau.imageSmoothingQuality = 'high';
  pinceau.drawImage(reduireParMoities(source, toile.width, toile.height),
                    0, 0, toile.width, toile.height);
  zone.classList.add('depot-analyse');
  passerEnModeResultat(true);
  zone.innerHTML = `<img class="vignette" alt="Le logo que vous venez de déposer"
    src="${toile.toDataURL('image/png')}">
    ${teinte ? `<span class="vignette-teinte">Votre logo est blanc. Il est affiché
    en rose pour être visible ici : ce n'est pas sa couleur.</span>` : ''}
    <span>Cliquez pour essayer un autre logo.</span>`;
}

/**
 * LA TEINTE DE REPERE, et pourquoi elle n'est pas une couleur de la charte.
 *
 * Le rose #E5387E ne dit AUCUN etat : il n'est ni le vert du favorable, ni
 * l'orange de l'action, ni le rouge du bloquant. C'est exactement ce qu'on lui
 * demande. Il ne juge rien, il rend visible, comme le crayon bleu d'un
 * imprimeur sur une epreuve. Le confondre avec une couleur d'identite serait
 * casser la regle semantique du site.
 *
 * On ne teinte QUE les pixels clairs, et seulement quand le logo entier l'est :
 * un logo fonce portant un lettrage blanc garde ses vraies couleurs, parce
 * qu'il se voit deja.
 */
const ROSE_REPERE = [229, 56, 126];

function teinterSiClair(octets, mesures) {
  if (!logoClair(mesures)) return false;
  for (let i = 0; i < octets.length; i += 4) {
    if (octets[i + 3] < 8) continue;
    // Meme formule de luminance que le verdict : deux definitions du « clair »
    // dans un meme ecran donneraient une vignette qui contredit sa legende.
    const c = [octets[i], octets[i + 1], octets[i + 2]].map((x) => {
      const n = x / 255;
      return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    });
    if (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] <= 0.72) continue;
    octets[i] = ROSE_REPERE[0];
    octets[i + 1] = ROSE_REPERE[1];
    octets[i + 2] = ROSE_REPERE[2];
  }
  return true;
}

/**
 * LA REDUCTION PAR MOITIES.
 *
 * Tant que la source fait plus du double de la cible, on la divise par deux.
 * Chaque passe moyenne quatre pixels en un, donc rien ne se perd : c'est la
 * difference entre une vignette lisse et une vignette hachee. On s'arrete au
 * dernier facteur deux, et le drawImage final fait la marche restante.
 *
 * Trois passes suffisent a couvrir tous les cas reels : un logo de 4000 px
 * ramene a 300 tient en deux moities plus la marche finale.
 */
function reduireParMoities(source, cibleL, cibleH) {
  let courant = source;
  while (courant.width >= cibleL * 2 && courant.height >= cibleH * 2) {
    const demi = document.createElement('canvas');
    demi.width = Math.max(1, Math.floor(courant.width / 2));
    demi.height = Math.max(1, Math.floor(courant.height / 2));
    const p = demi.getContext('2d');
    p.imageSmoothingEnabled = true;
    p.imageSmoothingQuality = 'high';
    p.drawImage(courant, 0, 0, demi.width, demi.height);
    courant = demi;
  }
  return courant;
}

function rendreLaZoneDeDepot() {
  const zone = $('depot');
  passerEnModeResultat(false);
  if (!zone || depotOrigine === null) return;
  attenteEnCours = false;
  zone.removeAttribute('aria-busy');
  zone.classList.remove('depot-analyse');
  zone.classList.remove('depot-attente');
  zone.innerHTML = depotOrigine;
}

/**
 * LA PRESENTATION SORT DE L'ECRAN DE RESULTAT, arbitrage Alex du 24/08/2026.
 *
 * « Ce que fait cet outil », « ce qu'il ne fait pas » et les questions
 * frequentes repondent a quelqu'un qui HESITE a deposer. Une fois le fichier
 * depose, ces trois blocs se lisent comme du remplissage derriere un verdict,
 * et ils poussent la grille loin du haut de page.
 *
 * ILS NE SONT PAS SUPPRIMES, ILS SONT MASQUES. Le HTML servi les garde mot
 * pour mot, avec leur balisage FAQPage : ce que les moteurs lisent ne change
 * pas d'une ligne, et le visiteur qui arrive sans rien deposer les voit
 * toujours. Ils reviennent des qu'on redepose un autre logo.
 */
function passerEnModeResultat(actif) {
  const bloc = $('presentation');
  if (bloc) bloc.hidden = actif;
  // L'ACCROCHE AUSSI, mesure du 25/08/2026. Elle explique QUOI DEPOSER a
  // quelqu'un qui vient de deposer. Sur un telephone elle coute huit lignes,
  // et il fallait faire defiler 983 pixels avant de voir la reponse, soit un
  // ecran et demi. C'est la meme faute que « Ce qu'il ne fait pas » et les
  // questions frequentes, au meme endroit, corrigee de la meme facon : rien
  // n'est supprime du document, tout revient au fichier suivant.
  for (const p of document.querySelectorAll('.accroche')) p.hidden = actif;
}

function reinitialiser() {
  // Ces blocs sont REMPLIS par le traitement : on les vide. Ceux qui
  // n'existent pas sur la page courante (/vectoriser n'a pas de diagnostic)
  // sont simplement ignores.
  for (const id of ['erreur', 'avertissements', 'mesures', 'verdict', 'resultat',
                    'fait_principal', 'couleurs', 'fiche', 'conseils', 'decouverte']) {
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
  // Les volets se referment ET se cachent : un volet ouvert sur le contenu du
  // fichier precedent serait la meme faute que les boutons qui survivaient a
  // un refus, corrigee le 19/08.
  for (const volet of document.querySelectorAll('details.volet')) {
    volet.hidden = true;
    volet.open = false;
  }
  // Meme raison pour la largeur de marquage : son champ et son ecouteur sont
  // poses une seule fois au demarrage. On masque la section, on ne la vide pas.
  const largeur = $('largeur');
  if (largeur) largeur.hidden = true;
  const apercu = $('apercu');
  if (apercu) apercu.innerHTML = '';
  rendreLaZoneDeDepot();
  etat = { nom: null, image: null, fiche: null, mesures: null, programme: null, svg: null,
           verdict: null, selection: null, fichierEtat: null,
           telechargementDemande: false, avertissements: [] };
}

/**
 * LES TELECHARGEMENTS NE S'IMPOSENT PLUS, arbitrage Alex du 24/08/2026.
 *
 * CE QUI N'ALLAIT PAS : la page finissait sur « Télécharger le .eps » alors que
 * la personne n'avait rien demande. Elle etait venue savoir si son logo etait
 * bon a marquer ; le site lui rendait un fichier qu'elle n'avait pas reclame,
 * et l'ecran de diagnostic se terminait sur un acte commercial.
 *
 * CE QUI NE CHANGE PAS : la vectorisation, elle, se fait quand meme, en fond.
 * Faire attendre le visiteur APRES son clic serait payer deux fois le meme
 * calcul en temps de perception. Le fichier est pret, il n'est pas montre.
 *
 * SUR /vectoriser, aucune retenue : la page ne fait que ca, la personne y est
 * venue pour ca, et lui cacher le resultat serait absurde.
 */
function revelerTelechargements() {
  const bloc = $('telechargements');
  if (!bloc) return;
  if (!etat.programme) return;
  if (modeVectoriser() || etat.telechargementDemande) bloc.hidden = false;
}

/**
 * LA DEMANDE EXPLICITE. Tous les appels a l'action pointent vers la meme ancre,
 * qu'ils viennent d'une carte de feu ou du bandeau : un seul ecouteur delegue
 * les couvre tous, et les fonctions de rendu restent PURES, sans une ligne de
 * comportement dedans.
 *
 * Le clic peut arriver AVANT la fin de la vectorisation : on note la demande,
 * et `revelerTelechargements()` la respectera quand le fichier sera pret.
 */
function ecouterLaDemandeDeFichier() {
  document.addEventListener('click', (e) => {
    const lien = e.target.closest?.('a[href="#telechargements"]');
    if (!lien) return;
    etat.telechargementDemande = true;
    revelerTelechargements();
  });
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

/**
 * LA TAILLE QUE PORTERA LE FICHIER LIVRE, dite au visiteur avant qu'il clique.
 *
 * Elle se lit dans la MEME fonction que celle qui ecrit les fichiers : une
 * seule source, sinon la page annoncerait une taille et le fichier en porterait
 * une autre, ce qui est exactement le genre d'ecart qui ne se voit jamais.
 */
function tailleLivree(programme) {
  if (!programme?.largeur || !programme?.hauteur) return null;
  const largeurMm = largeurLivreeMm(programme, largeurDeMarquage());
  const hauteurMm = (programme.hauteur / programme.largeur) * largeurMm;
  return `${nb(largeurMm, 1)} × ${nb(hauteurMm, 1)} mm`;
}

/** Re-mesure a partir de l'image deja lue, sans redemander le fichier. */
function remesurer() {
  if (!etat.image) return;
  const mesures = mesurer(etat.image, { largeurImprimeeMm: largeurDeMarquage() });
  etat.mesures = mesures;
  afficherCouleurs(mesures);
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
  devoiler('fiche');
}

/**
 * L'ECRAN D'UN EPS, arbitrage Alex du 24/08/2026.
 *
 * TROIS PARTS, ET L'ORDRE COMPTE : ce qu'on sait, ce qu'on ne sait pas, ce
 * qu'il peut faire. La deuxieme est la plus importante, et c'est celle qu'un
 * autre site supprimerait.
 *
 * ON NE DIT PAS QUE LE LOGO EST BON. On dit que le FORMAT est le bon, ce qui
 * est vrai et verifiable dans l'en-tete, et on dit qu'on ne sait rien du
 * DESSIN, ce qui est vrai aussi : un EPS peut porter douze couleurs, un
 * degrade, un trait de cinq centiemes de millimetre, et rien de tout cela
 * n'est ecrit dans l'en-tete. Confondre le format et le dessin serait
 * exactement le mensonge que ce site refuse, et ce serait le pire endroit
 * pour le faire, parce que c'est la personne la mieux equipee du parcours.
 */
function afficherFichePostscript(e) {
  const taille = e.largeurMm
    ? `Il mesure <b>${Math.round(e.largeurMm)} × ${Math.round(e.hauteurMm)} mm</b> `
      + 'à sa taille d\'origine, ce qui ne limite rien : un fichier vectoriel '
      + 'se réduit et s\'agrandit sans jamais perdre en netteté.'
    : '';
  const logiciel = e.createur
    ? `<p class="note">Écrit par ${echapperTexte(e.createur)}.</p>` : '';
  const tete = $('fait_principal');
  if (!tete) return;
  tete.innerHTML = `<div class="verdict-tete reponse-format">
    <p class="fait-reponse">Votre fichier est déjà vectoriel. C'est le format que
    votre marqueur réclame.</p>
    <p class="fait-couleurs">${taille}</p>
  </div>
  <div class="encadre eps-limite">
    <p><b>En revanche, nous ne savons pas encore lire son contenu.</b> Un EPS est un
    programme, pas une image : pour savoir ce qu'il dessine, il faut l'exécuter, et
    aucun navigateur ne sait le faire. Nous ne pouvons donc pas vous dire combien
    votre logo a de couleurs, s'il tient en une seule, ni si son trait le plus fin
    passera. <b>Le format est bon ; sur le dessin, nous ne nous prononçons pas.</b></p>
    <p>Pour obtenir le diagnostic complet, deux chemins. Si vous avez Illustrator ou
    un logiciel équivalent, exportez le même logo en <b>PDF</b> et déposez-le ici :
    tout fonctionne. Sinon, demandez le PDF à qui vous a fourni cet EPS, c'est
    l'affaire de deux minutes pour lui.</p>
    <p class="note">Et si vous ne voulez rien faire de plus : envoyez cet EPS tel quel
    à votre marqueur. C'est un fichier qu'il sait ouvrir.</p>
  </div>`;
  tete.hidden = false;
  passerEnModeResultat(true);
}

const echapperTexte = (t) => String(t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Les conseils d'impression : un fait mesure, une mecanique de procede.
 * Ils ne dependent d'AUCUN seuil arbitre, c'est pour cela qu'ils peuvent
 * s'afficher aujourd'hui alors que le verdict, lui, attend encore.
 */
function afficherConseils(mesures, fiche) {
  const liste = conseiller(mesures, fiche);
  if (!liste.length) { $('conseils').hidden = true; return; }
  // UNE PHRASE PAR POINT, arbitrage Alex du 24/08/2026. Chaque point tenait en
  // un titre et deux paragraphes : six points faisaient dix huit blocs de
  // texte apres le verdict, et « c'est pompeux, un peu illisible ». Le fait et
  // la mecanique restent DEUX champs, parce que la doctrine du site est de ne
  // jamais donner une mecanique sans la mesure qui la declenche : ils se
  // rendent maintenant sur la meme ligne.
  $('conseils').innerHTML = `
    <h2>Ce que votre fichier implique au marquage</h2>
    <p class="note">Ce ne sont pas des verdicts : chaque ligne croise une mesure de
    votre fichier avec une mécanique de procédé.</p>
    <ul class="conseils">${liste.map((c) => `<li class="conseil">
      <b>${c.titre}.</b> <span class="fait">${c.fait}</span>
      <span class="mecanique">${c.mecanique}</span>
    </li>`).join('')}</ul>`;
  devoiler('conseils');
}

async function traiter(fichier) {
  reinitialiser();
  $('travail').hidden = false;
  poserAttente('Lecture du fichier');
  // L'etape courante est suivie explicitement : quand quelque chose casse chez
  // un visiteur, savoir A QUEL MOMENT vaut plus que le message d'erreur lui
  // meme. Le 18/08, un rapport disant seulement "TextDecoder" a coute une heure
  // de recherche faute de savoir si la lecture, la mesure ou la vectorisation
  // avait echoue.
  let etape = 'lecture du fichier';
  direEtape('Lecture du fichier');

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

    // L'EPS N'EST PLUS RENVOYE SANS RIEN, arbitrage Alex du 24/08/2026. On ne
    // sait toujours pas l'executer, donc on ne juge pas son dessin. Mais son
    // en-tete est du texte en clair, et il porte deux verites : la taille du
    // logo et le logiciel qui l'a ecrit. Les dire coute zero dependance, et ca
    // change tout pour celui qui arrive avec le fichier que son marqueur
    // reclame et qu'on lui refusait a l'entree.
    if (nature === 'postscript') {
      const entete = lireEnteteEps(await fichier.arrayBuffer());
      if (entete) {
        afficherFichePostscript(entete);
        terminerAttente();
        return;
      }
    }

    let image;
    if (nature === 'pdf') {
      etape = 'lecture du fichier vectoriel';
      direEtape('Lecture du fichier vectoriel');
      const lu = await lireVectoriel(fichier);
      image = lu.image;
      etat.fiche = lu.fiche;
    } else {
      image = await lireImage(fichier);
    }

    etape = 'mesure';
    direEtape('Mesure');
    const mesures = mesurer(image, { largeurImprimeeMm: largeurDeMarquage() });
    etat.image = image;
    etat.mesures = mesures;
    // §7.1 : le logo prend la place de la zone de depot, des que l'analyse a
    // eu lieu. Avant la vectorisation, qui peut echouer : ce qui est confirme
    // ici, c'est le fichier analyse, pas le fichier produit.
    poserVignette(image, mesures);
    etat.nom = (fichier.name || 'logo').replace(/\.[^.]+$/, '');
    // LA PREMIERE QUESTION DU DIAGNOSTIC : ce fichier passe-t-il, en l'etat ?
    // (arbitrage Alex du 20/08). L'origine se connait ici ; pour une image, le
    // sort de la vectorisation se connait plus bas, et le bandeau est re-rendu
    // a ce moment la.
    etat.fichierEtat = nature === 'pdf'
      ? { origine: etat.fiche?.faux_vectoriel ? 'faux_vectoriel' : 'vectoriel' }
      : { origine: 'image', vectorise: null };

    // SUR /VECTORISER, PAS DE DIAGNOSTIC. La page promet une seule chose,
    // vectoriser, et elle ne fait que ca. Les mesures ont quand meme eu lieu :
    // la vectorisation en a besoin pour choisir ses options et pour refuser ce
    // qui doit l'etre.
    if (!modeVectoriser()) {
      const largeur = $('largeur');
      if (largeur) devoiler('largeur');
      afficherFiche(etat.fiche);
      afficherCouleurs(mesures);
      afficherMesures(mesures, image);
      afficherConseils(mesures, etat.fiche);
      await afficherVerdict(mesures);
    }

    // UN FICHIER DEJA VECTORIEL S'ARRETE ICI, et c'est le coeur de la
    // separation des deux metiers. Il a ete mesure, situe, conseille. On ne
    // lui propose aucun telechargement : lui rendre une version tracee de son
    // propre vectoriel serait lui rendre une copie degradee de ce qu'il a
    // deja.
    if (nature === 'pdf') {
      // Sur /vectoriser, il faut le DIRE : la page n'affiche pas de fiche, et
      // un depot qui ne produit rien ressemblerait a une panne. Ce fichier n'a
      // pas besoin d'etre vectorise, et c'est une bonne nouvelle.
      if (modeVectoriser()) {
        $('resultat').innerHTML = `
          <h2>Ce fichier est déjà vectoriel</h2>
          <p class="gris">Il n'y a rien à vectoriser : vous avez déjà ce que cette page
          fabrique. Pour savoir sur quoi et à quelle taille le marquer,
          <a href="/">évaluez votre logo</a>.</p>`;
        devoiler('resultat');
      }
      terminerAttente();
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
      devoiler('resultat');
      terminerAttente();
      etat.fichierEtat = { origine: 'image', vectorise: false };
      rendreLeVerdict();
      return;
    }

    etape = 'chargement du vectoriseur';
    direEtape('Chargement du vectoriseur');
    await chargerVectoriseur();

    etape = 'vectorisation';
    direEtape('Vectorisation');
    // Les dimensions viennent de la PREPARATION, pas de l'image : le tampon
    // peut etre la grille fine du sur echantillonnage.
    const svg = vectorize_rgba(new Uint8Array(prepare.pixels.buffer), prepare.largeur, prepare.hauteur, prepare.options);
    etape = 'lecture des chemins';
    etat.programme = construireProgramme(svg, prepare.options);
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
      devoiler('resultat');
      terminerAttente();
      etat.fichierEtat = { origine: 'image', vectorise: false };
      rendreLeVerdict();
      return;
    }
    $('apercu').innerHTML = etat.svg;
    // L'APERCU NE GROSSIT JAMAIS LA SOURCE, idee d'Alexandre du 26/08. Un
    // logo de 416 px etire sur toute la colonne montre chaque defaut a
    // 220 pour cent ; affiche a sa taille, il montre ce que le fichier sait
    // faire. L'agrandissement reste possible dans le logiciel du client,
    // c'est son geste, pas le notre.
    {
      const svgApercu = $('apercu').querySelector('svg');
      if (svgApercu && etat.programme?.largeur) {
        svgApercu.style.maxWidth = etat.programme.largeur + 'px';
        svgApercu.style.width = '100%';
        svgApercu.style.height = 'auto';
      }
    }
    $('resultat').innerHTML = `
      <h2>Votre fichier vectoriel</h2>
      ${ligne('Formes', nb(inv.formes))}
      ${etat.programme.poussiere?.formes
        ? ligne('Poussière retirée', nb(etat.programme.poussiere.formes) + ' formes',
                'des taches plus petites que deux pixels dans les deux sens, '
                + 'issues de la compression de votre image')
        : ''}
      ${ligne('Couleurs du fichier livré', nb(inv.couleurs))}
      ${ligne('Segments', nb(inv.segments))}
      ${ligne('Taille déclarée du fichier', tailleLivree(etat.programme),
              largeurDeMarquage() ? 'la largeur que vous avez indiquée'
                                  : 'un point de départ, à redimensionner sans perte')}
      <p class="note">
        Les fabricants de goodies demandent du .eps ou du .ai, et refusent le
        SVG dans la plupart des cas. Le SVG reste téléchargeable, pour votre
        site web.
      </p>
    `;
    devoiler('resultat');
    revelerTelechargements();
    terminerAttente();
    // Le .eps existe desormais : l'action peut le promettre et pointer vers le
    // bas de page.
    etat.fichierEtat = { origine: 'image', vectorise: true };
    rendreLeVerdict();
    // PARTIE D DU BRIEF DU 21/08 : sur /vectoriser, la decouverte arrive APRES
    // la remise du fichier, jamais avant. Le visiteur a ce qu'il venait
    // chercher ; on lui propose alors de voir CE logo sur un objet reel, et le
    // fichier qu'on vient de fabriquer part avec lui.
    afficherDecouverte();
  } catch (e) {
    terminerAttente();
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
  // toutes les valeurs en dessous. Le champ n'existe pas sur /vectoriser.
  $('largeur_mm')?.addEventListener('input', () => remesurer());

  // Le menu deroulant des produits, en DELEGATION sur le conteneur : le HTML
  // du verdict est reconstruit a chaque rendu, un ecouteur pose sur le select
  // lui meme partirait avec lui. L'ecouteur vit sur #verdict, qui est statique.
  $('verdict')?.addEventListener('change', (e) => {
    if (e.target?.id === 'choix_produit') {
      etat.selection = { produit: e.target.value || null, variante: null };
      rendreLeVerdict();
    } else if (e.target?.id === 'choix_variante') {
      etat.selection = { ...(etat.selection ?? {}), variante: e.target.value || null };
      rendreLeVerdict();
    }
  });

  // Les appels a l'action ne s'affichent pas tout seuls : ils se demandent.
  ecouterLaDemandeDeFichier();

  // LA LARGEUR SAISIE ATTEINT ENFIN LE FICHIER LIVRE, 26/08/2026. Elle servait
  // au diagnostic et s'arretait la : les deux appels ci-dessous ne passaient
  // que le titre. Une personne qui prend la peine de dire « je marque sur
  // 60 mm » recevait un fichier qui l'ignorait.
  $('telecharger_eps').addEventListener('click', () => {
    telecharger(versEps(etat.programme, { titre: etat.nom, largeurMm: largeurDeMarquage() }),
                `${etat.nom}.eps`, 'application/postscript');
  });
  $('telecharger_pdf').addEventListener('click', () => {
    telecharger(versPdf(etat.programme, { titre: etat.nom, largeurMm: largeurDeMarquage() }),
                `${etat.nom}.pdf`, 'application/pdf');
  });
  $('telecharger_svg').addEventListener('click', () => {
    telecharger(etat.svg, `${etat.nom}.svg`, 'image/svg+xml');
  });

  // LE BOUTON DE COPIE DU BRIEF, lot 1 du 21/08. La personne colle le texte
  // dans son mail a son graphiste : cout nul, valeur immediate, et le texte
  // emporte notre raisonnement chez un professionnel qui decouvre le site.
  document.addEventListener('click', async (evenement) => {
    const bouton = evenement.target?.closest?.('.feu-copier');
    if (!bouton) return;
    try {
      await navigator.clipboard.writeText(bouton.dataset.copier ?? '');
      bouton.textContent = 'Copié';
      setTimeout(() => { bouton.textContent = 'Copier ce brief'; }, 2000);
    } catch {
      // Un presse-papier refuse ne doit pas casser la page : le texte reste
      // lisible et selectionnable a l'ecran, c'est la sortie de secours.
      bouton.textContent = 'Sélectionnez le texte pour le copier';
    }
  });

  // C4 DU BRIEF DU 21/08 : LA SUITE, POUR LE VISITEUR LE PLUS CHAUD DU
  // PARCOURS, QUI N'EN AVAIT AUCUNE.
  //
  // Le bloc est rendu avec le verdict, donc apres coup : on ecoute au niveau
  // du document plutot que sur un bouton qui n'existe pas encore au demarrage.
  //
  // AUCUN ENVOI AUTOMATIQUE. On compose un message dans le logiciel de courrier
  // du visiteur, il le relit, il l'envoie. Le fichier ne part pas, le diagnostic
  // l'accompagne, et la promesse « rien ne quitte votre machine » tient : c'est
  // lui qui envoie, pas nous.
  document.addEventListener('click', (evenement) => {
    if (evenement.target?.id !== 'suite_envoyer') return;
    const email = $('suite_email')?.value.trim() ?? '';
    const objet = $('suite_mot')?.value.trim() ?? '';
    location.href = `mailto:${CONTACT}?subject=${encodeURIComponent('Demande de prix')}`
      + `&body=${encodeURIComponent(corpsDeLaDemande(email, objet))}`;
  });
}

/**
 * LE MESSAGE PRE-REMPLI : ce que le repondant a besoin de savoir avant meme
 * d'ouvrir un fichier. Le diagnostic, jamais le logo.
 */
function corpsDeLaDemande(email, objet) {
  const m = etat.mesures;
  const lignes = ['Bonjour,', ''];
  lignes.push(objet ? `Je voudrais un prix pour : ${objet}.` : 'Je voudrais un prix pour un marquage.');
  lignes.push('');
  lignes.push('Voici le diagnostic de mon logo, fait sur bonamarquer.fr :');
  if (m?.m2Couleurs) lignes.push(`- ${m.m2Couleurs.couleursReelles} couleur(s) réelle(s)`);
  if (etat.fichierEtat) {
    lignes.push(etat.fichierEtat.origine === 'vectoriel'
      ? '- fichier déjà vectoriel'
      : `- image${etat.fichierEtat.vectorise === true ? ', vectorisée par l\'outil' : ''}`);
  }
  for (const p of etat.juges ?? []) {
    if (p.etat === 'oui' && p.meilleure) {
      lignes.push(`- ${p.libelle} : ${p.meilleure.zone}, en ${p.meilleure.technique.toLowerCase()}, `
        + `${p.meilleure.taille.largeurMm} × ${p.meilleure.taille.hauteurMm} mm`);
    }
  }
  lignes.push('', email ? `Vous pouvez me répondre à ${email}.` : 'Merci de me répondre à cette adresse.');
  return lignes.join('\n');
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
    // Chemin ABSOLU : avec `document.baseURI`, la page /vectoriser/ demandait
    // /vectoriser/vtracer_wasm_bg.wasm, qui n'existe pas. Le fichier est
    // unique et vit a la racine, l'URL doit le dire.
    promesseVectoriseur = initialiser(new URL('/vtracer_wasm_bg.wasm', document.baseURI));
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
