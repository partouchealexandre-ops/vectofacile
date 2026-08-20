/**
 * Le rendu du verdict, en fonction PURE : elle prend un verdict, elle rend une
 * chaine HTML. Elle ne touche pas au DOM, ce qui la rend testable dans node.
 *
 * L'ETAT « NOUS NE SAVONS PAS ENCORE » EST DESSINE ICI COMME UN ETAT A PART
 * ENTIERE, pas comme un vide ni comme un message d'erreur.
 *
 * Le Fil meta a pose la question que personne n'avait posee : avec 110
 * contradictions et 70 trous au referentiel, la majorite des cellules technique
 * par critere sera VIDE au lancement, et le verdict le plus frequent des
 * premieres semaines ne sera ni vert ni rouge. Cet etat n'existait pas dans la
 * maquette. Il doit etre assume comme une force : c'est le seul site du marche
 * qui distinguera ce qu'il sait de ce qu'il ignore.
 *
 * Consequence de mise en forme, et elle est deliberee : l'inconnu n'est ni
 * grise ni mis en bas de page. Il porte la meme graisse que les deux autres,
 * et il dit CE QUI MANQUE, pas seulement qu'il manque quelque chose.
 */

import { LIBELLES, direCritere, direBase, direTailles, direCouleurs, etiquetteTailles,
         direEtatFichier } from './formulation.js';

const CLASSE = {
  favorable: 'verdict-favorable',
  defavorable: 'verdict-defavorable',
  inconnu: 'verdict-inconnu',
};

