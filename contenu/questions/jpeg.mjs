/**
 * Gabarit QUESTION : une vraie question par URL, la reponse en premier.
 *
 * Regle d'ecriture, la meme partout : pas de paragraphe d'echauffement, la
 * reponse des la premiere phrase, et aucun seuil de marquage. Cette page
 * decrit ce que fait l'outil et ce que fait un format de fichier, jamais ce
 * qui est marquable : les seuils attendent les arbitrages P0 et le
 * referentiel, ils n'ont rien a faire dans une page publiee avant eux.
 */

export const QUESTIONS_JPEG = [
  {
    url: '/questions/comment-vectoriser-un-jpeg',
    titre: 'Comment vectoriser un JPEG gratuitement',
    meta: "Vectoriser un JPEG, c'est redessiner ses contours. Comment le faire "
      + "gratuitement dans votre navigateur, et comment juger si le résultat tient.",
    h1: 'Comment vectoriser un JPEG',
    chapo: "Déposez votre image ici : elle est vectorisée dans votre navigateur, sans compte "
      + "et sans envoi, et vous récupérez un .eps. La vraie question n'est pas comment, "
      + "c'est si le résultat tient la route, et cette page vous apprend à le juger.",
    sections: [
      {
        h2: 'Vectoriser, ce que ça veut dire exactement',
        html: `
<p>Un JPEG est une grille de points de couleur. Vectoriser, c'est faire parcourir cette
grille par un programme qui cherche les frontières entre les zones de couleur et les
remplace par des <b>contours mathématiques</b>. Le fichier obtenu ne contient plus de
points : il contient des formes, que l'on peut agrandir sans limite.</p>
<p>Le mot important est <b>remplace</b>. La vectorisation ne retrouve pas le dessin
d'origine, elle en fabrique une nouvelle interprétation. Sa qualité dépend donc
entièrement de ce qu'elle avait à lire.</p>`,
      },
      {
        h2: "Pourquoi le JPEG est le pire départ possible",
        html: `
<p>Le JPEG a été conçu pour les photographies, où l'œil ne voit pas les petites
approximations. Un logo, lui, est fait d'aplats et de bords nets, exactement ce que ce
format traite le plus mal.</p>
<p>Sa compression fabrique deux dégâts, invisibles à l'écran et bien visibles pour un
programme qui suit des contours :</p>
<ul>
<li><b>Des halos autour des bords.</b> Le noir d'un texte ne s'arrête pas net sur le blanc :
il passe par une bande de gris. Le vectoriseur, lui, doit décider où est la frontière.</li>
<li><b>Des aplats qui n'en sont plus.</b> Une zone d'une seule couleur devient un nuage de
teintes très proches. Un logo à trois couleurs peut ainsi contenir plusieurs milliers de
nuances mesurables.</li>
</ul>
<p>Un PNG à la même taille donne un résultat nettement plus propre, parce qu'il conserve
les aplats exactement. Si vous avez le choix entre les deux, prenez le PNG sans hésiter.</p>`,
      },
      {
        h2: 'La taille de départ décide de tout',
        html: `
<p>C'est le facteur qui compte le plus, et de loin. Un vectoriseur ne peut pas inventer
un détail qui n'est pas dans l'image. Si la barre d'un « e » fait deux pixels de large
dans votre fichier, aucun programme au monde ne saura si c'était une ligne fine
régulière ou une courbe : il tracera ce qu'il voit, c'est-à-dire un escalier.</p>
<div class="encadre"><p><b>Le réflexe qui sauve la mise :</b> cherchez la plus grande version
de votre logo dont vous disposez avant de vectoriser. Le PDF d'une ancienne plaquette,
la version haute définition envoyée par l'imprimeur, le fichier d'origine sur un vieux
disque. Une image deux fois plus large donne un résultat deux fois plus fidèle, et
aucun réglage ne compense cela.</p></div>
<p>C'est aussi pour cette raison que l'image récupérée sur un site web est presque
toujours trop petite : elle a été fabriquée pour un écran, pas pour être agrandie.</p>`,
      },
      {
        h2: "Comment juger le résultat, en trois vérifications",
        html: `
<p>Un fichier vectoriel s'ouvre et se regarde. Ne l'envoyez jamais sans ces trois gestes,
qui prennent une minute.</p>
<ol>
<li><b>Agrandissez fortement les textes.</b> Les lettres doivent rester lisses. Si leurs
bords forment des marches d'escalier, l'image de départ était trop petite.</li>
<li><b>Regardez les angles.</b> Un angle droit du logo doit rester un angle droit, pas un
coin arrondi ou grignoté.</li>
<li><b>Comptez les couleurs.</b> Elles doivent correspondre à celles de votre charte. Si
le fichier en contient beaucoup plus, c'est que la compression a été vectorisée en même
temps que le dessin.</li>
</ol>
<p>Notre outil fait ces mesures pour vous et vous les affiche <b>avant</b> le téléchargement,
plutôt que de vous laisser découvrir le problème chez le marqueur. Il refuse même de
vectoriser une image manifestement trop bruitée : produire un fichier inexploitable et
le présenter comme un résultat serait pire que de ne rien produire.</p>`,
      },
      {
        h2: "Quand la vectorisation automatique ne suffit pas",
        html: `
<p>Il y a des cas où aucun outil automatique ne donnera un bon résultat, et il vaut mieux
le savoir tout de suite : un logo avec un dégradé, une photo intégrée, une texture, un
effet d'ombre portée, ou une image de départ vraiment minuscule.</p>
<p>Dans ces cas, le tracé se fait à la main par un graphiste, qui redessine le logo au
lieu de le décalquer. C'est du travail humain, et cela se facture. L'intérêt de mesurer
d'abord, c'est de savoir dans quel cas vous êtes avant de payer.</p>`,
      },
    ],
    faq: [
      {
        q: 'Peut-on vectoriser un JPEG gratuitement ?',
        r: "Oui. Bon à Marquer le fait dans votre navigateur, sans compte et sans envoi de "
          + "fichier, et vous rend un .eps et un .pdf. La limite n'est pas le prix mais la "
          + "qualité de l'image de départ : aucun outil, gratuit ou payant, ne récupère un "
          + "détail absent du fichier d'origine.",
      },
      {
        q: 'Quelle taille doit faire mon JPEG pour donner un bon vectoriel ?',
        r: "Plus il est grand, mieux c'est, sans seuil magique. Le critère utile n'est pas le "
          + "nombre de pixels de l'image entière mais l'épaisseur du trait le plus fin qu'elle "
          + "contient : c'est lui qui casse en premier. Notre outil mesure ce trait et vous "
          + "avertit quand il est trop mince pour être suivi proprement.",
      },
      {
        q: 'Vaut-il mieux vectoriser un PNG ou un JPEG ?',
        r: "Un PNG, toujours, à taille égale. Le PNG conserve les aplats exactement, alors que "
          + "la compression JPEG fabrique des halos autour des bords et transforme une couleur "
          + "unique en nuage de teintes proches, que le vectoriseur devra ensuite démêler.",
      },
      {
        q: 'La vectorisation automatique remplace-t-elle un graphiste ?',
        r: "Non, et il faut le dire clairement. Elle donne un résultat propre sur un logo net "
          + "et suffisamment grand, fait de formes simples. Sur un dégradé, une texture, une "
          + "ombre portée ou une image très petite, elle produit un tracé qu'un professionnel "
          + "devra reprendre, voire redessiner entièrement.",
      },
    ],
  },
];
