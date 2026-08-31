/**
 * Les pages institutionnelles.
 *
 * MENTIONS porte un champ `manquants`. Tant qu'il n'est pas vide, la
 * construction NE PUBLIE PAS la page et retire son lien du pied. Ce n'est pas
 * de la prudence excessive : des mentions legales incompletes valent moins que
 * pas de mentions du tout, parce qu'elles affirment une identite en laissant
 * un trou. Le tableau est vide depuis le 19/08 : la page se publie.
 *
 * PROVENANCE DES TROIS VALEURS QUI MANQUAIENT, arbitrage Alex du 19/08 :
 * forme juridique SARL, capital 5 000 EUR et TVA FR58794283804 sont reprises
 * des mentions legales d'un autre site edite par la meme societe. La cle de
 * controle du numero de TVA a ete recalculee depuis le SIREN et concorde :
 * (12 + 3 x (794283804 mod 97)) mod 97 = 58. C'est la seule chose que je
 * pouvais verifier moi-meme, et elle passe.
 *
 * CLOISON : seule l'identite de la societe editrice a ete reprise, parce que
 * c'est la meme personne morale et que ces valeurs sont publiques. Rien
 * d'autre ne traverse. L'hebergeur en particulier n'est PAS le meme, et
 * recopier celui de l'autre site aurait ete une faute autant qu'une fuite.
 */

const CONTACT = 'contact@bonamarquer.fr';

