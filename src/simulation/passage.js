/**
 * LE LOGO QUI SUIT LE VISITEUR D'UNE PAGE A L'AUTRE, 26/08/2026.
 *
 * CE QUI N'ALLAIT PAS. Sous le fichier livre, /vectoriser proposait deux
 * cartes de matieres et un bouton « voir toutes les matieres pour ce logo »
 * qui menait a la page d'accueil, c'est a dire nulle part : il fallait
 * redeposer son fichier pour retrouver quoi que ce soit. Pendant ce temps le
 * site porte un simulateur qui pose un logo sur un objet reel, a la taille
 * declaree par le fabricant. Arbitrage d'Alex du 26/08 : apres la remise du
 * fichier, on propose LE SIMULATEUR, et le logo suit.
 *
 * LE LOGO NE SORT PAS DU NAVIGATEUR, ET CE MODULE EST LA PREUVE. Il n'y a ici
 * ni requete, ni envoi, ni cookie : le stockage de session appartient a
 * l'onglet, meurt avec lui, et n'est jamais transmis a un serveur. C'est la
 * meme promesse que le reste du site, tenue par le meme moyen : rien ne part.
 *
 * UNE SEULE CLE, ECRITE ICI ET NULLE PART AILLEURS. Deux pages se parlent a
 * travers ce module ; si chacune ecrivait son nom de cle, la premiere faute de
 * frappe donnerait un simulateur vide sans la moindre erreur a l'ecran.
 *
 * ON NE CONSOMME PAS CE QU'ON LIT. Un visiteur qui recharge /voir-mon-logo
 * doit retrouver son logo pose, pas une zone de depot vide : la reprise
 * n'efface donc rien. Le depot suivant remplace le precedent, et l'onglet
 * ferme emporte le tout.
 */

const CLE = 'bonamarquer.logo-vectorise.v1';

/**
 * Depose le logo pour la page suivante.
 * @returns {boolean} vrai si le depot a reussi, et c'est la seule promesse
 *   qu'on peut tenir : le stockage peut etre plein ou interdit, et l'ecran ne
 *   doit alors pas annoncer que le logo suivra.
 */
export function deposerLogo(png, nom = null) {
  if (typeof png !== 'string' || !png) return false;
  try {
    sessionStorage.setItem(CLE, JSON.stringify({ png, nom }));
    return true;
  } catch (e) {
    return false;
  }
}

/** Le logo depose par la page precedente, ou null s'il n'y en a pas. */
export function reprendreLogo() {
  try {
    const brut = sessionStorage.getItem(CLE);
    if (!brut) return null;
    const valeur = JSON.parse(brut);
    if (!valeur || typeof valeur.png !== 'string' || !valeur.png) return null;
    return { png: valeur.png, nom: typeof valeur.nom === 'string' ? valeur.nom : null };
  } catch (e) {
    return null;
  }
}

/** Oublie le logo depose. Sert au harnais, et a qui voudra un ecran vierge. */
export function oublierLogo() {
  try { sessionStorage.removeItem(CLE); } catch (e) { /* rien a oublier */ }
}
