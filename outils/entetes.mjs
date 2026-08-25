/**
 * Entetes HTTP et robots du site, en UNE seule source.
 *
 * Le fichier `public/_headers` et le fichier `public/robots.txt` sont GENERES
 * a partir d'ici par la construction, et le harnais de bout en bout sert
 * exactement les memes entetes a Chromium. Le site est donc teste sous sa
 * politique de production, et pas sous une politique de developpement plus
 * permissive qui laisserait la surprise pour le jour de la mise en ligne.
 *
 * Le mecanisme importe autant que les valeurs : une regle de securite qui
 * n'est verifiee que par le serveur de production n'est pas verifiee.
 */

/**
 * Le site est il ouvert aux moteurs de recherche ?
 *
 * A FAUX pour l'instant, et c'est une decision, pas un oubli. Le diagnostic
 * par technique n'existe pas encore, et aucune des pages de contenu prevues
 * n'est ecrite. Publier maintenant en indexable ferait crawler un site dont la
 * seule page dit "pas encore disponible" : on brulerait la premiere impression
 * du domaine pour rien, alors que tout le trafic du projet doit venir du
 * referencement.
 *
 * A passer a VRAI le jour ou la couche verdict et les six guides existent.
 * Ce seul booleen bascule les entetes ET le robots.txt.
 */
export const INDEXABLE = false;

/**
 * LE DOMAINE, EN UN SEUL ENDROIT.
 *
 * Trouvaille de l'audit du 21/08 : les canonicals, le sitemap et les URL du
 * JSON-LD pointent vers vectofacile.netlify.app. C'est normal aujourd'hui et
 * c'est un piege demain. Le jour du .fr, ces trois choses doivent basculer
 * ENSEMBLE ; si elles vivent a trois endroits, l'une des trois sera oubliee, et
 * une canonique qui pointe ailleurs que le sitemap est la faute qui coute le
 * plus longtemps.
 *
 * Les gabarits d'outil, contenu/accueil.html et contenu/vectoriser.html,
 * portent le jeton {{DOMAINE}} et la construction le remplace. Personne ne
 * recopie une URL a la main nulle part.
 */
export const DOMAINE = 'https://vectofacile.netlify.app';

/**
 * LES METADONNEES DE PARTAGE. Sans elles, un lien envoye sur LinkedIn ou dans
 * une conversation sort NU : pas de titre, pas d'image, pas un mot. Pour un
 * outil dont on attend qu'il circule de bouche a oreille entre acheteurs, c'est
 * la difference entre un lien qu'on clique et un lien qu'on ignore.
 */
export function partage({ titre, description, url }) {
  return [
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Bon à Marquer">`,
    `<meta property="og:locale" content="fr_FR">`,
    `<meta property="og:title" content="${titre}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${DOMAINE}${url}">`,
    `<meta property="og:image" content="${DOMAINE}/partage.png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${titre}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${DOMAINE}/partage.png">`,
  ].join('\n');
}

/**
 * Politique de securite du contenu.
 *
 * Elle n'est pas ici pour cocher une case. Le produit promet que le logo du
 * visiteur ne quitte jamais sa machine, et cette promesse est invérifiable sur
 * parole. `connect-src 'self'` la rend MECANIQUE : sous cette politique, la
 * page ne PEUT PAS envoyer quoi que ce soit vers un autre domaine, et
 * n'importe qui peut le constater en lisant les entetes de reponse. La
 * confidentialite cesse d'etre un argument commercial pour devenir un fait
 * observable.
 *
 * Le detail des directives :
 *   default-src 'self'        rien ne vient d'ailleurs, par defaut ;
 *   script-src ... 'wasm-unsafe-eval'  necessaire au vectoriseur WebAssembly,
 *                             et strictement a lui : pas de eval JavaScript ;
 *   style-src ... 'unsafe-inline'  les styles de la page sont en ligne ;
 *   img-src 'self' data: blob:  la vignette du logo depose vit en memoire,
 *                             sous forme de blob, jamais d'une URL distante ;
 *   connect-src 'self'        la ligne qui compte ;
 *   form-action 'none'        aucun formulaire ne peut poster nulle part ;
 *   frame-ancestors 'none'    le site ne peut pas etre encadre par un tiers.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

/** Entetes appliques a toutes les reponses. */
export function entetesGlobales() {
  const entetes = {
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
  if (!INDEXABLE) {
    entetes['X-Robots-Tag'] = 'noindex, nofollow';
  }
  return entetes;
}

/** Contenu du fichier _headers de Netlify. */
export function fichierHeaders() {
  const lignes = [
    '# FICHIER GENERE par outils/construire_site.mjs. Ne pas modifier a la main.',
    '# La source est outils/entetes.mjs, lue aussi par le harnais de bout en bout.',
    '',
    '/*',
  ];
  for (const [nom, valeur] of Object.entries(entetesGlobales())) {
    lignes.push(`  ${nom}: ${valeur}`);
  }
  lignes.push('');
  lignes.push('# Le WebAssembly du vectoriseur ne change qu\'avec la version du paquet.');
  lignes.push('/vtracer_wasm_bg.wasm');
  lignes.push('  Cache-Control: public, max-age=3600');
  lignes.push('');
  lignes.push('# Le lecteur de PDF ne change qu\'avec la version du paquet, lui aussi.');
  lignes.push('# Ceinture en plus des bretelles : le worker est deja partage cote code,');
  lignes.push('# mais un script servi sans cache se re-telecharge au moindre faux pas.');
  lignes.push('/pdfjs/*');
  lignes.push('  Cache-Control: public, max-age=86400');
  lignes.push('');
  return lignes.join('\n');
}

/** Contenu du fichier robots.txt. */
export function fichierRobots() {
  if (!INDEXABLE) {
    return [
      '# FICHIER GENERE. Source : outils/entetes.mjs, constante INDEXABLE.',
      '# L\'indexation reste fermee, et ce n\'est plus parce que le site est vide :',
      '# dix-sept pages de contenu existent, avec leurs tables sourcees. Elle',
      '# attend le domaine definitif. Ouvrir ici construirait l\'autorite sur',
      '# vectofacile.netlify.app, c\'est-a-dire au mauvais endroit, et rien ne se',
      '# transfere proprement apres coup.',
      '#',
      '# La checklist d\'ouverture, aucune etape sautable : domaine achete et',
      '# branche, constante DOMAINE basculee (canonicals, sitemap, JSON-LD),',
      '# adresse de contact operationnelle, meta og: en place, Rich Results vert',
      '# sur chaque gabarit. Alors seulement INDEXABLE passe a vrai.',
      'User-agent: *',
      'Disallow: /',
      '',
    ].join('\n');
  }
  return [
    '# FICHIER GENERE. Source : outils/entetes.mjs, constante INDEXABLE.',
    'User-agent: *',
    'Allow: /',
    '',
    'Sitemap: https://bonamarquer.fr/sitemap.xml',
    '',
  ].join('\n');
}