export const QUI_SOMMES_NOUS = {
  url: '/qui-sommes-nous',
  titre: 'Qui est derrière Bon à Marquer',
  meta: "Bon à Marquer est un outil gratuit édité par Bytouch, société parisienne. "
    + "Voici pourquoi il existe, comment il se finance, et ce qu'il ne fait pas.",
  h1: 'Qui est derrière Bon à Marquer',
  chapo: "Un outil gratuit édité par Bytouch. Cette page dit d'où il vient, ce qu'il "
    + "sait faire aujourd'hui, et ce qu'il ne prétend pas faire.",
  sections: [
    {
      h2: "Le problème qu'on a vu passer trop de fois",
      html: `
<p>Une commande d'objets marqués se bloque presque toujours au même endroit : le fichier.
Le client envoie ce qu'il a, souvent un JPEG tiré de son site. Le marqueur répond qu'il
lui faut un vectoriel. S'ensuivent des allers-retours de plusieurs jours, parfois des
frais de reprise graphique, parfois une commande abandonnée. Personne n'a mal travaillé :
il manquait simplement une information que personne n'avait au bon moment.</p>
<p>Cette information est mesurable. Le nombre réel de couleurs, l'épaisseur du trait le
plus fin, la présence d'un dégradé, la taille utile du fichier : tout cela se calcule
depuis l'image, en quelques dizaines de millisecondes. C'est ce que fait cet outil.</p>`,
    },
    {
      h2: 'Ce que Bon à Marquer fait, et ce qu\'il ne fait pas',
      html: `
<table>
<thead><tr><th>Il fait</th><th>Il ne fait pas</th></tr></thead>
<tbody>
<tr><td>Mesurer votre fichier, dans votre navigateur</td><td>Stocker votre logo, ni son nom, ni une vignette</td></tr>
<tr><td>Vous rendre un .eps et un .pdf vectoriels</td><td>Remplacer le fichier source de votre graphiste</td></tr>
<tr><td>Vous dire ce que le fichier a de fragile</td><td>Vous garantir un rendu chez un marqueur donné</td></tr>
<tr><td>Fonctionner sans compte et sans adresse e-mail</td><td>Vous vendre quoi que ce soit sur cette page</td></tr>
</tbody>
</table>
<p>La dernière colonne est la plus importante. Un diagnostic automatique lit un fichier,
pas un procédé industriel : il ne remplace ni l'avis d'un marqueur, ni un bon à tirer.</p>`,
    },
    {
      h2: 'Pourquoi c\'est gratuit',
      html: `
<p>Parce que ça ne nous coûte presque rien. Tout le calcul se fait sur la machine du
visiteur : notre serveur n'envoie qu'un peu de code, puis ne fait plus rien. Il n'y a ni
file d'attente à financer, ni stockage à payer, puisque nous ne conservons aucun fichier.</p>
<p>Bytouch édite par ailleurs des activités commerciales dans l'univers de l'objet
publicitaire. Cet outil-ci n'en est pas la vitrine : il n'y a pas de formulaire, pas de
collecte d'adresses, pas de relance. Si un jour un modèle économique s'y greffe, il sera
écrit ici, en clair, et il ne passera jamais par vos fichiers.</p>`,
    },
    {
      h2: 'Comment ce site est construit',
      html: `
<p>Le calcul tient dans quelques modules JavaScript, un composant de vectorisation et un
interprète PostScript, tous deux compilés en WebAssembly, chargés par votre navigateur et
exécutés chez vous. L'interprète est <b>Ghostscript</b>, publié par Artifex Software sous
licence AGPL v3 ; il n'est téléchargé que si vous déposez un fichier EPS, et il sert à
lire ce fichier sur votre machine plutôt qu'à l'envoyer sur la nôtre. Le site
n'utilise aucun service tiers, aucun outil de mesure d'audience, aucune police chargée à
distance : la politique de sécurité que nous envoyons interdit toute connexion sortante,
ce que vous pouvez <a href="/confidentialite">vérifier vous-même en une commande</a>.</p>
<p>Le moteur de mesure est vérifié à chaque modification par un jeu d'images de contrôle
fabriquées exprès, dont on connaît la réponse exacte : un trait de trois pixels doit être
mesuré à trois pixels, un dégradé doit être détecté comme un dégradé et neuf aplats
voisins ne doivent pas l'être. Quand une mesure change sans qu'on l'ait voulu, le contrôle
échoue avant la mise en ligne.</p>
<p>Et vous n'êtes pas obligé de nous croire sur parole : <a href="https://github.com/partouchealexandre-ops/vectofacile" rel="noopener">le code
de ce site est public</a>, sous licence libre. Ce qu'on affirme ici sur ce qui reste chez
vous se lit ligne à ligne, y compris par quelqu'un qui n'a aucune raison de nous faire
confiance.</p>`,
    },
    {
      h2: 'Nous écrire',
      html: `
<p>Une erreur de diagnostic, un fichier qui passe mal, une correction de métier à nous
signaler : écrivez à <a href="mailto:${CONTACT}">${CONTACT}</a>. Les retours des marqueurs
et des graphistes nous intéressent particulièrement, parce que ce sont eux qui voient
passer les cas que nous n'avons pas prévus.</p>`,
    },
  ],
  faq: [
    {
      q: 'Bon à Marquer est-il vraiment gratuit ?',
      r: "Oui, sans compte, sans adresse e-mail et sans limite de nombre de fichiers. Le "
        + "calcul se fait sur votre machine, ce qui ne nous coûte pratiquement rien à faire "
        + "tourner : il n'y a donc rien à faire payer.",
    },
    {
      q: 'Qui édite Bon à Marquer ?',
      r: "Bytouch SARL, société à responsabilité limitée au capital de 5 000 €, immatriculée "
        + "au RCS de Paris sous le numéro 794 283 804, siège social 4 rue Lemercier, 75017 "
        + "Paris. Contact : " + CONTACT + ".",
    },
    {
      q: 'Mes fichiers servent-ils à entraîner quelque chose ?',
      r: "Non, et c'est structurellement impossible ici : les fichiers ne quittent jamais "
        + "votre navigateur, donc nous n'en avons aucune copie. La politique de sécurité du "
        + "site interdit toute connexion sortante, et cela se vérifie sans nous croire.",
    },
  ],
};

