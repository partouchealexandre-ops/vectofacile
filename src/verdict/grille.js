/**
 * LE VERDICT PAR PRODUIT.
 *
 * Pivot du 20/08/2026, decide par Alex apres essai du site en ligne. Personne
 * n'arrive en se demandant « puis-je faire de la tampographie ». On arrive en
 * se demandant « est-ce que mon logo passe sur ce mug ». L'axe devient donc le
 * produit reel ; la technique redevient une explication, jamais une entree.
 *
 * CE QUI REND CE VERDICT POSSIBLE AUJOURD'HUI, sans attendre un seul arbitrage :
 * il ne croise que des faits deja disponibles des deux cotes.
 *
 *   le nombre de couleurs du logo         mesure par notre moteur
 *   les couleurs acceptees sur une zone   donnee fournisseur, par zone
 *   la taille de la zone                  donnee fournisseur, en millimetres
 *
 * La finesse de trait, elle, reste dehors : elle demande les seuils P0 qui ne
 * sont pas rendus. Un critere absent ne se devine pas, il se tait.
 *
 * Fonction PURE : pas de DOM, pas de fetch. Elle se teste dans node.
 */

/** Une zone accepte-t-elle ce nombre de couleurs ? */
function accepte(technique, nCouleurs) {
  // couleursMax null = quadrichromie, sans limite de separation. C'est la
  // traduction du 0 de la source, faite une fois a la derivation : ici, null
  // veut dire « autant que vous voulez », jamais « aucune ».
  if (technique.couleursMax === null || technique.couleursMax === undefined) return true;
  if (!Number.isInteger(nCouleurs) || nCouleurs <= 0) return true;
  return nCouleurs <= technique.couleursMax;
}

/**
 * LA TAILLE REELLE DU MARQUAGE, et c'est le calcul qui remplace la question
 * qu'on posait au visiteur.
 *
 * On lui demandait « sur quelle largeur allez-vous marquer ». Il ne le savait
 * pas, et pour cause : ce n'est pas lui qui decide, c'est la zone du produit.
 * Un logo garde ses proportions, on l'inscrit donc au plus grand dans la zone,
 * et la taille de marquage tombe toute seule.
 */
export function tailleDansZone(zone, ratio) {
  if (!Number.isFinite(ratio) || ratio <= 0) return null;
  const largeur = Math.min(zone.largeurMm, zone.hauteurMm * ratio);
  return {
    largeurMm: Math.round(largeur),
    hauteurMm: Math.round(largeur / ratio),
    // Ce qui limite : la largeur de la zone, ou sa hauteur. Le stylo est le cas
    // d'ecole, ses cinq zones font 7 mm de haut et c'est la hauteur qui decide.
    limitePar: zone.largeurMm <= zone.hauteurMm * ratio ? 'largeur' : 'hauteur',
  };
}

/** Toutes les offres d'un produit : une par couple zone x technique. */
function offres(produit, nCouleurs, ratio) {
  const liste = [];
  for (const zone of produit.zones) {
    const taille = tailleDansZone(zone, ratio);
    for (const technique of zone.techniques) {
      liste.push({
        zone: zone.libelle,
        largeurZoneMm: zone.largeurMm,
        hauteurZoneMm: zone.hauteurMm,
        technique: technique.technique,
        parDefaut: Boolean(technique.parDefaut),
        couleursMax: technique.couleursMax ?? null,
        quadri: technique.couleursMax === null || technique.couleursMax === undefined,
        accepte: accepte(technique, nCouleurs),
        taille,
        // La surface reellement marquee, c'est elle qui classe les offres. Une
        // zone large mais basse ne vaut pas mieux qu'une zone carree plus
        // petite : ce que le visiteur voit, c'est la taille de son logo.
        surface: taille ? taille.largeurMm * taille.hauteurMm : zone.largeurMm * zone.hauteurMm,
      });
    }
  }
  return liste.sort((a, b) => b.surface - a.surface);
}

