/**
 * La page qui porte la promesse centrale du produit.
 *
 * Elle est ecrite differemment de toutes les autres : elle ne PROMET rien, elle
 * donne les commandes qui verifient. Un visiteur du metier, ou un concurrent,
 * peut la contredire en trente secondes s'il a raison. C'est exactement ce
 * qu'on veut : une promesse verifiable vaut mille promesses affirmees.
 */

export const CONFIDENTIALITE = {
  url: '/confidentialite',
  titre: 'Votre logo reste chez vous : comment le vérifier vous-même',
  meta: "Vecto Facile n'envoie jamais votre logo. Ce n'est pas une promesse, c'est une "
    + "contrainte appliquée par votre navigateur, et cette page vous donne les commandes "
    + "pour le vérifier sans nous croire sur parole.",
  h1: 'Votre logo reste chez vous',
  chapo: "Tout le monde écrit ça. Voici pourquoi c'est vrai ici, et surtout comment le "
    + "vérifier sans nous faire confiance.",
  sections: [
    {
      h2: 'Ce qui se passe quand vous déposez un fichier',
      html: `
<p>Votre navigateur lit le fichier depuis votre disque, le décode, le mesure et le
vectorise. Tout cela se produit sur votre machine, dans l'onglet ouvert. Le fichier
n'est jamais téléversé, son nom n'est jamais transmis, aucune vignette n'est produite
ailleurs que chez vous.</p>
<p>Quand vous fermez l'onglet, il ne reste rien. Nous n'avons pas de base de données
de logos, parce qu'il n'y a rien à y mettre.</p>`,
    },
    {
      h2: "Pourquoi ce n'est pas qu'une promesse",
      html: `
<p>Une promesse de confidentialité ne vaut que par ce qui l'empêche d'être trahie. Ici,
ce qui l'empêche est une règle que votre navigateur applique, et que nous ne pouvons
pas contourner : la <b>politique de sécurité du contenu</b>, envoyée avec chaque page.</p>
<p>Elle contient une directive nommée <code>connect-src 'self'</code>. En français : cette
page n'a le droit d'envoyer des données <b>vers aucun autre serveur que celui qui l'a
servie</b>. Si notre code tentait d'expédier votre logo quelque part, votre navigateur
refuserait la connexion et l'écrirait dans sa console. Ce n'est pas nous qui nous en
empêchons, c'est lui.</p>`,
    },
    {
      h2: 'Vérifiez-le en une commande',
      html: `
<p>Ouvrez un terminal et tapez ceci. Vous lirez les entêtes que notre serveur envoie
réellement, sans passer par nous.</p>
<pre><code>curl -sSI https://vectofacile.netlify.app/ | grep -i content-security-policy</code></pre>
<p>La réponse contient <code>connect-src 'self'</code>. C'est la ligne qui compte.</p>
<div class="encadre preuve"><p><b>Sans terminal, aussi simplement :</b> ouvrez les outils
de développement de votre navigateur, onglet Réseau, déposez un logo, et regardez la
liste des requêtes. Aucune ne part vers un autre domaine, et aucune ne contient votre
fichier. C'est la vérification la plus honnête qui soit, parce que c'est votre
navigateur qui l'affiche, pas nous.</p></div>`,
    },
    {
      h2: 'Les autres directives, et ce que chacune interdit',
      html: `
<table>
<thead><tr><th>Directive</th><th>Ce qu'elle interdit</th></tr></thead>
<tbody>
<tr><td><code>connect-src 'self'</code></td><td>Tout envoi de données vers un autre serveur. La ligne qui protège votre fichier.</td></tr>
<tr><td><code>form-action 'none'</code></td><td>Tout formulaire qui posterait quoi que ce soit où que ce soit.</td></tr>
<tr><td><code>default-src 'self'</code></td><td>Le chargement de la moindre ressource extérieure. Nos polices sont servies par nous, pas par Google.</td></tr>
<tr><td><code>frame-ancestors 'none'</code></td><td>L'inclusion de notre page dans un cadre par un site tiers.</td></tr>
<tr><td><code>object-src 'none'</code></td><td>Tout greffon, qui serait une échappatoire à tout le reste.</td></tr>
</tbody>
</table>`,
    },
    {
      h2: 'Ce que nous mesurerons un jour, et ce que nous ne mesurerons jamais',
      html: `
<p>Le site n'a aujourd'hui aucune mesure d'audience. Quand il en aura, la règle est déjà
écrite et elle ne bougera pas : <b>on enregistre les mesures et le verdict, jamais le
fichier, jamais son nom, jamais une vignette.</b></p>
<p>Concrètement, une ligne du type « un logo de neuf couleurs, halo de 3,7 %, verdict
orange en sérigraphie » nous apprend ce qu'il faut pour améliorer l'outil. Elle ne
permet à personne de reconstituer votre logo, ni de savoir que c'était le vôtre.</p>`,
    },
    {
      h2: 'Le code est ouvert',
      html: `
<p>Rien de tout cela ne demande de nous croire : le code du site est public, et vous
pouvez lire exactement ce qu'il fait de votre fichier. Le module qui le lit tient en
une centaine de lignes.</p>`,
    },
  ],
  faq: [
    {
      q: 'Est-ce que mon logo est envoyé sur vos serveurs ?',
      r: "Non. Le fichier est lu, mesuré et vectorisé par votre navigateur, sur votre "
        + "machine. La politique de sécurité du site interdit techniquement tout envoi vers "
        + "un autre serveur, et vous pouvez le vérifier dans l'onglet Réseau de votre "
        + "navigateur ou par une commande curl.",
    },
    {
      q: 'Gardez-vous une copie de mon fichier ?',
      r: "Non, et nous ne le pourrions pas : le fichier ne nous parvient jamais. Il n'existe "
        + "aucune base de données de logos chez nous. Quand vous fermez l'onglet, il ne reste "
        + "rien.",
    },
    {
      q: "Le fichier vectoriel que je télécharge, d'où vient-il ?",
      r: "Il est fabriqué dans votre navigateur, à partir de votre fichier, et n'a jamais "
        + "transité par un serveur. C'est pour cette raison qu'il apparaît instantanément.",
    },
    {
      q: 'Faut-il créer un compte ou donner un email ?',
      r: "Non. Le diagnostic et le fichier vectoriel sont gratuits et sans compte. Un email "
        + "n'est demandé qu'à un seul endroit du site, pour recevoir la matrice complète par "
        + "technique et par objet, et c'est facultatif.",
    },
  ],
};
