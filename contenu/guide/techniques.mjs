/**
 * Les fiches techniques, en FORME HONNETE.
 *
 * Ces pages ont attendu, et il faut dire pourquoi elles n'attendent plus.
 * Elles etaient bloquees parce qu'une fiche technique sans taille maximale ni
 * nombre de couleurs admis n'est qu'une definition de dictionnaire. Ce
 * raisonnement etait incomplet : il supposait qu'une page ne vaut que par ses
 * chiffres. Ce qui decide vraiment d'un marquage tient d'abord a une
 * mecanique physique, et celle-la se decrit sans chiffre.
 *
 * REGLE ABSOLUE DE CE FICHIER, et le harnais du referentiel ne peut pas la
 * verifier a ma place : AUCUN SEUIL DE MARQUAGE. Pas une taille maximale, pas
 * un nombre de couleurs admis, pas une epaisseur minimale. Ces valeurs
 * appartiennent au referentiel et aux arbitrages P0. Chaque fiche porte a la
 * place la meme phrase que le verdict, « nous ne savons pas encore », et dit
 * ce qui manque.
 *
 * Ce qui EST permis ici : le principe physique du procede, ce qu'il reussit,
 * ce qu'il rate, et le fichier qu'il demande. Ce sont des faits de mecanique,
 * pas des seuils, et ils restent vrais quel que soit l'arbitrage a venir.
 *
 * Consequence heureuse : ces pages ne seront pas a reecrire quand les chiffres
 * arriveront. Elles s'enrichiront d'un bloc, a URL constante.
 */

const NON_PUBLIE = {
  h2: 'Ce que nous ne publions pas encore',
  html: `
<p>Vous ne trouverez sur cette page ni taille maximale de marquage, ni nombre
de couleurs admis, ni épaisseur de trait minimale. Ce n'est pas un oubli.</p>
<p>Ces valeurs varient d'un atelier à l'autre, et les sources publiées se
contredisent plus souvent qu'elles ne s'accordent. Nous les rassemblons une par
une, avec leur source et leur date, et nous ne les afficherons qu'une fois
tranchées. En attendant, notre diagnostic vous dit <b>nous ne savons pas
encore</b> plutôt qu'un chiffre plausible. Un seuil inventé se recopie, et il se
recopie longtemps.</p>
<div class="encadre"><p><b>Ce que nous mesurons déjà, en revanche, ce sont des
faits</b> : le nombre réel de couleurs de votre fichier, l'épaisseur de son trait
le plus fin, l'écart le plus étroit entre deux formes, la hauteur de ses
capitales. Ces mesures ne dépendent d'aucun seuil et suffisent déjà à parler à
un marqueur. <a href="/">Déposez votre logo</a>, c'est gratuit et rien ne quitte
votre navigateur.</p></div>`,
};

