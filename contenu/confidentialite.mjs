/**
 * La page qui porte la promesse centrale du produit.
 *
 * DEUXIEME REECRITURE, 19/08. La premiere ouvrait sur une commande de
 * terminal : honnete, et adressee a trois pour cent des visiteurs. La deuxieme
 * ouvrait sur le test hors ligne, ce qui etait le bon geste, mais elle
 * accumulait ensuite neuf cent cinquante mots. Alex a tranche : trop long,
 * trop complique.
 *
 * ET SURTOUT, elle etait devenue FAUSSE. Le jour ou le site a su lire les PDF,
 * il a fallu telecharger un lecteur de PDF depuis notre domaine, au moment du
 * premier depot. Un visiteur qui coupe sa connexion et depose un PDF voit donc
 * une erreur, sur la page meme qui lui promet que ca marchera. Une promesse
 * qu'un visiteur peut prendre en defaut en dix secondes est pire que pas de
 * promesse du tout.
 *
 * La correction n'est pas de retirer le test, il est excellent : c'est de dire
 * exactement ce qu'il prouve. Il ne prouve pas que le site marche sans
 * internet. Il prouve que VOTRE FICHIER NE PART PAS, ce qui est la seule chose
 * qui compte, et il le prouve toujours.
 *
 * La partie technique reste, entiere, mais repliee. Elle ne coute plus rien a
 * qui ne la lit pas, et elle reste entiere pour qui la cherche.
 */

export const CONFIDENTIALITE = {
  url: '/confidentialite',
  titre: 'Votre logo ne quitte pas votre ordinateur',
  meta: "Coupez votre connexion internet, déposez une image : elle est mesurée et "
    + "vectorisée quand même. La preuve en dix secondes que rien n'est envoyé.",
  h1: 'Votre logo reste chez vous',
  chapo: "Tout le monde écrit ça. Voici comment le vérifier vous-même, en dix secondes, "
    + "sans rien connaître à la technique et sans avoir à nous croire.",
  sections: [
    {
      h2: 'Le test, en dix secondes',
      html: `
<div class="encadre preuve">
<p><b>Chargez cette page, coupez votre connexion internet, puis déposez une image sur
notre accueil.</b></p>
<p>Wifi éteint, câble débranché ou mode avion : vos mesures s'affichent et votre fichier
vectoriel se fabrique, exactement comme avant. Un site qui envoie vos fichiers quelque
part <b>ne peut pas</b> faire ça.</p>
</div>
<p>Ce test prouve une chose précise, et c'est la seule qui compte : <b>votre fichier ne
part pas</b>. Il ne dit pas que le site fonctionne entièrement sans internet, et nous ne
le prétendons pas.</p>
<p><b>La nuance, sur les PDF.</b> Pour lire un PDF ou un fichier Illustrator, votre
navigateur télécharge d'abord un lecteur depuis notre site, la première fois seulement.
Hors ligne dès le départ, ce téléchargement échoue et le PDF n'est pas lu. Déposez-en un
une fois connecté, coupez, redéposez-en un autre : il est lu aussi. Ce qui descend, c'est
un outil ; ce qui ne monte jamais, c'est votre fichier.</p>
<p>Nous vérifions ces deux comportements à chaque modification de l'outil, dans un
navigateur automatisé : le réseau réellement coupé d'un côté, et de l'autre la liste
complète des requêtes émises pendant un audit, dont aucune ne sort de notre domaine ni
n'écrit quoi que ce soit.</p>`,
    },
    {
      h2: 'Ce qui se passe quand vous déposez un fichier',
      html: `
<p>Votre navigateur lit le fichier depuis votre disque, le décode, le mesure et, s'il
s'agit d'une image, le vectorise. Tout se produit sur votre machine, dans l'onglet
ouvert. Le fichier n'est jamais téléversé, son nom n'est jamais transmis, aucune vignette
n'est fabriquée ailleurs que chez vous.</p>
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
      h2: 'Les preuves techniques, si vous voulez aller au fond',
      html: `
<p>Rien de ce qui suit ne change ce qui précède : c'est le même fait, vu de plus près.
Vous pouvez ne pas l'ouvrir.</p>
<details class="preuves">
<summary>Vérifier par vous-même, sans nous croire sur parole</summary>
<p><b>Dans votre navigateur.</b> Ouvrez les outils de développement, onglet Réseau,
déposez un logo et regardez la liste des requêtes. Aucune ne part vers un autre domaine,
et aucune ne contient votre fichier.</p>
<p><b>Ce qui rend l'envoi impossible, et pas seulement absent.</b> Une promesse ne vaut
que par ce qui l'empêche d'être trahie. Ici, c'est une règle que votre navigateur
applique et que nous ne pouvons pas contourner : la <b>politique de sécurité du
contenu</b>, envoyée avec chaque page. Sa directive <code>connect-src 'self'</code>
interdit à cette page d'envoyer quoi que ce soit vers un autre serveur que celui qui l'a
servie. Si notre code essayait, votre navigateur refuserait la connexion.</p>
<p><b>En une commande</b>, qui lit les entêtes que notre serveur envoie réellement, sans
passer par nous.</p>
<pre><code>curl -sSI https://bonamarquer.fr/ | grep -i content-security-policy</code></pre>
<table>
<thead><tr><th>Directive</th><th>Ce qu'elle interdit</th></tr></thead>
<tbody>
<tr><td><code>connect-src 'self'</code></td><td>Tout envoi de données vers un autre serveur. La ligne qui protège votre fichier.</td></tr>
<tr><td><code>form-action 'none'</code></td><td>Tout formulaire qui posterait quoi que ce soit où que ce soit.</td></tr>
<tr><td><code>default-src 'self'</code></td><td>Le chargement de la moindre ressource extérieure. Nos polices et notre lecteur de PDF sont servis par nous, pas par un tiers.</td></tr>
<tr><td><code>frame-ancestors 'none'</code></td><td>L'inclusion de notre page dans un cadre par un site tiers.</td></tr>
<tr><td><code>object-src 'none'</code></td><td>Tout greffon, qui serait une échappatoire à tout le reste.</td></tr>
</tbody>
</table>
</details>`,
    },
  ],
  faq: [
    {
      q: 'Comment vérifier qu\'un site de vectorisation n\'envoie pas mon logo ?',
      r: "Chargez la page, coupez votre connexion internet, puis déposez une image. Si "
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
      q: 'Pourquoi le site télécharge-t-il quelque chose quand je dépose un PDF ?',
      r: "Parce qu'il faut un lecteur de PDF pour l'ouvrir, et que nous le servons depuis "
        + "notre propre domaine plutôt que de vous envoyer chez un tiers. Ce téléchargement "
        + "descend vers vous, il ne remonte rien : votre fichier reste sur votre disque.",
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
