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

import { LIBELLES, LIBELLES_SITUATION, direCritere, direBase, direSituation } from './formulation.js';

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
  // Quand une SITUATION existe, le trait est deja traite juste au dessus, avec
  // ses sources. Le repli ne doit donc plus le compter parmi les inconnus,
  // sinon la carte se contredit en trois lignes : elle situe le trait sur
  // vingt-et-une matieres, puis annonce qu'aucun critere n'est documente.
  // C'est exactement ce qu'elle faisait le 19/08 au premier essai.
  const situe = Boolean(t.situation?.valeurs?.length);
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

/**
 * LE TABLEAU DES MINIMUMS PUBLIES.
 *
 * Il est replie par defaut, et c'est un arbitrage de lecture, pas un moyen de
 * cacher. Un visiteur veut d'abord savoir ou il se situe ; celui qui veut
 * verifier, ou envoyer la ligne a son marqueur, deplie et trouve la matiere,
 * la source, la date et le lien. C'est la definition d'une valeur SOURCEE :
 * elle se re-verifie sans nous.
 */
function rendreMinimums(s) {
  if (!s?.valeurs?.length) return '';
  const lignes = s.valeurs.map((v) => {
    const tient = s.mesure !== null && s.mesure !== undefined && Number.isFinite(s.mesure)
      ? (s.mesure >= v.mm ? 'oui' : 'non') : '';
    const source = v.url
      ? `<a href="${echapper(v.url)}" rel="nofollow noopener" target="_blank">${echapper(v.source)}</a>`
      : echapper(v.source);
    return `<tr${tient === 'non' ? ' class="ne-tient-pas"' : ''}>
      <td class="mm">${echapper(mmTexte(v.mm))}</td>
      <td>${echapper(v.support)}</td>
      <td>${source}</td>
      <td class="date">${echapper(v.date)}</td>
      ${tient ? `<td class="tient">${tient}</td>` : ''}
    </tr>`;
  }).join('');
  const enTeteTient = s.mesure !== null && s.mesure !== undefined && Number.isFinite(s.mesure)
    ? '<th>votre trait tient</th>' : '';
  return `<details class="minimums">
  <summary>Voir les ${s.total} minimums publiés, avec leurs sources</summary>
  <table><thead><tr><th>minimum</th><th>matière nommée par la source</th>
    <th>source</th><th>relevé le</th>${enTeteTient}</tr></thead>
  <tbody>${lignes}</tbody></table>
</details>`;
}

function mmTexte(v) {
  return (Math.round(v * 100) / 100).toFixed(2).replace('.', ',') + ' mm';
}

export function rendreTechnique(t) {
  const criteres = rendreCriteres(t);
  const base = direBase(t.base);
  const s = t.situation;
  // L'etiquette dit ce qu'on SAIT. Tant qu'aucune valeur ne servait, c'etait
  // « nous ne savons pas encore » sept fois de suite, et un visiteur en
  // concluait que l'outil ne savait rien alors qu'il venait de mesurer son
  // fichier au centieme. Des qu'une situation existe, c'est elle qui parle.
  const etiquette = s ? LIBELLES_SITUATION[s.etat] : LIBELLES[t.etat];
  const phrase = s ? direSituation(s, s.matieresQuiTiennent, s.matieresQuiNon) : null;
  return `<article class="technique ${CLASSE[t.etat]}">
  <h3>${echapper(t.libelle)}<span class="etiquette">${echapper(etiquette)}</span></h3>
  ${base ? `<p class="base">${echapper(base)}</p>` : ''}
  ${phrase ? `<p class="situation">${echapper(phrase)}</p>` : ''}
  ${rendreMinimums(s)}
  <ul class="criteres">${criteres}</ul>
</article>`;
}

/**
 * Le bandeau de tete. Il annonce l'etat du referentiel AVANT les techniques,
 * parce qu'un visiteur qui lit sept « nous ne savons pas encore » sans
 * explication conclut que l'outil est casse, alors qu'il est honnete.
 */
export function rendreEntete(verdict) {
  const { favorables, defavorables, inconnues, total, situees,
          tiennentPartout, tiennentEnPartie, neTiennentPas, sansMesure } = verdict.resume;

  // Le bandeau depuis que les valeurs sourcees servent. Il annonce ce que la
  // page va dire, et il dit d'ou ca vient, parce qu'un chiffre de marquage
  // sans provenance est exactement ce que ce site existe pour ne pas faire.
  if (situees) {
    if (sansMesure === total) {
      return `<div class="encadre">
  <p><b>Voici ce que publient les marqueurs.</b> Nous avons relevé les épaisseurs
  minimales publiées par des fabricants et des ateliers, technique par technique
  et matière par matière. Chaque valeur porte sa source et sa date.</p>
  <p>Indiquez plus haut la largeur à laquelle vous comptez marquer votre logo,
  et nous vous dirons où votre trait se situe dans ces valeurs.</p>
</div>`;
    }
    return `<div class="encadre">
  <p><b>Votre trait tient partout sur ${tiennentPartout} technique${tiennentPartout > 1 ? 's' : ''},
  en partie sur ${tiennentEnPartie}, et sur aucune matière relevée pour ${neTiennentPas}.</b></p>
  <p>Nous ne vous donnons pas un seuil unique par technique, parce qu'il n'en existe pas :
  une sérigraphie ne demande pas la même finesse sur un sac plastique et sur de la toile
  de jute. Nous comparons donc matière par matière, avec les valeurs publiées par les
  fabricants eux mêmes. Dépliez le tableau d'une technique pour voir qui publie quoi.</p>
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

export function rendreVerdict(verdict) {
  return `<h2>Le diagnostic par technique</h2>
${rendreEntete(verdict)}
<div class="techniques-verdict">
${verdict.techniques.map(rendreTechnique).join('\n')}
</div>
<p class="note">Ce diagnostic décrit ce que les fabricants d'objets acceptent
couramment de produire, pas les limites physiques des procédés. Un atelier
spécialisé peut réaliser ce que la plupart refusent.</p>`;
}
