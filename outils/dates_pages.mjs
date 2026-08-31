/**
 * LA DATE DE CHAQUE PAGE, ECRITE A UN SEUL ENDROIT.
 *
 * Un moteur qui ne peut pas dater une page la classe derriere une page datee a
 * contenu egal, et un moteur de reponse ne cite pas volontiers une donnee dont
 * il ignore l'age. Or les quatorze pages qui portent l'actif du site, les sept
 * fiches du guide et les sept questions, ne portaient jusqu'ici ni date ni
 * auteur : seuls les deux articles du journal en avaient, parce qu'eux
 * declarent un champ date dans leur propre fichier.
 *
 * POURQUOI UNE TABLE, ET PAS UN CHAMP DANS CHAQUE FICHIER DE CONTENU. Les sept
 * fiches vivent dans un seul fichier, les sept questions dans cinq. Le fil
 * contenu y ecrit tous les jours. Poser une date au milieu de son texte
 * fabriquerait un conflit a chaque livraison croisee. La table est ici, dans
 * outils/, ou vit deja tout ce qui fabrique le balisage.
 *
 * POURQUOI PAS UNE DATE CALCULEE DEPUIS GIT. Netlify construit sur un clone
 * superficiel : l'historique n'y est pas garanti. Une date qui vaut une chose
 * en local et une autre en production est pire que pas de date.
 *
 * D'OU VIENNENT CES VALEURS. Elles sont mesurees, pas choisies : publiee est la
 * date du commit qui a cree le fichier de la page, modifiee celle du dernier
 * commit qui l'a touche, relevees le 01/09/2026.
 *
 * COMMENT ON LA TIENT A JOUR. Quand une page change pour de vrai, on avance sa
 * date modifiee ici, dans la meme livraison. Une date qui ne bouge jamais reste
 * vraie ; une date avancee a chaque construction serait fausse tous les jours.
 * La construction refuse de sortir si une fiche ou une question n'a pas sa
 * ligne : c'est un controle sur ce qui doit etre la, jamais sur une absence.
 *
 * Format ISO 8601, AAAA-MM-JJ, celui que schema.org et le sitemap attendent
 * tous les deux.
 */

export const DATES_PAGES = {
  // Les sept fiches du guide vivent dans contenu/guide/techniques.mjs.
  '/guide/serigraphie': { publiee: '2026-08-19', modifiee: '2026-08-20' },
  '/guide/tampographie': { publiee: '2026-08-19', modifiee: '2026-08-20' },
  '/guide/gravure-laser': { publiee: '2026-08-19', modifiee: '2026-08-20' },
  '/guide/broderie': { publiee: '2026-08-19', modifiee: '2026-08-20' },
  '/guide/impression-numerique-uv': { publiee: '2026-08-19', modifiee: '2026-08-20' },
  '/guide/transfert-dtf': { publiee: '2026-08-19', modifiee: '2026-08-20' },
  '/guide/marquage-a-chaud': { publiee: '2026-08-19', modifiee: '2026-08-20' },

  // Les sept questions, reparties dans cinq fichiers de contenu/questions/.
  '/questions/mon-imprimeur-demande-un-fichier-vectoriel': { publiee: '2026-08-19', modifiee: '2026-08-31' },
  '/questions/comment-vectoriser-un-jpeg': { publiee: '2026-08-19', modifiee: '2026-08-31' },
  '/questions/combien-de-couleurs-a-mon-logo': { publiee: '2026-08-19', modifiee: '2026-08-31' },
  '/questions/comment-savoir-si-mon-pdf-est-vectoriel': { publiee: '2026-08-19', modifiee: '2026-08-25' },
  '/questions/eps-ai-pdf-svg-quelle-difference': { publiee: '2026-08-19', modifiee: '2026-08-25' },
  '/questions/comment-ouvrir-un-fichier-ai': { publiee: '2026-08-20', modifiee: '2026-08-20' },
  '/questions/comment-ouvrir-un-fichier-eps': { publiee: '2026-08-20', modifiee: '2026-08-20' },

  // Le referentiel. Sa donnee est datable, sinon elle n'est pas reprenable.
  '/referentiel': { publiee: '2026-09-01', modifiee: '2026-09-01' },

  // Les trois index et les trois pages d'institution. Ils n'ont pas d'article,
  // mais le sitemap gagne a savoir quand ils ont bouge.
  '/guide/': { publiee: '2026-08-19', modifiee: '2026-08-20' },
  '/questions/': { publiee: '2026-08-19', modifiee: '2026-08-31' },
  '/blog/': { publiee: '2026-08-31', modifiee: '2026-08-31' },
  '/qui-sommes-nous': { publiee: '2026-08-19', modifiee: '2026-08-31' },
  '/mentions-legales': { publiee: '2026-08-19', modifiee: '2026-08-31' },
  '/confidentialite': { publiee: '2026-08-19', modifiee: '2026-08-26' },
};

/**
 * Les familles dont CHAQUE page doit porter une date. Ecrit comme une liste de
 * ce qui doit etre present, et pas comme l'absence d'un manque : un controle
 * ecrit en negation passe au vert sur du vide.
 */
export const FAMILLES_DATEES = [/^\/guide\/.+/, /^\/questions\/.+/, /^\/referentiel$/];

/**
 * Les dates d'une page : celles que la page porte elle-meme si elle en porte
 * (le journal), sinon celles de la table. Une seule fonction, pour que le
 * balisage et le sitemap ne puissent pas repondre deux choses differentes.
 */
export function datesDe(page) {
  if (page.date) return { publiee: page.date, modifiee: page.dateModifiee ?? page.date };
  return DATES_PAGES[page.url] ?? null;
}
