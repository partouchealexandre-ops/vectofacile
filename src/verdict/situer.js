/**
 * SITUER UNE MESURE DANS LES VALEURS PUBLIEES.
 *
 * Pourquoi ce module existe, et pourquoi il rend caduque une partie de
 * l'attente : pendant deux jours le diagnostic n'a rien dit, et on a cru que
 * la cause etait l'absence d'un SEUIL par technique. C'etait une hypothese, et
 * elle etait fausse.
 *
 * La doctrine dit qu'une valeur SOURCEE sert un verdict, au meme titre qu'une
 * valeur ARBITREE ALEX. Depuis l'arbitrage P0.3 du 19/08, on sait lesquelles
 * sont admissibles : celles dont la source nomme une matiere. Il y en a
 * soixante-deux. Elles avaient donc le droit de parler.
 *
 * Ce qui manquait n'etait pas la donnee, c'etait la question. « Quel est LE
 * seuil de la serigraphie ? » n'a pas de reponse honnete : vingt-et-une
 * sources publient de 0,18 mm sur un sac plastique a 1,00 mm sur de la toile
 * de jute, et elles ont toutes raison, parce qu'elles ne parlent pas de la
 * meme matiere.
 *
 * « Le trait du visiteur tient-il, et sur quelles matieres ? » a une reponse,
 * et elle ne demande aucun arbitrage : on compare, matiere par matiere, et on
 * dit sur lesquelles ca tient. Rien n'est moyenne, rien n'est choisi a la
 * place d'une autre valeur, et chaque ligne garde son URL.
 *
 * Fonction PURE. Pas de DOM, pas de fetch, aucune valeur en dur : tout vient
 * de valeurs_sourcees.json.
 */

/**
 * Situe une mesure en millimetres dans une liste de valeurs publiees.
 *
 * Les valeurs sont des MINIMUMS : la mesure tient quand elle est superieure ou
 * egale. La liste est supposee triee par mm croissants, mais on ne s'y fie
 * pas : un fichier de donnees mal trie ne doit pas produire un faux verdict.
 */
export function situerMinimum(mesureMm, valeurs) {
  const liste = Array.isArray(valeurs) ? [...valeurs].sort((a, b) => a.mm - b.mm) : [];

  if (!liste.length) {
    return { etat: 'sans_valeurs', mesure: mesureMm, total: 0,
             tiennent: [], ne_tiennent_pas: [] };
  }

  const min = liste[0].mm;
  const max = liste[liste.length - 1].mm;
  const commun = { mesure: mesureMm, total: liste.length, min, max, valeurs: liste };

  if (mesureMm === null || mesureMm === undefined || !Number.isFinite(mesureMm)) {
    return { ...commun, etat: 'sans_mesure', tiennent: [], ne_tiennent_pas: [] };
  }

  const tiennent = liste.filter((v) => mesureMm >= v.mm);
  const ne_tiennent_pas = liste.filter((v) => mesureMm < v.mm);

  let etat = 'partiel';
  if (!ne_tiennent_pas.length) etat = 'au_dessus';
  else if (!tiennent.length) etat = 'au_dessous';

  return { ...commun, etat, tiennent, ne_tiennent_pas };
}

/**
 * Les matieres distinctes d'une liste de valeurs, dans l'ordre ou elles
 * apparaissent, sans doublon. Deux sources qui nomment « textile » ne font pas
 * deux matieres : le visiteur compte des matieres, pas des pages web.
 */
export function matieres(valeurs) {
  const vues = new Set();
  const sortie = [];
  for (const v of valeurs || []) {
    const m = (v.support || '').trim();
    if (!m || vues.has(m)) continue;
    vues.add(m);
    sortie.push(m);
  }
  return sortie;
}

/**
 * Situe toutes les techniques d'un fichier de valeurs sourcees.
 * `lire` extrait la mesure en mm du critere concerne.
 */
export function situerTechniques(mesures, valeursSourcees, critere = 'trait_minimal',
                                 lire = (m) => m?.m5TraitLePlusFin?.encadrementMm?.basse ?? null) {
  const mesure = lire(mesures);
  const techniques = valeursSourcees?.techniques ?? {};
  const sortie = {};
  for (const [cle, t] of Object.entries(techniques)) {
    sortie[cle] = {
      libelle: t.libelle,
      critere,
      ...situerMinimum(mesure, t.criteres?.[critere]?.valeurs),
    };
  }
  return sortie;
}
