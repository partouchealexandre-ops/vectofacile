/**
 * Gabarit QUESTION, famille FORMATS.
 *
 * Ces deux pages ne parlent que de fichiers : ce qu'un format contient, et
 * comment le verifier soi-meme. Aucun seuil de marquage, donc aucune
 * dependance aux arbitrages P0. C'est precisement pourquoi elles sont
 * ecrivables aujourd'hui alors que /guide/ et /marquage/ ne le sont pas.
 *
 * Regle d'ecriture, la meme partout : la reponse des la premiere phrase, et
 * une verification que le lecteur peut faire lui-meme plutot qu'une
 * affirmation qu'il doit croire.
 */

export const QUESTIONS_FORMATS = [
  {
    url: '/questions/comment-savoir-si-mon-pdf-est-vectoriel',
    titre: 'Comment savoir si mon PDF est vectoriel',
    meta: "Un PDF peut contenir un vrai vectoriel ou juste une photo collée dedans. "
      + "Trois vérifications simples pour le savoir en trente secondes, sans logiciel payant.",
    h1: 'Comment savoir si mon PDF est vectoriel',
    chapo: "Agrandissez-le à 1600 % dans votre lecteur de PDF : si les bords restent nets, "
      + "il est vectoriel ; s'ils deviennent flous ou carrés, il contient une image. "
      + "C'est le test le plus rapide, et il ne coûte rien.",
    sections: [
      {
        h2: 'Pourquoi la question se pose',
        html: `
<p>Le PDF n'est pas un format de dessin, c'est un <b>conteneur</b>. Il peut renfermer des
courbes mathématiques, une photo en pixels, du texte, ou les trois mêlés. Deux fichiers
avec la même extension peuvent donc être l'un parfaitement exploitable et l'autre
totalement inutile pour un marquage.</p>
<p>C'est la source d'un quiproquo classique : vous envoyez « le PDF du logo », votre
marqueur répond qu'il n'est pas vectoriel, et vous croyez à une erreur de sa part. Il a
raison : le fichier est bien un PDF, mais ce qu'il y a dedans est un scan ou une capture.</p>`,
      },
      {
        h2: 'Test numéro un : agrandissez très fort',
        html: `
<p>Ouvrez le fichier dans n'importe quel lecteur de PDF et montez le zoom à 1600 %, ou
au maximum disponible. Regardez le bord d'une lettre ou d'un cercle.</p>
<table>
<thead><tr><th>Ce que vous voyez</th><th>Ce que c'est</th></tr></thead>
<tbody>
<tr><td>Le bord reste net et lisse, quel que soit le zoom</td><td>Vectoriel</td></tr>
<tr><td>Le bord devient flou, ou se découpe en petits carrés</td><td>Une image en pixels dans un PDF</td></tr>
<tr><td>Le texte reste net mais le logo devient flou</td><td>Un PDF mixte : le texte est vectoriel, le logo non</td></tr>
</tbody>
</table>
<p>Ce dernier cas est le plus traître, parce que la netteté du texte donne l'impression
que tout le fichier est propre.</p>`,
      },
      {
        h2: 'Test numéro deux : essayez de sélectionner',
        html: `
<p>Passez l'outil de sélection de texte sur les lettres de votre logo. Si le curseur
change de forme et que vous pouvez surligner les caractères, le texte est resté du texte.
Si rien ne se sélectionne, c'est soit un tracé, soit une image, et le test du zoom
tranche entre les deux.</p>
<div class="encadre"><p><b>À savoir pour l'envoi :</b> un texte encore sélectionnable veut dire
que la police n'a pas été convertie en courbes. Chez qui ouvrira le fichier sans avoir
cette police installée, les lettres seront remplacées par d'autres. C'est pour cette
raison que les fabricants demandent un fichier « avec les polices vectorisées », et c'est
une demande différente de « un fichier vectoriel », même si les deux mots se ressemblent.</p></div>`,
      },
      {
        h2: 'Test numéro trois : le poids du fichier',
        html: `
<p>C'est un indice, pas une preuve, mais il coûte un coup d'œil. Un logo réellement
vectoriel est décrit par quelques centaines de courbes : le fichier pèse typiquement de
quelques dizaines à quelques centaines de kilo-octets. Un PDF de plusieurs méga-octets
pour un simple logo contient presque toujours une image haute définition.</p>
<p>L'inverse n'est pas vrai : un PDF léger peut très bien contenir une petite image de
mauvaise qualité. Le zoom reste le juge.</p>`,
      },
      {
        h2: 'Et si mon PDF contient bien une image',
        html: `
<p>Vous êtes dans la situation la plus courante, et elle n'est pas bloquante. Deux voies,
dans cet ordre.</p>
<ol>
<li><b>Réclamez le fichier source</b> à qui a créé le logo. Le PDF que vous avez est un
export ; l'original existe probablement en .ai ou .eps.</li>
<li><b>Extrayez l'image et faites-la mesurer.</b> Une capture d'écran du PDF affiché en très
grand donne souvent une meilleure image de départ que le JPEG qui traînait sur votre
bureau. Déposez-la <a href="/">dans l'outil</a> : il vous dira si elle est assez nette pour
donner un vectoriel propre, avant que vous n'envoyiez quoi que ce soit.</li>
</ol>`,
      },
    ],
    faq: [
      {
        q: 'Un PDF est-il toujours vectoriel ?',
        r: "Non. Le PDF est un conteneur : il peut renfermer des courbes, une photo en pixels, "
          + "du texte, ou un mélange des trois. Un scan enregistré en PDF reste un scan. Le test "
          + "du zoom à 1600 % tranche en quelques secondes.",
      },
      {
        q: 'Comment vérifier un PDF sans Illustrator ?',
        r: "Le lecteur de PDF de votre ordinateur suffit : zoomez à 1600 % et regardez si les "
          + "bords restent nets, puis essayez de sélectionner le texte. Ces deux gestes donnent "
          + "la réponse sans aucun logiciel payant.",
      },
      {
        q: "Que veut dire « vectoriser les polices » ?",
        r: "Transformer les lettres en tracés, pour qu'elles ne dépendent plus d'une police "
          + "installée sur l'ordinateur qui ouvre le fichier. Sans cela, une police absente est "
          + "remplacée par une autre et votre logo change d'allure à votre insu.",
      },
    ],
  },
  {
    url: '/questions/eps-ai-pdf-svg-quelle-difference',
    titre: 'EPS, AI, PDF, SVG : quelle différence et lequel envoyer',
    meta: "Quatre extensions pour des fichiers vectoriels, et elles ne s'échangent pas. "
      + "Ce que chacune contient, laquelle envoyer à un fabricant d'objets, laquelle "
      + "garder pour votre site.",
    h1: 'EPS, AI, PDF, SVG : quelle différence',
    chapo: "Pour un marquage sur objet, envoyez un .eps ou un .pdf vectoriel. Gardez le .ai "
      + "comme fichier de travail et le .svg pour votre site web : il est pourtant "
      + "parfaitement vectoriel, mais peu de fabricants le prennent.",
    sections: [
      {
        h2: 'Les quatre, en un tableau',
        html: `
<table>
<thead><tr><th></th><th>À quoi ça sert</th><th>Qui l'ouvre</th></tr></thead>
<tbody>
<tr><td><b>.ai</b></td><td>Le fichier de travail d'Adobe Illustrator, avec les calques et l'historique</td><td>Illustrator, et lui seul vraiment</td></tr>
<tr><td><b>.eps</b></td><td>Le format d'échange historique de l'impression</td><td>À peu près tous les logiciels de production</td></tr>
<tr><td><b>.pdf</b></td><td>Un conteneur universel, vectoriel s'il a été exporté comme tel</td><td>Tout le monde, y compris vous</td></tr>
<tr><td><b>.svg</b></td><td>Le vectoriel du web, lisible dans un navigateur</td><td>Navigateurs et outils de dessin récents</td></tr>
</tbody>
</table>
<p>Aucun de ces formats n'est meilleur que les autres dans l'absolu. Ils répondent à des
questions différentes : garder mon travail, l'échanger avec une machine, le montrer à
quelqu'un, l'afficher sur un écran.</p>`,
      },
      {
        h2: 'Lequel envoyer à un fabricant d\'objets marqués',
        html: `
<p>Le <b>.eps</b> passe partout dans ce métier. C'est le format que les chaînes de production
attendent depuis trente ans, et c'est celui qu'on vous demandera par défaut.</p>
<p>Le <b>.pdf vectoriel</b> est accepté tout aussi largement, et il a un avantage que l'EPS
n'a pas : <b>vous pouvez l'ouvrir vous-même</b> pour vérifier avant d'envoyer. Un EPS ne
s'affiche pas sur un ordinateur ordinaire, donc vous l'expédiez sans l'avoir vu. Quand
vous avez le choix, envoyez les deux : le PDF pour contrôler, l'EPS pour la production.</p>
<div class="encadre"><p><b>Le .svg, le piège du bon élève.</b> Il est vectoriel, il est léger, il
est ouvert, et il est pourtant refusé par une bonne partie des fabricants d'objets
publicitaires. Leurs chaînes de production ne le lisent pas. Ce n'est pas un défaut du
format, c'est un fait d'outillage : gardez-le pour votre site web.</p></div>`,
      },
      {
        h2: 'Les pièges qui n\'ont rien à voir avec l\'extension',
        html: `
<p>Renommer un fichier ne change pas ce qu'il contient. Quatre problèmes traversent les
quatre formats, et ce sont eux qui bloquent réellement une commande.</p>
<ul>
<li><b>Une image collée dans un fichier vectoriel.</b> Le fichier porte la bonne extension et
ne contient qu'une photo. C'est le cas le plus fréquent, et le zoom le révèle.</li>
<li><b>Des polices non converties en courbes.</b> Chez qui n'a pas la police, les lettres
changent. Demandez toujours un fichier « polices vectorisées ».</li>
<li><b>Un mode colorimétrique inattendu.</b> Un fichier destiné au web est en RVB, la
production travaille souvent en CMJN ou en tons directs. La conversion se fait, mais les
couleurs bougent si personne ne les a fixées.</li>
<li><b>Des effets non aplatis.</b> Ombres portées, transparences, dégradés de maillage : ils
survivent mal aux conversions et se rendent différemment d'une machine à l'autre.</li>
</ul>`,
      },
      {
        h2: 'Ce que produit Vecto Facile, et pourquoi',
        html: `
<p>L'outil vous rend un <b>.eps</b> et un <b>.pdf</b>, générés depuis le même tracé, à partir
de votre image. L'EPS pour votre marqueur, le PDF pour que vous puissiez regarder avant
d'envoyer. Les deux sont écrits par notre propre code plutôt que repris tels quels d'une
bibliothèque, ce qui nous permet de garantir qu'ils décrivent exactement les mêmes formes,
et c'est vérifié à chaque modification de l'outil.</p>
<p>Nous ne produisons pas de .ai, qui est un format de travail propriétaire, ni de .svg :
il ne vous servirait pas là où vous allez.</p>`,
      },
    ],
    faq: [
      {
        q: 'Quel format vectoriel envoyer à un imprimeur ?',
        r: "Un .eps en priorité, accepté à peu près partout en production. Un .pdf vectoriel "
          + "convient tout aussi bien et présente l'avantage que vous pouvez l'ouvrir pour "
          + "vérifier avant l'envoi. Idéalement, envoyez les deux.",
      },
      {
        q: 'Peut-on convertir un SVG en EPS ?',
        r: "Oui, la conversion est directe puisque les deux décrivent des courbes : rien n'est "
          + "perdu au passage. Attention seulement aux effets et aux polices, qui doivent être "
          + "convertis en tracés avant la conversion pour ne pas se déformer.",
      },
      {
        q: 'Pourquoi mon fabricant refuse-t-il mon SVG alors qu\'il est vectoriel ?',
        r: "Parce que ses outils de production ne le lisent pas. Le SVG vient du web, les "
          + "chaînes de marquage viennent de l'impression et parlent EPS et PDF. Le format "
          + "n'est pas en cause, l'outillage l'est.",
      },
      {
        q: 'Un .ai est-il meilleur qu\'un .eps ?',
        r: "Non, il est différent. Le .ai est un fichier de travail qui conserve calques et "
          + "réglages, utile à votre graphiste mais illisible ailleurs qu'avec Illustrator. "
          + "Pour un échange avec un fabricant, l'EPS est le bon choix.",
      },
    ],
  },
];
