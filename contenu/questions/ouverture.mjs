/**
 * Gabarit QUESTION, famille OUVERTURE DES FICHIERS.
 *
 * Priorite 1 du plan contenu du 20/08 : « les pages question sur l'ouverture
 * des fichiers, .ai en tete. Elles captent une intention massive, elles ne
 * demandent aucun seuil, et elles preparent l'inspecteur de fichier. »
 *
 * L'intention est massive parce que le scenario est universel : un client
 * recoit « le logo » de son graphiste dans un format qu'aucun logiciel de sa
 * machine ne sait ouvrir. Il ne veut pas apprendre Illustrator, il veut VOIR
 * le fichier et savoir quoi en faire.
 *
 * Regle d'ecriture, la meme que les autres familles : la reponse des la
 * premiere phrase, des gestes verifiables plutot que des affirmations, et
 * AUCUN seuil de marquage.
 */

export const QUESTIONS_OUVERTURE = [
  {
    url: '/questions/comment-ouvrir-un-fichier-ai',
    titre: 'Comment ouvrir un fichier AI sans Illustrator',
    meta: "Un fichier .ai récent est un PDF déguisé : renommez-le et il s'ouvre. "
      + "Trois façons gratuites de le voir, de le vérifier et de l'envoyer à un marqueur.",
    h1: 'Comment ouvrir un fichier .ai sans Illustrator',
    chapo: "Dans la plupart des cas, il suffit de le renommer : un fichier .ai enregistré "
      + "depuis Illustrator 9 ou plus récent contient un PDF complet. Copiez le fichier, "
      + "remplacez .ai par .pdf, et il s'ouvre dans n'importe quel lecteur de PDF.",
    sections: [
      {
        h2: 'Ce qu\'est vraiment un fichier .ai',
        html: `
<p>Le format .ai est le format de travail d'Adobe Illustrator. Mais depuis la version 9,
Illustrator coche par défaut une option nommée <b>« Créer un fichier compatible PDF »</b> :
le fichier enregistré contient alors deux choses à la fois, les données de travail
d'Illustrator et un PDF ordinaire du même dessin. C'est ce PDF que tous les autres
logiciels lisent.</p>
<p>Conséquence pratique : votre .ai s'ouvre presque partout, à condition de savoir que
c'est un PDF. Et une exception existe : si le graphiste a décoché l'option en
enregistrant, le fichier ne contient que les données Illustrator, et rien d'autre ne
l'ouvrira. Dans ce cas, une seule solution : demander un réenregistrement.</p>`,
      },
      {
        h2: 'Trois façons de l\'ouvrir, toutes gratuites',
        html: `
<table>
<thead><tr><th>Méthode</th><th>Ce qu'il faut faire</th><th>Ce que vous obtenez</th></tr></thead>
<tbody>
<tr><td><b>Le renommer en .pdf</b></td><td>Copiez le fichier, remplacez l'extension .ai
par .pdf, ouvrez la copie</td><td>Le dessin s'affiche dans votre lecteur de PDF habituel,
zoomable et imprimable</td></tr>
<tr><td><b>Le déposer sur notre outil</b></td><td><a href="/">Déposez le .ai tel quel</a>,
sans le renommer</td><td>Sa taille réelle en millimètres, ses couleurs, ses mesures, et
le diagnostic de marquage. Rien ne quitte votre navigateur</td></tr>
<tr><td><b>L'ouvrir dans Inkscape</b></td><td>Logiciel de dessin vectoriel gratuit,
Windows, Mac et Linux</td><td>Le dessin ouvert et MODIFIABLE, exportable en PDF, SVG ou
PNG</td></tr>
</tbody>
</table>
<p>Le renommage n'abîme rien : travaillez toujours sur une copie, et le fichier
d'origine reste intact. Si la copie renommée ne s'ouvre pas, vous êtes dans le cas de
l'option décochée décrit plus haut.</p>`,
      },
      {
        h2: 'Ce qu\'il faut vérifier avant de l\'envoyer à un marqueur',
        html: `
<p>Ouvrir le fichier ne suffit pas : un .ai peut contenir une photo collée au lieu d'un
vrai tracé vectoriel, et il peut contenir du texte non vectorisé qui changera de police
chez l'atelier. Les deux se voient mal à l'œil nu.</p>
<p><a href="/">Notre outil</a> lit les fichiers .ai compatibles PDF et compte ce qu'il y
a dedans : tracés, images, blocs de texte. Il vous dit en clair si votre fichier n'est
vectoriel que d'extension, et il mesure son trait le plus fin, ses couleurs réelles et
sa taille exacte en millimètres. Pour comprendre la différence entre les formats,
voyez <a href="/questions/eps-ai-pdf-svg-quelle-difference">EPS, AI, PDF, SVG : quelle
différence</a>.</p>`,
      },
    ],
    faq: [
      {
        q: 'Puis-je ouvrir un fichier .ai sans Illustrator ?',
        r: "Oui, dans la plupart des cas. Un .ai enregistré avec l'option « Créer un fichier "
          + "compatible PDF », qui est le réglage par défaut depuis Illustrator 9, contient un "
          + "PDF complet : renommez une copie en .pdf et elle s'ouvre dans tout lecteur de PDF.",
      },
      {
        q: 'Renommer un .ai en .pdf peut-il abîmer le fichier ?',
        r: "Non. L'extension n'est qu'une étiquette : le contenu du fichier ne change pas. "
          + "Travaillez sur une copie par prudence, et gardez l'original en .ai pour votre "
          + "graphiste et votre marqueur.",
      },
      {
        q: 'Pourquoi mon .ai renommé en .pdf ne s\'ouvre-t-il pas ?',
        r: "Parce qu'il a été enregistré sans l'option de compatibilité PDF. Le fichier ne "
          + "contient alors que les données de travail d'Illustrator, qu'aucun autre logiciel "
          + "ne lit. Demandez à son auteur de le réenregistrer avec l'option cochée, ou un "
          + "export en PDF.",
      },
      {
        q: 'Un marqueur accepte-t-il un fichier .ai ?',
        r: "Oui, c'est même l'un des formats qu'ils demandent le plus, avec l'EPS et le PDF "
          + "vectoriel. L'important n'est pas l'extension mais le contenu : un vrai tracé "
          + "vectoriel, des textes convertis en courbes, et les bonnes couleurs.",
      },
    ],
  },
  {
    url: '/questions/comment-ouvrir-un-fichier-eps',
    titre: 'Comment ouvrir un fichier EPS gratuitement',
    meta: "L'EPS ne s'ouvre pas d'un double-clic, mais des outils gratuits le lisent sur "
      + "Mac, Windows et Linux. Les méthodes qui marchent, et celle qu'il faut éviter.",
    h1: 'Comment ouvrir un fichier .eps gratuitement',
    chapo: "Sur Mac, l'application Aperçu l'ouvre directement et peut l'exporter en PDF. "
      + "Sur Windows et Linux, Inkscape et LibreOffice Draw le lisent gratuitement. Et si "
      + "vous voulez seulement l'envoyer à un marqueur : vous n'avez pas besoin de l'ouvrir.",
    sections: [
      {
        h2: 'Pourquoi l\'EPS ne s\'ouvre pas tout seul',
        html: `
<p>L'EPS est un format des années 1980, conçu pour parler aux imprimantes : c'est du
<b>PostScript</b>, un langage de description de page, pas une image. Le lire demande un
interpréteur, et ni Windows ni les navigateurs n'en embarquent un. C'est pourquoi le
double-clic ne donne rien, alors que le fichier est parfaitement valable.</p>
<p>Les ateliers de marquage, eux, l'ouvrent sans y penser : leurs logiciels de
production le lisent nativement. Un EPS qui ne s'ouvre pas chez vous n'est donc pas un
fichier cassé, et il n'a souvent pas besoin d'être ouvert du tout pour servir.</p>`,
      },
      {
        h2: 'Les méthodes gratuites, système par système',
        html: `
<table>
<thead><tr><th>Outil</th><th>Système</th><th>Ce qu'il fait</th></tr></thead>
<tbody>
<tr><td><b>Aperçu</b></td><td>Mac</td><td>Ouvre l'EPS d'un double-clic en le convertissant,
et l'exporte en PDF par « Fichier, Exporter »</td></tr>
<tr><td><b>Inkscape</b></td><td>Windows, Mac, Linux</td><td>Ouvre et modifie l'EPS, avec
l'interpréteur Ghostscript installé à côté</td></tr>
<tr><td><b>LibreOffice Draw</b></td><td>Windows, Mac, Linux</td><td>Affiche l'EPS inséré
dans une page et le réexporte en PDF</td></tr>
</tbody>
</table>
<p>La méthode à éviter : les convertisseurs en ligne. Votre logo part sur le serveur
d'un inconnu, et la plupart rastérisent le fichier au passage, c'est à dire qu'ils vous
rendent une image en pixels à la place de votre vectoriel. Vous perdez précisément ce
qui faisait la valeur du fichier.</p>`,
      },
      {
        h2: 'Et pour un marquage ?',
        html: `
<p>Si votre but est de faire marquer des objets, la meilleure nouvelle est que vous
n'avez rien à ouvrir : <b>l'EPS est le format que les ateliers préfèrent recevoir</b>.
Envoyez-le tel quel, avec vos couleurs en référence.</p>
<p>Notre outil ne lit pas encore l'EPS directement : il lit les PDF et les fichiers
Illustrator. Pour faire diagnostiquer un EPS, exportez-le en PDF, sur Mac avec Aperçu en
deux clics, ailleurs avec Inkscape ou LibreOffice Draw, puis
<a href="/">déposez le PDF</a> : taille réelle, couleurs, trait le plus fin, et ce que
les fabricants publient comme minimums. Pour savoir ce qui distingue les formats entre
eux, voyez <a href="/questions/eps-ai-pdf-svg-quelle-difference">EPS, AI, PDF, SVG :
quelle différence</a>.</p>`,
      },
    ],
    faq: [
      {
        q: 'Comment ouvrir un fichier EPS sans Photoshop ni Illustrator ?',
        r: "Sur Mac, l'application Aperçu l'ouvre directement. Sur Windows et Linux, Inkscape "
          + "avec Ghostscript, ou LibreOffice Draw. Tous sont gratuits, et tous savent "
          + "réexporter en PDF.",
      },
      {
        q: 'Pourquoi mon EPS s\'affiche-t-il en qualité médiocre ?',
        r: "Beaucoup de logiciels ne montrent que l'aperçu de secours embarqué dans le "
          + "fichier, une petite image en pixels prévue pour l'époque des écrans de 1990. Le "
          + "dessin vectoriel, lui, est intact : un logiciel qui interprète réellement le "
          + "PostScript l'affichera net.",
      },
      {
        q: 'Faut-il convertir un EPS avant de l\'envoyer à un marqueur ?',
        r: "Non. L'EPS est justement le format que la plupart des ateliers demandent. "
          + "Envoyez-le tel quel : c'est chez eux qu'il s'ouvre le mieux.",
      },
      {
        q: 'Un convertisseur EPS en ligne est-il une bonne idée ?',
        r: "Rarement. Votre fichier part sur un serveur tiers, et beaucoup de convertisseurs "
          + "rendent une image en pixels au lieu d'un vectoriel : le fichier converti a perdu "
          + "ce qui faisait sa valeur. Préférez Aperçu, Inkscape ou LibreOffice Draw, qui "
          + "travaillent sur votre machine.",
      },
    ],
  },
];
