# Vecto Facile, le code

Outil gratuit qui vectorise un logo **entierement dans le navigateur du
visiteur** et rend un diagnostic de marquage : nombre reel de couleurs,
techniques possibles, taille maximale, risques par support.

Baseline : « Votre logo est-il bon a marquer ? »

Rien ne part sur un serveur. Ni le fichier, ni son nom, ni une vignette.
C'est une contrainte de conception, pas une promesse commerciale : il n'y a
aucun point du code ou un fichier client quitte la machine.

---

## Etat au 18/08/2026

| Chantier | Etat | Ce qui bloque |
|---|---|---|
| A. Chaine de vectorisation, EPS et PDF | **fait et verifie** | rien |
| B. Moteur de mesure M1 a M10 et ses harnais | **fait et verifie** | rien |
| C. Squelette du site | **fait**, sans la couche verdict | rien pour le squelette |
| D. Couche verdict, feux par technique | **pas commence** | `seuils.json`, qui attend les arbitrages d'Alex |
| E. Recette sur logos clients reels | **pas commence** | le corpus de logos, voir `protocole_corpus_logos.md` |

Trois harnais, tous verts :

```
npm run verifier
```

- **16 cas, 46 controles** sur le moteur de mesure, corpus synthetique
- **16 cas** sur la chaine de vectorisation, rendus compares par Ghostscript
- **4 cas** de bout en bout, dans un vrai Chromium

La page affiche aujourd'hui les MESURES, qui sont des faits, et dit
explicitement qu'elle ne sait pas encore rendre de verdict. Aucun seuil de
marquage n'est ecrit dans le code, nulle part. C'est la regle du projet : une
valeur inferee n'entre jamais dans un verdict servi a un visiteur, et le plus
sur moyen de ne pas en servir est de ne pas en ecrire.

---

## Architecture

```
src/
  moteur/            MESURE. Ne connait ni fichier, ni DOM, ni seuil.
    distance.js        transformee de distance euclidienne exacte
    couleurs.js        Lab, ecart perceptuel, regroupement des teintes
    image.js           fond, masque d'encre, composantes, trous
    mesures.js         M1 a M10, et la fonction mesurer()
  vectorisation/     TRACE. Du pixel au fichier livrable.
    options.js         reglages du vectoriseur DEDUITS des mesures
    chemins.js         lecture des chemins SVG vers des segments absolus
    programme.js       forme intermediaire commune aux trois sorties
    geometrie.js       reperes, unites, emission des operateurs
    eps.js  pdf.js  svg.js
  adaptateurs/       DECODAGE. Tout ce qui touche au navigateur.
  app.js             assemblage de la page
harnais/             les trois harnais et le corpus synthetique
outils/              construction du wasm navigateur et du dossier publie
```

**La regle qui tient tout** : `mesurer()` prend
`{ largeur, hauteur, donnees }`, un RVBA nu, et rien d'autre. Le navigateur lui
donne des pixels sortis d'un canvas, le harnais lui donne des pixels lus dans un
fichier brut. C'est ce qui permet de tester le moteur sans navigateur, et de
verifier ensuite que les deux repondent la meme chose.

### Les deux jointures entre le moteur et le vectoriseur

Elles font l'unite du produit, et elles sont dans `vectorisation/options.js`.

1. **La palette.** Le vectoriseur recoit la palette que le diagnostic a
   annoncee. Si l'ecran dit neuf couleurs, l'EPS en porte neuf, exactement les
   memes. Sans cette jointure, le vectoriseur requantifie de son cote et le
   client repart avec un fichier qui contredit le diagnostic qu'il vient de
   lire.

2. **Le mode.** Le lissage en courbes est choisi selon le trait le plus fin
   mesure. Sous trois pixels de trait, on passe en contours droits : plus
   anguleux, mais juste.

### Le format livre

**Le livrable vectoriel n'est pas un SVG.** Decision metier ARBITREE ALEX le
17/08/2026 : la plupart des fabricants de goodies refusent le SVG. On livre un
**.eps** et un **.pdf**. Le SVG reste propose en troisieme, explicitement pour
le site web du client.

Pas de **.ai** natif : le format est proprietaire Adobe, et fabriquer un fichier
qui se declare .ai sans venir d'Illustrator serait une contrefacon de format.
L'EPS produit s'ouvre nativement dans Illustrator. **Point a verifier par Alex
aupres d'un marqueur** : est ce que l'extension .eps suffit en pratique, ou est
ce que certains exigent litteralement du .ai. Cela ne se devine pas.

