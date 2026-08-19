/**
 * La page qui porte la promesse centrale du produit.
 *
 * REECRITE le 19/08 sur une critique d'Alex, et il avait raison : la premiere
 * version ouvrait sur une commande de terminal. Elle etait honnete et elle
 * s'adressait a trois pour cent des visiteurs. Les autres lisaient
 * « connect-src 'self' » et refermaient l'onglet, ce qui revient a n'avoir
 * rien prouve du tout.
 *
 * La page ouvre desormais sur le test que N'IMPORTE QUI peut faire et qui
 * prouve tout : couper sa connexion internet, puis deposer un logo. Si l'outil
 * fonctionne encore, rien ne part. Aucun terminal, aucune confiance, aucune
 * competence.
 *
 * Ce test n'etait pas vrai quand la premiere version a ete ecrite : le
 * vectoriseur se chargeait apres le depot. Il l'est maintenant, le
 * prechargement de fond a ete pose pour ca, et le harnais de bout en bout le
 * verifie a chaque execution en coupant reellement le reseau. La page dit donc
 * quelque chose de teste, pas quelque chose d'espere.
 *
 * Les preuves techniques restent, en dernier, pour qui veut aller au fond.
 * L'ordre compte plus que le contenu : du geste que tout le monde peut faire
 * vers celui que peu feront.
 */

