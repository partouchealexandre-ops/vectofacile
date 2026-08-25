/**
 * Gabarit QUESTION.
 *
 * ATTENTION, contrainte de fond sur cette page : elle explique COMMENT on
 * compte les couleurs, jamais COMBIEN une technique en accepte. Le nombre de
 * couleurs admis par la serigraphie ou la tampographie est un seuil de
 * marquage : il appartient au referentiel et aux arbitrages P0, il ne se
 * publie pas dans une page de contenu ecrite avant eux. Toute phrase de cette
 * page doit rester vraie sans consulter seuils.json.
 */

export const QUESTIONS_COULEURS = [
  {
    url: '/questions/combien-de-couleurs-a-mon-logo',
    titre: "Combien de couleurs a vraiment mon logo ?",
    meta: "Votre logo a trois couleurs sur le papier et des milliers dans le fichier. "
      + "D'où vient l'écart, pourquoi votre marqueur le facture, comment les compter.",
    h1: "Combien de couleurs a vraiment mon logo ?",
    chapo: "Presque jamais le nombre que vous croyez. Un logo « à trois couleurs » exporté "
      + "en JPEG en contient couramment plusieurs milliers, et c'est ce nombre-là que "
      + "voit la machine de marquage.",
    sections: [
      {
        h2: "Deux comptes différents, et ils comptent tous les deux",
        html: `
<p>Quand vous dites que votre logo a trois couleurs, vous parlez de votre charte : le
navy, l'orange, le blanc. C'est le compte du graphiste, et c'est celui qui a du sens.</p>
<p>Quand un programme ouvre votre fichier, il compte autre chose : le nombre de teintes
<b>réellement présentes</b> dans les pixels. Sur un fichier propre, les deux comptes
coïncident. Sur un JPEG, ils divergent violemment.</p>
<table>
<thead><tr><th>Fichier</th><th>Couleurs de la charte</th><th>Teintes mesurées</th></tr></thead>
<tbody>
<tr><td>Le vectoriel d'origine</td><td>3</td><td>3</td></tr>
<tr><td>Un PNG exporté proprement</td><td>3</td><td>3, plus le lissage des bords</td></tr>
<tr><td>Le même logo passé en JPEG</td><td>3</td><td>des centaines à des milliers</td></tr>
</tbody>
</table>
<p>Ces milliers de teintes ne sont pas un défaut de votre logo : ce sont des artefacts
de compression, des halos de un ou deux pixels autour de chaque bord. Invisibles à
l'œil, parfaitement visibles pour une machine.</p>`,
      },
      {
        h2: "Pourquoi cet écart vous coûte de l'argent",
        html: `
<p>Une bonne partie des techniques de marquage ne posent pas de la couleur en continu :
elles appliquent des <b>encres séparées</b>, une par une. Chaque encre demande sa
préparation, et la préparation se facture, généralement une fois par commande.</p>
<p>Le devis dépend donc du nombre de couleurs que votre fichier impose de séparer. Si
personne ne nettoie le fichier avant, deux issues, toutes deux à vos frais : le marqueur
passe du temps à le remettre au propre et vous le facture, ou il le marque tel quel et
le résultat est sale.</p>
<div class="encadre"><p><b>Ce qu'il faut retenir :</b> le nombre de couleurs de votre fichier
n'est pas une donnée esthétique, c'est une ligne de devis. C'est la raison pour laquelle
notre diagnostic le mesure en premier.</p></div>`,
      },
      {
        h2: 'Comment nous comptons, et pourquoi pas autrement',
        html: `
<p>Compter les teintes exactes n'aurait aucun intérêt : le résultat serait « quatre mille
deux cent onze », un chiffre vrai et inutile. Ce que vous voulez savoir, c'est
<b>combien de couleurs il faudra vraiment séparer</b>. Notre outil procède donc en
plusieurs temps.</p>
<ol>
<li>Il compte les teintes brutes, sur les pixels pleinement opaques seulement, parce que
la transparence partielle des bords fabrique des couleurs qui n'existent pas dans le
dessin.</li>
<li>Il écarte les pixels instables, ceux dont les voisins immédiats diffèrent : c'est la
signature d'un bord lissé ou d'un artefact, pas d'un aplat.</li>
<li>Il regroupe les teintes perceptuellement identiques, celles qu'aucun œil ne distingue,
en travaillant dans un espace de couleur qui respecte la vision humaine plutôt que les
valeurs brutes de l'écran.</li>
<li>Il ne retient que les couleurs qui couvrent une part réelle du dessin, et vous rend
cette <b>palette</b> : la liste courte, celle qui a un sens pour un marqueur.</li>
</ol>
<p>Vous obtenez donc les deux chiffres : les teintes brutes, qui disent l'état du fichier,
et la palette, qui dit le dessin. L'écart entre les deux est précisément la mesure de la
dégradation subie par votre logo.</p>`,
      },
      {
        h2: 'Le nombre de couleurs admis dépend de la technique',
        html: `
<p>Il n'existe pas de bon nombre de couleurs dans l'absolu. Une technique qui dépose des
encres séparées, une technique qui imprime en quadrichromie et une gravure qui ne dépose
aucune encre n'ont pas les mêmes contraintes, ni de près.</p>
<p>C'est pourquoi le diagnostic ne vous dira jamais « votre logo a trop de couleurs » dans
le vide : il vous dira quelles techniques restent ouvertes avec la palette mesurée, et
lesquelles se ferment. Ces correspondances sont en cours d'établissement, technique par
technique et source par source ; elles arriveront dans l'outil quand elles seront
vérifiées, pas avant.</p>`,
      },
      {
        h2: 'Réduire le nombre de couleurs sans abîmer le logo',
        html: `
<p>Trois gestes, dans cet ordre, du plus efficace au moins souhaitable.</p>
<ol>
<li><b>Retrouvez le fichier vectoriel d'origine.</b> Il porte exactement les couleurs de la
charte, et le problème disparaît au lieu d'être corrigé.</li>
<li><b>Repartez d'un PNG plutôt que d'un JPEG.</b> À taille égale, il conserve les aplats et
divise le nombre de teintes parasites par plusieurs ordres de grandeur.</li>
<li><b>Faites simplifier le dessin.</b> Supprimer un dégradé ou une ombre portée relève d'un
choix graphique, pas d'un réglage technique : cela se décide, avec la personne qui tient
votre identité visuelle.</li>
</ol>`,
      },
    ],
    faq: [
      {
        q: "Pourquoi mon logo a-t-il des milliers de couleurs alors qu'il en a trois ?",
        r: "Parce qu'il est passé par une compression JPEG. Celle-ci fabrique des halos de "
          + "teintes intermédiaires autour de chaque bord et transforme un aplat unique en "
          + "nuage de nuances très proches. Le dessin n'a pas changé, le fichier si.",
      },
      {
        q: 'Comment compter les couleurs de mon logo gratuitement ?',
        r: "Déposez-le sur Bon à Marquer : la mesure se fait dans votre navigateur, sans compte "
          + "et sans envoi. Vous obtenez les teintes brutes présentes dans le fichier et la "
          + "palette réelle du dessin, c'est-à-dire les couleurs qu'il faudra séparer au marquage.",
      },
      {
        q: 'Le blanc compte-t-il comme une couleur en marquage ?',
        r: "Cela dépend entièrement du support et de la technique : sur un objet clair le blanc "
          + "peut être la couleur du support et ne rien coûter, sur un objet foncé c'est une "
          + "encre à part entière, parfois même une sous-couche indispensable. C'est une "
          + "question à poser à votre marqueur avec le support exact en tête.",
      },
      {
        q: 'Faut-il fournir les références Pantone de mon logo ?',
        r: "Si vous les avez, oui, et cela évite une conversion approximative. Si vous ne les "
          + "avez pas, votre marqueur les approchera depuis les valeurs de votre fichier, avec "
          + "un écart possible : c'est justement ce que les références Pantone servent à éviter.",
      },
    ],
  },
];
