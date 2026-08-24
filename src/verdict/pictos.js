/**
 * LA BIBLIOTHEQUE DE PICTOGRAMMES.
 *
 * Direction visuelle du 24/08/2026, « piste 3 compacte ». La grille de feux
 * cessait d'etre lue parce qu'elle etait du texte, puis du texte, puis du
 * texte. Le picto de technique et les puces d'objets sont ce qui rend une carte
 * BALAYABLE : on reconnait un t-shirt avant d'avoir lu « transfert numerique ».
 *
 * UN SEUL LANGAGE GRAPHIQUE, et il est celui de la charte :
 *   viewBox 0 0 64 64, fill none, stroke currentColor, stroke-width 2.5,
 *   jointures et extremites arrondies, silhouettes de CONTOUR, jamais pleines.
 * Aucune bibliotheque tierce : un jeu d'icones importe amenerait son propre
 * dessin, ses propres graisses, et le site aurait deux mains.
 *
 * LA REGLE QUI COMPTE, arbitrage Alex du 24/08/2026 : quand un produit nouveau
 * n'a pas de picto, ON N'EN INVENTE PAS. Il retombe sur `defaut` et
 * `pictosManquants()` le remonte, avec son motif, pour que le dessin soit
 * commande dans le meme langage. Une icone improvisee dans un autre style coute
 * plus cher a rattraper qu'un rond neutre pendant une semaine.
 *
 * Fonction PURE : pas de DOM, pas de fetch. Elle se teste dans node.
 */

/**
 * LES SEPT PICTOS DE TECHNIQUE, un par cle de TECHNIQUES_FEUX. Ils ne decrivent
 * pas la machine, ils decrivent LE GESTE : le laser descend sur la matiere, la
 * broderie est un cercle a broder traverse de points, le transfert descend du
 * film vers le textile.
 */
export const PICTOS_TECHNIQUE = Object.freeze({
  numerique_uv: '<rect x="12" y="15" width="40" height="34" rx="5"/><path d="M22 26h20M22 33h13M22 40h18"/>',
  transfert_dtf: '<path d="M14 15h36v18H14z"/><path d="M20 48h24M32 33v15"/><path d="m24 40 8 8 8-8"/>',
  serigraphie: '<rect x="11" y="14" width="42" height="24" rx="2"/><path d="M18 24h28M24 50h16M32 38v12"/>',
  tampographie: '<path d="M18 16h28l6 10H12z"/><path d="M20 26v11c0 8 4.8 14 12 14s12-6 12-14V26"/><path d="M24 56h16"/>',
  gravure_laser: '<path d="M10 18h18M36 18h18M32 10v16"/><path d="m20 50 12-24 12 24"/><path d="M16 56h32"/>',
  broderie: '<circle cx="32" cy="32" r="18"/><path d="M20 32h24M32 20v24M22 22l20 20M42 22 22 42"/>',
  marquage_a_chaud: '<path d="M18 12h28v12H18z"/><path d="M22 24v10h20V24"/><path d="M14 48h36v8H14z"/><path d="M20 34h24v14H20z"/>',
});

/**
 * LES PICTOS D'OBJET. Vingt cinq dessins pour vingt neuf produits : plusieurs
 * objets partagent legitimement une silhouette, une gourde et une gourde inox
 * sont la meme forme, et ceux la sont declares dans PARTAGES_VOULUS. Les autres
 * sont des manques, et le harnais les reclame.
 */
