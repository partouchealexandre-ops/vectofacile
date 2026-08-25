/**
 * LA PAGE /voir-mon-logo : elle n'assemble rien elle-meme.
 *
 * Tout le comportement vit dans `panneau.js`, qui ne connait aucune page. Ce
 * fichier fait trois choses et s'arrete : il charge le lot, il monte le
 * panneau, il branche le depot de fichier. C'est ce qui permettra de monter le
 * meme panneau ailleurs, sous une carte verte de la page de resultat par
 * exemple, sans rien reecrire.
 */
import { monterPanneau } from './panneau.js';
import { verifierLotDerive } from './simulateur.js';

const hote = document.getElementById('simulateur');
const zoneErreur = document.getElementById('erreur');

function echouer(message) {
  if (hote) hote.innerHTML = '';
  if (!zoneErreur) return;
  zoneErreur.hidden = false;
  zoneErreur.textContent = message;
}

/**
 * LA DERNIERE SORTIE DU MODULE, gardee ici et nulle part ailleurs.
 *
 * Elle porte la taille choisie par le visiteur. Le jour ou cette page portera
 * une demande de devis, c'est cet objet qui partira avec, et pas une capture
 * d'ecran dont personne ne saurait dire a quelle taille elle a ete prise.
 */
let derniereSortie = null;
export const sortieCourante = () => derniereSortie;

try {
  const reponse = await fetch('/src/simulation/lot1.json');
  if (!reponse.ok) throw new Error('lot introuvable');
  const lot = await reponse.json();

  // LE LOT SE VERIFIE AVANT DE SERVIR, pas seulement au harnais. Un lot mal
  // derive ferait dire non a des logos qui passent, et ce serait invisible :
  // rien ne planterait, l'ecran afficherait simplement le mauvais verdict.
  const fautes = verifierLotDerive(lot);
  if (fautes.length > 0) throw new Error(fautes[0]);

  const panneau = monterPanneau({
    hote,
    lot,
    surChangement: (sortie) => { derniereSortie = sortie; },
  });

  const champ = document.getElementById('fichier');
  const depot = document.getElementById('depot');

  /**
   * LA ZONE DE DEPOT MONTRE LE LOGO DEPOSE.
   *
   * Sans ca, elle continue de reclamer un fichier qu'on vient de lui donner :
   * le logo apparait sur l'objet, mais rien ne dit que c'est bien LE fichier
   * choisi qui est parti. Meme regle que sur l'accueil, ou la vignette
   * remplace l'appel au depot une fois l'analyse faite.
   */
  const montrerLeLogo = (source, nom) => {
    if (!depot) return;
    depot.classList.add('depot-analyse');
    depot.innerHTML = '';
    const vignette = document.createElement('img');
    vignette.className = 'vignette';
    vignette.src = source;
    vignette.alt = '';
    const titre = document.createElement('strong');
    titre.textContent = nom || 'Votre logo';
    const aide = document.createElement('span');
    aide.textContent = 'Cliquez pour en déposer un autre.';
    depot.append(vignette, titre, aide);
  };

  const poser = (fichier) => {
    if (!fichier) return;
    if (!/^image\//.test(fichier.type)) {
      echouer('Ce format n’est pas une image. Déposez un PNG, un JPEG, un GIF ou un WEBP.');
      return;
    }
    if (zoneErreur) zoneErreur.hidden = true;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      panneau.poserLogo(lecteur.result);
      // LE NOM DU FICHIER RESTE DANS LA PAGE ET N'EN SORT PAS. Il sert au
      // visiteur a reconnaitre ce qu'il a depose ; il n'est ni enregistre, ni
      // transmis, comme le reste.
      montrerLeLogo(lecteur.result, fichier.name);
    };
    lecteur.readAsDataURL(fichier);
  };

  if (depot && champ) {
    depot.addEventListener('click', () => champ.click());
    champ.addEventListener('change', (e) => poser(e.target.files[0]));
    for (const nom of ['dragenter', 'dragover']) {
      depot.addEventListener(nom, (e) => { e.preventDefault(); depot.classList.add('survol'); });
    }
    for (const nom of ['dragleave', 'drop']) {
      depot.addEventListener(nom, (e) => { e.preventDefault(); depot.classList.remove('survol'); });
    }
    depot.addEventListener('drop', (e) => poser(e.dataTransfer?.files?.[0]));
  }
} catch (e) {
  echouer('Les objets n’ont pas pu être chargés. Rechargez la page, '
    + 'ou évaluez votre logo depuis l’accueil.');
}
