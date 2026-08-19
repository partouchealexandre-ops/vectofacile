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
  `;
  $('mesures').hidden = false;
}

/**
 * Le verdict. Les seuils sont charges au moment ou on en a besoin, et un
 * echec de chargement N'EST PAS silencieux : sans seuils, la page dit qu'elle
 * n'a pas pu les lire, elle ne montre pas un diagnostic vide qui ressemblerait
 * a « rien a signaler ».
 */
async function afficherVerdict(mesures) {
  let seuils;
  try {
    const reponse = await fetch('/src/verdict/seuils.json');
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    seuils = await reponse.json();
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

async function traiter(fichier) {
  $('erreur').hidden = true;
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
    await initialiser(new URL('./vtracer_wasm_bg.wasm', document.baseURI));

    etape = 'vectorisation';
    $('travail').textContent = 'Vectorisation';
    const svg = vectorize_rgba(new Uint8Array(prepare.pixels.buffer), image.largeur, image.hauteur, prepare.options);
    etape = 'lecture des chemins';
    etat.programme = construireProgramme(svg);
    // On n'affiche ni ne livre JAMAIS le SVG brut du vectoriseur : il contient
    // des chemins que la grammaire SVG interdit. Voir vectorisation/svg.js.
    etat.svg = versSvg(etat.programme, { titre: etat.nom });
    etat.avertissements = prepare.avertissements;

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
      ${etat.avertissements.map((a) => `<p class="note">${a}</p>`).join('')}
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

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', brancher);
else brancher();

// Exposé pour le test de bout en bout, qui pilote la page sans souris.
globalThis.vecto = { traiter, etat: () => etat };
