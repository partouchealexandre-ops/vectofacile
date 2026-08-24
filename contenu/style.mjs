/**
 * La feuille de style du site, en un seul endroit.
 *
 * Elle sert l'outil ET les pages de contenu. Le site en aura cinquante a
 * quatre vingts : une palette dupliquee est une palette qui derive, et
 * l'identite Vecto Facile a deja paye ce defaut sur ses PNG, avec trois navys
 * differents dans une meme livraison.
 *
 * La construction l'ecrit dans public/vecto.css, et l'outil comme les pages la
 * chargent depuis la. Aucune couleur n'est ecrite deux fois.
 */

export const STYLE = `/* FICHIER GENERE par outils/construire_pages.mjs depuis contenu/style.mjs.
   Ne pas modifier ici : il est reecrit a chaque construction. */

/* Poppins, SIL Open Font License 1.1, servie depuis notre propre domaine.
     Aucun appel a un service tiers : la politique de securite du site
     (connect-src 'self') l'interdit, et c'est voulu. Une police chargee chez
     Google serait une requete sortante a chaque visite, donc une faille dans la
     promesse "rien ne quitte votre machine" : la promesse doit valoir pour les
     ressources du site autant que pour le fichier du visiteur.
     Licence complete dans /polices/LICENCE_POPPINS.txt */
  @font-face {
    font-family: 'Poppins';
    src: url('/polices/poppins-400.woff2') format('woff2');
    font-weight: 400; font-style: normal; font-display: swap;
  }
  @font-face {
    font-family: 'Poppins';
    src: url('/polices/poppins-700.woff2') format('woff2');
    font-weight: 700; font-style: normal; font-display: swap;
  }


  /* Palette validee par Alex le 18/08. L'orange ne sert qu'a la conversion :
     un seul bouton orange par ecran, celui qui ramene a l'outil. */
  :root {
    --navy: #0A2D4D;
    --orange: #FF6A00;
    --encre: #0A2D4D;
    --papier: #ffffff;
    --gris: #7B8794;
    --trait: #E3E8ED;
    --accent: #0A2D4D;
    --gris-clair: #F6F8FA;
    --vert: #0E7C52;
    /* Poppins pour le logotype et les titres, arbitrage du master prompt §8.
       Le texte courant reste sur la pile systeme : elle est deja installee chez
       le visiteur, donc zero octet a telecharger et zero attente. */
    --pile-systeme: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--papier); color: var(--encre);
    font: 16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  /* ------------------------------------------------------------- l'entete
     Version validee par Alex le 18/08.
     Les rubriques de navigation (Techniques de marquage, Marquage par objet,
     Questions frequentes) sont arretees mais PAS encore posees ici : aucune
     des pages qu'elles designent n'existe. Un lien de navigation qui ne mene
     nulle part est une page vide sous une autre forme, et la regle du projet
     est qu'aucune page ne nait vide. Elles arrivent avec les premiers guides.
     Ce qui est deja la, en revanche, c'est ce qui ne depend d'aucun contenu :
     le retour a l'outil et la preuve de confidentialite. */
  .entete { display: flex; align-items: center; justify-content: space-between;
            gap: 18px; padding: 16px 0 18px; border-bottom: 1px solid var(--trait);
            margin-bottom: 34px; flex-wrap: wrap; }
  .lockup { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .lockup svg { width: 36px; height: 36px; display: block; }
  .lockup .mot { font-family: 'Poppins', var(--pile-systeme); font-weight: 700;
                 font-size: 18px; line-height: 1.05; color: var(--navy);
                 letter-spacing: -0.025em; }
  .entete .droite { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .cta-entete { font-size: 14px; font-weight: 600; padding: 9px 17px; border-radius: 8px;
                border: 1.5px solid var(--orange); background: var(--orange); color: #fff;
                text-decoration: none; white-space: nowrap; }
  .cta-secondaire { display: inline-block; padding: 10px 18px; border-radius: 8px;
                    border: 1.5px solid var(--trait); color: var(--encre); font-weight: 600;
                    font-size: 14.5px; text-decoration: none; white-space: nowrap; }
  .cta-secondaire:hover { border-color: var(--gris); }
  .mesures-detail summary { cursor: pointer; color: var(--gris); font-size: 14px;
                            padding: 8px 0; font-weight: 600; }
  #couleurs h2, #verdict h2 { margin-top: 26px; }
  /* ------------------------------------------------- la largeur du site

     Deux largeurs, et la distinction n'est pas cosmetique.

     LE CADRE fait 1120 px : entete, pied de page, zone de depot, tableau de
     mesures, cartes de verdict. Ce sont des objets qu'on BALAIE du regard,
     et les etaler evite l'effet de colonne perdue au milieu d'un grand ecran.

     LA COLONNE DE LECTURE fait 68 caracteres : tout ce qui se LIT ligne apres
     ligne. Au-dela, l'oeil rate le retour a la ligne suivante ; c'est la seule
     regle de mise en page qui repose sur une mesure et non sur un gout.

     La premiere version appliquait 860 px aux deux, ce qui etait trop etroit
     pour le cadre et a peu pres juste pour le texte. */
  main { max-width: 1120px; margin: 0 auto; padding: 48px 24px 96px; }
  h1 { font-family: 'Poppins', var(--pile-systeme); font-weight: 700; font-size: 34px;
       line-height: 1.2; margin: 0 0 12px; letter-spacing: -0.02em; }
  h2 { font-family: 'Poppins', var(--pile-systeme); font-weight: 700; font-size: 17px;
       margin: 32px 0 12px; letter-spacing: -0.01em; }
  .accroche { color: var(--gris); margin: 0 0 8px; max-width: 62ch; font-size: 17px; }

  /* Le bandeau d'accueil. En dessous de 1000 px, une colonne : le discours
     puis l'action. Au-dessus, deux colonnes de meme poids, parce que la zone
     de depot etiree sur toute la largeur d'un grand ecran devenait un vide
     avec un titre au milieu. */
  .bandeau { display: grid; gap: 28px; align-items: center; margin: 8px 0 20px; }
  .bandeau h1 { margin-top: 0; }
  @media (min-width: 1000px) {
    .bandeau { grid-template-columns: 1fr 1fr; gap: 56px; margin: 24px 0 28px; }
    .bandeau h1 { font-size: 40px; }
  }
  #depot {
    border: 2px dashed var(--trait); border-radius: 12px; padding: 56px 24px;
    text-align: center; cursor: pointer; transition: border-color .15s, background .15s;
  }
  #depot:hover, #depot.survol { border-color: var(--accent); background: var(--gris-clair); }
  #depot strong { display: block; font-size: 18px; margin-bottom: 6px; }
  /* §7.1 du brief du 20/08 : une fois l'analyse faite, la zone de depot montre
     le logo analyse plutot que de reclamer une action deja accomplie. */
  #depot.depot-analyse { border-style: solid; border-color: var(--trait);
    background: #fff; padding: 14px; }
  #depot .vignette { display: block; max-width: 150px; max-height: 150px;
    margin: 0 auto 10px; }
  #depot span { color: var(--gris); font-size: 14px; }
  input[type=file] { display: none; }
  .ligne { display: flex; align-items: baseline; gap: 12px; padding: 7px 0; border-bottom: 1px solid var(--trait); }
  .intitule { flex: 0 0 210px; color: var(--gris); font-size: 14px; }
  .valeur { font-weight: 600; font-variant-numeric: tabular-nums; }
  .precision { color: var(--gris); font-size: 13px; }
  .pastille { display: inline-block; width: 13px; height: 13px; border-radius: 3px; margin-left: 3px;
              vertical-align: -1px; border: 1px solid rgba(0,0,0,.15); }
  .secondaire { color: var(--gris); font-weight: 400; font-size: 13px; }
  .technique .situation { margin: 8px 0 10px; font-size: 14.5px; line-height: 1.55; }
  .technique .couleurs-technique { margin: 0 0 10px; font-size: 13.5px; line-height: 1.5;
    color: #5b6470; }
  /* Le bandeau du fichier, 20/08 : la premiere question est le fichier. */
  .etat-fichier.fichier-ok { border-left-color: #1d6b38; }
  .etat-fichier.fichier-refus { border-left-color: #9c3722; }
  /* Le ton partiel, ne du correctif du 20/08 : un fichier qui ouvre une moitie
     des techniques et pas l'autre n'est ni un feu vert ni un refus. */
  .etat-fichier.fichier-partiel { border-left-color: var(--orange); }
  .cta-fichier { display: inline-block; margin-top: 8px; font-size: 14px; font-weight: 600;
    padding: 9px 17px; border-radius: 8px; border: 1.5px solid var(--orange);
    background: var(--orange); color: #fff; text-decoration: none; }
  /* LA GRILLE DE PRODUITS, pivot du 20/08. Des cartes qui se lisent en une
     seconde : une silhouette, un nom, un verdict, une phrase. */
  .grille-produits { display: grid; gap: 14px; margin: 16px 0 18px;
    grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); }
  .produit { border: 1px solid #e3e6ea; border-radius: 10px; padding: 16px 18px;
    background: #fff; display: grid; grid-template-columns: 46px minmax(0, 1fr);
    gap: 16px; align-items: start; }
  .produit-corps { display: grid; gap: 8px; min-width: 0; align-content: start; }
  .produit-image { color: var(--navy); opacity: .7; }
  .produit .silhouette { width: 46px; height: 46px; }
  .produit h3 { margin: 2px 0 0; font-size: 15.5px; line-height: 1.35; }
  .produit-verdict { justify-self: start; display: inline-block; font-size: 11.5px; font-weight: 700;
    letter-spacing: .03em; text-transform: uppercase; padding: 2px 8px;
    border-radius: 20px; background: var(--gris-clair); }
  .produit-phrase { margin: 0; font-size: 14.5px; line-height: 1.5; }
  .produit-autres { margin: 0; font-size: 12.5px; color: var(--gris); }
  /* Le gain de la vectorisation sur un produit qui dit deja oui. Il remplace
     le peage supprime : ce n'est plus une condition, c'est une ouverture. */
  .produit-gain { margin: 0; font-size: 13.5px; line-height: 1.45; color: #8f3d08; }
  .appel-grille { margin: 14px 0 2px; }
  /* STRUCTURE C DU BRIEF DU 21/08 : le verdict d'abord, seul, en gros. Le test
     du couloir se joue sur ces trois regles. */
  .verdict-tete { margin: 4px 0 14px; }
  .verdict-tete p { margin: 0; font-size: 20px; line-height: 1.45; }
  .verdict-tete b { color: var(--navy); }
  .verdict-action { margin: 0 0 22px; }
  .verdict-action .note { margin: 8px 0 0; }
  .cta-large { display: block; text-align: center; padding: 14px 20px; border-radius: 10px;
    background: var(--orange); color: #fff; font-weight: 700; font-size: 16px;
    text-decoration: none; }
  .verdict-action-ok p { margin: 0; padding: 12px 16px; border-radius: 10px;
    background: #eef5f0; border-left: 3px solid #1d6b38; }
  /* LA GRILLE DE FEUX, lot 1 du 21/08. Elle doit se comprendre SANS LIRE, au
     seul jeu des couleurs : la pastille porte donc tout le poids visuel, et le
     reste de la ligne reste calme. */
  .grille-feux { display: grid; gap: 10px; margin: 4px 0 22px; }
  .feu { display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: 14px;
    align-items: start; padding: 14px 16px; border: 1px solid #e3e6ea;
    border-radius: 10px; background: #fff; }
  .feu-pastille { width: 16px; height: 16px; border-radius: 50%; margin-top: 3px; }
  .feu-vert .feu-pastille { background: #1d6b38; }
  .feu-orange .feu-pastille { background: var(--orange); }
  .feu-rouge .feu-pastille { background: #9c3722; }
  .feu-vert { border-left: 3px solid #1d6b38; }
  .feu-orange { border-left: 3px solid var(--orange); }
  .feu-rouge { border-left: 3px solid #9c3722; background: #fdfbfa; }
  .feu h3 { margin: 0 0 2px; font-size: 16px; }
  .feu-etat { font-size: 11.5px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .03em; margin-left: 8px; vertical-align: 1px; }
  .feu-vert .feu-etat { color: #12522a; }
  .feu-orange .feu-etat { color: #8f3d08; }
  .feu-rouge .feu-etat { color: #9c3722; }
  .feu-definition { margin: 0; font-size: 14px; color: #5b6470; line-height: 1.45; }
  .feu-raison { margin: 8px 0 0; font-size: 14.5px; line-height: 1.5; }
  .feu-produits { margin: 8px 0 0; font-size: 13px; color: var(--gris); }
  /* L'action de ligne est CONTEXTUELLE : elle se merite la ou l'obstacle est
     nomme. Elle reste secondaire, en contour : trois boutons pleins identiques
     sur un ecran ne sont plus un appel a l'action, c'est un sapin. Le seul
     bouton plein reste celui du bas, qui conclut. */
  .feu-action { display: inline-block; margin: 10px 0 0; padding: 8px 15px;
    border-radius: 8px; border: 1.5px solid var(--orange); background: #fff;
    color: #8f3d08; font-weight: 600; font-size: 14px; text-decoration: none; }
  .feu-action:hover { background: #fdf0e6; }
  .feu-sortie { margin: 8px 0 0; font-size: 14px; line-height: 1.5; }
  /* LE BRIEF DU GRAPHISTE, sous un rouge. Le site ecrit ce que le visiteur ne
     saurait pas demander, et le bouton le lui met dans le presse-papier. */
  .feu-brief { margin: 10px 0 0; padding: 12px 14px; border-radius: 8px;
    background: #f7f4f2; }
  .feu-brief p { margin: 0 0 8px; font-size: 14.5px; line-height: 1.5; }
  .feu-brief p:last-child { margin-bottom: 0; }
  .feu-demande { }
  /* La couleur est explicite : la regle generale des boutons pose du texte
     blanc sur fond navy, et un bouton clair qui en herite est invisible. */
  .feu-copier { margin-left: 8px; padding: 5px 11px; border-radius: 6px;
    border: 1px solid var(--trait); background: #fff; color: var(--encre);
    font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit;
    white-space: nowrap; }
  .feu-copier:hover { border-color: var(--gris); }
  /* Les points d'attention : ce qui change la lecture de TOUTES les lignes. */
  .points-attention { margin: 0 0 22px; }
  .points-attention h2 { font-size: 18px; margin: 0 0 8px; }
  .points-attention ul { margin: 0; padding-left: 20px; }
  .points-attention li { margin: 0 0 8px; font-size: 14.5px; line-height: 1.5; }
  /* Les trois groupes de C3. Melangees, les cartes sont un inventaire. */
  .groupe-titre { margin: 22px 0 10px; font-size: 15px; letter-spacing: .01em; }
  .groupe-passe { color: #12522a; }
  .groupe-vectoriel { color: #8f3d08; }
  .groupe-coince { color: #9c3722; }
  /* C4 : la suite, pour le visiteur le plus chaud du parcours. */
  .et-maintenant { margin-top: 26px; }
  .et-maintenant h2 { margin: 0 0 6px; font-size: 19px; }
  .suite-champs { display: grid; gap: 8px; margin: 14px 0 10px; max-width: 460px; }
  .suite-champs label { font-size: 13.5px; color: var(--gris); }
  .suite-champs input { padding: 10px 12px; border: 1px solid var(--trait);
    border-radius: 8px; font-size: 15px; font-family: inherit; }
  .suite-champs button { padding: 11px 18px; border-radius: 8px; border: 0;
    background: var(--navy); color: #fff; font-weight: 600; font-size: 15px;
    cursor: pointer; justify-self: start; font-family: inherit; }
  /* §7 du lot 1 : l'exemple, c'est la grille de feux et rien d'autre. Une
     demi-hauteur d'ecran, compris sans lire. */
  .exemple-feux { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    gap: 26px; align-items: center; margin: 12px 0 4px; }
  .exemple-feux img { width: 100%; height: auto; border: 1px solid var(--trait);
    border-radius: 10px; background: #fff; }
  .pastilles { list-style: none; margin: 0 0 10px; padding: 0; display: grid; gap: 5px; }
  .pastilles li { position: relative; padding-left: 22px; font-size: 14.5px; }
  .pastilles li::before { content: ''; position: absolute; left: 0; top: 5px;
    width: 12px; height: 12px; border-radius: 50%; }
  .pastille-vert::before { background: #1d6b38; }
  .pastille-orange::before { background: var(--orange); }
  .pastille-rouge::before { background: #9c3722; }
  .exemple-feux button { margin-top: 6px; padding: 11px 18px; border-radius: 8px;
    border: 1.5px solid var(--trait); background: #fff; color: var(--encre);
    font-weight: 600; font-size: 14.5px; cursor: pointer; font-family: inherit; }
  .exemple-feux button:hover { border-color: var(--gris); }
  @media (max-width: 760px) { .exemple-feux { grid-template-columns: 1fr; } }
  /* C5 a C7 : la preuve se replie, elle ne barre plus la route. */
  .volet { border-top: 1px solid var(--trait); margin-top: 18px; padding-top: 12px; }
  .volet > summary { cursor: pointer; font-weight: 600; font-size: 15.5px;
    color: var(--navy); list-style: none; }
  .volet > summary::-webkit-details-marker { display: none; }
  .volet > summary::before { content: '▸ '; color: var(--gris); }
  .volet[open] > summary::before { content: '▾ '; }
  .produit-oui { border-left: 3px solid #1d6b38; }
  .produit-oui .produit-verdict { color: #12522a; background: #e8f3ec; }
  .produit-si { border-left: 3px solid var(--orange); }
  .produit-si .produit-verdict { color: #8f3d08; background: #fdf0e6; }
  /* §5 du brief du 20/08 : « techniquement, oui » n'est pas un oui franc. */
  .produit-reserve { border-left-color: #b07a1a; }
  .produit-reserve .produit-verdict { color: #7a5310; background: #fbf3e2; }
  .produit-non { border-left: 3px solid #9c3722; background: #fcfaf9; }
  .produit-non .produit-verdict { color: #9c3722; background: #f8ebe8; }
  .produit-non .produit-image { opacity: .3; }
  /* La vue produit, 20/08 : le menu deroulant et la carte du produit choisi. */
  .choix-produit { margin: 14px 0 16px; display: flex; gap: 14px; flex-wrap: wrap;
    align-items: flex-end; }
  .choix-produit label { display: block; font-weight: 600; font-size: 14px;
    margin: 0 0 6px; }
  .choix-produit select { font: inherit; font-size: 15px; padding: 9px 12px;
    border: 1px solid #c9ced6; border-radius: 8px; background: #fff; min-width: 260px;
    max-width: 100%; }
  .produit-verdict { border: 1px solid #e3e6ea; border-radius: 10px;
    padding: 16px 18px; margin: 0 0 16px; background: #fff; }
  .produit-verdict h3 { margin: 0 0 10px; font-size: 17px; }
  .produit-techniques { list-style: none; padding: 0; margin: 0; display: grid;
    gap: 12px; }
  .produit-techniques li { font-size: 15px; line-height: 1.55; }
  .produit-techniques .couleurs-technique { display: block; font-size: 13px;
    color: #5b6470; margin-top: 2px; }
  .produit-techniques .note-produit { color: #5b6470; font-weight: 400; }
  .produit-techniques .ligne-ok { color: #1d6b38; font-weight: 600; }
  .produit-techniques .ligne-ko { color: #9c3722; font-weight: 600; }
  .par-technique { margin: 6px 0 14px; }
  .par-technique > summary { cursor: pointer; color: var(--gris); font-size: 14px;
    margin-bottom: 10px; }
  .sources-verdict h4 { margin: 14px 0 4px; font-size: 13.5px; }
  .minimums .note-calcul { margin: 8px 0 0; font-size: 12.5px; color: var(--gris);
    line-height: 1.5; }
  .minimums { margin: 0 0 10px; }
  .minimums summary { cursor: pointer; color: var(--gris); font-size: 13px; }
  .minimums table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12.5px; }
  .minimums th { text-align: left; font-weight: 600; color: var(--gris); font-size: 11.5px;
                 text-transform: uppercase; letter-spacing: .04em; padding: 4px 8px 4px 0;
                 border-bottom: 1px solid var(--trait); }
  .minimums td { padding: 5px 8px 5px 0; border-bottom: 1px solid var(--trait);
                 vertical-align: top; }
  .minimums td.mm { font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .minimums td.date, .minimums td.tient { color: var(--gris); white-space: nowrap; }
  .minimums tr.ne-tient-pas td.mm, .minimums tr.ne-tient-pas td.tient { color: #b23b32; }
  .minimums a { color: inherit; }
  #largeur label { display: inline-block; color: var(--gris); font-size: 14px; margin-right: 10px; }
  #largeur input { width: 110px; padding: 9px 12px; font: inherit; font-size: 16px;
                   border: 1px solid var(--trait); border-radius: 6px; background: #fff; }
  #largeur .unite { margin-left: 8px; color: var(--gris); font-size: 14px; }
  .conseil { border-left: 3px solid var(--trait); padding: 2px 0 2px 16px; margin: 16px 0; }
  .conseil h3 { margin: 0 0 6px; font-size: 16.5px; }
  .conseil .fait { margin: 0 0 6px; font-weight: 600; }
  .conseil .mecanique { margin: 0; color: var(--gris); font-size: 14.5px; }
  .palette { list-style: none; padding: 0; margin: 12px 0 0; }
  .teinte { display: flex; align-items: center; gap: 12px; padding: 6px 0;
            border-bottom: 1px solid var(--trait); }
  .teinte .pastille { width: 22px; height: 22px; margin-left: 0; flex: 0 0 22px; }
  .teinte .hex { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px;
                 font-weight: 600; letter-spacing: .02em; user-select: all; }
  .teinte .rvb { color: var(--gris); font-size: 13.5px; font-variant-numeric: tabular-nums;
                 user-select: all; }
  .teinte .part { margin-left: auto; color: var(--gris); font-size: 13px;
                  font-variant-numeric: tabular-nums; }
  @media (max-width: 520px) {
    .teinte { flex-wrap: wrap; gap: 8px 10px; }
    .teinte .part { margin-left: 0; flex-basis: 100%; }
  }
  .preuves { margin: 10px 0 0; }
  .preuves summary { cursor: pointer; color: var(--gris); font-size: 14px; padding: 6px 0; }
  .preuves > *:not(summary) { margin-left: 2px; }
  .note { color: var(--gris); font-size: 13.5px; margin: 10px 0; }
  .gris { background: var(--gris-clair); border-left: 3px solid var(--trait); padding: 14px 16px;
          color: var(--gris); font-size: 14px; border-radius: 0 6px 6px 0; }
  .techniques { list-style: none; padding: 0; margin: 14px 0 0; display: flex; flex-wrap: wrap; gap: 8px; }
  .techniques li { font-size: 13px; color: var(--gris); background: var(--gris-clair);
                   border: 1px solid var(--trait); border-radius: 999px; padding: 4px 12px; }
  #apercu { margin-top: 14px; border: 1px solid var(--trait); border-radius: 8px; padding: 12px;
            background: repeating-conic-gradient(#f3f4f6 0% 25%, #ffffff 0% 50%) 50% / 16px 16px; }
  #apercu svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
  #telechargements { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }

  /* L'attribut hidden ne resiste pas a une regle display, et le navigateur ne
     previent pas. En production, le 19/08 : les trois boutons de
     telechargement etaient AFFICHES avant tout depot de fichier, parce que
     « #telechargements { display: flex } » ecrasait le hidden du HTML. On
     proposait de telecharger un fichier qui n'existait pas.
     La regle ci-dessous met fin a la classe entiere de ce defaut, pour tous
     les blocs du site et pas seulement celui-la. */
  [hidden] { display: none !important; }

  /* Le contenu sous l'outil. Colonne de lecture, comme partout ailleurs. */
  .explication { margin-top: 56px; border-top: 1px solid var(--trait); padding-top: 8px; }
  .explication h2, .explication p, .explication ul, .explication ol { max-width: 68ch; }
  .explication h3 { font-family: 'Poppins', var(--pile-systeme); font-weight: 700;
                    font-size: 15px; margin: 20px 0 6px; max-width: 68ch; }
  .explication li { margin-bottom: 8px; }

  /* Les avertissements. Ils ont le poids de ce qu'ils disent : un fichier
     trop petit produira un marquage rate, ce n'est pas une note de bas de
     page. Le remede est en gras parce que c'est la seule ligne qui demande
     une action au visiteur. */
  .alerte { border-left: 4px solid var(--orange); background: #FFF7F0;
            border-radius: 0 8px 8px 0; padding: 14px 18px; margin: 22px 0;
            max-width: 68ch; }
  .alerte-titre { font-family: 'Poppins', var(--pile-systeme); font-weight: 700;
                  font-size: 16px; margin: 0 0 8px; }
  .alerte p { margin: 0 0 8px; font-size: 15px; line-height: 1.55; }
  .alerte p:last-child { margin-bottom: 0; }
  .alerte-remede { font-weight: 600; }
  .alerte-notable { border-left-color: #C9A227; background: #FFFBF0; }

  /* Un apercu vide n'est pas un apercu : c'est un cadre a damier au milieu de
     la page. Il ne se montre que quand il a quelque chose a montrer. */
  #apercu:empty { display: none; }
  button { font: inherit; font-size: 14px; font-weight: 600; padding: 10px 18px; border-radius: 8px;
           border: 1.5px solid var(--navy); background: var(--navy); color: #fff; cursor: pointer; }
  button.second { background: #fff; color: var(--encre); }
  button.tertiaire { background: #fff; color: var(--gris); border-color: var(--trait); font-weight: 500; }
  #travail { margin-top: 20px; color: var(--gris); font-size: 14px; }
  #erreur { margin-top: 20px; color: #b42318; background: #fef3f2; border: 1px solid #fecdca;
            padding: 12px 14px; border-radius: 8px; font-size: 14px; }
  footer { border-top: 1px solid var(--trait); margin-top: 56px; padding-top: 20px;
           color: var(--gris); font-size: 13px; }

/* ------------------------------------------------------ pages de contenu */

/* Meme doctrine sur les pages de contenu : le cadre est large, la colonne de
   lecture ne l'est pas. Les tableaux, eux, debordent volontairement de la
   colonne, parce qu'un tableau se balaie et ne se lit pas ligne a ligne. */
.page-contenu { max-width: 1120px; margin: 0 auto; padding: 0 24px 90px; }
.page-contenu > p,
.page-contenu > ul,
.page-contenu > ol,
.page-contenu > h2,
.page-contenu > h3 { max-width: 68ch; }
.page-contenu > h1 { max-width: 24ch; }
.page-contenu h1 { font-family: \'Poppins\', var(--pile-systeme); font-weight: 700;
  font-size: 34px; line-height: 1.18; margin: 26px 0 14px; letter-spacing: -0.02em; }
.page-contenu .chapo { font-size: 18px; color: var(--texte); margin: 0 0 30px; line-height: 1.6; }
.page-contenu h2 { font-family: \'Poppins\', var(--pile-systeme); font-weight: 700;
  font-size: 22px; margin: 40px 0 12px; letter-spacing: -0.015em; }
.page-contenu h3 { font-family: \'Poppins\', var(--pile-systeme); font-weight: 700;
  font-size: 17px; margin: 26px 0 8px; }
.page-contenu p { margin: 0 0 14px; }
.page-contenu ul { margin: 0 0 16px; padding-left: 22px; }
.page-contenu li { margin-bottom: 7px; }
.page-contenu a { color: var(--navy); font-weight: 500; }
.page-contenu code { background: var(--gris-clair); border: 1px solid var(--trait);
  border-radius: 5px; padding: 1px 6px; font-size: 13.5px; }
.page-contenu table { width: 100%; border-collapse: collapse; margin: 18px 0 24px; font-size: 14.5px; }
.page-contenu th, .page-contenu td { padding: 10px 12px; text-align: left;
  border-bottom: 1px solid var(--trait); vertical-align: top; }
.page-contenu th { background: var(--gris-clair); font-family: \'Poppins\', var(--pile-systeme);
  font-weight: 600; color: var(--navy); font-size: 13.5px; }
.fil { font-size: 13px; color: var(--gris); margin: 0 0 4px; }
.fil a { color: var(--gris); text-decoration: none; }
.fil a:hover { color: var(--navy); }
.encadre { background: var(--gris-clair); border: 1px solid var(--trait);
  border-left: 3px solid var(--navy); border-radius: 0 8px 8px 0; padding: 16px 18px; margin: 22px 0; }
.encadre p:last-child { margin-bottom: 0; }
.encadre b { font-family: \'Poppins\', var(--pile-systeme); font-weight: 600; color: var(--navy); }
.preuve { background: #F0F7F3; border-color: #C6E3D4; border-left-color: var(--vert); }
.preuve b { color: #0B5C3D; }
.appel { text-align: center; margin: 40px 0 10px; }
.appel a { display: inline-block; font-family: \'Poppins\', var(--pile-systeme); font-weight: 600;
  font-size: 15px; padding: 13px 26px; border-radius: 9px; background: var(--orange);
  color: #fff; text-decoration: none; }

/* ----------------------------------------------- navigation et pied commun */

.nav-site { display: flex; gap: 20px; font-size: 14px; font-weight: 500; flex-wrap: wrap; }
.nav-site a { color: var(--texte); text-decoration: none; white-space: nowrap; }
.nav-site a:hover, .nav-site a[aria-current] { color: var(--navy); }
.pied-site { border-top: 1px solid var(--trait); margin-top: 60px; padding: 30px 20px 40px;
  background: var(--gris-clair); }
.pied-site .colonnes { max-width: 1120px; margin: 0 auto; display: flex; gap: 40px; flex-wrap: wrap; }
.pied-site b { display: block; font-family: \'Poppins\', var(--pile-systeme); font-weight: 600;
  color: var(--navy); font-size: 13px; margin-bottom: 8px; }
.pied-site a { display: block; color: var(--gris); text-decoration: none; font-size: 13px; padding: 3px 0; }
.pied-site a:hover { color: var(--navy); }
.pied-site .mention { max-width: 1120px; margin: 26px auto 0; font-size: 12.5px; color: var(--gris); }

@media (max-width: 700px) {
  .page-contenu h1 { font-size: 27px; }
  .pied-site .colonnes { gap: 26px; }
}

/* Bloc « A lire aussi », genere en pied de chaque question. */
.voisines { list-style: none; padding: 0; margin: 14px 0 0; }
.voisines li { margin: 0 0 9px; }
.voisines a { font-weight: 600; }

/* ------------------------------------------------- la couche verdict

   Trois etats, TROIS TRAITEMENTS DE MEME POIDS. L'inconnu n'est ni grise ni
   relegue : c'est un etat a part entiere, et le plus frequent au lancement.
   Le griser reviendrait a s'excuser de ne pas savoir, alors que le dire est
   precisement ce qui distingue ce site. */
.techniques-verdict { display: grid; gap: 14px; margin: 18px 0 6px; }
@media (min-width: 900px) {
  /* Sept techniques en colonne unique font defiler pour rien. Deux colonnes
     des qu'il y a la place : on les COMPARE, on ne les lit pas a la suite. */
  .techniques-verdict { grid-template-columns: 1fr 1fr; }
  div.encadre.verdict-inconnu { grid-column: 1 / -1; }
}
.technique { border: 1px solid #e3e6ea; border-radius: 10px; padding: 14px 16px; }
.technique h3 { margin: 0 0 8px; font-size: 16px; display: flex;
  align-items: baseline; justify-content: space-between; gap: 12px; }
.technique .etiquette { font-size: 13px; font-weight: 600; white-space: nowrap; }
.technique .base { margin: 0 0 8px; font-size: 14px; color: #5b6470; }
.technique .criteres { list-style: none; padding: 0; margin: 0;
  font-size: 14px; line-height: 1.55; }
.technique .criteres li { padding-left: 16px; position: relative; }
.technique .criteres li::before { position: absolute; left: 0; }

.verdict-favorable { border-color: #bcd9c4; }
.verdict-favorable > h3 .etiquette { color: #1d6b38; }
li.verdict-favorable::before { content: "+"; color: #1d6b38; }

.verdict-defavorable { border-color: #e6c3bc; }
.verdict-defavorable > h3 .etiquette { color: #9c3722; }
li.verdict-defavorable::before { content: "-"; color: #9c3722; }

/* Ni rouge ni vert : une troisieme couleur, franche, qui ne suggere ni un
   probleme ni une permission. */
.verdict-inconnu { border-color: #cdd4dd; }
.verdict-inconnu > h3 .etiquette { color: #44536b; }
li.verdict-inconnu::before { content: "?"; color: #44536b; }
div.encadre.verdict-inconnu { background: #f4f6f9; }

#verdict .resume { font-size: 15px; margin: 10px 0 0; }
#verdict .note { font-size: 13px; color: #5b6470; margin-top: 14px; }
`;