export const CONFIDENTIALITE = {
  url: '/confidentialite',
  titre: 'Votre logo ne quitte pas votre ordinateur',
  meta: "Coupez votre connexion internet, déposez un logo : tout fonctionne encore. "
    + "La preuve en dix secondes que rien n'est envoyé, sans avoir à nous croire.",
  h1: 'Votre logo reste chez vous',
  chapo: "Tout le monde écrit ça. Voici comment le vérifier vous-même, en dix secondes, "
    + "sans rien connaître à la technique.",
  sections: [
    {
      h2: 'Le test que vous pouvez faire tout de suite',
      html: `
<div class="encadre preuve">
<p><b>Coupez votre connexion internet, puis déposez un logo sur notre page d'accueil.</b></p>
<p>Le wifi éteint, le câble débranché, le mode avion activé : peu importe. Vous verrez
vos mesures s'afficher et votre fichier vectoriel se fabriquer, exactement comme avant.</p>
<p>Un site qui envoie vos fichiers quelque part <b>ne peut pas</b> faire ça. C'est la
preuve, et elle tient en dix secondes.</p>
</div>
<p>Une seule précaution : chargez la page <i>avant</i> de couper, puisque la page
elle-même doit bien arriver jusqu'à vous. Une fois qu'elle est là, elle n'a plus besoin
de nous.</p>
<p>Nous vérifions ce comportement à chaque modification de l'outil, en coupant réellement
le réseau dans un navigateur automatisé. Si un jour quelqu'un ajoutait le moindre appel
extérieur, même une police ou une mesure d'audience, ce contrôle échouerait avant la mise
en ligne.</p>`,
    },
    {
      h2: 'Ce qui se passe quand vous déposez un fichier',
      html: `
<p>Votre navigateur lit le fichier depuis votre disque, le décode, le mesure et le
vectorise. Tout cela se produit sur votre machine, dans l'onglet ouvert. Le fichier
n'est jamais téléversé, son nom n'est jamais transmis, aucune vignette n'est fabriquée
ailleurs que chez vous.</p>
<p>Quand vous fermez l'onglet, il ne reste rien. Nous n'avons pas de base de données de
logos, parce qu'il n'y a rien à y mettre.</p>`,
    },
    {
      h2: 'Ni compte, ni adresse e-mail, ni traceur',
      html: `
<p>Le diagnostic et le fichier vectoriel sont gratuits, sans inscription et sans limite
de nombre de fichiers. Nous ne vous demandons pas votre adresse, et le site ne dépose
aucun traceur publicitaire ni aucun outil de mesure d'audience.</p>
<p>Le jour où nous mesurerons quelque chose, la règle est déjà écrite et elle ne bougera
pas : <b>on enregistre les mesures et le verdict, jamais le fichier, jamais son nom,
jamais une vignette.</b> Une ligne du type « un logo de neuf couleurs, trait le plus fin
fragile » nous apprend ce qu'il faut pour améliorer l'outil, et ne permet à personne de
reconstituer votre logo ni de savoir qu'il était le vôtre.</p>`,
    },
    {
      h2: 'Pour aller plus loin, si la technique vous intéresse',
      html: `
<p>Ce qui suit ne change rien à ce qui précède : c'est le même fait, vu de plus près.
Vous pouvez sauter cette section sans rien perdre.</p>
<p><b>La deuxième vérification, dans votre navigateur.</b> Ouvrez les outils de
développement, onglet Réseau, déposez un logo et regardez la liste des requêtes. Aucune
ne part vers un autre domaine, et aucune ne contient votre fichier. C'est votre
navigateur qui l'affiche, pas nous.</p>
<p><b>Ce qui rend l'envoi impossible, et pas seulement absent.</b> Une promesse ne vaut
que par ce qui l'empêche d'être trahie. Ici, c'est une règle que votre navigateur
applique et que nous ne pouvons pas contourner : la <b>politique de sécurité du
contenu</b>, envoyée avec chaque page. Elle contient une directive nommée
<code>connect-src 'self'</code>, qui interdit à cette page d'envoyer quoi que ce soit
vers un autre serveur que celui qui l'a servie. Si notre code essayait, votre navigateur
refuserait la connexion et l'écrirait dans sa console.</p>
<p><b>La troisième vérification, en une commande.</b> Elle lit les entêtes que notre
serveur envoie réellement, sans passer par nous.</p>
<pre><code>curl -sSI https://vectofacile.netlify.app/ | grep -i content-security-policy</code></pre>
<table>
<thead><tr><th>Directive</th><th>Ce qu'elle interdit</th></tr></thead>
<tbody>
<tr><td><code>connect-src 'self'</code></td><td>Tout envoi de données vers un autre serveur. La ligne qui protège votre fichier.</td></tr>
<tr><td><code>form-action 'none'</code></td><td>Tout formulaire qui posterait quoi que ce soit où que ce soit.</td></tr>
<tr><td><code>default-src 'self'</code></td><td>Le chargement de la moindre ressource extérieure. Nos polices sont servies par nous, pas par un tiers.</td></tr>
<tr><td><code>frame-ancestors 'none'</code></td><td>L'inclusion de notre page dans un cadre par un site tiers.</td></tr>
<tr><td><code>object-src 'none'</code></td><td>Tout greffon, qui serait une échappatoire à tout le reste.</td></tr>
</tbody>
</table>`,
    },
  ],
  faq: [
    {
      q: 'Comment vérifier qu\'un site de vectorisation n\'envoie pas mon logo ?',
      r: "Chargez la page, coupez votre connexion internet, puis déposez votre fichier. Si "
        + "l'outil fonctionne encore, c'est que tout se passe sur votre machine : un site "
        + "qui téléverse vos fichiers ne peut pas fonctionner hors ligne. Le test vaut pour "
        + "n'importe quel outil en ligne, pas seulement le nôtre.",
    },
    {
      q: 'Est-ce que mon logo est envoyé sur vos serveurs ?',
      r: "Non. Le fichier est lu, mesuré et vectorisé par votre navigateur, sur votre "
        + "machine. La politique de sécurité du site interdit techniquement tout envoi vers "
        + "un autre serveur, et le test hors ligne vous le montre en dix secondes.",
    },
    {
      q: 'Gardez-vous une copie de mon fichier ?',
      r: "Non, et nous ne le pourrions pas : le fichier ne nous parvient jamais. Il n'existe "
        + "aucune base de données de logos chez nous. Quand vous fermez l'onglet, il ne "
        + "reste rien.",
    },
    {
      q: "Le fichier vectoriel que je télécharge, d'où vient-il ?",
      r: "Il est fabriqué dans votre navigateur, à partir de votre fichier, et n'a jamais "
        + "transité par un serveur. C'est pour cette raison qu'il apparaît instantanément, "
        + "et pour cette raison qu'il apparaît aussi hors ligne.",
    },
    {
      q: 'Faut-il créer un compte ou donner un e-mail ?',
      r: "Non. Le diagnostic et le fichier vectoriel sont gratuits, sans compte, sans "
        + "adresse e-mail et sans limite de nombre de fichiers.",
    },
  ],
};