/**
 * QUELLE OFFRE RECOMMANDER, quand plusieurs conviennent.
 *
 * La plus grande n'est pas toujours la bonne. Sur un gobelet a sangle, la
 * sangle offre trois centimetres carres de plus que la face avant : la
 * classer premiere serait arithmetiquement juste et commercialement absurde,
 * personne ne marque un logo sur une sangle quand la face est libre.
 *
 * La donnee fournisseur porte la reponse : chaque zone declare SA technique
 * par defaut, celle que le grossiste propose en standard. On recommande donc
 * parmi les offres par defaut, et on ne descend vers les autres que si aucune
 * n'accepte le logo. Ce n'est pas une preference de notre part, c'est celle du
 * fabricant, lue dans ses donnees.
 */
function recommander(passantes) {
  const parDefaut = passantes.filter((o) => o.parDefaut);
  return (parDefaut.length ? parDefaut : passantes)[0] ?? null;
}

/**
 * LE CONSEIL CHIFFRE quand rien ne passe.
 *
 * Un refus sec n'aide personne. Si le logo compte neuf couleurs et que la
 * meilleure zone en accepte quatre, la phrase utile n'est pas « refuse », elle
 * est « a quatre couleurs, cette zone s'ouvre ». On rend donc le palier le plus
 * haut du produit, et combien d'offres il ouvrirait.
 */
function palierQuiOuvre(toutes, produit) {
  const plafonds = [...new Set(toutes.filter((o) => !o.quadri).map((o) => o.couleursMax))]
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => b - a);
  if (!plafonds.length) return null;
  const seuil = plafonds[0];
  const ouvertes = toutes.filter((o) => o.quadri || o.couleursMax >= seuil);
  return { couleurs: seuil, zones: new Set(ouvertes.map((o) => o.zone)).size };
}

/**
 * Juge UN produit.
 *
 * Trois etats, et le troisieme est le plus precieux : « ca passe si » designe
 * un visiteur qui a un probleme ET le bouton qui le regle sous les yeux.
 */
export function jugerProduit(produit, { nCouleurs, ratio, fichierVectoriel }) {
  const toutes = offres(produit, nCouleurs, ratio);
  const passantes = toutes.filter((o) => o.accepte);
  const meilleure = recommander(passantes);
  const plusGrande = toutes[0] ?? null;

  // « PAS LA, MAIS LA » : la plus grande zone du produit ne prend pas ce logo,
  // une autre oui. C'est le moment ou le site cesse d'etre un juge et devient
  // un conseiller, et il ne se dit qu'apres avoir essaye TOUTES les zones.
  const ailleurs = Boolean(meilleure && plusGrande && !plusGrande.accepte
    && meilleure.zone !== plusGrande.zone);

  let etat = 'non';
  if (meilleure) etat = fichierVectoriel === false ? 'si' : 'oui';

  return {
    famille: produit.famille,
    libelle: produit.libelle,
    silhouette: produit.silhouette,
    etat,
    meilleure,
    refusee: ailleurs ? plusGrande : null,
    // On compte des EMPLACEMENTS, pas des offres. Un t-shirt a cinq zones ;
    // annoncer « 18 emplacements » parce que cinq techniques s'y appliquent
    // serait un chiffre juste et un mensonge d'usage.
    zonesQuiPassent: new Set(passantes.map((o) => o.zone)).size,
    zonesTotal: new Set(produit.zones.map((z) => z.libelle)).size,
    offresTotal: toutes.length,
    palier: meilleure ? null : palierQuiOuvre(toutes, produit),
    // Le plafond de couleurs le plus genereux du produit, pour dire la raison
    // d'un refus sans avoir a fouiller les offres a l'affichage.
    plafond: toutes.some((o) => o.quadri) ? null
      : Math.max(...toutes.map((o) => o.couleursMax ?? 0)),
  };
}

/**
 * La grille entiere, dans l'ordre qui sert le visiteur : ce qui passe d'abord,
 * ce qui passe sous condition ensuite, ce qui ne passe pas en dernier. Un
 * refus ne se met pas en tete de page.
 */
export function jugerGrille(grille, contexte) {
  const rang = { oui: 0, si: 1, non: 2 };
  return (grille?.produits ?? [])
    .map((p) => jugerProduit(p, contexte))
    .sort((a, b) => rang[a.etat] - rang[b.etat]
      || (b.meilleure?.surface ?? 0) - (a.meilleure?.surface ?? 0));
}