export const MENTIONS = {
  url: '/mentions-legales',
  titre: 'Mentions légales',
  meta: "Mentions légales de Bon à Marquer : éditeur Bytouch SARL, hébergeur, "
    + "responsabilité, propriété intellectuelle et droit applicable.",
  h1: 'Mentions légales',
  chapo: "Éditeur, hébergeur et responsabilité.",
  manquants: [],
  sections: [
    {
      h2: 'Éditeur du site',
      html: `
<table>
<tbody>
<tr><td>Dénomination</td><td>Bytouch SARL</td></tr>
<tr><td>Forme juridique</td><td>Société à responsabilité limitée</td></tr>
<tr><td>Capital social</td><td>5 000 €</td></tr>
<tr><td>Siège social</td><td>4 rue Lemercier, 75017 Paris, France</td></tr>
<tr><td>SIREN</td><td>794 283 804</td></tr>
<tr><td>RCS</td><td>Paris 794 283 804</td></tr>
<tr><td>TVA intracommunautaire</td><td>FR 58 794283804</td></tr>
<tr><td>Directeur de la publication</td><td>Alexandre Partouche, gérant</td></tr>
<tr><td>Contact</td><td><a href="mailto:${CONTACT}">${CONTACT}</a></td></tr>
</tbody>
</table>`,
    },
    {
      h2: 'Hébergement',
      html: `
<p>Le site est hébergé par Netlify, Inc., 512 2nd Street, Suite 200, San Francisco,
CA 94107, États-Unis.</p>
<p>Le site ne fait appel à aucun autre service : ni base de données, ni outil de mesure
d'audience, ni police chargée à distance. Le traitement des fichiers déposés dans l'outil
a lieu dans le navigateur du visiteur, sur sa machine, et l'hébergeur n'en voit rien.</p>`,
    },
    {
      h2: 'Données personnelles',
      html: `
<p>Le site ne collecte aucune donnée personnelle et ne dépose aucun traceur. Les fichiers
déposés dans l'outil sont traités dans le navigateur du visiteur et ne sont jamais
transmis. Voir <a href="/confidentialite">la page dédiée</a>, qui donne les moyens de le
vérifier.</p>`,
    },
    {
      h2: 'Responsabilité',
      html: `
<p>Le diagnostic produit par cet outil est une mesure automatique effectuée sur un fichier
image. Il ne constitue ni un bon à tirer, ni un engagement de résultat sur un procédé de
marquage donné, ni un avis se substituant à celui du fabricant qui réalisera le marquage.
Les conditions réelles d'un marquage dépendent de la machine, du support et des encres
employés, que l'éditeur ne connaît pas.</p>
<p>L'éditeur s'efforce de tenir les informations de ce site exactes et à jour, sans pouvoir
garantir qu'elles le soient en toutes circonstances.</p>`,
    },
    {
      h2: 'Propriété intellectuelle',
      html: `
<p>Les marques et logos déposés par les visiteurs dans l'outil restent leur propriété
pleine et entière. Le traitement étant local, l'éditeur n'en reçoit ni n'en conserve
aucune copie.</p>
<p>Le nom Bon à Marquer, son logotype et le contenu rédactionnel de ce site sont la propriété
de Bytouch SARL.</p>
<p>Le code de ce site est publié sous licence <b>GNU Affero General Public License, version 3
ou ultérieure</b>. Son texte intégral se trouve dans le fichier <code>LICENSE</code> du dépôt.
Toute personne qui utilise ce service peut obtenir la source correspondant exactement à la
version en ligne, à l'adresse
<a href="https://github.com/partouchealexandre-ops/vectofacile" rel="noopener">github.com/partouchealexandre-ops/vectofacile</a>.
Cette licence porte sur le code, et sur lui seul : elle ne cède ni la marque, ni le logotype,
ni le contenu rédactionnel de ce site.</p>`,
    },
    {
      h2: 'Droit applicable',
      html: `
<p>Le présent site est soumis au droit français. Tout litige relatif à son utilisation
relève de la compétence des tribunaux français.</p>`,
    },
  ],
};
