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

/**
 * L'INVERSION D'USAGE, 20/08/2026.
 *
 * `situerMinimum` repondait a « mon trait tient-il a CETTE taille ? », et la
 * question supposait que le visiteur connaisse sa taille de marquage. Alex a
 * tranche : il ne la connait presque jamais. La bonne question est l'inverse :
 * « a partir de QUELLE taille ce logo passe-t-il, et sur quoi ? », et elle se
 * calcule sans rien demander.
 *
 * Le calcul est une regle de trois, et chaque choix y est le choix PRUDENT :
 *
 *   L_min = ceil( minimum_publie_mm × largeur_image_px / trait_px )
 *
 *   le trait en pixels est la borne BASSE de l'encadrement : on dimensionne
 *   pour le trait le plus fin que le fichier puisse contenir ;
 *   l'arrondi est SUPERIEUR, au millimetre entier : on ne conseille jamais
 *   une taille qui mettrait le trait un centieme sous le minimum ;
 *   pour une meme matiere citee par plusieurs sources, on garde la PLUS
 *   EXIGEANTE : conseiller la plus laxiste reviendrait a choisir sa source
 *   au confort.
 *
 * Rien n'est moyenne, chaque ligne du resultat garde sa source et sa date :
 * c'est la meme donnee sourcee qu'avant, lue dans l'autre sens.
 */
export function taillesMinimales(traitPx, largeurImagePx, valeurs) {
  const liste = Array.isArray(valeurs) ? valeurs : [];
  if (!liste.length) return { etat: 'sans_valeurs', parSupport: [], total: 0 };

  if (!Number.isFinite(traitPx) || traitPx <= 0
      || !Number.isFinite(largeurImagePx) || largeurImagePx <= 0) {
    // Pas de trait fin mesurable : un logo fait d'aplats. Les minimums
    // d'epaisseur ne le contraignent pas, a aucune taille.
    return { etat: 'sans_trait', parSupport: [], total: liste.length };
  }

  const parMatiere = new Map();
  for (const v of liste) {
    const support = (v.support || '').trim();
    if (!support || !Number.isFinite(v.mm) || v.mm <= 0) continue;
    const actuel = parMatiere.get(support);
    if (!actuel || v.mm > actuel.mm) parMatiere.set(support, v);
  }
  if (!parMatiere.size) return { etat: 'sans_valeurs', parSupport: [], total: liste.length };

  const parSupport = [...parMatiere.values()]
    .map((v) => ({
      support: v.support,
      mm: v.mm,
      source: v.source,
      date: v.date,
      url: v.url ?? null,
      tailleMinMm: Math.ceil((v.mm * largeurImagePx) / traitPx),
    }))
    .sort((a, b) => a.tailleMinMm - b.tailleMinMm
      || a.support.localeCompare(b.support, 'fr'));

  return {
    etat: 'tailles',
    parSupport,
    total: liste.length,
    des: parSupport[0].tailleMinMm,
    jusqu_a: parSupport[parSupport.length - 1].tailleMinMm,
  };
}

/**
 * LA VUE PRODUIT, ARBITRÉ ALEX 20/08/2026.
 *
 * La vue par matiere restait la vue de NOTRE donnee : dix-huit matieres en
 * serigraphie, des supports de packaging au milieu des objets, une source par
 * ligne. Le client, lui, part d'un produit : un tote bag, un mug, un t-shirt.
 * La taxonomie de produits.json reprend les rubriques publiques des grands
 * catalogues d'objets promotionnels, et chaque couple produit x technique
 * reference les lignes sourcees qui le concernent en lecture directe.
 *
 * Deux disciplines, et le harnais les controle :
 *
 *   une reference se resout par le triplet source + support + mm, et elle doit
 *   resoudre EXACTEMENT une ligne de valeurs_sourcees.json : une valeur
 *   corrigee la bas casse bruyamment ici, au lieu de servir une correspondance
 *   perimee en silence ;
 *
 *   la valeur retenue est LA PLUS EXIGEANTE des lignes referencees, meme
 *   prudence que le reste du calcul. Les autres lignes restent portees par le
 *   resultat, pour la rubrique sources.
 *
 * Fonction PURE : elle rend, pour chaque produit et chaque variante, la liste
 * des techniques praticables avec la taille minimale calculee pour CE logo.
 */
export function taillesParProduit(traitPx, largeurImagePx, valeursSourcees, produits) {
  const catalogue = produits?.produits ?? [];
  if (!catalogue.length) return { etat: 'sans_produits', produits: [] };

  const calculable = Number.isFinite(traitPx) && traitPx > 0
    && Number.isFinite(largeurImagePx) && largeurImagePx > 0;

  const resoudre = (technique, ref) => {
    const liste = valeursSourcees?.techniques?.[technique]?.criteres?.trait_minimal?.valeurs ?? [];
    const trouvees = liste.filter((v) => v.source === ref.source
      && v.support === ref.support && v.mm === ref.mm);
    return trouvees.length === 1 ? trouvees[0] : null;
  };

  const calculerTechniques = (techniques) => {
    const sortie = [];
    for (const [cle, spec] of Object.entries(techniques ?? {})) {
      const lignes = (spec.refs ?? []).map((r) => resoudre(cle, r)).filter(Boolean);
      if (!lignes.length) continue;
      // La plus exigeante des lignes referencees.
      const retenue = lignes.reduce((a, b) => (b.mm > a.mm ? b : a));
      sortie.push({
        technique: cle,
        libelle: valeursSourcees?.techniques?.[cle]?.libelle ?? cle,
        note: spec.note ?? null,
        retenue: { mm: retenue.mm, support: retenue.support, source: retenue.source,
                   date: retenue.date, url: retenue.url ?? null },
        lignes,
        tailleMinMm: calculable
          ? Math.ceil((retenue.mm * largeurImagePx) / traitPx) : null,
      });
    }
    sortie.sort((a, b) => (a.tailleMinMm ?? 0) - (b.tailleMinMm ?? 0)
      || a.libelle.localeCompare(b.libelle, 'fr'));
    return sortie;
  };

  const resultat = [];
  for (const p of catalogue) {
    if (Array.isArray(p.variantes)) {
      const variantes = p.variantes
        .map((v) => ({ cle: v.cle, libelle: v.libelle,
                       techniques: calculerTechniques(v.techniques) }))
        .filter((v) => v.techniques.length);
      if (variantes.length) {
        resultat.push({ cle: p.cle, libelle: p.libelle, rubrique: p.rubrique, variantes });
      }
    } else {
      const techniques = calculerTechniques(p.techniques);
      if (techniques.length) {
        resultat.push({ cle: p.cle, libelle: p.libelle, rubrique: p.rubrique, techniques });
      }
    }
  }
  return { etat: calculable ? 'tailles' : 'sans_trait', produits: resultat };
}