export const PICTOS_OBJET = Object.freeze({
  stylo: '<path d="m15 49 11-3 22-22-8-8-22 22z"/><path d="m40 24 8 8"/>',
  gourde: '<path d="M25 10h14v7l4 7v26H21V24l4-7z"/><path d="M25 28h14"/>',
  textile: '<path d="m22 14-12 7 7 10 5-3v22h20V28l5 3 7-10-12-7c-2 4-6 5-10 5s-8-1-10-5z"/>',
  sac: '<path d="M16 24h32l3 28H13z"/><path d="M24 24a8 8 0 0 1 16 0"/>',
  casquette: '<path d="M15 36c0-14 7-22 17-22s17 8 17 22"/><path d="M15 36h34c5 0 8 2 10 5H27c-8 0-12-2-12-5z"/>',
  mug: '<path d="M15 16h28v30H15z"/><path d="M43 24h6a8 8 0 0 1 0 16h-6"/>',
  carnet: '<rect x="16" y="10" width="32" height="44" rx="3"/><path d="M24 10v44M30 22h10M30 30h10"/>',
  porte_cles: '<circle cx="22" cy="32" r="8"/><path d="M30 32h22M46 32v8M38 32v6"/>',
  usb: '<rect x="14" y="23" width="28" height="18" rx="4"/><path d="M42 27h8v10h-8"/>',
  batterie: '<rect x="14" y="18" width="36" height="28" rx="4"/><path d="M26 24v16M38 24v16"/>',
  regle: '<path d="M14 42 42 14l12 12-28 28z"/><path d="m34 22 5 5M26 30l5 5M42 14l5 5"/>',
  parapluie: '<path d="M8 30a24 24 0 0 1 48 0H8z"/><path d="M32 30v16c0 5 8 5 8 0"/>',
  bois: '<rect x="16" y="10" width="32" height="44" rx="4"/><path d="M26 10v44M38 10v44"/>',
  cuir: '<path d="M18 14h28l6 10-5 26H17l-5-26z"/><path d="M24 24h16"/>',
  serviette: '<path d="M16 12h32v40H16z"/><path d="M16 40h32M24 12v40"/>',
  bonnet: '<path d="M18 38V26a14 14 0 0 1 28 0v12"/><path d="M14 38h36v12H14z"/><circle cx="32" cy="12" r="3"/>',
  etui: '<rect x="14" y="18" width="36" height="30" rx="4"/><path d="M24 18v-6h16v6M14 32h36"/>',
  // LOT COMPLEMENTAIRE DU 24/08/2026, commande apres le rapport du harnais.
  // `etui_fin` porte volontairement une cle distincte de `etui` : redessiner
  // `etui` aurait change en silence le picto du boitier et de la trousse, qui
  // n'ont rien demande. Un dessin nouveau prend une cle nouvelle.
  chargeur: '<rect x="18" y="15" width="28" height="31" rx="5"/><path d="M26 15V9M38 15V9"/><path d="M28 26h8"/><path d="M32 22v8"/><path d="M25 46v7M39 46v7"/>',
  sweat: '<path d="M23 15 14 20 8 34l9 4 5-10v23h20V28l5 10 9-4-6-14-9-5"/><path d="M23 15c1 5 5 8 9 8s8-3 9-8"/><path d="M22 44h20"/>',
  sac_a_dos: '<path d="M20 24c0-8 5-13 12-13s12 5 12 13"/><rect x="15" y="21" width="34" height="34" rx="8"/><path d="M23 35h18v12H23z"/><path d="M15 30h-4v17h4M49 30h4v17h-4"/><path d="M26 21v-5h12v5"/>',
  briquet: '<rect x="18" y="24" width="28" height="31" rx="4"/><path d="M23 24v-8h17v8"/><path d="M40 17h7"/><circle cx="28" cy="20" r="3"/><path d="M43 13c4 4 4 8 0 11-3-2-5-4-4-7 1-2 2-3 4-4z"/>',
  agenda: '<rect x="14" y="14" width="36" height="40" rx="4"/><path d="M22 10v9M32 10v9M42 10v9"/><path d="M14 24h36"/><path d="M22 32h5M33 32h5M22 40h5M33 40h5"/>',
  etui_fin: '<rect x="12" y="20" width="40" height="27" rx="7"/><path d="M16 25 32 36l16-11"/><path d="M24 47v5h16v-5"/>',
  sous_main: '<rect x="8" y="15" width="48" height="34" rx="5"/><path d="M16 42h32"/><path d="m39 23 8 8"/><path d="m37 25 8 8"/><path d="M36 34l11-11"/>',
  defaut: '<circle cx="32" cy="32" r="18"/><path d="M24 32h16M32 24v16"/>',
});

/**
 * LA TABLE DE TRADUCTION objet vers picto. La cle est le libelle EXACT servi
 * par TECHNIQUES_FEUX : si un libelle change, le picto tombe sur `defaut` et
 * `pictosManquants()` le dit, plutot que de laisser passer un silence.
 */
export const PICTO_PAR_PRODUIT = Object.freeze({
  'stylo': 'stylo',
  'stylo métal': 'stylo',
  'powerbank': 'batterie',
  'chargeur': 'chargeur',
  'gourde': 'gourde',
  'gourde inox': 'gourde',
  'règle': 'regle',
  'boîtier': 'etui',
  't-shirt': 'textile',
  'sweat': 'sweat',
  'polo': 'textile',
  'tote bag': 'sac',
  'sac à dos': 'sac_a_dos',
  'sac en toile': 'sac',
  'casquette': 'casquette',
  'bonnet': 'bonnet',
  'parapluie': 'parapluie',
  'mug': 'mug',
  'carnet': 'carnet',
  'agenda': 'agenda',
  'briquet': 'briquet',
  'clé USB': 'usb',
  'porte-clés': 'porte_cles',
  'objet en bois': 'bois',
  'cuir': 'cuir',
  'serviette': 'serviette',
  'trousse': 'etui',
  'étui': 'etui_fin',
  'sous-main': 'sous_main',
});