const echapper = (t) => String(t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Le repli de l'inconnu.
 *
 * La premiere version affichait les quatre criteres de chaque technique, soit
 * vingt-huit lignes « nous ne savons pas encore » a l'ecran. C'etait exact et
 * illisible, et l'illisible finit par etre saute : le visiteur ne lit plus
 * rien, y compris ce qu'on sait. Quand TOUS les criteres d'une technique sont
 * inconnus, une seule phrase le dit, et elle dit ce qui manque.
 *
 * On ne cache rien : des qu'UN critere est jugeable, tous reapparaissent, pour
 * qu'on voie ce qui a ete pese a cote de ce qui ne l'a pas ete.
 */
function rendreCriteres(t) {
  // Quand une TAILLE est calculee, le trait est deja traite juste au dessus,
  // avec ses sources. Le repli ne doit donc plus le compter parmi les
  // inconnus, sinon la carte se contredit en trois lignes : elle donne une
  // taille calculee sur vingt-et-une matieres, puis annonce qu'aucun critere
  // n'est documente. C'est ce qu'elle faisait le 19/08 au premier essai.
  const situe = ['tailles', 'sans_trait'].includes(t.situation?.etat);
  const restants = situe ? t.criteres.filter((c) => c.cle !== 'trait_minimal') : t.criteres;

  const tousInconnus = restants.every((c) => c.etat_verdict === 'inconnu');
  if (tousInconnus) {
    const raisons = [...new Set(restants.map((c) => c.raison).filter(Boolean))];
    const noms = restants.map((c) => c.libelle.toLowerCase()).join(', ');
    if (situe) {
      return `<li class="${CLASSE.inconnu}">Nos ${restants.length} autres critères `
        + `ne sont pas encore documentés pour cette technique : ${echapper(noms)}.</li>`;
    }
    return `<li class="${CLASSE.inconnu}">Aucun de nos ${restants.length} critères `
      + `n'est encore documenté pour cette technique`
      + (raisons.length ? ` : ${echapper(raisons.join(' ; '))}` : '') + '.</li>';
  }
  return restants
    .map((c) => `<li class="${CLASSE[c.etat_verdict]}">${echapper(direCritere(c))}</li>`)
    .join('');
}

function mmTexte(v) {
  return (Math.round(v * 100) / 100).toFixed(2).replace('.', ',') + ' mm';
}

export function rendreTechnique(t) {
  const criteres = rendreCriteres(t);
  const base = direBase(t.base);
  const s = t.situation;
  // L'etiquette repond en quatre mots : « dès 19 mm de large ». Les anciennes
  // etiquettes, « tient les minimums publiés », « tient sur une partie des
  // matières », decrivaient notre comparaison au lieu de la decision du
  // visiteur ; Alex les a retirees le 20/08.
  const etiquette = s ? etiquetteTailles(s, t.verdictLargeur, t.largeurDonneeMm)
                      : LIBELLES[t.etat];
  const phrase = s ? direTailles(s, t.verdictLargeur, t.largeurDonneeMm) : null;
  const couleurs = s ? direCouleurs(t.technique, t.nCouleurs) : null;
  // Plus de tableau de sources DANS la carte, second arbitrage Alex du 20/08 :
  // « les sources, on les donnera si on nous demande ». Elles vivent dans la
  // rubrique unique « D'où viennent ces chiffres ? », en bas du diagnostic.
  return `<article class="technique ${CLASSE[t.etat]}">
  <h3>${echapper(t.libelle)}<span class="etiquette">${echapper(etiquette)}</span></h3>
  ${base ? `<p class="base">${echapper(base)}</p>` : ''}
  ${phrase ? `<p class="situation">${echapper(phrase)}</p>` : ''}
  ${couleurs ? `<p class="couleurs-technique">${echapper(couleurs)}</p>` : ''}
  <ul class="criteres">${criteres}</ul>
</article>`;
}

/* ------------------------------------------------- la vue produit, 20/08 */

/**
 * LE MENU DEROULANT DES PRODUITS.
 *
 * Le client part d'un produit, pas d'une technique : arbitrage Alex du 20/08,
 * apres les captures du patch 0025. La taxonomie vient de produits.json,
 * limitee aux rubriques publiques des grands catalogues d'objets
 * promotionnels. Un produit a variantes (le mug) demande un second choix :
 * on indique d'abord le produit, puis son type.
 *
 * Le rendu reste une fonction PURE : la selection arrive en parametre, les
 * ecouteurs sont poses par app.js en delegation. Reconstruire le HTML a
 * chaque changement ne perd donc aucun etat.
 */
function rendreChoixProduit(vue, selection) {
  if (!vue?.produits?.length) return '';
  const parRubrique = new Map();
  for (const p of vue.produits) {
    if (!parRubrique.has(p.rubrique)) parRubrique.set(p.rubrique, []);
    parRubrique.get(p.rubrique).push(p);
  }
  const groupes = [...parRubrique.entries()].map(([rubrique, liste]) => {
    const options = liste.map((p) =>
      `<option value="${echapper(p.cle)}"${selection?.produit === p.cle ? ' selected' : ''}>${echapper(p.libelle)}</option>`).join('');
    return `<optgroup label="${echapper(rubrique)}">${options}</optgroup>`;
  }).join('');

  const produit = vue.produits.find((p) => p.cle === selection?.produit);
  let variante = '';
  if (produit?.variantes?.length) {
    const options = produit.variantes.map((v) =>
      `<option value="${echapper(v.cle)}"${selection?.variante === v.cle ? ' selected' : ''}>${echapper(v.libelle)}</option>`).join('');
    variante = `<label for="choix_variante">Quel type ?</label>
  <select id="choix_variante">
    <option value=""${!selection?.variante ? ' selected' : ''}>Choisissez…</option>
    ${options}
  </select>`;
  }

  return `<div class="choix-produit">
  <label for="choix_produit">Sur quel produit voulez-vous marquer ce logo ?</label>
  <select id="choix_produit">
    <option value=""${!selection?.produit ? ' selected' : ''}>Choisissez un produit…</option>
    ${groupes}
  </select>
  ${variante}
</div>`;
}

/**
 * La carte du produit choisi : une ligne par technique praticable, la taille
 * calculee pour CE logo, la mecanique des couleurs, et rien d'autre. Si le
 * visiteur a donne une taille de marquage, chaque ligne dit si ca passe.
 */
function rendreProduitChoisi(vue, selection, verdict) {
  const produit = vue?.produits?.find((p) => p.cle === selection?.produit);
  if (!produit) return '';
  let cible = produit;
  if (produit.variantes) {
    cible = produit.variantes.find((v) => v.cle === selection?.variante);
    if (!cible) {
      return `<p class="note">Indiquez le type de ${echapper(produit.libelle.toLowerCase())} pour voir les tailles.</p>`;
    }
  }

  const L = verdict.largeurDonneeMm;
  const nCouleurs = verdict.techniques?.[0]?.nCouleurs ?? null;
  const lignes = cible.techniques.map((t) => {
    const note = t.note ? ` <span class="note-produit">(${echapper(t.note)})</span>` : '';
    if (t.tailleMinMm === null) {
      return `<li><b>${echapper(t.libelle)}</b>${note} : praticable à toutes les tailles,
      votre logo n'a pas de trait fin à contraindre.</li>`;
    }
    let verdictLigne = '';
    if (Number.isFinite(L)) {
      verdictLigne = L >= t.tailleMinMm
        ? ` <span class="ligne-ok">À ${L} mm : ça passe.</span>`
        : ` <span class="ligne-ko">À ${L} mm : trop petit, passez à ${t.tailleMinMm} mm ou plus.</span>`;
    }
    const couleurs = direCouleurs(t.technique, nCouleurs);
    return `<li><b>${echapper(t.libelle)}</b>${note} : dès ${t.tailleMinMm} mm de large.${verdictLigne}
    ${couleurs ? `<span class="couleurs-technique">${echapper(couleurs)}</span>` : ''}</li>`;
  }).join('\n');

  return `<article class="produit-verdict">
  <h3>${echapper(cible.libelle)}</h3>
  <ul class="produit-techniques">
${lignes}
  </ul>
</article>`;
}

/**
 * D'OU VIENNENT CES CHIFFRES : la seule rubrique qui montre les sources.
 *
 * Second arbitrage Alex du 20/08 : les sources ne s'affichent plus a chaque
 * ligne, elles se donnent a qui les demande. La doctrine ne change pas d'un
 * millimetre : chaque valeur reste sourcee, datee, liee, re-verifiable sans
 * nous. Seul l'endroit change : un repli unique, en bas du diagnostic.
 */
function rendreSources(verdict) {
  const techniques = (verdict.techniques ?? [])
    .filter((t) => t.situation?.etat === 'tailles' && t.situation.parSupport?.length);
  if (!techniques.length) return '';
  const blocs = techniques.map((t) => {
    const lignes = t.situation.parSupport.map((v) => {
      const source = v.url
        ? `<a href="${echapper(v.url)}" rel="nofollow noopener" target="_blank">${echapper(v.source)}</a>`
        : echapper(v.source);
      return `<tr><td>${echapper(v.support)}</td>
      <td class="mm">${echapper(mmTexte(v.mm))}</td>
      <td>${source}</td><td class="date">${echapper(v.date)}</td></tr>`;
    }).join('');
    return `<h4>${echapper(t.libelle)}</h4>
<table><thead><tr><th>matière nommée par la source</th><th>trait minimal publié</th>
<th>source</th><th>relevé le</th></tr></thead><tbody>${lignes}</tbody></table>`;
  }).join('\n');
  return `<details class="minimums sources-verdict">
  <summary>D'où viennent ces chiffres ?</summary>
  <p class="note-calcul">Chaque taille affichée est calculée pour votre logo : c'est la
  largeur de marquage à partir de laquelle son trait le plus fin atteint le minimum
  d'épaisseur publié par un fabricant ou un atelier, pour la matière qu'il nomme.
  Voici toutes les valeurs relevées, avec leur source et leur date : chacune se
  vérifie sans nous croire.</p>
  ${blocs}
</details>`;
}

/**
 * Le bandeau de tete. Il annonce l'etat du referentiel AVANT les techniques,
 * parce qu'un visiteur qui lit sept « nous ne savons pas encore » sans
 * explication conclut que l'outil est casse, alors qu'il est honnete.
 */
export function rendreEntete(verdict) {
  const { favorables, defavorables, inconnues, total, situees, sansTrait,
          parTaille } = verdict.resume;

  // Le bandeau depuis la vue produit du 20/08 : une seule phrase, qui dit
  // quoi faire. Le detail vit dans la carte du produit choisi, le reste est
  // replie. Deuxieme retour d'Alex sur les captures du 0025 : « il y a trop
  // de choses ». Le bandeau n'enumere donc plus rien.
  if (situees && parTaille?.length) {
    return `<div class="encadre">
  <p><b>Choisissez un produit : nous vous disons à partir de quelle taille votre
  logo passe dessus, avec quelle technique, et ce que ça implique pour vos
  couleurs.</b> Ces tailles sont calculées pour votre logo, à partir des épaisseurs
  minimales publiées par les fabricants.</p>
</div>`;
  }

  // Un logo fait d'aplats : aucune taille a calculer, et c'est une bonne
  // nouvelle qu'il faut dire comme telle.
  if (sansTrait === total && total > 0) {
    return `<div class="encadre">
  <p><b>Votre logo est fait d'aplats, sans trait fin.</b> Les finesses minimales
  publiées par les fabricants ne le limitent pas : côté épaisseur de trait, il
  passe à toutes les tailles, sur toutes les techniques relevées.</p>
</div>`;
  }

  if (inconnues === total) {
    return `<div class="encadre verdict-inconnu">
  <p><b>Nous ne savons pas encore.</b> Aucun seuil de marquage n'est encore
  arbitré dans notre référentiel, donc nous ne vous dirons rien sur ce que votre
  logo permet ou interdit. Les mesures ci-dessus, elles, sont des faits : elles
  décrivent votre fichier, et elles suffisent déjà à parler à un marqueur.</p>
  <p>Nous préférons afficher ceci plutôt qu'une valeur plausible. Un seuil
  inventé se recopie, et il se recopie longtemps.</p>
</div>`;
  }
  return `<p class="resume">Sur ${total} techniques : ${favorables} ${favorables > 1 ? 'passent' : 'passe'}
  chez la plupart des fabricants, ${defavorables} ${defavorables > 1 ? 'sont refusées' : 'est refusée'},
  et ${inconnues} ${inconnues > 1 ? 'restent' : 'reste'} à documenter.</p>`;
}

/**
 * LE BANDEAU DU FICHIER, avant tout le reste. Arbitrage Alex du 20/08 : la
 * premiere question n'est pas la taille, c'est « est-ce que ce fichier passe,
 * en l'etat ? ». La reponse porte toujours sa sortie : le .eps deja fabrique
 * en bas de page, la page Vectoriser mon logo, ou le graphiste.
 */
function rendreEtatFichier(fichier) {
  const etat = direEtatFichier(fichier);
  if (!etat) return '';
  let sortie = '';
  if (etat.sortie === 'faux_vectoriel') {
    sortie = ` <a href="/vectoriser">Déposez l'image d'origine de votre logo sur
    Vectoriser mon logo</a>, ou réclamez le fichier source à votre graphiste.`;
  } else if (etat.sortie === 'graphiste') {
    sortie = ` Faites établir un fichier vectoriel par un graphiste, ou repartez de la
    plus grande version disponible de votre logo :
    <a href="/questions/comment-vectoriser-un-jpeg">pourquoi la taille de départ décide
    de tout</a>.`;
  }
  const classe = etat.ton === 'ok' ? 'fichier-ok' : etat.ton === 'refus' ? 'fichier-refus' : '';
  return `<div class="encadre etat-fichier ${classe}">
  <p>${echapper(etat.texte)}${sortie}</p>
</div>`;
}

/**
 * L'assemblage. L'ordre est celui de la lecture d'un client : le fichier
 * (passe-t-il, en l'etat ?), le choix du produit, la reponse pour CE produit,
 * puis, replies parce qu'ils repondent a d'autres questions : le detail par
 * technique, et les sources.
 *
 * `selection` est l'etat du menu deroulant, `fichier` l'origine du depot ;
 * les deux sont tenus par app.js et repasses a chaque rendu : la fonction
 * reste pure et se teste dans node.
 */
export function rendreVerdict(verdict, selection = {}, fichier = null) {
  const vue = verdict.produits;
  const aProduits = Boolean(vue?.produits?.length) && verdict.resume.situees > 0;
  const techniquesRendues = verdict.techniques.map(rendreTechnique).join('\n');
  // Tant que la vue produit n'a rien a montrer (pas de taxonomie, logo
  // d'aplats, referentiel vide), les cartes techniques restent depliees :
  // replier la seule information affichable serait une page vide.
  const parTechnique = aProduits
    ? `<details class="par-technique">
  <summary>Le détail par technique d'impression</summary>
  <div class="techniques-verdict">
${techniquesRendues}
  </div>
</details>`
    : `<div class="techniques-verdict">
${techniquesRendues}
</div>`;
  return `<h2>Sur quoi marquer ce logo ?</h2>
${rendreEtatFichier(fichier)}
${rendreEntete(verdict)}
${aProduits ? rendreChoixProduit(vue, selection) : ''}
${aProduits ? rendreProduitChoisi(vue, selection, verdict) : ''}
${parTechnique}
${rendreSources(verdict)}
<p class="note">Ce diagnostic décrit ce que les fabricants d'objets acceptent
couramment de produire, pas les limites physiques des procédés. Un atelier
spécialisé peut réaliser ce que la plupart refusent.</p>`;
}
