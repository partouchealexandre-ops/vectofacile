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
 * CORRECTIF DU 20/08/2026, brief matieres et techniques, §1. Un quatrieme fait
 * entre dans le croisement, et il ouvre des portes au lieu d'en fermer : ce que
 * la technique demande AU FICHIER. Les techniques qui fabriquent un outil
 * exigent des courbes ; celles qui impriment une image se contentent d'une
 * image nette. Un JPEG net passe donc TEL QUEL sur les secondes, et le site
 * cesse de repondre « non » a quelqu'un dont le fichier fonctionne deja.
 *
 * Fonction PURE : pas de DOM, pas de fetch. Elle se teste dans node.
 */

import { exigeVectoriel, qualifierDefinition, familleDe, compatibilite, DPI_PLANCHER }
  from './techniques.js';

/**
 * LE PLANCHER DE LISIBILITE, §5 du brief du 20/08.
 *
 * L'ecran affichait « le clip : en tampographie, votre logo ferait 12 × 7 mm ».
 * C'est arithmetiquement juste et commercialement absurde : un logo a trois
 * couleurs sur douze millimetres, personne ne le lit. C'est la meme famille que
 * le « dès 726 mm » de la broderie, un nombre exact et vide de sens.
 *
 * En dessous du plancher, on ne dit donc pas oui. On dit « techniquement
 * possible, mais a cette taille votre logo ne serait plus lisible ».
 *
 * LE SEUIL EST PROVISOIRE ET IL LE DIT. Le vrai seuil depend du contenu du
 * logo, de la presence de texte avant tout, et c'est un arbitrage Alex, §9.1 du
 * brief. En attendant, tout marquage sous 20 mm de large porte la reserve. Ce
 * n'est pas un refus : c'est une reserve, et elle propose la sortie, une
 * version simplifiee du logo.
 */
export const LISIBILITE_MM = 20;

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

/**
 * CE QUE LE FICHIER DEPOSE PERMET SUR CETTE OFFRE, §1 du brief du 20/08.
 *
 * Un vectoriel passe partout : c'est la definition meme du format que les
 * fabricants reclament. Une image passe sur les techniques qui impriment une
 * image, A CONDITION d'etre assez definie POUR CETTE TAILLE : dire oui a un
 * logo de 200 pixels sur une zone de 300 mm serait l'erreur symetrique de
 * celle qu'on corrige.
 *
 * `fichierVectoriel` a trois valeurs et la troisieme compte : true, false, et
 * null quand on ne sait pas encore. Dans le doute on ne bloque pas sur le
 * fichier, on ne juge que les couleurs.
 */
function jugerFichier(nomTechnique, { fichierVectoriel, largeurPx }, taille) {
  if (fichierVectoriel !== false) return { passe: true, definition: null };
  if (exigeVectoriel(nomTechnique)) return { passe: false, definition: null, raison: 'vectoriel' };
  const definition = taille ? qualifierDefinition(largeurPx, taille.largeurMm) : null;
  if (definition === 'insuffisante') return { passe: false, definition, raison: 'definition' };
  return { passe: true, definition };
}

/**
 * Toutes les offres d'un produit : une par couple zone x technique.
 *
 * B1 DU BRIEF DU 20/08 : ce qui est physiquement impossible sur cette matiere
 * n'entre pas dans la liste. La page a affiche « toute la surface : en
 * sublimation » sur une bouteille en acier inoxydable ; la sublimation teint le
 * polyester ou un revetement, pas le metal nu. Une seule affirmation de ce
 * genre suffit a tuer la credibilite d'un site qui veut faire reference.
 */
