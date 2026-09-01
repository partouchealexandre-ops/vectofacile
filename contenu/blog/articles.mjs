/**
 * LE JOURNAL : la quatrieme famille de pages du site.
 *
 * Les trois familles existantes repondent a une question POSEE : « c'est quoi,
 * cette technique » pour /guide/, « comment je fais X » pour /questions/,
 * « est-ce que je peux vous faire confiance » pour /confidentialite. Le journal
 * repond a une situation SUBIE : « il vient de m'arriver ca, je fais quoi ».
 * Personne ne tape « pourquoi mon logo passe sur un tote bag et rate sur un
 * stylo » en connaissant deja la reponse.
 *
 * L'URL EST /blog/, LE LIBELLE VISIBLE EST « JOURNAL », arbitrage du 26/08. Les
 * deux mots ne servent pas la meme chose : `blog` est la convention que tout le
 * monde reconnait dans une adresse, y compris les moteurs ; « Journal » est le
 * mot qui se lit sur la page, et il promet ce que le corpus tient vraiment, des
 * textes dates.
 *
 * LE JOURNAL N'ENTRE PAS DANS L'ENTETE, ET C'EST MESURE. L'entete tient sur une
 * ligne avec deux rubriques, une pilule et deux boutons ; une rubrique de plus
 * l'a deja fait passer de 79 a 135 pixels sur les vingt-deux pages. Le journal
 * entre donc par le PIED, dans l'arborescence complete, et par le maillage
 * contextuel des articles. Personne ne decouvre un article par une barre de
 * navigation : on y arrive par une recherche ou par un lien dans un autre
 * texte.
 *
 * LA DATE EST UN CHAMP, PAS UNE PHRASE DANS LE CORPS. Un journal se date, et
 * cette date part dans le balisage structure comme dans l'affichage : deux
 * endroits, une seule source. Le format est celui de la norme, l'affichage est
 * derive.
 *
 * CE QUI N'EST PAS ENCORE LA. Les deux articles portent chacun deux
 * infographies decrites dans le corpus editorial et non produites : elles
 * demandent un arbitrage de charte qu'Alex n'a pas rendu, Bon a Marquer n'ayant
 * pas de palette d'infographie distincte de celle du site. Les textes se
 * tiennent sans elles ; les images s'ajouteront sans toucher au texte.
 *
 * DEUX CHAMPS POUR LE RYTHME, ajoutes le 31/08. `axe` reprend les quatre axes
 * du plan editorial et se lit en sur-titre : c'est ce qui donne au journal une
 * structure visible des l'index, et ce qui portera les filtres quand il y aura
 * assez d'articles pour qu'un filtre veuille dire quelque chose. `mots` porte
 * les mots-cles affiches en pilules. Ni l'un ni l'autre n'entre dans une URL :
 * une taxonomie qui commande des adresses ne se change plus.
 *
 * LA DUREE DE LECTURE NE S'ECRIT PAS ICI. Elle se CALCULE sur le texte rendu,
 * a la construction. Ecrite a la main, elle serait fausse a la premiere
 * correction, et fausse en silence.
 *
 * Source : corpus/article_01_fichier_refuse.md et corpus/article_02_totebag_stylo.md,
 * ecrits dans la nuit du 25 au 26/08/2026.
 */

