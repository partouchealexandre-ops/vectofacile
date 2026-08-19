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

import { LIBELLES, direCritere, direBase } from './formulation.js';

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
  const tousInconnus = t.criteres.every((c) => c.etat_verdict === 'inconnu');
  if (tousInconnus) {
    const raisons = [...new Set(t.criteres.map((c) => c.raison).filter(Boolean))];
    return `<li class="${CLASSE.inconnu}">Aucun de nos ${t.criteres.length} critères `
      + `n'est encore documenté pour cette technique`
      + (raisons.length ? ` : ${echapper(raisons.join(' ; '))}` : '') + '.</li>';
  }
  return t.criteres
    .map((c) => `<li class="${CLASSE[c.etat_verdict]}">${echapper(direCritere(c))}</li>`)
    .join('');
}

export function rendreTechnique(t) {
  const criteres = rendreCriteres(t);
  const base = direBase(t.base);
  return `<article class="technique ${CLASSE[t.etat]}">
  <h3>${echapper(t.libelle)}<span class="etiquette">${echapper(LIBELLES[t.etat])}</span></h3>
  ${base ? `<p class="base">${echapper(base)}</p>` : ''}
  <ul class="criteres">${criteres}</ul>
</article>`;
}

/**
 * Le bandeau de tete. Il annonce l'etat du referentiel AVANT les techniques,
 * parce qu'un visiteur qui lit sept « nous ne savons pas encore » sans
 * explication conclut que l'outil est casse, alors qu'il est honnete.
 */
export function rendreEntete(verdict) {
  const { favorables, defavorables, inconnues, total } = verdict.resume;
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
