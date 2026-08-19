/**
 * Gabarit QUESTION : une vraie question par URL, la reponse en premier.
 *
 * C'est le format que les moteurs de reponse citent le plus, et c'est celui ou
 * la longue traine du client bloque se joue. Regle d'ecriture du gabarit :
 * aucun paragraphe d'introduction, la reponse directe des la premiere phrase,
 * des chiffres precis, et un lien vers l'outil dans la reponse.
 */

export const QUESTIONS = [
  {
    url: '/questions/mon-imprimeur-demande-un-fichier-vectoriel',
    titre: "Mon imprimeur demande un fichier vectoriel : que faire ?",
    meta: "Votre imprimeur réclame un .ai ou un .eps et vous n'avez qu'un JPEG. Voici ce "
      + "que ça veut dire, où le chercher, et comment en obtenir un gratuitement en trente secondes.",
    h1: "Mon imprimeur demande un fichier vectoriel",
    chapo: "Réclamez-le d'abord à qui a créé votre logo : vous y avez droit et c'est gratuit. "
      + "S'il est introuvable, cet outil en fabrique un depuis votre image, sans compte.",
    sections: [
      {
        h2: 'Ce que votre imprimeur demande vraiment',
        html: `
<p>Un fichier vectoriel décrit votre logo par des <b>formes et des courbes</b>, pas par des
pixels. Il s'agrandit à n'importe quelle taille sans jamais devenir flou, et surtout la
machine de marquage sait le suivre : le laser suit un contour, la découpe suit un tracé,
la sérigraphie sépare des aplats.</p>
<p>Une image en pixels, elle, ne contient aucun contour. Elle contient des points de
couleur. C'est pour ça qu'on ne peut pas simplement l'agrandir.</p>
<table>
<thead><tr><th></th><th>Fichier vectoriel</th><th>Image en pixels</th></tr></thead>
<tbody>
<tr><td>Extensions</td><td>.ai, .eps, .pdf, .svg</td><td>.jpg, .png, .gif, .webp</td></tr>
<tr><td>Agrandissement</td><td>sans perte, à l'infini</td><td>devient flou ou pixelisé</td></tr>
<tr><td>Couleurs</td><td>comptées exactement</td><td>souvent des milliers, involontaires</td></tr>
<tr><td>Accepté en marquage</td><td>oui</td><td>rarement, et jamais en gravure ou découpe</td></tr>
</tbody>
</table>`,
      },
      {
        h2: 'Commencez par le réclamer, il existe probablement',
        html: `
<p>Si votre logo a été dessiné par un graphiste, une agence ou un studio, <b>le fichier
vectoriel existe</b>. Le JPEG que vous avez sous la main en est un export. Demandez le
fichier source : selon les usages professionnels, il vous revient, et le réclamer ne
coûte rien.</p>
<div class="encadre"><p><b>Le message à envoyer :</b> « Bonjour, j'ai besoin du logo en
fichier vectoriel, .ai ou .eps, pour un marquage. Pouvez-vous me l'envoyer ? »
C'est tout, et c'est une demande banale.</p></div>
<p>Notre outil vous dit d'ailleurs si votre image ressemble à l'export d'un vectoriel
existant : quand un dessin de neuf couleurs se retrouve noyé dans vingt mille teintes,
c'est la signature d'un aplat passé par une compression. Le dessin d'origine, lui,
est propre quelque part.</p>`,
      },
      {
        h2: "Si le fichier source est introuvable",
        html: `
<p>C'est le cas courant : l'agence a fermé, le graphiste ne répond plus, le logo date de
douze ans. On peut alors le <b>revectoriser</b> à partir de l'image, c'est-à-dire redessiner
automatiquement des contours qui suivent les formes.</p>
<p>Le résultat dépend entièrement de la taille de départ. Une image nette et grande donne
un vectoriel propre. Une vignette de 300 pixels prise sur un site web donne un tracé
anguleux, où les petits textes se déforment. Notre outil mesure cela et vous le dit
avant que vous ne téléchargiez quoi que ce soit, plutôt que de vous laisser découvrir le
problème chez le marqueur.</p>`,
      },
      {
        h2: 'Quel format lui envoyer, concrètement',
        html: `
<p>Le <b>.eps</b> passe chez tous les fabricants d'objets publicitaires. Le <b>.pdf</b>
vectoriel est accepté partout aussi et présente l'avantage que vous pouvez l'ouvrir
vous-même pour vérifier avant d'envoyer.</p>
<p>Le <b>.svg</b>, en revanche, est refusé par la plupart des fabricants de goodies, même
s'il est parfaitement vectoriel. Gardez-le pour votre site web.</p>`,
      },
    ],
    faq: [
      {
        q: "Comment savoir si mon fichier est vectoriel ?",
        r: "Regardez son extension : .ai, .eps, .pdf et .svg peuvent être vectoriels ; .jpg, "
          + ".png, .gif et .webp ne le sont jamais. Attention, un .pdf peut aussi ne contenir "
          + "qu'une image collée. Le test qui ne trompe pas : agrandissez très fortement à "
          + "l'écran. Si les contours restent nets, c'est vectoriel.",
      },
      {
        q: "Puis-je juste renommer mon JPEG en .eps ?",
        r: "Non. L'extension ne change pas le contenu du fichier : il resterait une image en "
          + "pixels et votre imprimeur le verrait immédiatement. Il faut une vraie conversion, "
          + "qui redessine des contours.",
      },
      {
        q: "Un logo vectorisé automatiquement vaut-il l'original ?",
        r: "Rarement. Il s'en approche beaucoup quand l'image de départ est grande et nette, et "
          + "il s'en éloigne d'autant plus que l'image est petite ou compressée, surtout sur les "
          + "petits textes. Quand le fichier source existe, il vaut toujours mieux le réclamer.",
      },
      {
        q: "Est-ce que ça coûte quelque chose ?",
        r: "Non. Le diagnostic et le fichier vectoriel sont gratuits, sans compte et sans email.",
      },
    ],
  },
];
