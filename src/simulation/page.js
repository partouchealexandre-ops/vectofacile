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
import { reconnaitre, lireVectoriel, FichierVectorielNonLu }
  from '../adaptateurs/pdf_navigateur.js';
import { reprendreLogo } from './passage.js';

const hote = document.getElementById('simulateur');
const zoneErreur = document.getElementById('erreur');

/**
 * DEUX PANNES, ET ELLES N'ONT PAS LA MEME REPONSE. Separees le 26/08/2026.
 *
 * `echouer` est pour une panne FATALE : le lot ne se charge pas, le panneau ne
 * peut pas exister. Vider l'hote est alors correct, il n'y a rien a montrer.
 *
 * `signaler` est pour un FICHIER qui ne convient pas. Le panneau, lui, va tres
 * bien : les objets sont charges, les emplacements sont la, il suffit de
 * deposer autre chose. L'ancien code appelait `echouer` dans ce cas, et
 * detruisait donc tout le simulateur parce qu'un visiteur avait depose un PDF.
 * On lui retirait l'outil pour le punir d'avoir essaye.
 */
function echouer(message) {
  if (hote) hote.innerHTML = '';
  signaler(message);
}

function signaler(message) {
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

/**
 * LA BOITE D'ENCRE D'UNE TOILE, et pourquoi elle est indispensable ici.
 *
 * Un PDF, c'est une PAGE, pas un dessin. Un logo exporte tout seul remplit sa
 * page ; un logo pris dans une plaquette flotte au milieu d'un A4. Poser la
 * page entiere dans la zone de marquage y mettrait les marges, et annoncerait
 * les millimetres du PAPIER au lieu de ceux du logo.
 *
 * On recadre donc AVANT de poser, jamais apres : recadrer, c'est recalculer,
 * et le calcul qui compte est celui qui suit le recadrage.
 *
 * Le fond rendu par le lecteur est transparent, jamais blanc, decision du
 * module PDF : l'opacite suffit donc a separer l'encre du vide, sans regarder
 * une seule couleur.
 */
function recadrerSurLEncre(toile) {
  const c = toile.getContext('2d', { willReadFrequently: true });
  const { data, width, height } = c.getImageData(0, 0, toile.width, toile.height);
  let gauche = width;
  let haut = height;
  let droite = -1;
  let bas = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 8) continue;
      if (x < gauche) gauche = x;
      if (x > droite) droite = x;
      if (y < haut) haut = y;
      if (y > bas) bas = y;
    }
  }
  // Page entierement vide : on ne recadre pas sur rien. La toile part telle
  // quelle, et le visiteur voit qu'il n'y a pas de dessin dedans.
  if (droite < 0 || bas < 0) return toile;
  const largeur = droite - gauche + 1;
  const hauteur = bas - haut + 1;
  if (largeur === width && hauteur === height) return toile;
  const coupee = document.createElement('canvas');
  coupee.width = largeur;
  coupee.height = hauteur;
  coupee.getContext('2d')
    .drawImage(toile, gauche, haut, largeur, hauteur, 0, 0, largeur, hauteur);
  return coupee;
}