Les trois fichiers sortent du **meme programme de trace**. Deux traducteurs
independants divergeraient, et la divergence se decouvrirait chez le marqueur,
sur la presse.

---

## Ce que les harnais ont attrape

Chaque ligne ci dessous est un bug qui serait parti en production, et qui n'a
ete vu que parce qu'un harnais existait. Elles sont listees ici parce qu'elles
disent mieux que tout ce que les harnais servent a faire.

| Trouve par | Le probleme | Pourquoi c'etait grave |
|---|---|---|
| Corpus synthetique | L'axe median d'un carre passe par ses coins : un aplat de 100 px etait annonce « trait de 3 px » | Tout logo a angle droit aurait ete declare non marquable |
| Corpus synthetique | Neuf aplats francs cote a cote etaient annonces « degrades a 20 pour cent » | La detection de degrade se declenchait sur des aplats parfaits |
| Corpus synthetique | Le cas JPEG rejouait en fait l'image d'origine | Le test central du diagnostic couleur ne testait rien |
| Ghostscript | Un sous chemin sans point de depart produisait un EPS inouvrable | Le SVG s'affichait tres bien : aucun apercu navigateur ne l'aurait montre |
| Chromium | VTracer 1.0.0-alpha.3 emet des chemins SVG que la grammaire interdit | Le SVG propose au telechargement etait casse, et l'apercu ampute |
| Chromium | Un canvas premultiplie l'alpha et arrondit : 1 couleur brute en lecture fichier, 2 en lecture navigateur | Les deux moities du produit ne disaient plus la meme chose du meme fichier |
| Rendu compare | `filterSpeckle` a 1 SUPPRIME un trait de 1 px, quelle que soit sa longueur | Un logo perdait un filet en silence, et personne avant la presse |
| Rendu compare | Sans quantification prealable, 3 330 pixels sales devenaient 2 331 formes dans l'EPS | Le fichier livre partait charge de bruit de compression transforme en geometrie |
| Corpus synthetique | Le crenelage JPEG faisait tomber le trait le plus fin a 1 px sur toute image compressee | Le diagnostic devenait inutile exactement sur les fichiers pour lesquels le produit existe |

---

## Le corpus synthetique, et pourquoi il n'est pas fait de vrais logos

Un vrai logo client ne dit pas quelle est la bonne reponse. Pour savoir si le
moteur a raison sur son trait le plus fin, il faudrait le mesurer a la main, au
pixel : on aurait alors mesure a la main ce que le moteur doit mesurer.

Une image qu'on dessine soi meme porte sa verite terrain par construction. Un
trait de trois pixels fait trois pixels. Un ecart de cinq en fait cinq. Un aplat
de 22 500 pixels en fait 22 500. Un halo de 3 330 pixels sur une boite de 90 000
fait 3,70 pour cent, exactement. Le harnais peut donc echouer, ce qui est la
seule qualite qui compte chez un harnais.

Les logos clients servent a autre chose, et ils serviront : ils testent la
robustesse et la plausibilite du verdict. C'est la recette, pas le test
unitaire, et les deux ne se remplacent pas.

---

## Parametres d'instrument, et pourquoi ce ne sont pas des seuils

Le code contient des constantes de reglage : ecart de fusion des teintes, part
minimale d'une composante, longueur minimale d'une crete. Elles sont calees sur
le corpus synthetique et **elles ne viennent d'aucune source du referentiel**.

Elles disent COMMENT ON MESURE. Elles ne disent jamais CE QUI EST MARQUABLE.
Aucune ne doit se retrouver dans `seuils.json`, et aucune valeur de
`seuils.json` ne doit se retrouver ici.

---

## Confidentialite

- Le corpus de logos clients ne va **jamais** dans le depot : `corpus/` est
  ignore des la premiere ligne de code, jamais envoye a un service tiers. Seuls
  des annotations et des empreintes peuvent etre versionnes.
- Aucune donnee commerciale IA Goodies n'entre ici, sous aucune forme.
- Pas de telemetrie : on enregistrera un jour les mesures et le verdict, jamais
  le fichier, jamais son nom, jamais une vignette.

---

## Dependances

- **@visioncortex/vtracer** 1.0.0-alpha.3, licence **MIT OR Apache-2.0**,
  verifiee a la source le 17/08. C'est la seule dependance du site. Le paquet
  npm est compile pour node ; `npm run vtracer:web` traduit sa couche de
  chargement vers le navigateur, sans toucher au WebAssembly, et s'arrete avec
  un message clair si le paquet amont change de forme.