export const ARTICLES = [
  {
    url: '/blog/mon-fichier-a-ete-refuse',
    date: '2026-08-31',
    axe: 'La situation vécue',
    mots: ['Fichier refusé', 'Format vectoriel', 'Fond blanc', 'Monochrome', 'Graphiste'],
    titre: 'Fichier refusé par le marqueur : que faire',
    titreCourt: 'Mon fichier a été refusé par le marqueur',
    meta: "Un marqueur refuse un fichier pour un petit nombre de raisons, toujours les "
      + "mêmes. Voici comment les reconnaître et laquelle se règle sans graphiste.",
    h1: 'Mon fichier a été refusé par le marqueur',
    chapo: "Un refus n'est presque jamais un jugement sur votre logo. Il porte soit sur le "
      + "fichier, soit sur le dessin lui-même. Les deux ne se règlent pas du tout de la même "
      + "façon, l'un en quelques minutes et l'autre avec un graphiste, et la première chose à "
      + "faire est de savoir dans lequel des deux cas vous êtes.",
    sections: [
      {
        h2: "Pourquoi un marqueur refuse un fichier plutôt que d'essayer",
        html: `
<p>Parce qu'un atelier ne découvre pas le problème à l'écran, il le découvre sur l'objet,
quand la série est lancée. <b>Le refus est la version économique de l'erreur.</b> Un fichier
refusé coûte un courriel, un marquage raté coûte la série, le produit et le délai.</p>
<p>C'est aussi pour ça que le refus arrive souvent sans explication détaillée : la personne
qui vous répond a vu la cause en trois secondes, elle en voit trente par jour, et elle n'a
pas le temps de vous expliquer un métier. Le message tient donc en une ligne, et cette ligne
vous laisse sans savoir quoi faire.</p>`,
      },
      {
        h2: 'Est-ce le fichier ou le dessin',
        html: `
<p>C'est la première question à se poser, et elle départage tout le reste. Deux familles de
refus existent, et une seule se règle sans redessiner quoi que ce soit.</p>
<p>Le test qui tranche : <b>le défaut survivrait-il à une meilleure version du même
fichier ?</b> Un logo dont le seul tort est d'avoir été exporté en image n'a aucun problème
de dessin. Un logo qui reste illisible même en contours nets et en grand a un problème de
dessin, et aucun format ne le réparera.</p>
<table>
<thead><tr><th></th><th>Un problème de fichier</th><th>Un problème de dessin</th></tr></thead>
<tbody>
<tr><td>Ce qui est en cause</td><td>le format, la définition, un fond</td><td>les formes et les couleurs elles-mêmes</td></tr>
<tr><td>Le même logo ailleurs</td><td>passe, une fois le fichier corrigé</td><td>peut passer sur un objet plus grand</td></tr>
<tr><td>Qui le règle</td><td>un outil, ou vous</td><td>un graphiste</td></tr>
<tr><td>Le délai</td><td>des minutes</td><td>des jours</td></tr>
</tbody>
</table>
<blockquote class="exergue"><p>Un fichier se répare. Un dessin se retravaille. Confondre les deux
fait perdre une semaine à demander un devis de graphiste pour un problème de format.</p></blockquote>`,
      },
      {
        h2: "Les causes qui reviennent, dans l'ordre où elles arrivent",
        html: `
<p>Il y en a peu, et elles sont toujours les mêmes. Elles sont classées ici de la plus
facile à régler à la plus lourde.</p>
<ol>
<li><b>Le fichier n'est pas vectoriel.</b> Vous avez envoyé une image, la machine attend des
contours. C'est la cause la plus fréquente et la plus rapide à traiter.</li>
<li><b>L'image est trop petite pour l'emplacement visé.</b> Elle est nette à l'écran, elle ne
l'est plus une fois agrandie à la taille du marquage.</li>
<li><b>Le logo porte un fond ou un contour blanc.</b> Invisible sur une page blanche, bien
présent dans le fichier, et il se marque comme le reste.</li>
<li><b>Le logo se referme quand on le passe en une seule couleur.</b> Deux teintes proches
deviennent la même, et une forme disparaît dans une autre.</li>
<li><b>Le logo porte un dégradé.</b> Les techniques qui déposent une couleur à la fois ne
savent pas fabriquer une transition continue.</li>
<li><b>Le logo porte plus de couleurs que l'emplacement retenu n'en accepte.</b> Et c'est
bien l'emplacement qui décide, pas la technique : le même procédé n'offre pas les mêmes
possibilités sur le devant d'un sac et sur le clip d'un stylo.</li>
</ol>
<p>Une septième cause existe, et elle ne dépend ni du fichier ni du dessin : <b>le contraste
avec la couleur de l'objet.</b> Un logo foncé sur un objet foncé est techniquement marquable
et visuellement raté. Aucun fichier ne corrige ça, seul le choix de l'objet ou d'une version
claire du logo le règle.</p>`,
      },
      {
        h2: 'Comment savoir laquelle vous concerne sans attendre la réponse du marqueur',
        html: `
<p>En mesurant votre fichier. C'est exactement ce que fait <a href="/">l'évaluation de votre
logo</a> : elle lit le fichier dans votre navigateur, mesure ce qui est mesurable, et dit
lesquelles de ces sept causes s'appliquent, technique par technique.</p>
<p>Deux précisions honnêtes. Une mesure n'est pas une validation, et personne ne peut vous
promettre un rendu avant production. Et sur plusieurs de ces causes, notre référentiel dit
encore « nous ne savons pas » plutôt que d'avancer un chiffre : les sources professionnelles
consultées divergent d'un facteur important sur la finesse minimale d'un trait, et publier
une moyenne serait inventer une donnée.</p>
<blockquote class="exergue"><p>Un site qui vous donne un nombre là où le métier n'est pas d'accord
ne vous rend pas service. Il vous rend confiant, ce qui est autre chose.</p></blockquote>`,
      },
      {
        h2: 'Ce qui se règle en quelques minutes',
        html: `
<p>Trois des sept causes ne demandent ni graphiste ni budget.</p>
<ul>
<li><b>Le format.</b> Une image peut être redessinée en contours, et le résultat s'obtient en
ligne, sans compte : voir <a href="/vectoriser">vectoriser un logo</a>.</li>
<li><b>Le fond blanc.</b> Il se retire, et il vaut mieux le retirer avant toute mesure : tant
qu'il est là, il fausse ce qu'on croit mesurer.</li>
<li><b>Le choix de l'emplacement.</b> Un logo qui ne passe pas à un endroit passe souvent à un
autre sur le même objet. C'est ce que montre <a href="/voir-mon-logo">la pose de votre logo
sur un objet</a>, aux dimensions déclarées par les fabricants.</li>
</ul>`,
      },
      {
        h2: 'Ce qui demande vraiment un graphiste',
        html: `
<p>Les trois autres. Un logo qui se referme en monochrome, qui porte un dégradé ou qui
déborde du nombre de couleurs de l'emplacement ne se répare pas : il se redessine, au moins
en version de marquage.</p>
<p><b>La bonne nouvelle est qu'on ne redessine pas tout.</b> Ce qui est demandé est presque
toujours une version simplifiée, à côté de la version d'origine, qui reste celle du site et
des documents. C'est une commande courte, précise, et bien moins chère qu'une refonte
d'identité. Le brief tient en trois phrases, et il sort tout seul de l'évaluation.</p>
<p>Avant de demander un devis à qui que ce soit, mesurez le fichier que vous avez déjà sous
la main. La réponse dira si vous cherchez un outil ou un graphiste, et ce sont deux semaines
d'écart.</p>`,
      },
    ],
    faq: [
      {
        q: 'Le marqueur a refusé sans dire pourquoi, que demander ?',
        r: "Une seule question suffit : est-ce le format du fichier, ou le dessin lui-même ? "
          + "Un atelier répond à ça en une ligne, et cette ligne vous dit si vous cherchez un "
          + "outil ou un graphiste.",
      },
      {
        q: 'Mon logo est passé chez un autre marqueur, celui-ci refuse. Qui a raison ?',
        r: "Les deux, souvent. Les possibilités ne dépendent pas que de la technique mais de "
          + "l'emplacement exact et de l'objet, et deux ateliers ne travaillent pas les mêmes "
          + "produits. Un refus n'invalide pas une acceptation ailleurs.",
      },
      {
        q: 'Faut-il refaire son logo pour de bon ?',
        r: "Rarement. Dans la plupart des cas, une version dédiée au marquage suffit, et "
          + "l'identité d'origine ne bouge pas. Refaire un logo pour un objet publicitaire est "
          + "une décision de marque, pas une décision technique.",
      },
      {
        q: 'Le marqueur propose de corriger le fichier lui-même, faut-il accepter ?',
        r: "Souvent oui, à une condition : demander à voir ce qui a été modifié avant de signer "
          + "le bon à tirer. Une correction faite en atelier est une décision prise à votre "
          + "place, et elle vous engage une fois signée.",
      },
      {
        q: "Combien de temps prend la correction d'un fichier ?",
        r: "Le passage en contours et le retrait d'un fond se font en quelques minutes. Une "
          + "version simplifiée dessinée par un graphiste se compte en jours, selon sa charge.",
      },
      {
        q: "Est-ce qu'un logo refusé aujourd'hui le sera toujours ?",
        r: "Non. Un refus porte sur un couple précis, ce fichier et cet emplacement. Le même "
          + "logo, mieux exporté ou posé ailleurs, passe souvent.",
      },
    ],
  },
  {
    url: '/blog/le-meme-logo-tote-bag-et-stylo',
    date: '2026-08-31',
    axe: "L'anatomie d'un échec",
    mots: ['Emplacement', 'Petits objets', 'Traits fins', 'Contre-formes', 'Simulation'],
    titre: 'Le même logo sur un tote bag et sur un stylo',
    titreCourt: 'Le même logo passe sur un tote bag et rate sur un stylo',
    meta: "Un logo n'est pas accepté ou refusé dans l'absolu. Ce qui change d'un objet à "
      + "l'autre, ce n'est pas le dessin, c'est ce que la surface autorise.",
    h1: 'Le même logo passe sur un tote bag et rate sur un stylo',
    chapo: "Le fichier est le même, le dessin est le même, et pourtant le verdict change. Ce "
      + "n'est pas une incohérence du métier : c'est que la question posée n'est jamais « ce "
      + "logo est-il marquable », mais « ce logo est-il marquable là ».",
    sections: [
      {
        h2: 'Ce qui change vraiment entre un tote bag et un stylo',
        html: `
<p>La taille de la surface disponible, et tout ce qui en découle. Un devant de sac et un
corps de stylo n'appartiennent pas au même ordre de grandeur, et un logo posé sur l'un est
réduit sur l'autre dans un rapport considérable.</p>
<p><b>Or tout se réduit en même temps.</b> Quand un logo passe d'une grande zone à une petite,
ce ne sont pas seulement ses dimensions qui diminuent : ce sont ses traits, ses espacements,
ses contre-formes, et le texte de sa signature. Une mécanique qui tenait largement à une
échelle se retrouve au bord de ce que le procédé sait déposer.</p>
<blockquote class="exergue"><p>Un logo ne devient pas mauvais en changeant d'objet. Il devient
petit, et le petit est un régime différent.</p></blockquote>`,
      },
      {
        h2: 'Ce qui casse en premier quand la surface rétrécit',
        html: `
<p>Toujours les mêmes choses, et dans un ordre assez prévisible.</p>
<ul>
<li><b>Les traits les plus fins.</b> Ils sont les premiers à passer sous ce que la technique
sait déposer proprement. Selon le procédé, ils s'épaississent, se bouchent ou disparaissent.</li>
<li><b>Les espaces entre deux traits voisins.</b> Deux lignes séparées à grande échelle se
rejoignent à petite échelle, et la forme entre les deux se remplit.</li>
<li><b>Les contre-formes.</b> Le trou d'un <code>o</code>, l'intérieur d'un <code>e</code>,
l'entaille d'un <code>a</code>. Ce sont des vides, et un vide trop petit se comble.</li>
<li><b>La signature sous le logo.</b> Elle est presque toujours composée dans un corps bien
plus petit que le nom, donc elle atteint la limite bien avant lui.</li>
</ul>`,
      },
      {
        h2: "Est-ce la technique ou l'emplacement qui décide",
        html: `
<p><b>L'emplacement, et c'est une correction importante.</b> Il est tentant de croire qu'une
technique donnée offre des possibilités fixes, valables partout. Le catalogue dit le
contraire : le même procédé, sur le même objet, n'offre pas les mêmes limites selon l'endroit
où il s'applique.</p>
<table>
<thead><tr><th>Ce qu'on croit</th><th>Ce que disent les fiches fabricant</th></tr></thead>
<tbody>
<tr><td>une technique a une limite</td><td>la limite est attachée à un emplacement précis</td></tr>
<tr><td>un objet a une limite</td><td>un objet a autant de limites que d'emplacements</td></tr>
<tr><td>un plafond de couleurs appartient au procédé</td><td>il appartient à la position marquée</td></tr>
</tbody>
</table>
<p>C'est pour cette raison que Bon à Marquer ne publie jamais un plafond unique par
technique. Un chiffre présenté comme la limite de la sérigraphie serait faux dès qu'on change
d'endroit sur le produit, et il serait cru.</p>`,
      },
      {
        h2: "Pourquoi le verdict n'est pas un oui ou un non",
        html: `
<p>Parce qu'entre les deux il existe un état que la plupart des sites escamotent : <b>ce qui
ne va pas, mais que nous pouvons régler.</b> Un fichier au mauvais format n'est pas un logo à
refaire, c'est une conversion. Une image trop peu définie pour une zone donnée, en revanche,
ne se répare pas : aucun traitement ne réinvente une information qui n'a jamais été
enregistrée.</p>
<p>Trois réponses différentes, donc, et une seule appelle un graphiste :</p>
<ol>
<li><b>La technique passe.</b> Rien à lire, rien à faire.</li>
<li><b>Le fichier ne va pas.</b> Nous le réglons, ou nous disons franchement que nous ne
pouvons pas.</li>
<li><b>Le dessin doit être retravaillé.</b> Et dans ce cas le brief à transmettre est écrit
pour vous.</li>
</ol>
<blockquote class="exergue"><p>Un site qui répond seulement oui ou non vous cache l'information la
plus utile : qui doit agir ensuite.</p></blockquote>`,
      },
      {
        h2: 'Comment le voir avant de commander',
        html: `
<p>En posant le logo sur les objets, à leurs dimensions réelles. C'est ce que fait <a
href="/voir-mon-logo">la pose de votre logo sur un objet</a> : la zone n'est pas inventée,
elle vient des dimensions déclarées par les fabricants, et le millimètre commande l'affichage
plutôt que l'inverse.</p>
<p>Deux réserves, et elles comptent autant que la fonction. Une simulation montre un rendu,
jamais une faisabilité : elle ne remplace pas un bon à tirer. Et le choix d'un objet dans une
liste n'est pas le choix de <b>votre</b> objet : deux mugs de deux fabricants n'ont pas la
même surface utile.</p>
<p>Si le doute porte sur le fichier plutôt que sur l'objet, <a href="/">l'évaluation du
logo</a> répond à l'autre question, et <a href="/vectoriser">la vectorisation</a> règle le cas
du format.</p>
<p>Le réflexe utile n'est pas de choisir un objet puis d'espérer. C'est de regarder son logo
posé sur les objets les plus petits d'abord : ce qui passe là passe partout ailleurs.</p>`,
      },
    ],
    faq: [
      {
        q: 'Faut-il une version différente du logo par objet ?',
        r: "Non, deux suffisent presque toujours : la version complète pour les grandes "
          + "surfaces, et une version simplifiée pour les petites, souvent sans la signature. "
          + "C'est le même logo, pas une autre identité.",
      },
      {
        q: 'Peut-on juste réduire le logo sans rien changer ?',
        r: "C'est exactement ce qui produit l'échec décrit ici. Réduire conserve les "
          + "proportions, donc les traits fins deviennent plus fins, et les vides plus petits. "
          + "Une version pour petit format se redessine, elle ne se met pas à l'échelle.",
      },
      {
        q: 'Pourquoi le marqueur ne prévient-il pas avant ?',
        r: "Souvent il prévient, mais après commande, au moment du bon à tirer. C'est le moment "
          + "où quelqu'un regarde vraiment le fichier, et c'est aussi le moment où changer "
          + "d'objet coûte le plus cher.",
      },
      {
        q: 'Le stylo est-il le pire cas ?',
        r: "Pas systématiquement. Certains objets ont des emplacements plus petits encore, et "
          + "d'autres ajoutent une difficulté que la taille ne dit pas, par exemple une surface "
          + "courbe ou une matière qui ne retient pas la même finesse.",
      },
      {
        q: 'Un logo simple passe-t-il forcément partout ?',
        r: "Il passe beaucoup plus souvent, et il est plus lisible. Mais un logo simple posé "
          + "dans une couleur trop proche de celle de l'objet reste invisible : la lisibilité "
          + "ne dépend pas que du dessin.",
      },
    ],
  },
  {
    // Source : corpus/article_03_refaire_son_logo.md, relu et repris par Alex le
    // 01/09/2026. La version relue apporte la reponse courte en tete, le test en
    // trois questions, et la nuance « toutes les techniques n'exigent pas un
    // vectoriel ». Trois arbitrages ont ete rendus au moment de l'integrer.
    //
    // 1. LES FORMATS SONT RENOMMES DANS LE BRIEF. La version relue demandait
    //    « le fichier source vectoriel ». Sa structure de livrables est
    //    meilleure que la premiere, mais elle effacait l'arbitrage du 17/08 :
    //    le SVG est refuse par la plupart des fabricants d'objets, le livrable
    //    est .eps ou .ai. Un lecteur qui repart avec « fichier vectoriel »
    //    redemande un SVG et se fait refuser. Les deux sont donc fusionnes :
    //    sa liste, nos formats, et son PDF de controle qu'on n'avait pas.
    //
    // 2. LES LIENS INTERNES SONT REMIS. Ils avaient saute au passage en
    //    markdown, et une phrase s'etait mise a parler au constructeur du site
    //    (« l'evaluation doit effectuer ce tri ») au lieu du lecteur.
    //
    // 3. LE TITRE EST SAISI NU. La fiche de relecture donnait la balise avec
    //    « | Bon a Marquer » deja dedans ; le gabarit l'ajoute, et la page
    //    serait sortie avec le suffixe en double.
    url: '/blog/refaire-logo-pour-marquage',
    date: '2026-09-01',
    axe: "L'arbitrage",
    mots: ['Refonte de logo', 'Déclinaison', 'Logo monochrome', 'Fichier vectoriel', 'Brief graphiste'],
    titre: 'Faut-il refaire son logo pour un marquage ?',
    titreCourt: 'Faut-il refaire son logo pour un marquage',
    meta: "Logo refusé pour un marquage ? Distinguez fichier à récupérer, déclinaison "
      + "technique et véritable refonte, puis préparez le bon brief graphiste.",
    h1: "Faut-il refaire son logo pour le marquage d'un objet ?",
    chapo: "Dans la grande majorité des cas, non. Un logo refusé pour un marquage n'a pas "
      + "forcément besoin d'être refait. Il faut d'abord distinguer trois situations : "
      + "récupérer un fichier exploitable, créer une déclinaison de marquage, ou engager une "
      + "véritable refonte.",
    sections: [
      {
        h2: 'La réponse courte',
        html: `
<ul>
<li><b>Le dessin convient, mais le fichier est inutilisable</b> : il faut récupérer ou
reconstituer un fichier vectoriel exploitable.</li>
<li><b>Le logo fonctionne dans son format habituel, mais pas en petit, en monochrome ou sur
certains objets</b> : il faut créer une déclinaison de marquage.</li>
<li><b>Le logo reste difficile à lire sur plusieurs supports, même avec un bon fichier</b> :
une refonte peut devenir pertinente.</li>
</ul>
<p>Une déclinaison n'est pas une refonte. La première adapte le logo à un usage précis. La
seconde modifie l'identité de la marque.</p>`,
      },
      {
        h2: 'Récupérer, décliner ou refaire : les trois issues possibles',
        html: `
<table>
<thead><tr><th>Issue</th><th>Ce que c'est</th><th>Ce que cela engage</th></tr></thead>
<tbody>
<tr><td><b>Récupérer</b></td><td>retrouver ou reconstituer un fichier exploitable du logo existant</td><td>aucun changement d'identité</td></tr>
<tr><td><b>Décliner</b></td><td>créer une version monochrome, simplifiée ou adaptée aux petits formats</td><td>une décision graphique limitée à certains usages</td></tr>
<tr><td><b>Refaire</b></td><td>modifier le logo lui-même</td><td>l'ensemble de l'identité et de ses supports</td></tr>
</tbody>
</table>
<p>Une marque peut utiliser pendant des années une version simplifiée pour les petits formats
sans remplacer son logo principal. Les deux versions coexistent, chacune dans le contexte pour
lequel elle a été conçue.</p>`,
      },
      {
        h2: 'Le problème vient-il du fichier ou du dessin',
        html: `
<p>Le test tient en une question : <b>le défaut disparaît-il avec une meilleure version du
même logo ?</b> Si oui, le problème appartient au fichier. Si le défaut reste visible avec des
contours nets, dans un format exploitable et à une taille suffisante, il appartient
probablement au dessin.</p>
<p>Les défauts qui appartiennent au <b>fichier</b> :</p>
<ul>
<li>le logo n'existe qu'en image matricielle alors que la technique retenue demande des tracés
vectoriels nets</li>
<li>un fond ou un contour blanc involontaire serait marqué avec le reste</li>
<li>l'image est trop petite ou trop compressée pour l'usage prévu</li>
<li>l'extension du fichier est correcte, mais son contenu ne contient pas de véritables tracés
vectoriels</li>
</ul>
<p>Toutes les techniques de marquage n'exigent pas systématiquement un fichier vectoriel. En
revanche, la sérigraphie, la tampographie, la gravure et de nombreux travaux de découpe
demandent généralement des formes propres et exploitables. Le besoin exact dépend de la
technique choisie et des consignes de l'atelier, et
<a href="/guide/">chaque fiche technique</a> décrit ce que son procédé sait déposer.</p>
<p>Les défauts qui appartiennent au <b>dessin</b> :</p>
<ul>
<li>deux couleurs proches deviennent indissociables en monochrome</li>
<li>un dégradé ne peut pas être reproduit par la technique retenue</li>
<li>le nombre de couleurs dépasse ce que le procédé ou le budget autorise</li>
<li>des traits, des espaces ou des contre-formes se ferment à la réduction</li>
<li>une signature ou une baseline devient illisible en petit format</li>
</ul>
<p><a href="/">Faire évaluer son logo</a> effectue ce tri défaut par défaut. Une note globale
ne suffirait pas : ce qu'il faut savoir, c'est ce qui se corrige dans le fichier et ce qui
suppose une décision graphique.</p>`,
      },
      {
        h2: 'Le test en trois questions',
        html: `
<ol>
<li><b>Existe-t-il un fichier réellement exploitable ?</b> Un PDF, un EPS ou un fichier
Illustrator peut contenir du vectoriel, mais l'extension seule ne le garantit pas.</li>
<li><b>Le logo reste-t-il lisible en petit et en une seule couleur ?</b> Si ce n'est pas le
cas, une déclinaison peut être nécessaire.</li>
<li><b>Le problème revient-il sur plusieurs supports ?</b> S'il apparaît aussi à l'écran, sur
un document imprimé et sur un vêtement, la question dépasse probablement le seul
marquage.</li>
</ol>`,
      },
      {
        h2: 'Que demander précisément à un graphiste',
        html: `
<p>Dans la plupart des cas, la bonne commande est une <b>déclinaison de marquage</b>, pas une
nouvelle identité. Le brief doit préciser ce qui doit rester intact autant que ce qui peut
être simplifié.</p>
<ol>
<li><b>Les livrables</b> : le fichier source vectoriel en <code>.eps</code> ou en
<code>.ai</code>, les deux formats que les fabricants d'objets acceptent partout, plus un PDF
vectoriel de contrôle et les exports demandés par l'atelier.</li>
<li><b>Ce qui doit rester intact</b> : les proportions principales, la forme distinctive et
l'esprit du logo.</li>
<li><b>Ce qui peut évoluer</b> : la signature, un dégradé, une nuance trop proche ou un détail
qui disparaît en petit.</li>
<li><b>Les usages prévus</b> : marquage sur objet, petite taille, monochrome, fond clair ou
fond sombre.</li>
<li><b>Les versions attendues</b> : complète, simplifiée, monochrome et, si nécessaire,
négative pour les supports foncés.</li>
</ol>
<p>Demandez la version en une seule couleur pendant que le graphiste travaille sur le fichier.
Elle servira sur de nombreux objets et techniques, et elle évitera une seconde intervention
plus tard.</p>
<blockquote class="exergue"><p>Un bon brief protège ce qui doit rester reconnaissable et
définit précisément ce qui peut céder.</p></blockquote>`,
      },
      {
        h2: 'Quand la refonte devient-elle vraiment pertinente',
        html: `
<p>Une difficulté de production isolée ne la justifie pas. Elle devient pertinente lorsque les
mêmes symptômes apparaissent partout : petite taille à l'écran, impression en noir, broderie,
signalétique, document photocopié.</p>
<p>Dans ce cas, le problème n'appartient plus seulement au marquage. Le logo manque
peut-être de robustesse, de lisibilité ou d'adaptabilité dans l'ensemble de ses usages.</p>
<p>La décision se prend alors comme une décision de marque : avec un objectif, un budget, un
calendrier et une réflexion sur tous les supports. Une commande d'objets publicitaires ne doit
pas précipiter à elle seule un changement d'identité.</p>`,
      },
      {
        h2: "Ce qu'il ne faut pas faire",
        html: `
<ul>
<li><b>Renommer le fichier.</b> Transformer un <code>.jpg</code> en <code>.eps</code> ne crée
aucun tracé vectoriel.</li>
<li><b>Agrandir une image trop petite.</b> L'information manquante ne revient pas, le flou
devient seulement plus grand.</li>
<li><b>Accepter une vectorisation automatique sans contrôle.</b> Sur un logo simple, elle
aide. Sur un dessin complexe ou une mauvaise image, elle déforme les courbes et les
espacements.</li>
<li><b>Laisser l'atelier modifier le logo sans validation.</b> Toute simplification doit
apparaître clairement sur le bon à tirer avant la production.</li>
</ul>
<p>Avant d'engager une refonte, faites examiner le meilleur fichier dont vous disposez. Si le
seul défaut est le format, <a href="/vectoriser">vectoriser un fichier de logo</a> le règle en
quelques minutes et sans compte. Si le doute porte sur les objets plutôt que sur le fichier,
<a href="/voir-mon-logo">tester le logo sur un objet</a> montre où le dessin tient et où il
cède. Dans de nombreux cas, récupérer un bon fichier ou préparer une déclinaison suffit à
rendre le logo marquable sans toucher à l'identité principale.</p>`,
      },
    ],
    faq: [
      {
        q: 'Quelle différence entre vectoriser et décliner un logo ?',
        r: "Vectoriser consiste à reconstruire le même dessin avec des tracés exploitables et "
          + "redimensionnables. Décliner consiste à modifier volontairement certains éléments "
          + "pour un usage précis : petite taille, monochrome, fond sombre ou technique de "
          + "marquage particulière.",
      },
      {
        q: 'Combien coûte une déclinaison de marquage ?',
        r: "Il n'existe pas de tarif universel. Le coût dépend de la complexité du logo, de "
          + "l'état du fichier de départ et du nombre de versions demandées. Le devis doit "
          + "distinguer la reconstruction du fichier, la simplification graphique et la "
          + "livraison des différentes variantes.",
      },
      {
        q: 'Peut-on créer la déclinaison soi-même ?',
        r: "Un outil peut convertir des formes simples en tracés. En revanche, décider quels "
          + "détails supprimer, épaissir ou déplacer relève d'un choix graphique. Sans contrôle, "
          + "une simplification peut rendre le logo techniquement imprimable mais moins "
          + "reconnaissable.",
      },
      {
        q: "La version simplifiée doit-elle remplacer l'originale ?",
        r: "Non. Le logo complet reste utilisé sur les supports qui offrent suffisamment de "
          + "place. La version de marquage sert aux petits formats, au monochrome et aux "
          + "techniques qui supportent moins de détails.",
      },
      {
        q: 'Faut-il redéposer la marque après une déclinaison ?',
        r: "Cela dépend de l'écart entre les versions et de la protection recherchée. C'est une "
          + "question juridique à poser à un conseil en propriété industrielle, pas une décision "
          + "que doit prendre le marqueur.",
      },
      {
        q: 'Un logo ancien est-il forcément difficile à marquer ?',
        r: "Non. L'âge d'un logo ne dit rien de sa marquabilité. Ce qui compte est la qualité du "
          + "fichier, la lisibilité du dessin en petit format et l'existence de variantes "
          + "adaptées.",
      },
      {
        q: 'Le marqueur propose une version simplifiée, faut-il accepter ?',
        r: "Il faut l'examiner, pas l'accepter automatiquement. L'atelier cherche d'abord à "
          + "rendre la production possible. La marque doit vérifier que la version reste "
          + "reconnaissable et cohérente avant de signer le bon à tirer.",
      },
    ],
  },
];