function offres(produit, nCouleurs, ratio, contexte) {
  const liste = [];
  for (const zone of produit.zones) {
    const taille = tailleDansZone(zone, ratio);
    for (const technique of zone.techniques) {
      const possible = compatibilite(produit.matiere, technique.technique);
      if (possible.etat === 'non') continue;
      const fichier = jugerFichier(technique.technique, contexte, taille);
      liste.push({
        zone: zone.libelle,
        largeurZoneMm: zone.largeurMm,
        hauteurZoneMm: zone.hauteurMm,
        technique: technique.technique,
        parDefaut: Boolean(technique.parDefaut),
        couleursMax: technique.couleursMax ?? null,
        quadri: technique.couleursMax === null || technique.couleursMax === undefined,
        // Deux jugements SEPARES, et ils ne disent pas la meme chose :
        // `accepte` = les couleurs du logo tiennent dans cette offre ;
        // `fichierPasse` = le fichier depose est du bon type, assez defini.
        // Leur croisement donne les trois etats du produit.
        accepte: accepte(technique, nCouleurs),
        exigeVectoriel: exigeVectoriel(technique.technique),
        // `conditionnel` : le procede marche sur cette matiere, mais seulement
        // sur une variante du produit. La condition voyage avec l'offre et
        // s'affiche AVEC elle, jamais separement.
        condition: possible.condition ?? null,
        fichierPasse: fichier.passe,
        definition: fichier.definition,
        bloquePar: fichier.passe ? null : fichier.raison,
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
 * CE QUE LA VECTORISATION AJOUTERAIT SUR UN PRODUIT QUI DIT DEJA OUI.
 *
 * Remplacant exact du peage supprime au §1 du brief du 20/08 : au lieu de
 * barrer la route a une image qui marche, on chiffre ce qu'elle gagnerait a
 * devenir des courbes. Des emplacements en plus, ou, a emplacements egaux, des
 * techniques en plus.
 */
function gainDeVectoriser(etat, couleursOk, zonesTelQuel, zonesVectorise) {
  if (etat !== 'oui') return null;
  const bloquees = couleursOk.filter((o) => !o.fichierPasse);
  if (!bloquees.length) return null;
  const zones = zonesVectorise.size - zonesTelQuel.size;
  return {
    zones,
    techniques: [...new Set(bloquees.map((o) => o.technique))],
    meilleure: recommander(bloquees),
  };
}

/**
 * Juge UN produit.
 *
 * Trois etats, et le troisieme est le plus precieux : « ca passe si » designe
 * un visiteur qui a un probleme ET le bouton qui le regle sous les yeux.
 *
 * DEPUIS LE CORRECTIF DU §1, l'etat se lit sur DEUX questions, pas une :
 *
 *   les couleurs du logo tiennent-elles quelque part sur ce produit ?
 *   le fichier depose convient-il a la technique de cet emplacement ?
 *
 *   oui  = les deux, quelque part. Le visiteur peut commander en l'etat.
 *   si   = les couleurs tiennent, mais partout ou elles tiennent la technique
 *          reclame des courbes. La vectorisation debloque, et elle est ici.
 *   non  = les couleurs ne tiennent nulle part. Vectoriser n'y changerait rien,
 *          c'est le logo qu'il faut simplifier, et on dit a partir de combien.
 *
 * Une image nette peut donc rendre OUI, tel quel. C'etait tout l'objet du
 * correctif : avant, elle rendait « si » partout, y compris la ou son fichier
 * fonctionnait deja.
 */
export function jugerProduit(produit, contexte) {
  const { nCouleurs, ratio } = contexte;
  const toutes = offres(produit, nCouleurs, ratio, contexte);
  // Les couleurs d'abord : c'est le fait du PRODUIT, il ne depend pas du
  // fichier depose et il ne bouge pas si on vectorise.
  const couleursOk = toutes.filter((o) => o.accepte);
  // Puis le fichier : c'est le fait du VISITEUR, et lui, il peut le changer.
  const telQuel = couleursOk.filter((o) => o.fichierPasse);

  const meilleure = recommander(telQuel.length ? telQuel : couleursOk);

  let etat = 'non';
  if (telQuel.length) etat = 'oui';
  else if (couleursOk.length) etat = 'si';

  // POURQUOI CA NE PASSE PAS TEL QUEL, et les deux raisons ne se disent pas
  // pareil. « La technique fabrique un outil, il lui faut des courbes » n'a
  // rien a voir avec « votre image n'a pas assez de pixels pour cette taille ».
  // Sans cette distinction, une carte affiche « oui, avec votre fichier
  // vectoriel » a cote d'un transfert numerique, qui accepte les images : le
  // visiteur y lit une contradiction, et il a raison.
  //
  // Quand les deux raisons jouent en meme temps, c'est la definition qui se
  // dit : elle est plus englobante. Une image trop petite bloque MEME les
  // techniques qui acceptent les images, et c'est le fait que le visiteur a
  // besoin d'entendre ; « il faut des courbes » ne lui apprendrait que la
  // moitie de son probleme.
  const floue = couleursOk.find((o) => o.bloquePar === 'definition') ?? null;
  const raison = etat !== 'si' ? null : (floue ? 'definition' : 'vectoriel');

  // « PAS LA, MAIS LA », et B3 du brief du 20/08 : QUAND LA ZONE PROPOSEE N'EST
  // PAS LA ZONE EVIDENTE, LA CARTE DIT POURQUOI.
  //
  // La casquette annoncait « le côté droit : en transfert numérique » sans un
  // mot sur le devant, alors que tout le monde marque le devant. La raison
  // existait, le devant se brode et la broderie reclame un vectoriel, mais elle
  // etait tue : la carte paraissait absurde alors qu'elle avait raison.
  //
  // La zone evidente est la PREMIERE du produit : la derivation les trie par
  // nombre d'observations, donc c'est celle que les fournisseurs proposent le
  // plus. Ce n'est pas la plus grande, et c'est voulu : sur un gobelet, le tour
  // complet est plus grand que la face avant, personne ne marque le tour.
  const zoneEvidente = produit.zones[0]?.libelle ?? null;
  const surEvidente = toutes.filter((o) => o.zone === zoneEvidente);
  // L'arbitrage ne se dit QUE si la zone evidente est vraiment bloquee. Si
  // elle passe et qu'on propose ailleurs parce que c'est plus grand, « pas sur
  // la face avant » serait faux : elle marche, elle est juste plus petite. Ne
  // pas poser cette condition produisait « Pas sur tout le tour. » sans raison,
  // ce qui est exactement le raisonnement cache que B3 reproche a la page.
  const evidenteRetenable = surEvidente.some((o) => o.accepte && o.fichierPasse);
  // ET LES DEUX LIBELLES NE DOIVENT PAS SE RECOUVRIR. « Sur la face avant,
  // votre image manquerait de pixels. Sur la face avant, en bas, en étiquette
  // numérique » se lit comme une contradiction : le visiteur voit deux fois la
  // meme zone. Quand un libelle est le prefixe de l'autre, ce sont deux
  // decoupes du meme endroit, et l'arbitrage ne s'annonce pas.
  const memeEndroit = meilleure && zoneEvidente
    && (meilleure.zone.startsWith(zoneEvidente) || zoneEvidente.startsWith(meilleure.zone));
  const ecartee = meilleure && zoneEvidente && meilleure.zone !== zoneEvidente
    && !evidenteRetenable && !memeEndroit
    ? (recommander(surEvidente.filter((o) => o.accepte)) ?? recommander(surEvidente))
    : null;

  // La reserve de lisibilite porte sur l'offre RECOMMANDEE : c'est elle que le
  // visiteur lira. Elle ne change pas l'etat, elle le nuance, et elle ne se
  // confond pas avec un refus.
  const reserveLisibilite = Boolean(meilleure?.taille
    && meilleure.taille.largeurMm < LISIBILITE_MM);

  const zonesTelQuel = new Set(telQuel.map((o) => o.zone));
  const zonesVectorise = new Set(couleursOk.map((o) => o.zone));

  return {
    famille: produit.famille,
    // La MATIERE, depuis les archetypes du 21/08 : c'est elle qui decide, le
    // produit n'est que la porte d'entree reconnaissable.
    matiere: produit.matiere ?? null,
    produits: produit.produits ?? null,
    libelle: produit.libelle,
    silhouette: produit.silhouette,
    etat,
    raison,
    reserveLisibilite,
    // L'offre a citer quand c'est la definition qui bloque : celle dont la
    // taille explique le flou, pas forcement celle qu'on recommande.
    offreFloue: raison === 'definition' ? floue : null,
    meilleure,
    // L'offre de la zone evidente qu'on n'a PAS retenue, avec ce qui la bloque.
    // Elle porte l'arbitrage que la carte doit dire a voix haute.
    refusee: ecartee,
    // On compte des EMPLACEMENTS, pas des offres. Un t-shirt a cinq zones ;
    // annoncer « 18 emplacements » parce que cinq techniques s'y appliquent
    // serait un chiffre juste et un mensonge d'usage.
    zonesQuiPassent: (etat === 'oui' ? zonesTelQuel : zonesVectorise).size,
    zonesTotal: new Set(produit.zones.map((z) => z.libelle)).size,
    offresTotal: toutes.length,
    // CE QUE LA VECTORISATION AJOUTERAIT, quand le produit dit deja oui. C'est
    // le remplacant exact du peage supprime : au lieu de barrer la route a une
    // image qui marche, on chiffre ce qu'elle gagnerait a devenir des courbes.
    // Il se compte de DEUX facons, et le t-shirt a impose la seconde : le
    // vectoriel n'y ouvre aucun emplacement de plus, puisque le transfert
    // numerique est deja partout. Ce qu'il ouvre, ce sont des TECHNIQUES sur
    // les memes emplacements, la serigraphie et la broderie. Compter en zones
    // seulement aurait rendu ce gain invisible sur le produit le plus vendu.
    gain: gainDeVectoriser(etat, couleursOk, zonesTelQuel, zonesVectorise),
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
  // La grille accepte les deux formes : les huit references du 20/08 et les
  // archetypes famille x matiere du 21/08, qui les remplacent.
  return (grille?.archetypes ?? grille?.produits ?? [])
    .map((p) => jugerProduit(p, contexte))
    .sort((a, b) => rang[a.etat] - rang[b.etat]
      || (b.meilleure?.surface ?? 0) - (a.meilleure?.surface ?? 0));
}

/**
 * LA REGLE DU CONTRASTE, §4 du brief du 20/08.
 *
 * « Une grille où tout dit oui n'apprend rien, elle décore. » Le constat est
 * tombe le 21/08 sur les archetypes : douze cartes, douze fois « oui ». Ce
 * n'etait pas un bug, c'est la realite du catalogue, presque chaque objet
 * porte quelque part une technique en quadrichromie. Un verdict binaire ne
 * discrimine donc plus rien, et une grille qui ne discrimine rien decore.
 *
 * Toute la valeur est dans la DIVERGENCE, et elle ne se lit pas sur le seul
 * oui/non. Deux cartes qui disent oui n'enseignent pas la meme chose si l'une
 * repond « en broderie, 64 mm » et l'autre « en gravure laser, 11 mm ». La
 * signature d'une carte est donc ce qu'elle apprend : son etat, la FAMILLE de
 * technique recommandee, et l'ordre de grandeur de la taille.
 *
 * On retient un archetype par signature, les plus peuples d'abord, et on
 * complete si la place reste. Le compte des signatures distinctes remonte a
 * l'affichage : quand il tombe a un, la grille doit le dire en une ligne
 * plutot que d'aligner huit cartes identiques.
 */
/** Quatre ordres de grandeur, parce que c'est ce que le visiteur retient. */
function palierDe(p) {
  const mm = p.meilleure?.taille?.largeurMm ?? 0;
  return mm < 20 ? 'minuscule' : mm < 60 ? 'petit' : mm < 150 ? 'moyen' : 'grand';
}

export function signature(p) {
  if (p.etat === 'non') return 'non';
  const technique = familleDe(p.meilleure.technique) ?? p.meilleure.technique;
  return `${p.etat}|${technique}|${palierDe(p)}`;
}

/**
 * LA SIGNATURE VUE PAR L'ACHETEUR, et elle est plus grossiere que l'autre.
 *
 * B4 du brief du 20/08 : deux cartes « sac shopping », coton et polyester
 * recycle, disaient la meme chose. Leurs signatures differaient pourtant, l'une
 * recommandait le transfert numerique et l'autre la serigraphie. Le visiteur,
 * lui, voyait deux sacs, la meme taille, le meme verdict, et apprenait zero.
 *
 * Pour DEUX ARCHETYPES DE LA MEME FAMILLE, il faut donc plus qu'une technique
 * differente : il faut un verdict ou un ordre de grandeur different. Une
 * bouteille en inox et une bouteille en verre passent toutes les deux, parce
 * que l'une se marque sur 200 mm et l'autre sur 55 : ca, ca enseigne.
 */
function signatureVisible(p) {
  return `${p.famille}|${p.etat}|${palierDe(p)}`;
}

export function choisirPourContraste(juges, maximum = 8) {
  const vues = new Set();
  const familles = new Set();
  const retenus = [];
  for (const p of juges) {
    const cle = signature(p);
    const vue = signatureVisible(p);
    if (vues.has(cle) || familles.has(vue)) continue;
    vues.add(cle);
    familles.add(vue);
    retenus.push(p);
  }
  // B4 DU BRIEF DU 20/08 : ON NE COMPLETE PAS AVEC DES DOUBLONS. La premiere
  // version remplissait jusqu'a huit cartes avec les archetypes ecartes, ce qui
  // remettait exactement ce qu'on venait d'ecarter : deux sacs shopping, coton
  // et polyester recycle, disaient mot pour mot la meme phrase. Une place vide
  // vaut mieux qu'une carte qui n'apprend rien. Le tri de jugerGrille tient :
  // ce qui passe d'abord, ce qui passe sous condition ensuite, le reste apres.
  return { choisis: retenus.slice(0, maximum), signatures: vues.size, total: juges.length };
}