/** Les pixels rendus par le lecteur, remis dans une toile posable. */
function toileDepuisImage(image) {
  const t = document.createElement('canvas');
  t.width = image.largeur;
  t.height = image.hauteur;
  t.getContext('2d').putImageData(
    new ImageData(new Uint8ClampedArray(image.donnees), image.largeur, image.hauteur), 0, 0);
  return t;
}

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

  /**
   * LE DEPOT ACCEPTE MAINTENANT LES VECTORIELS, correctif du 26/08/2026.
   *
   * CE QUI N'ALLAIT PAS, et Alex l'a dit franchement : le site acceptait un
   * PDF ou un .ai sur l'accueil et le refusait un clic plus loin. Ce n'etait
   * pas une regle, c'etait un trou. Cette page testait `fichier.type`, exigeait
   * qu'il commence par `image/`, puis mettait le fichier dans une balise img.
   * Un navigateur ne sait pas afficher un PDF dans une balise img : le fichier
   * le plus propre du parcours, celui de la personne qui a deja son vectoriel,
   * se faisait donc renvoyer.
   *
   * ON LIT LES OCTETS, PAS L'ETIQUETTE. Meme doctrine que sur l'accueil, et
   * pour la meme raison mesuree le 19/08 : le systeme d'Alex annonce un .ai
   * comme `application/postscript` alors que son contenu commence par %PDF.
   * Se fier au type declare refuserait le fichier pour la raison exactement
   * inverse de la vraie.
   *
   * pdf.js pese 3,5 Mo et n'est charge QUE si quelqu'un depose un vectoriel.
   * Qui arrive avec un PNG ne telecharge rien de plus qu'avant.
   */
  const poser = async (fichier) => {
    if (!fichier) return;

    let nature = null;
    try { nature = reconnaitre(await fichier.slice(0, 1024).arrayBuffer()); }
    catch (e) { nature = null; }

    // L'EPS N'EST PAS UN REFUS SEC, il a sa propre sortie. Un EPS est un
    // programme PostScript : pour savoir ce qu'il dessine il faut l'executer,
    // et aucun navigateur ne le fait. On ne dit donc pas « format invalide » a
    // quelqu'un qui tient le fichier que son marqueur reclame ; on lui dit ce
    // qui bloque et ce qui marche.
    if (nature === 'postscript') {
      signaler('Un EPS est un programme PostScript, et aucun navigateur ne sait '
        + 'l’exécuter : nous ne pouvons donc pas en tirer une image à poser. '
        + 'Réenregistrez le même logo en PDF depuis votre logiciel, ou demandez '
        + 'le PDF à qui vous a fourni cet EPS. Tout fonctionnera.');
      return;
    }

    if (nature === 'pdf') {
      if (zoneErreur) zoneErreur.hidden = true;
      try {
        const { image } = await lireVectoriel(fichier);
        const toile = recadrerSurLEncre(toileDepuisImage(image));
        panneau.poserLogo(toile);
        montrerLeLogo(toile.toDataURL('image/png'), fichier.name);
      } catch (e) {
        signaler(e instanceof FichierVectorielNonLu
          ? `Ce fichier vectoriel n’a pas pu être lu : ${e.message}`
          : 'Ce fichier vectoriel n’a pas pu être lu. Réenregistrez-le en PDF, '
            + 'ou déposez une image.');
      }
      return;
    }

    if (!/^image\//.test(fichier.type)) {
      signaler('Ce format n’est pas reconnu. Déposez un PNG, un JPEG, un GIF, '
        + 'un WEBP, un PDF ou un fichier Illustrator.');
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

  /**
   * LE LOGO QUI ARRIVE DE /VECTORISER EST DEJA LA, 26/08/2026.
   *
   * Le visiteur vient de recevoir son fichier et a cliqué sur « voir ce logo
   * sur un objet » : lui redemander son fichier serait lui faire refaire ce
   * qu'il vient de faire. Le dessin l'a suivi dans le stockage de session de
   * son onglet, jamais par le reseau (voir `passage.js`), et il se pose ici
   * comme s'il venait d'etre depose : meme chemin, meme vignette, meme
   * possibilite d'en deposer un autre par dessus.
   *
   * S'il n'y a rien, il n'y a rien : la page reste exactement celle qu'elle
   * etait, avec sa zone de depot. Cette reprise n'ajoute pas d'etat, elle en
   * consomme un s'il existe.
   */
  const repris = reprendreLogo();
  if (repris) {
    panneau.poserLogo(repris.png);
    montrerLeLogo(repris.png, repris.nom ? `${repris.nom} (vectorisé)` : 'Votre logo vectorisé');
  }

  if (depot && champ) {
    depot.addEventListener('click', () => champ.click());
    // Meme regle que sur l'accueil : un role=button repond au clavier.
    depot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        champ.click();
      }
    });
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