export const TECHNIQUES = [
  {
    url: '/guide/serigraphie',
    titre: 'La sérigraphie sur objet publicitaire',
    meta: "La sérigraphie pousse l'encre à travers un écran tendu. Ce que ce "
      + "principe permet, ce qu'il interdit, et le type de fichier qu'il réclame.",
    h1: 'La sérigraphie',
    chapo: "Une couche d'encre épaisse et opaque, posée à travers un écran. C'est la "
      + "technique la plus couvrante du marquage sur objet, et celle qui supporte "
      + "le moins bien les détails minuscules.",
    sections: [
      {
        h2: 'Le principe, et ce qu\'il implique',
        html: `
<p>Un écran, c'est une toile tendue dont les mailles ont été bouchées partout
sauf à l'endroit du dessin. Une raclette pousse l'encre à travers les mailles
restées ouvertes, et l'encre se dépose sur l'objet.</p>
<p>Toute la mécanique découle de là. <b>Le trait le plus fin réalisable dépend de
la géométrie de la maille</b> : il faut qu'un trait couvre assez de mailles pour
que l'encre passe régulièrement. En dessous, l'encre passe par à-coups et le
trait se hache. Aucun réglage ne contourne cela, c'est de la géométrie.</p>
<p>Conséquence directe : chaque couleur demande son propre écran, sa propre
préparation et son propre passage. C'est pourquoi le nombre de couleurs pèse
autant sur un devis de sérigraphie.</p>`,
      },
      {
        h2: 'Ce qu\'elle réussit mieux que les autres',
        html: `
<ul>
<li><b>L'opacité.</b> La couche déposée est épaisse. Un blanc sur un objet noir
reste franchement blanc, là où beaucoup de techniques donnent un gris.</li>
<li><b>Les aplats.</b> Une grande surface d'une seule couleur est son terrain
naturel, sans effet de bande ni de trame.</li>
<li><b>La tenue.</b> Bien cuite, l'encre résiste au frottement et aux lavages
mieux que la plupart des transferts.</li>
<li><b>Les couleurs exactes.</b> L'encre est mélangée avant impression, donc une
référence Pantone se respecte réellement, au lieu d'être approchée par
superposition.</li>
</ul>`,
      },
      {
        h2: 'Ce qu\'elle rate',
        html: `
<p><b>Les dégradés.</b> Il n'y a pas de demi-encre : une maille laisse passer ou
ne laisse pas passer. Un dégradé se rend par une trame de points, visible à
l'œil nu sur un petit marquage.</p>
<p><b>Les détails minuscules.</b> Un texte très petit, une ligne très fine, un
motif serré : la maille impose son pas et les détails se bouchent ou se
coupent.</p>
<p><b>Les surfaces très courbes.</b> L'écran est plat et doit venir au contact.
Sur un cylindre, le marquage se fait soit sur une bande tangente étroite, soit
avec un équipement qui fait tourner l'objet pendant le passage.</p>`,
      },
      {
        h2: 'Le fichier qu\'elle demande',
        html: `
<p>Un <b>vectoriel</b>, avec les couleurs <b>séparées</b> et les polices converties en
courbes. Chaque couleur devra devenir un écran : elle doit donc exister comme
une forme distincte, pas comme un mélange de pixels.</p>
<p>C'est exactement ce que notre outil mesure en premier. Un logo « à trois
couleurs » exporté en JPEG en contient souvent des milliers, et personne ne peut
en faire trois écrans sans nettoyage préalable.
<a href="/questions/combien-de-couleurs-a-mon-logo">Pourquoi cet écart existe</a>.</p>`,
      },
      NON_PUBLIE,
    ],
    faq: [
      {
        q: 'Peut-on faire un dégradé en sérigraphie ?',
        r: "Oui, mais par une trame de points, pas par une variation continue d'encre. "
          + "Sur un marquage de petite taille, la trame se voit à l'œil nu. Si le dégradé "
          + "est essentiel à votre logo, une technique numérique conviendra mieux.",
      },
      {
        q: 'Pourquoi le nombre de couleurs coûte-t-il si cher en sérigraphie ?',
        r: "Parce que chaque couleur est un écran séparé, avec sa préparation, son calage "
          + "et son passage. Ce coût est fixe par commande : il pèse énormément sur une "
          + "petite série et devient négligeable sur une grande.",
      },
      {
        q: 'La sérigraphie tient-elle au lavage ?',
        r: "Sur textile, oui, c'est même l'un de ses points forts quand l'encre est "
          + "correctement polymérisée. Sur objet dur, la tenue dépend surtout de la "
          + "préparation du support, et un vernis de protection est parfois ajouté.",
      },
    ],
  },

  {
    url: '/guide/tampographie',
    titre: 'La tampographie sur objet bombé',
    meta: "Un tampon souple prend l'encre dans un cliché gravé et la dépose sur "
      + "l'objet. C'est la technique des formes creuses, bombées et irrégulières.",
    h1: 'La tampographie',
    chapo: "La technique qui marque là où rien d'autre ne passe : un stylo, un briquet, "
      + "le fond d'une tasse, une coque bombée. En échange, elle dépose très peu "
      + "d'encre.",
    sections: [
      {
        h2: 'Le principe, et ce qu\'il implique',
        html: `
<p>Le dessin est gravé en creux dans une plaque, le cliché. On remplit ces creux
d'encre, on racle le surplus, puis un tampon en silicone souple vient s'écraser
sur le cliché, prendre l'encre, se relever, et s'écraser sur l'objet.</p>
<p>La souplesse du tampon est tout l'intérêt : il épouse une surface bombée,
entre dans un creux, contourne une arête. C'est pour cela qu'on marque un stylo
en tampographie et pas en sérigraphie.</p>
<p>Mais chaque étape de ce trajet <b>perd de la matière</b>. Le cliché est gravé à
une certaine profondeur, le tampon n'en prélève qu'une partie, et n'en dépose
qu'une partie de cette partie. La couche finale est donc très mince, et c'est la
contrainte dominante du procédé.</p>`,
      },
      {
        h2: 'Ce qu\'elle réussit mieux que les autres',
        html: `
<ul>
<li><b>Les formes impossibles.</b> Bombé, concave, avec un rebord, en creux : le
tampon s'adapte là où un écran plat ne peut pas venir au contact.</li>
<li><b>Les petits marquages nets.</b> Sur une zone réduite, elle rend des détails
plus fins que la sérigraphie, parce qu'aucune maille n'impose son pas.</li>
<li><b>Les petites séries.</b> La préparation est plus légère.</li>
</ul>`,
      },
      {
        h2: 'Ce qu\'elle rate',
        html: `
<p><b>L'opacité sur fond foncé.</b> La couche déposée est mince. Un clair sur un
objet sombre ressort atténué, et il faut parfois deux passages, ce qui rallonge
et renchérit.</p>
<p><b>Les grands aplats.</b> Une surface étendue d'une seule couleur se dépose mal
et laisse voir des irrégularités.</p>
<p><b>Les grandes zones tout court.</b> Le tampon a une taille, la zone marquable
suit.</p>`,
      },
      {
        h2: 'Le fichier qu\'elle demande',
        html: `
<p>Un <b>vectoriel</b>, couleurs séparées, polices en courbes, comme en sérigraphie.
Avec une vigilance particulière sur <b>la finesse</b> : c'est la technique où un
trait trop mince dans le fichier ne se retrouve pas sur l'objet, parce que
l'encre ne franchit pas la chaîne de prélèvement.</p>
<p>Notre outil mesure justement le trait le plus fin de votre logo, et vous le
donne en millimètres si vous indiquez la taille d'impression voulue.</p>`,
      },
      NON_PUBLIE,
    ],
    faq: [
      {
        q: 'Quelle est la différence entre tampographie et sérigraphie ?',
        r: "La sérigraphie pousse l'encre à travers un écran plat et dépose une couche "
          + "épaisse et opaque. La tampographie prélève l'encre dans un cliché gravé avec "
          + "un tampon souple, dépose une couche mince, et accepte les surfaces bombées ou "
          + "creuses que l'écran ne peut pas atteindre.",
      },
      {
        q: 'Pourquoi mon marquage tampographique paraît-il moins vif que prévu ?',
        r: "Parce que la couche d'encre déposée est très mince, et que la couleur du "
          + "support transparaît. C'est net sur les objets foncés. Un second passage ou "
          + "une sous-couche blanche corrige, avec un coût supplémentaire.",
      },
      {
        q: 'Peut-on marquer un stylo autrement qu\'en tampographie ?',
        r: "Oui, la gravure laser est courante sur les stylos métal, et la sérigraphie "
          + "rotative existe sur certains corps. Le choix dépend de la matière, de la "
          + "zone souhaitée et du rendu voulu : un marquage gravé ne se retire pas mais "
          + "prend la couleur du métal.",
      },
    ],
  },

  {
    url: '/guide/gravure-laser',
    titre: 'La gravure laser sur objet',
    meta: "Le laser ne pose rien, il retire ou transforme la matière. Ce que ça "
      + "change pour votre logo, et pourquoi le résultat est monochrome.",
    h1: 'La gravure laser',
    chapo: "Aucune encre : un faisceau retire ou transforme la surface. Le marquage ne "
      + "s'efface pas, et il prend la couleur que la matière veut bien lui donner.",
    sections: [
      {
        h2: 'Le principe, et ce qu\'il implique',
        html: `
<p>Un faisceau très concentré balaie la surface et y dépose assez d'énergie pour
en retirer une couche, la faire changer de couleur, ou révéler la matière du
dessous. Rien n'est ajouté.</p>
<p>Trois conséquences en découlent, et elles surprennent souvent.</p>
<p><b>La couleur ne se choisit pas.</b> Elle est celle que la matière donne :
l'aluminium anodisé vire au clair, le bois brunit, l'inox noircit. Un logo à
plusieurs couleurs devient un dessin d'une seule teinte, et il faut donc qu'il
reste lisible sans ses couleurs.</p>
<p><b>La finesse dépend du diamètre du faisceau.</b> Il a une largeur, et rien ne
peut être plus fin qu'elle.</p>
<p><b>La mise au point est étroite.</b> Le faisceau n'est concentré qu'à une
distance précise. Sur une surface courbe, seule une bande reste dans la zone
nette, à moins de faire tourner l'objet pendant le marquage.</p>`,
      },
      {
        h2: 'Ce qu\'elle réussit mieux que les autres',
        html: `
<ul>
<li><b>La permanence.</b> Le marquage fait partie de l'objet. Il ne s'écaille pas,
ne se lave pas, ne se raye pas comme une encre.</li>
<li><b>Le rendu haut de gamme sur métal</b>, très recherché sur les stylos, les
gourdes isothermes et les outils.</li>
<li><b>La finesse des détails</b>, souvent supérieure aux techniques à encre.</li>
<li><b>Aucun coût par couleur</b>, puisqu'il n'y en a qu'une.</li>
</ul>`,
      },
      {
        h2: 'Ce qu\'elle rate',
        html: `
<p><b>Tout ce qui repose sur la couleur.</b> Un logo dont la lecture dépend du
contraste entre deux teintes proches disparaît une fois monochrome.</p>
<p><b>Les grands aplats pleins.</b> Remplir une grande surface demande de la
balayer entièrement : c'est long, donc cher, et le rendu peut être irrégulier.</p>
<p><b>Certaines matières.</b> Beaucoup de plastiques réagissent mal, fondent, ou
ne changent pas assez de couleur pour que le marquage se voie.</p>`,
      },
      {
        h2: 'Le fichier qu\'elle demande',
        html: `
<p>Un <b>vectoriel</b> : la machine suit des contours, littéralement. Et surtout un
logo qui <b>tient en une seule couleur</b>. Avant de partir en gravure, regardez
votre logo en noir et blanc : si deux éléments se confondent, ils se confondront
sur l'objet.</p>
<p>Notre outil vous donne la palette réelle de votre fichier, ce qui rend ce
test immédiat.</p>`,
      },
      NON_PUBLIE,
    ],
    faq: [
      {
        q: 'De quelle couleur sera mon logo gravé au laser ?',
        r: "De la couleur que prend la matière quand elle est gravée : clair sur aluminium "
          + "anodisé, brun sur bois, sombre sur inox. Elle ne se choisit pas, et un "
          + "échantillon sur la matière exacte est la seule façon fiable de la connaître.",
      },
      {
        q: 'La gravure laser peut-elle faire plusieurs couleurs ?',
        r: "Non, le résultat est monochrome par nature puisque rien n'est déposé. Certains "
          + "procédés combinent une gravure et un remplissage d'encre, mais ce sont alors "
          + "deux opérations, pas une gravure multicolore.",
      },
      {
        q: 'Peut-on graver tout le tour d\'une gourde ?',
        r: "Avec un équipement qui fait tourner l'objet pendant le marquage, oui, et la "
          + "zone devient beaucoup plus large. Sans lui, seule une bande tangente reste "
          + "dans la zone de mise au point. Demandez à votre marqueur lequel des deux il "
          + "utilise, la différence est considérable.",
      },
    ],
  },

  {
    url: '/guide/broderie',
    titre: 'La broderie de logo sur textile',
    meta: "La broderie ne reproduit pas votre logo, elle le redessine en points de "
      + "fil. Pourquoi les petits détails disparaissent et ce qu'il faut prévoir.",
    h1: 'La broderie',
    chapo: "Le seul marquage où votre logo est entièrement redessiné : un programme de "
      + "points remplace le fichier. Les détails plus petits qu'un point n'existent "
      + "tout simplement pas.",
    sections: [
      {
        h2: 'Le principe, et ce qu\'il implique',
        html: `
<p>Une aiguille traverse le tissu et pose des points de fil, les uns à côté des
autres, jusqu'à couvrir la forme. Votre fichier n'est pas imprimé : il est
converti en un <b>programme de broderie</b>, qui décrit chaque point, son sens et
son ordre.</p>
<p>Cette conversion est un travail à part, souvent facturé une fois, et elle est
faite par une personne. C'est elle qui décide comment votre logo devient des
points, et c'est pourquoi deux brodeurs ne rendent pas exactement le même
résultat.</p>
<p><b>L'aiguille a un diamètre, le fil aussi.</b> Ils fixent la plus petite chose
qui puisse exister sur le tissu. En dessous, le détail n'est pas réduit : il est
supprimé par le programme, ou il devient un amas de fil.</p>`,
      },
      {
        h2: 'Ce qu\'elle réussit mieux que les autres',
        html: `
<ul>
<li><b>Le rendu perçu.</b> Le relief et la brillance du fil donnent une impression
de qualité qu'aucune impression textile n'égale.</li>
<li><b>La durabilité.</b> Le fil ne craquelle pas et ne se décolle pas au lavage.</li>
<li><b>Les textiles épais</b>, polaires et tricots, où une encre tiendrait mal.</li>
</ul>`,
      },
      {
        h2: 'Ce qu\'elle rate',
        html: `
<p><b>Les petits textes.</b> C'est la limite la plus fréquente. Un slogan sous un
logo, une mention légale, un site internet : à taille de poitrine, ces éléments
deviennent souvent illisibles.</p>
<p><b>Les dégradés et les photos.</b> Le fil est d'une couleur, sans nuance
possible autre que par juxtaposition.</p>
<p><b>Les contours très fins.</b> Un filet de contour plus mince qu'un point
disparaît ou se transforme en bourrelet.</p>
<p><b>Les couleurs exactes.</b> On choisit dans un nuancier de fils existants, on
ne mélange pas une teinte.</p>`,
      },
      {
        h2: 'Le fichier qu\'elle demande',
        html: `
<p>Un <b>vectoriel</b> pour la conversion, et surtout une <b>version simplifiée</b> de
votre logo prête à broder : sans les micro-détails, avec les textes agrandis ou
retirés, et un nombre de couleurs raisonnable.</p>
<p>Beaucoup d'identités visuelles prévoient cette version. Si la vôtre n'en a
pas, c'est le moment de la faire faire : elle resservira à chaque commande de
textile.</p>`,
      },
      NON_PUBLIE,
    ],
    faq: [
      {
        q: 'Pourquoi le texte de mon logo est-il illisible une fois brodé ?',
        r: "Parce qu'un caractère brodé ne peut pas être plus fin que le fil qui le "
          + "compose. En dessous d'une certaine hauteur, les lettres se remplissent et se "
          + "touchent. La parade est d'agrandir le texte, de le retirer, ou de le remplacer "
          + "par une version simplifiée du logo.",
      },
      {
        q: 'Qu\'est-ce que les frais de programmation en broderie ?',
        r: "La conversion de votre logo en programme de points, faite une fois par un "
          + "opérateur. Elle est généralement facturée à la première commande puis "
          + "conservée : pensez à demander que le programme reste disponible pour vos "
          + "commandes suivantes.",
      },
      {
        q: 'La broderie respecte-t-elle mes couleurs Pantone ?',
        r: "Approximativement. On choisit les fils les plus proches dans un nuancier "
          + "existant, sans mélange possible. Demandez la correspondance retenue avant "
          + "production si vos couleurs sont un point sensible de votre identité.",
      },
    ],
  },

  {
    url: '/guide/impression-numerique-uv',
    titre: 'L\'impression numérique UV sur objet',
    meta: "Des gouttes d'encre projetées puis durcies par une lampe UV. La technique "
      + "qui accepte les dégradés et les photos, si l'objet est assez régulier.",
    h1: 'L\'impression numérique UV',
    chapo: "La seule famille de techniques qui imprime une photo ou un dégradé "
      + "directement sur un objet. Sa contrainte n'est pas le dessin, c'est le "
      + "relief.",
    sections: [
      {
        h2: 'Le principe, et ce qu\'il implique',
        html: `
<p>Des têtes d'impression projettent de minuscules gouttes d'encre, et une lampe
ultraviolette les durcit instantanément, avant qu'elles ne s'étalent. C'est ce
durcissement immédiat qui permet d'imprimer sur des matières non absorbantes,
là où une encre classique resterait humide.</p>
<p>La contrainte centrale n'est pas le dessin mais la <b>géométrie de l'objet</b>.
Les têtes passent à très faible distance de la surface, et cette distance doit
rester constante : une différence de relief modifie la trajectoire des gouttes,
et le dessin se décale ou se floute. Un objet trop bombé, une couture, un
rebord peuvent suffire à faire refuser le marquage.</p>`,
      },
      {
        h2: 'Ce qu\'elle réussit mieux que les autres',
        html: `
<ul>
<li><b>Les dégradés, les photos, les logos complexes</b>, sans surcoût par couleur.</li>
<li><b>Les petites séries et les pièces uniques</b>, puisqu'il n'y a ni écran ni
cliché à préparer.</li>
<li><b>Le blanc de soutien</b>, une couche imprimée sous les couleurs pour qu'elles
ressortent sur un objet foncé.</li>
<li><b>Les matières difficiles</b>, verre, métal, plastique, avec la bonne
préparation.</li>
</ul>`,
      },
      {
        h2: 'Ce qu\'elle rate',
        html: `
<p><b>Les objets bombés ou irréguliers.</b> C'est sa limite dominante, et elle est
mécanique.</p>
<p><b>Les très fines lignes claires sur fond foncé</b>, qui dépendent de la précision
du blanc de soutien placé dessous.</p>
<p><b>La tenue à l'abrasion</b>, inférieure à une gravure, puisque l'encre reste en
surface. Un vernis est parfois ajouté.</p>`,
      },
      {
        h2: 'Le fichier qu\'elle demande',
        html: `
<p>C'est la technique la plus tolérante : un fichier en pixels de bonne
définition peut convenir. Un <b>vectoriel</b> reste préférable pour les contours et
les textes, qui resteront nets à toute taille.</p>
<p>Attention au <b>mode colorimétrique</b> : un fichier destiné au web est en RVB,
la production travaille en quadrichromie. La conversion se fait, mais les
couleurs bougent si personne ne les a fixées.</p>`,
      },
      NON_PUBLIE,
    ],
    faq: [
      {
        q: 'Peut-on imprimer une photo sur un objet publicitaire ?',
        r: "Oui, en impression numérique UV, sur un objet suffisamment plat et régulier. "
          + "Le facteur limitant n'est pas l'image mais la géométrie de l'objet : les têtes "
          + "d'impression passent très près de la surface et supportent mal le relief.",
      },
      {
        q: 'Qu\'est-ce que le blanc de soutien ?',
        r: "Une couche de blanc imprimée sous les couleurs pour qu'elles ne soient pas "
          + "avalées par un support foncé. Sans elle, un logo imprimé sur un objet noir "
          + "paraît terne et sale. Elle constitue un passage supplémentaire.",
      },
      {
        q: 'Faut-il un fichier vectoriel pour l\'impression UV ?',
        r: "Pas obligatoirement : une image en pixels de bonne définition peut suffire. Le "
          + "vectoriel reste préférable pour les textes et les contours, qui resteront nets "
          + "quelle que soit la taille de marquage retenue.",
      },
    ],
  },

  {
    url: '/guide/transfert-dtf',
    titre: 'Le transfert DTF sur textile',
    meta: "Le motif est imprimé sur un film, puis pressé à chaud sur le textile. "
      + "Pourquoi cette technique accepte les dégradés que la sérigraphie refuse.",
    h1: 'Le transfert DTF',
    chapo: "On imprime le motif sur un film, on le presse à chaud sur le vêtement. Le "
      + "dessin n'a plus besoin d'être simple, mais il reste une couche posée sur "
      + "le tissu.",
    sections: [
      {
        h2: 'Le principe, et ce qu\'il implique',
        html: `
<p>Le motif est imprimé en quadrichromie sur un film, recouvert d'une poudre
adhésive, chauffé, puis appliqué sur le textile par une presse. Le film part, le
motif reste.</p>
<p>Comme l'impression se fait à plat, sur un film, <b>le dessin n'a plus à
s'adapter au tissu</b>. C'est ce qui libère les dégradés, les photos et les
logos complexes sans surcoût par couleur, contrairement à la sérigraphie.</p>
<p>En contrepartie, le motif est une <b>couche posée sur le tissu</b> et non une
encre absorbée dedans. Cela se sent au toucher et se voit sur les grandes
surfaces.</p>`,
      },
      {
        h2: 'Ce qu\'elle réussit mieux que les autres',
        html: `
<ul>
<li><b>Les dessins complexes sur textile</b>, sans écran ni séparation de couleurs.</li>
<li><b>Les petites séries</b>, y compris à l'unité.</li>
<li><b>Les textiles variés</b>, coton, polyester, mélanges, y compris foncés.</li>
<li><b>Les couleurs vives sur fond sombre</b>, grâce à la couche blanche du film.</li>
</ul>`,
      },
      {
        h2: 'Ce qu\'elle rate',
        html: `
<p><b>La respirabilité et le toucher.</b> Un grand aplat DTF fait une zone
plastifiée sur le vêtement.</p>
<p><b>La finesse extrême.</b> Les très petits détails et les lignes très fines
peuvent se décoller au lavage, faute d'assez de surface pour adhérer.</p>
<p><b>La tenue au fil des lavages</b>, correcte mais généralement inférieure à une
sérigraphie bien polymérisée.</p>`,
      },
      {
        h2: 'Le fichier qu\'elle demande',
        html: `
<p>Un fichier de <b>bonne définition</b>, vectoriel de préférence pour les textes et
contours. Le fond doit être <b>réellement transparent</b> : un fond blanc que vous
croyez transparent sera imprimé, et vous obtiendrez un rectangle blanc autour de
votre logo.</p>
<p>Notre outil détecte le type de fond de votre fichier, transparent ou non, et
vous le dit avant que vous ne l'envoyiez.</p>`,
      },
      NON_PUBLIE,
    ],
    faq: [
      {
        q: 'Quelle différence entre DTF et sérigraphie sur un t-shirt ?',
        r: "La sérigraphie pousse l'encre à travers un écran, une couleur à la fois, et "
          + "l'encre pénètre le tissu : elle est plus douce au toucher et tient mieux au "
          + "lavage. Le DTF imprime le motif sur un film qu'on presse ensuite : il accepte "
          + "les dégradés et les petites séries, mais forme une couche en surface.",
      },
      {
        q: 'Mon logo a un fond blanc, est-ce un problème en DTF ?',
        r: "Oui, si ce fond n'est pas réellement transparent : il sera imprimé et vous "
          + "obtiendrez un rectangle blanc autour du logo. Il faut un fichier à fond "
          + "transparent, ou un détourage préalable.",
      },
      {
        q: 'Le DTF tient-il au lavage ?',
        r: "Correctement, avec les précautions habituelles : lavage à l'envers, "
          + "température modérée, pas de sèche-linge agressif. Les éléments très fins sont "
          + "les premiers à se décoller, faute d'assez de surface d'adhérence.",
      },
    ],
  },

  {
    url: '/guide/marquage-a-chaud',
    titre: 'Le marquage à chaud et la dorure',
    meta: "Dorure et débossage : un fer chaud presse un film métallisé. C'est la "
      + "seule technique où les grands aplats sont plus difficiles que les traits fins.",
    h1: 'Le marquage à chaud',
    chapo: "Un fer chauffé presse un film métallisé contre la matière. C'est la seule "
      + "technique de ce guide où un grand aplat est PLUS difficile qu'un trait fin, "
      + "et cette inversion surprend tout le monde.",
    sections: [
      {
        h2: 'Le principe, et ce qu\'il implique',
        html: `
<p>Un cliché en relief, chauffé, vient presser un film mince contre la surface.
Sous l'effet conjugué de la chaleur et de la pression, la couche colorée du film
se détache de son support et adhère à la matière. C'est ainsi qu'on obtient une
dorure sur un carnet ou un étui.</p>
<p>La contrainte dominante n'est ni la finesse ni la couleur : c'est la
<b>surface d'aplat continue</b>. Sur une grande zone, la chaleur et la pression ne
se répartissent jamais parfaitement, et le transfert devient irrégulier : des
manques, des bulles, des bords qui bavent.</p>
<p><b>C'est l'inverse de toutes les autres techniques.</b> Ailleurs, le trait fin
est le point faible et l'aplat le terrain sûr. Ici, le trait fin passe très bien
et c'est l'aplat qui pose problème.</p>`,
      },
      {
        h2: 'Ce qu\'elle réussit mieux que les autres',
        html: `
<ul>
<li><b>L'effet métallisé</b>, or, argent, cuivre, qu'aucune encre ne reproduit
vraiment.</li>
<li><b>Le rendu premium</b> sur maroquinerie, carnets, étuis et coffrets.</li>
<li><b>Les traits fins et les typographies délicates</b>, qui passent remarquablement
bien.</li>
<li><b>Le relief</b>, quand on combine avec un débossage.</li>
</ul>`,
      },
      {
        h2: 'Ce qu\'elle rate',
        html: `
<p><b>Les grands aplats pleins</b>, pour la raison décrite plus haut. Un logo massif
est le cas typique où le marqueur proposera de l'ajourer.</p>
<p><b>Les dégradés et la quadrichromie</b>, impossibles : le film est d'une seule
teinte.</p>
<p><b>Les matières qui ne supportent pas la chaleur</b>, certains plastiques et
textiles techniques.</p>
<p><b>Les surfaces très irrégulières</b>, où la pression ne se répartit pas.</p>`,
      },
      {
        h2: 'Le fichier qu\'elle demande',
        html: `
<p>Un <b>vectoriel</b>, en <b>une seule couleur</b>, polices en courbes. Le fichier doit
être pensé pour le procédé : si votre logo est un bloc plein, demandez à votre
marqueur s'il faut l'ajourer, et faites-le faire proprement plutôt que de le
découvrir au bon à tirer.</p>`,
      },
      NON_PUBLIE,
    ],
    faq: [
      {
        q: 'Quelle différence entre dorure à chaud et débossage ?',
        r: "La dorure dépose un film coloré ou métallisé sur la matière. Le débossage "
          + "creuse la matière sans rien déposer, et joue sur le relief et l'ombre. Les "
          + "deux se combinent souvent dans la même opération.",
      },
      {
        q: 'Pourquoi mon logo plein pose-t-il problème en dorure ?',
        r: "Parce que le transfert du film dépend d'une chaleur et d'une pression "
          + "uniformes, difficiles à obtenir sur une grande surface continue. Le résultat "
          + "montre des manques ou des irrégularités. Ajourer le logo ou n'en dorer que le "
          + "contour résout le problème.",
      },
      {
        q: 'Peut-on faire plusieurs couleurs en marquage à chaud ?',
        r: "Pas en un passage : chaque film est d'une seule teinte. Plusieurs couleurs "
          + "demandent plusieurs passages, avec un calage précis entre eux, ce qui "
          + "complique et renchérit nettement.",
      },
    ],
  },
];