/**
 * LES PARTAGES VOULUS, et pourquoi ils ne sont pas des manques.
 *
 * Deux objets qui partagent un picto DANS LA MEME CARTE donnent deux puces
 * identiques cote a cote : le picto cesse alors d'informer, il decore. C'est le
 * seul critere qui declenche une commande de dessin, et il est mecanique :
 * `pictosManquants()` le recalcule sur les donnees reelles, il ne lit jamais
 * cette liste.
 *
 * Ceux ci partagent une silhouette a dessein, et aucun ne se retrouve deux fois
 * dans la meme carte. Une gourde et une gourde inox ont la meme forme ; un
 * stylo metal est un stylo. Les redessiner separement ferait sept variantes du
 * meme trait pour une difference que personne ne verrait a 15 px.
 *
 * Le lot du 24/08/2026 a ferme les sept vrais manques : le rapport sort vide.
 */
export const PARTAGES_VOULUS = Object.freeze([
  { produit: 'gourde inox', partageAvec: 'gourde' },
  { produit: 'stylo métal', partageAvec: 'stylo' },
  { produit: 'polo', partageAvec: 't-shirt' },
  { produit: 'sac en toile', partageAvec: 'tote bag' },
  { produit: 'boîtier', partageAvec: 'trousse' },
]);

/** Le picto d'un produit, ou `defaut` si le libelle n'est pas dans la table. */
export function pictoProduit(nom) {
  return PICTO_PAR_PRODUIT[String(nom).trim()] ?? 'defaut';
}

/** La liste des objets d'une ligne, depuis la chaine servie par les donnees. */
export function objets(produits) {
  return String(produits ?? '').split(',').map((p) => p.trim()).filter(Boolean);
}

/**
 * LE RAPPORT DES PICTOS A COMMANDER, calcule sur les donnees reelles.
 *
 * Deux motifs, et un seul des deux est une opinion :
 *   `absent`   le produit tombe sur `defaut` : il n'a aucun dessin ;
 *   `doublon`  deux produits de LA MEME carte portent le meme picto, donc deux
 *              puces identiques se suivent a l'ecran.
 *
 * On ne remonte jamais un partage de picto entre deux cartes differentes : une
 * gourde en numerique et une gourde inox en gravure ne se voient pas ensemble.
 */
export function pictosManquants(techniques) {
  const rapport = [];
  const vu = new Set();
  for (const t of techniques ?? []) {
    const liste = objets(t.produits);
    const parPicto = new Map();
    for (const nom of liste) {
      const cle = pictoProduit(nom);
      if (cle === 'defaut' && !vu.has(nom)) {
        vu.add(nom);
        rapport.push({ produit: nom, motif: 'absent', technique: t.nom });
      }
      if (!parPicto.has(cle)) parPicto.set(cle, []);
      parPicto.get(cle).push(nom);
    }
    for (const [cle, noms] of parPicto) {
      if (cle === 'defaut' || noms.length < 2) continue;
      // Le premier garde le picto, les suivants sont ceux a dessiner.
      for (const nom of noms.slice(1)) {
        if (vu.has(nom)) continue;
        vu.add(nom);
        rapport.push({ produit: nom, motif: 'doublon', technique: t.nom, partageAvec: noms[0] });
      }
    }
  }
  return rapport;
}

/**
 * LE SPRITE, pose UNE FOIS dans la page. Vingt-cinq dessins repetes dans
 * quarante-neuf puces feraient une page trois fois plus lourde pour rien : les
 * puces referencent le sprite par `<use>`.
 *
 * Il est hors flux et masque aux lecteurs d'ecran : ce sont des dessins de
 * decoration, le nom de l'objet est ecrit a cote en toutes lettres.
 */
export function spritePictos() {
  const symbole = (prefixe, cle, dessin) =>
    `<symbol id="${prefixe}-${cle}" viewBox="0 0 64 64">${dessin}</symbol>`;
  const tech = Object.entries(PICTOS_TECHNIQUE)
    .map(([cle, d]) => symbole('pt', cle, d)).join('');
  const obj = Object.entries(PICTOS_OBJET)
    .map(([cle, d]) => symbole('po', cle, d)).join('');
  return `<svg class="sprite-pictos" aria-hidden="true" focusable="false"
  xmlns="http://www.w3.org/2000/svg">${tech}${obj}</svg>`;
}

/** Une reference au sprite, avec la classe qui porte le trait de la charte. */
export function usePicto(id, classe) {
  return `<svg class="picto ${classe}" viewBox="0 0 64 64" aria-hidden="true"
  focusable="false"><use href="#${id}"></use></svg>`;
}
