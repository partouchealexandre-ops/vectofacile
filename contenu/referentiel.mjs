/**
 * LA PAGE REFERENTIEL : les valeurs sourcees, rassemblees et balisees.
 *
 * POURQUOI ELLE EXISTE. Les 62 minimums de trait du referentiel sont servis
 * depuis le 20/08, mais eclates sur sept pages de guide. Une machine qui veut
 * la valeur en serigraphie doit visiter sept URL et recoudre. Un moteur de
 * reponse ne recoud pas : il cite ce qu'il trouve d'un bloc. Cette page est ce
 * bloc, et c'est la seule raison de son existence.
 *
 * CE QU'ELLE N'EST PAS. Elle ne rend aucun arbitrage. P0.7 est ouvert depuis le
 * 19/08 et le reste : la page publie ce que des tiers ont publie, avec qui l'a
 * publie et quand, et elle dit qu'elle ne conclut pas. Publier une moyenne des
 * 21 valeurs de serigraphie fabriquerait une donnee que personne n'a mesuree.
 *
 * UNE SEULE SOURCE DE VERITE. Le tableau se genere depuis
 * src/verdict/valeurs_sourcees.json, le fichier exact que le diagnostic lit et
 * que le site sert en clair. Un tableau recopie a la main aurait diverge a la
 * premiere correction, et c'est une page de reference qui aurait menti.
 *
 * LE MILLIMETRE ET LE HARNAIS. `rejouer_pages.mjs` interdit tout chiffre suivi
 * de mm ou cm dans le corps, sauf dans un tableau de classe
 * `minimums-sources` et dans le paragraphe qui le precede immediatement. Cette
 * page n'a donc besoin d'aucune exception : toutes ses valeurs sont dans ce
 * tableau, et pas une seule ailleurs. Si une relecture ajoute une plage dans le
 * chapo « pour rendre la page plus utile », le harnais la refusera, et il aura
 * raison.
 *
 * LE RANG N'EST PAS AFFICHE, et c'est un choix, pas un oubli. Le referentiel
 * classe ses sources en quatre rangs de fiabilite, et ce rang voyage dans le
 * JSON, qui est public. L'afficher en clair a cote d'une societe nommee
 * reviendrait a publier un jugement sur elle, ce que la doctrine du projet
 * interdit. Le rang sert a arbitrer, pas a noter.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOMAINE } from '../outils/entetes.mjs';
/**
 * POURQUOI LE LIEN VERS LE JSON EST ECRIT EN ABSOLU.
 *
 * `construire_pages.mjs` verifie tout href qui commence par une barre oblique
 * contre la liste des pages PUBLIEES, et refuse la construction sinon. C'est un
 * bon controle : il attrape les coquilles dans les liens de corps. Mais il ne
 * connait que des pages, et `valeurs_sourcees.json` est un fichier de donnees,
 * servi depuis public/src/ par la construction elle meme.
 *
 * Ecrire ce lien en absolu le fait sortir du controle des pages sans desactiver
 * ce controle pour les autres liens, et sans demander une exception dans un
 * fichier qui ne m'appartient pas. Le domaine vient de `entetes.mjs`, donc il
 * reste tenu a un seul endroit.
 */

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VALEURS = JSON.parse(fs.readFileSync(
  path.join(RACINE, 'src', 'verdict', 'valeurs_sourcees.json'), 'utf-8'));

const echapper = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const mmTexte = (v) => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');

/**
 * Les lignes, a plat, dans l'ordre du fichier source puis du plus fin au plus
 * epais. L'ordre du fichier est celui des techniques, il ne se trie pas
 * alphabetiquement : un lecteur cherche une technique, pas une lettre.
 */
const LIGNES = Object.entries(VALEURS.techniques).flatMap(([cle, t]) =>
  (t.criteres?.trait_minimal?.valeurs ?? [])
    .slice()
    .sort((a, b) => a.mm - b.mm)
    .map((v) => ({ cle, technique: t.libelle, ...v })));

