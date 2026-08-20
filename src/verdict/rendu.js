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

import { LIBELLES, direCritere, direBase, direTailles, direCouleurs, etiquetteTailles }
  from './formulation.js';

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

/**
 * LE TABLEAU DES TAILLES PAR MATIERE.
 *
 * Il est replie par defaut, et c'est un arbitrage de lecture, pas un moyen de
 * cacher. Un visiteur veut d'abord la reponse ; celui qui veut verifier, ou
 * envoyer la ligne a son marqueur, deplie et trouve la matiere, le minimum
 * publie qui a servi au calcul, la source, la date et le lien. C'est la
 * definition d'une valeur SOURCEE : elle se re-verifie sans nous.
 *
 * La colonne de tete est la TAILLE CALCULEE POUR CE LOGO, pas le minimum
 * publie : c'est elle que le visiteur cherche. Le minimum publie reste dans sa
 * colonne, parce que c'est lui qui se verifie chez la source.
 */
function rendreMinimums(s) {
  if (s?.etat !== 'tailles' || !s.parSupport?.length) return '';
  const lignes = s.parSupport.map((v) => {
    const source = v.url
      ? `<a href="${echapper(v.url)}" rel="nofollow noopener" target="_blank">${echapper(v.source)}</a>`
      : echapper(v.source);
    return `<tr>
      <td>${echapper(v.support)}</td>
      <td class="mm">dès ${echapper(String(v.tailleMinMm))} mm de large</td>
      <td class="mm">${echapper(mmTexte(v.mm))}</td>
      <td>${source}</td>
      <td class="date">${echapper(v.date)}</td>
    </tr>`;
  }).join('');
  return `<details class="minimums">
  <summary>Le détail par matière, avec les sources (${s.parSupport.length} matières)</summary>
  <p class="note-calcul">La taille « dès NN mm » est calculée pour VOTRE logo : c'est la
  largeur de marquage à partir de laquelle son trait le plus fin atteint le minimum
  publié par la source.</p>
  <table><thead><tr><th>matière</th><th>marquez ce logo</th>
    <th>trait minimal publié</th><th>source</th><th>relevé le</th></tr></thead>
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
  // L'etiquette repond en quatre mots : « dès 19 mm de large ». Les anciennes
  // etiquettes, « tient les minimums publiés », « tient sur une partie des
  // matières », decrivaient notre comparaison au lieu de la decision du
  // visiteur ; Alex les a retirees le 20/08.
  const etiquette = s ? etiquetteTailles(s, t.verdictLargeur, t.largeurDonneeMm)
                      : LIBELLES[t.etat];
  const phrase = s ? direTailles(s, t.verdictLargeur, t.largeurDonneeMm) : null;
  const couleurs = s ? direCouleurs(t.technique, t.nCouleurs) : null;
  return `<article class="technique ${CLASSE[t.etat]}">
  <h3>${echapper(t.libelle)}<span class="etiquette">${echapper(etiquette)}</span></h3>
  ${base ? `<p class="base">${echapper(base)}</p>` : ''}
  ${phrase ? `<p class="situation">${echapper(phrase)}</p>` : ''}
  ${couleurs ? `<p class="couleurs-technique">${echapper(couleurs)}</p>` : ''}
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
  const { favorables, defavorables, inconnues, total, situees, sansTrait,
          parTaille } = verdict.resume;

  // Le bandeau depuis l'inversion du 20/08. Il donne la reponse d'usage tout
  // de suite : les techniques les plus accessibles avec LEUR taille, calculee
  // pour ce logo, puis la plus exigeante. Chaque chiffre vient d'une valeur
  // sourcee, la provenance est dans les cartes.
  if (situees && parTaille?.length) {
    const dire = (e) => `${echapper(e.libelle)} dès ${e.des} mm`;
    const accessibles = parTaille.slice(0, 3).map(dire);
    const exigeante = parTaille[parTaille.length - 1];
    const suite = parTaille.length > 3
      ? ` La plus exigeante pour ce logo : ${dire(exigeante).toLowerCase()},`
        + ` sur ${echapper(String(exigeante.support).split(',')[0].trim())}.`
      : '';
    return `<div class="encadre">
  <p><b>Voici à quelle taille, et sur quoi, marquer ce logo.</b>
  Les plus accessibles : ${accessibles.join(', ')} de large.${suite}</p>
  <p>Ces tailles sont calculées pour votre logo, à partir de son trait le plus fin
  et des minimums publiés par les fabricants, matière par matière. Chaque carte
  ci-dessous donne le détail, avec les sources.</p>
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

export function rendreVerdict(verdict) {
  return `<h2>Sur quoi marquer ce logo, et à partir de quelle taille</h2>
${rendreEntete(verdict)}
<div class="techniques-verdict">
${verdict.techniques.map(rendreTechnique).join('\n')}
</div>
<p class="note">Ce diagnostic décrit ce que les fabricants d'objets acceptent
couramment de produire, pas les limites physiques des procédés. Un atelier
spécialisé peut réaliser ce que la plupart refusent.</p>`;
}