- **potrace est exclu** : licence GPL, incompatible avec ce projet.
- Ghostscript et Playwright ne servent qu'aux harnais. Le site n'en depend pas.

---

## Ce qu'il faut pour tout faire tourner en local

| Outil | Sert a | Sans lui |
|---|---|---|
| Node 22 | tout, et c'est la version que Netlify utilise | le harnais de bout en bout est SAUTE : Playwright demande Node 20 au minimum |
| Python 3 | generer le corpus synthetique | plus de corpus, donc plus aucun harnais |
| Ghostscript | comparer les rendus EPS et PDF | le harnais de vectorisation tourne, mais ses controles de rendu sont SAUTES |

Sur macOS : `brew install node@22 ghostscript`.

**Un controle saute n'est pas un controle reussi**, et les harnais le disent en
toutes lettres plutot que de passer au vert en silence. C'est la seule raison
pour laquelle ils s'autorisent a sortir sans erreur quand un outil manque : un
harnais qui plante au lieu d'expliquer est un harnais qu'on cesse de lancer.

La production, elle, ne depend d'aucun de ces outils. Netlify construit en
Node 22 et ne lance aucun harnais : ils tournent en local et, plus tard, en
integration continue.

## Commandes

```
npm run verifier          les trois harnais, de bout en bout
npm run corpus:generer    regenere le corpus synthetique
npm run site:construire   wasm navigateur et dossier publie
npm run servir            sert public/ sur le port 8123
```

---

## Mise en ligne

Hebergement **Netlify**, source de verite **GitHub**, un seul depot, un seul
auteur. Rien d'autre : ni base de donnees, ni fonction serveur, ni service
tiers. Tout le travail du produit se fait dans le navigateur du visiteur.

```
construction : npm run site:construire
publication  : public/
node         : 22, epingle dans .nvmrc et netlify.toml
```

La construction produit 18 fichiers pour 820 ko, WebAssembly du vectoriseur
compris. Il n'y a pas de bundler : moins il y a de machinerie entre le code
ecrit et le code execute, moins il y a d'endroits ou une difference peut se
cacher entre ce que le harnais teste et ce que le visiteur recoit.

### Le site n'est pas indexable, et c'est une decision

`outils/entetes.mjs` porte une constante `INDEXABLE`, a **faux**. Elle bascule
d'un coup l'entete `X-Robots-Tag` et le `robots.txt`.

Le diagnostic par technique n'existe pas encore et aucune page de contenu n'est
ecrite. Publier maintenant en indexable ferait crawler un site dont la seule
page dit "pas encore disponible" : on brulerait la premiere impression du
domaine, alors que tout le trafic du projet doit venir du referencement. La
regle du projet est qu'aucune page ne nait vide ; elle vaut aussi pour le site
entier.

Meme raison pour la navigation : les trois rubriques sont arretees
(Techniques de marquage, Marquage par objet, Questions frequentes) mais ne sont
pas posees dans l'entete, parce qu'aucune des pages qu'elles designent
n'existe. Un lien qui ne mene nulle part est une page vide sous une autre
forme. Ce qui est deja la, c'est ce qui ne depend d'aucun contenu : le retour a
l'outil et la preuve de confidentialite.

### La politique de securite est une PREUVE, pas une case a cocher

Le produit promet que le logo du visiteur ne quitte jamais sa machine. Sur
parole, c'est invérifiable. La directive `connect-src 'self'` rend la promesse
**mecanique** : sous cette politique, la page ne PEUT PAS envoyer quoi que ce
soit vers un autre domaine, et n'importe qui peut le constater en lisant les
entetes de reponse. La confidentialite cesse d'etre un argument commercial pour
devenir un fait observable.

Les entetes sont ecrits **une seule fois**, dans `outils/entetes.mjs`. La
construction en genere `public/_headers`, et le harnais de bout en bout sert
exactement les memes a Chromium : le site est donc teste sous sa politique de
production. Une regle de securite qui n'est verifiee que par le serveur de
production n'est pas verifiee.

### Ce qu'il reste a faire pour ouvrir au public

1. Reserver le domaine et le brancher sur Netlify.
2. Passer `INDEXABLE` a vrai, une fois la couche verdict et les six guides en
   place.
3. Poser les trois rubriques dans l'entete, en meme temps que les pages.
4. Ecrire le `sitemap.xml`, tenu a jour a chaque page publiee et pas par
   campagne.