const TOTAL = LIGNES.length;
const NB_TECHNIQUES = Object.keys(VALEURS.techniques).length;
const NB_SOURCES = new Set(LIGNES.map((l) => l.source)).size;

/** « 19/08/2026 » vers « 2026-08-19 », pour le balisage. Le JSON date en clair. */
function isoDepuisFr(d) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(d ?? ''));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** L'annee d'une date du corpus, qu'elle soit « 2022 » ou « 17/08/2026 ». */
function annee(d) {
  const m = /(\d{4})/.exec(String(d ?? ''));
  return m ? Number(m[1]) : null;
}

const ANNEES = LIGNES.map((l) => annee(l.date)).filter(Boolean);
const COUVERTURE = `${Math.min(...ANNEES)}/${Math.max(...ANNEES)}`;

/** Le tableau de couverture : aucun millimetre, donc lisible partout. */
const TABLE_COUVERTURE = `
<table>
<thead><tr><th>technique</th><th>valeurs relevées</th><th>sources distinctes</th></tr></thead>
<tbody>
${Object.entries(VALEURS.techniques).map(([cle, t]) => {
  const v = t.criteres?.trait_minimal?.valeurs ?? [];
  const sources = new Set(v.map((x) => x.source)).size;
  return `<tr><td><a href="/guide/${{
    serigraphie: 'serigraphie',
    tampographie: 'tampographie',
    gravure_laser: 'gravure-laser',
    broderie: 'broderie',
    numerique_uv: 'impression-numerique-uv',
    transfert_dtf: 'transfert-dtf',
    marquage_a_chaud: 'marquage-a-chaud',
  }[cle]}">${echapper(t.libelle)}</a></td><td>${v.length}</td><td>${sources}</td></tr>`;
}).join('\n')}
</tbody>
</table>`;

/** Le tableau des valeurs. Classe `minimums-sources` : c'est la zone exemptee. */
const TABLE_VALEURS = `
<table class="minimums-sources">
<thead><tr><th>technique</th><th>trait minimal</th><th>matière nommée par la source</th><th>source</th><th>relevé le</th></tr></thead>
<tbody>
${LIGNES.map((l) => `<tr>
<td>${echapper(l.technique)}</td>
<td>${mmTexte(l.mm)}&nbsp;mm</td>
<td>${echapper(l.support)}</td>
<td>${l.url
  ? `<a href="${echapper(l.url)}" rel="noopener">${echapper(l.source)}</a>`
  : `${echapper(l.source)} <span class="sans-lien">document fournisseur, pas d'URL publique</span>`}</td>
<td>${echapper(l.date)}</td>
</tr>`).join('\n')}
</tbody>
</table>`;

export const REFERENTIEL = {
  url: '/referentiel',
  titre: 'Épaisseurs minimales de trait par technique',
  meta: `Les ${TOTAL} épaisseurs minimales de trait publiées par des fabricants et des `
    + `ateliers, sur ${NB_TECHNIQUES} techniques de marquage, chacune avec sa matière, sa source et sa date.`,
  h1: 'Épaisseurs minimales de trait par technique',
  chapo: `Ce tableau rassemble les ${TOTAL} valeurs de trait minimal que nous avons `
    + `relevées chez ${NB_SOURCES} fabricants, ateliers et distributeurs, sur `
    + `${NB_TECHNIQUES} techniques de marquage. Chaque ligne porte la matière que sa source `
    + `nomme, le nom de cette source et la date du relevé. Nous ne concluons rien à leur place.`,
  sections: [
    {
      h2: 'Ce que ce tableau répond, et ce qu\'il ne répond pas',
      html: `
<p>Il répond à une question précise : quelle est la finesse de trait qu'un fabricant
donné annonce, sur une matière donnée, à une date donnée. Il ne répond pas à la question
que tout le monde pose, qui est « à partir de quelle finesse mon logo passe ». Cette
question là n'a pas de réponse unique, et le tableau montre pourquoi : sur une même
technique, les valeurs publiées s'étalent sur un rapport de plus de sept entre la plus
fine et la plus épaisse.</p>
<p>Cet écart n'est pas du bruit et ce ne sont pas des erreurs. Un fabricant de machines
publie une limite physique, un atelier publie ce qui passe en série sans reprise, un
distributeur publie le seuil en dessous duquel il refuse un fichier. Les trois mesurent
des choses différentes et ont raison en même temps. La matière change tout également :
la même technique ne rend pas la même finesse sur du métal et sur du textile.</p>
<p>Nous aurions pu publier une moyenne. Nous ne le faisons pas, et c'est le seul parti
pris de cette page : une moyenne entre des grandeurs qui ne mesurent pas la même chose
ressemble à une donnée alors que personne ne l'a jamais mesurée. Tant que nous n'avons
pas de quoi trancher, nous préférons écrire que nous ne savons pas encore.</p>`,
    },
    {
      h2: 'Ce que le référentiel couvre aujourd\'hui',
      html: `
<p>Le relevé porte sur le trait minimal, et sur lui seul. Les autres contraintes de
marquage, nombre de couleurs, dégradés, tailles de zone, ne sont pas encore consolidées
au même niveau d'exigence et n'entrent donc pas ici.</p>
${TABLE_COUVERTURE}
<p>Chaque technique renvoie vers sa fiche, qui décrit la mécanique du procédé et reprend
ses propres valeurs.</p>`,
    },
    {
      h2: `Les ${TOTAL} valeurs relevées, avec leur source`,
      html: `
<p>Le tableau se lit ligne par ligne, jamais en colonne : une valeur sans sa matière et
sans sa source ne veut rien dire. Le lien mène à la page où la source publie son chiffre,
pour que vous puissiez vérifier sans nous croire. Quand la source n'est pas en ligne, la
ligne le dit, et le chiffre vient alors d'un document remis par le fournisseur que nous
ne pouvons pas republier.</p>
${TABLE_VALEURS}`,
    },
    {
      h2: 'Comment ces valeurs sont retenues',
      html: `
<p>Quatre règles, et elles expliquent l'essentiel de ce que vous voyez.</p>
<ul>
<li><b>Une valeur sans source nommée n'entre pas.</b> Pas de valeur d'expérience, pas de
valeur d'usage, pas de valeur trouvée sur un forum.</li>
<li><b>Une valeur dont la source ne nomme aucun support n'entre pas</b>, quelle que soit
la notoriété de cette source. Une règle de préparation de fichier d'imprimerie n'est pas
une contrainte de marquage sur objet, et les confondre est l'erreur la plus fréquente du
domaine.</li>
<li><b>Deux sources qui se contredisent restent toutes les deux.</b> Aucune n'est
supprimée au profit de l'autre, et aucune moyenne ne les remplace.</li>
<li><b>Chaque conversion d'unité est recalculée.</b> Quand une source publie une valeur
qui paraît fausse, elle est reportée telle qu'elle a été publiée, et l'anomalie est
signalée plutôt que corrigée en silence.</li>
</ul>
<p>Ces règles sont la raison pour laquelle ce tableau est court. Nous avons lu beaucoup
plus de pages que de valeurs retenues.</p>`,
    },
    {
      h2: 'Reprendre ces données',
      html: `
<p>Le relevé est servi tel quel, en JSON, à une adresse stable :
<a href="${DOMAINE}/src/verdict/valeurs_sourcees.json">valeurs_sourcees.json</a>. C'est le fichier
exact que lit le diagnostic du site, pas une copie faite pour la publication : une
correction se propage aux deux au même moment. Il porte pour chaque valeur la matière,
la source, l'URL quand elle existe, la date du relevé et le rang de fiabilité que nous
attribuons à ce type de source.</p>
<p>Vous pouvez le reprendre, à condition de citer chaque source à côté de sa valeur. Ces
chiffres ne sont pas les nôtres : ils appartiennent aux fabricants et aux ateliers qui
les publient. Notre travail est le relevé, le nettoyage et la datation, pas la mesure.</p>`,
    },
  ],
  faq: [
    {
      q: 'Pourquoi ne donnez-vous pas une seule épaisseur minimale par technique ?',
      r: "Parce que les sources ne sont pas d'accord, et que leur désaccord est instructif. "
        + "Un fabricant de machines publie une limite physique, un atelier ce qui passe en "
        + "série, un distributeur son seuil de refus. Une moyenne entre les trois "
        + "ressemblerait à une donnée alors que personne ne l'a mesurée. Tant que nous n'avons "
        + "pas de quoi trancher, nous publions les valeurs et leurs sources.",
    },
    {
      q: 'D\'où viennent ces valeurs ?',
      r: `De ${NB_SOURCES} sources distinctes : fabricants de machines et de consommables, `
        + "ateliers spécialisés, imprimeurs et distributeurs. Chaque ligne du tableau nomme la "
        + "sienne et renvoie vers la page où elle la publie, quand cette page est en ligne.",
    },
    {
      q: 'Ces chiffres valent-ils pour mon objet ?',
      r: "Seulement si la matière de votre objet est celle que nomme la ligne. La même "
        + "technique ne rend pas la même finesse sur du métal, du textile ou du plastique. "
        + "Et un relevé documentaire ne remplace ni l'avis de votre marqueur ni un bon à tirer.",
    },
    {
      q: 'Puis-je réutiliser ce tableau ?',
      r: "Oui, à condition de citer chaque source à côté de sa valeur. Les chiffres "
        + "appartiennent aux fabricants et aux ateliers qui les publient. Le fichier JSON qui "
        + "sert cette page est accessible en clair et se reprend directement.",
    },
  ],
  /**
   * Le balisage Dataset. Il voyage dans le champ `dataset` et se pousse dans le
   * meme graphe que le fil d'Ariane et la FAQ : un seul bloc a tenir a jour.
   *
   * PAS DE CHAMP `license` TANT QU'ALEX N'A PAS TRANCHE. Le depot est sous AGPL,
   * mais cette licence couvre le code, pas le contenu editorial ni ce releve.
   * Declarer une licence que personne n'a choisie serait pire que de ne rien
   * declarer : ce serait une affirmation juridique inventee sur une page de
   * reference. Le jour ou la licence est choisie, c'est une ligne de plus ici.
   */
  dataset: {
    '@type': 'Dataset',
    name: 'Épaisseurs minimales de trait pour le marquage d\'objets',
    description: `Relevé de ${TOTAL} épaisseurs minimales de trait publiées par des `
      + `fabricants, des ateliers et des distributeurs, sur ${NB_TECHNIQUES} techniques de `
      + `marquage d'objets. Chaque valeur porte la matière nommée par sa source, le nom de `
      + `cette source, son URL quand elle est publique, et la date du relevé.`,
    url: `${DOMAINE}/referentiel`,
    identifier: `${DOMAINE}/referentiel`,
    inLanguage: 'fr',
    isAccessibleForFree: true,
    dateModified: isoDepuisFr(VALEURS.genere_le),
    temporalCoverage: COUVERTURE,
    creator: { '@type': 'Organization', name: 'Bon à Marquer', url: `${DOMAINE}/` },
    publisher: { '@type': 'Organization', name: 'Bon à Marquer', url: `${DOMAINE}/` },
    keywords: ['marquage', 'objet publicitaire', 'sérigraphie', 'tampographie',
      'gravure laser', 'broderie', 'impression numérique UV', 'transfert DTF',
      'marquage à chaud', 'épaisseur de trait'],
    variableMeasured: {
      '@type': 'PropertyValue',
      name: 'Épaisseur minimale de trait',
      description: 'Trait le plus fin qu\'une source publie comme marquable, pour une technique et une matière données.',
      unitCode: 'MMT',
      unitText: 'millimètre',
    },
    measurementTechnique: 'Relevé documentaire de valeurs publiées par les fabricants, ateliers et distributeurs, avec source, URL et date. Aucune mesure de laboratoire, aucune moyenne, aucune valeur inférée.',
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: `${DOMAINE}/src/verdict/valeurs_sourcees.json`,
    },
  },
};
