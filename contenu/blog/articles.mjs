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
 * Source : corpus/article_01_fichier_refuse.md et corpus/article_02_totebag_stylo.md,
 * ecrits dans la nuit du 25 au 26/08/2026.
 */

export const ARTICLES = [
  {
    url: '/blog/mon-fichier-a-ete-refuse',
    date: '2026-08-31',
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
<div class="encadre"><p>Un fichier se répare. Un dessin se retravaille. Confondre les deux
fait perdre une semaine à demander un devis de graphiste pour un problème de format.</p></div>`,
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
<div class="encadre"><p>Un site qui vous donne un nombre là où le métier n'est pas d'accord
ne vous rend pas service. Il vous rend confiant, ce qui est autre chose.</p></div>`,
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
<div class="encadre"><p>Un logo ne devient pas mauvais en changeant d'objet. Il devient
petit, et le petit est un régime différent.</p></div>`,
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
<div class="encadre"><p>Un site qui répond seulement oui ou non vous cache l'information la
plus utile : qui doit agir ensuite.</p></div>`,
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
];
