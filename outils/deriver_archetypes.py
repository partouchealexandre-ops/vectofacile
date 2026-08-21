# -*- coding: utf-8 -*-
"""Derive les ARCHETYPES famille x matiere depuis la base de travail.

Brief matieres et techniques du 20/08/2026, §2 et §3.

POURQUOI DES ARCHETYPES ET PLUS DES REFERENCES. « Sac shopping coton 140 g/m² »
est une reference de catalogue : elle laisse croire qu'on vend ce produit, et
elle n'enseigne rien de general. « Sac shopping en coton » enseigne, parce que
la contrainte de marquage est d'abord une affaire de MATIERE. La gravure laser
travaille le metal, le bois et le cuir, jamais le coton. La broderie n'existe
que sur textile. La sublimation exige du polyester.

Le produit reste la porte d'entree reconnaissable, celle qui porte le picto ;
la matiere est le discriminant reel ; la technique est la consequence.

REGLE DE CLOISON, inchangee : la base de travail reste hors du depot, seul ce
qui en est DERIVE y entre. Aucun fournisseur nomme, aucun code interne, aucune
URL. Le garde-fou est verifie sur le fichier ECRIT, pas sur la memoire.

CE QUE CE SCRIPT NE DEVINE PAS. Un nom de zone qu'il ne sait pas traduire en
position francaise est ECARTE, jamais approxime, et le compte des ecartes est
affiche. La source porte 1 306 noms de zone distincts : pretendre tous les
traduire serait mentir, et se taire sur ceux qu'on jette serait pire.
"""
import csv, json, os, re, sys
from collections import Counter, defaultdict
from statistics import median

ICI = os.path.dirname(os.path.abspath(__file__))
BASE = os.environ.get('BASE_TRAVAIL') or os.path.join(ICI, '..', '..', 'referentiel')
CIBLE = os.environ.get('CIBLE_ARCHETYPES') or os.path.join(
    ICI, '..', 'src', 'verdict', 'archetypes.json')
NOMS = os.path.join(BASE, 'produits_noms_familles.csv')
MARQUAGE = os.path.join(BASE, 'base_travail_A_marquage.csv')

if not os.path.exists(NOMS) or not os.path.exists(MARQUAGE):
    print(f"  base de travail introuvable dans {BASE}")
    print("  Elle reste hors du depot, c'est normal sur une machine qui ne l'a pas.")
    print("  Le fichier derive src/verdict/archetypes.json est versionne, il suffit au site.")
    sys.exit(0)

# --------------------------------------------------------------------- MATIERE
#
# La source ecrit la meme matiere de dix facons : « Acier Inoxydable » et
# « Acier inoxydable », « RPET », « rPET » et « PET recyclé », « ABS »,
# « Plastique ABS » et « Plastique recyclé ABS ». Sans normalisation, un
# archetype se scinde en cinq et aucun n'est assez peuple pour dire quoi que ce
# soit. L'ordre des regles compte : « polyester recyclé » avant « polyester ».
MATIERES = [
    (r'coton|canvas|toile de coton', 'coton'),
    (r'polyester recycl|rpet|pet recycl|\bgrs\b', 'polyester recyclé'),
    (r'polyester|nylon|polyamide', 'polyester'),
    (r'acier inox|inox|stainless', 'acier inoxydable'),
    (r'aluminium|\balu\b', 'aluminium'),
    (r'verre|sodocalcique|borosilicate', 'verre'),
    (r'bambou|bois|liège|liege', 'bois ou bambou'),
    (r'papier|carton|kraft', 'carton'),
    (r'c[ée]ramique|gr[èe]s|porcelaine', 'céramique'),
    (r'cuir|\bpu\b|similicuir', 'cuir ou simili'),
    (r'\babs\b|\bpp\b|\bps\b|\bpvc\b|\bpet\b|plastique|polypropyl', 'plastique'),
    (r'bo?ambou', 'bois ou bambou'),
    (r'm[ée]tal|zinc|laiton|acier', 'métal'),
    (r'silicone', 'silicone'),
]

def matiere_de(brut):
    t = (brut or '').strip().lower()
    if not t:
        return None
    for motif, nom in MATIERES:
        if re.search(motif, t):
            return nom
    return None

# --------------------------------------------------------------------- FAMILLE
#
# La famille est la PORTE D'ENTREE : ce que le visiteur reconnait sur un picto.
# Elle se lit sur la sous-categorie, la categorie et le titre, dans cet ordre,
# et un produit qui ne tombe dans aucune famille connue est ecarte. Mieux vaut
# huit familles sures que quarante douteuses.
# LA FAMILLE SE LIT SUR LA SOUS-CATEGORIE, JAMAIS SUR LA CATEGORIE.
#
# Premier essai : sous-categorie, puis categorie, puis titre. La categorie est
# trop large et elle a produit des archetypes absurdes, « Stylo en carton »
# (categorie « Bureau et écriture », mais ce sont des carnets) et « Gobelet en
# polyester recyclé » avec une poche avant et des bretelles (des sacs
# isothermes). Une categorie de catalogue est un rayon de magasin, pas une
# forme d'objet.
#
# Le titre reste en secours pour les fiches sans sous-categorie : c'est un nom
# commercial, il ne sert qu'a defaut.
FAMILLES = [
    (r'^t-shirts|polos|sweat|capuche|jackets|catégories de textiles', 'Textile', 't-shirt'),
    (r'casquettes|bonnets|chapeau', 'Casquette', 'casquette'),
    (r'carnets|blocs?-notes', 'Carnet', 'carnet'),
    (r'bouteilles', 'Bouteille', 'bouteille'),
    (r'mugs|tasses|gobelets', 'Gobelet', 'gobelet'),
    (r'sacs? à dos|sacoches ordinateur', 'Sac à dos', 'sac'),
    (r'sacs shopping', 'Sac shopping', 'sac'),
    (r'parapluies', 'Parapluie', 'parapluie'),
    (r'stylos|écriture', 'Stylo', 'stylo'),
    (r'powerbanks|batteries externes|banques d\'alimentation|chargeurs sans fil',
     'Powerbank', 'powerbank'),
]

def famille_de(ligne):
    for champ in ('sous_categorie', 'titre'):
        t = (ligne.get(champ) or '').strip().lower()
        if not t:
            continue
        for motif, nom, silhouette in FAMILLES:
            if re.search(motif, t):
                return nom, silhouette
    return None, None

# ----------------------------------------------------------------- PUBLIABLES
#
# LA LISTE EST CURATEE, ET C'EST VOLONTAIRE. 503 couples famille x matiere
# existent dans la source ; l'agregation en produit une vingtaine d'assez
# peuples pour tenir debout, et parmi eux quelques uns sont mal nommes plutot
# que faux : « Textile en plastique » designe des vestes impermeables, « Stylo
# en carton » des crayons ranges au rayon ecriture, « Parapluie en métal »
# la matiere du manche et non celle de la toile.
#
# Ces trois-la ne sont pas des erreurs de calcul, ce sont des limites de la
# donnee source. On ne les publie pas, et on ne les corrige pas en douce : le
# script dit ce qu'il a ecarte. Alex tranchera la liste definitive, c'est le
# §9.2 du brief.
#
# Le choix des matieres, lui, suit le §4 : montrer des cas qui ne repondent PAS
# la meme chose. Le coton qui accepte tout, l'inox qui impose la gravure, le
# verre, le carton, l'aluminium, le bois.
PUBLIABLES = {
    ('Textile', 'coton'),
    ('Sac shopping', 'coton'),
    ('Casquette', 'coton'),
    ('Carnet', 'carton'),
    ('Bouteille', 'acier inoxydable'),
    ('Bouteille', 'verre'),
    ('Gobelet', 'acier inoxydable'),
    ('Sac à dos', 'polyester recyclé'),
    ('Sac shopping', 'polyester recyclé'),
    ('Stylo', 'aluminium'),
    ('Stylo', 'bois ou bambou'),
    ('Powerbank', 'plastique'),
}

# ----------------------------------------------------------------------- ZONES
#
# Un libelle nomme une POSITION sur l'objet, jamais une technique. La regle a
# ete payee le 20/08 : avec la technique dans le libelle, la page produisait
# « pas sur la face avant, mais sur la face avant, en transfert ».
#
# Les doublons de position fusionnent : un sac a une face avant, pas trois,
# meme si la source y declare trois gabarits parce que trois procedes y ont des
# reglages differents.
POSITIONS = {
    'FRONT': 'la face avant', 'BACK': 'le dos',
    'SIDE 1': 'le côté', 'SIDE 2': 'l\'autre côté',
    'SIDE 3': 'le troisième côté', 'SIDE 4': 'le quatrième côté',
    'TOP': 'le dessus', 'BOTTOM': 'le dessous',
    'CHEST': 'la poitrine, à gauche',
    'ARM RIGHT': 'la manche droite', 'ARM LEFT': 'la manche gauche',
    'ROUNDSCREEN': 'tout le tour', '360': 'tout le tour',
    'LID': 'le couvercle', 'LID TOP': 'le dessus du couvercle',
    'FRONT POCKET': 'la poche avant', 'POCKET': 'la poche', 'POUCH': 'la poche',
    'POUCH SIDE 1': 'le côté de la poche', 'POUCH SIDE 2': 'l\'autre côté de la poche',
    'STRAP': 'la sangle',
    'SHOULDER STRAP RIGHT': 'la bretelle droite',
    'SHOULDER STRAP LEFT': 'la bretelle gauche',
    'BARREL RIGHT HANDED': 'le corps', 'BARREL LEFT HANDED': 'le corps, côté gaucher',
    'RIGHT HANDED': 'le corps', 'LEFT HANDED': 'le corps, côté gaucher',
    'CLIP RIGHT HANDED': 'le clip', 'CLIP LEFT HANDED': 'le clip, côté gaucher',
    'OPPOSITE THE CLIP': 'en face du clip',
    'FRONT UPPER': 'la face avant, en haut', 'FRONT LOWER': 'la face avant, en bas',
    'FRONT TOP': 'la face avant, en haut', 'FRONT BOTTOM': 'la face avant, en bas',
    'FRONT TRANSFER': 'la face avant', 'FRONT PD': 'la face avant',
    'BACK TRANSFER': 'le dos', 'BACK PD': 'le dos',
    'FRONT TD1': 'la face avant', 'BACK TD1': 'le dos',
    'FRONT PAD': 'une pastille sur la face avant',
    'FRONT EMBROIDERY': 'le devant', 'EMBROIDERY': 'la face avant',
    'SEGMENT 1': 'le premier panneau', 'SEGMENT 2': 'le deuxième panneau',
    'SEGMENT 3': 'le troisième panneau', 'SEGMENT 4': 'le quatrième panneau',
    'SEGMENT LEFT': 'le panneau gauche', 'SEGMENT RIGHT': 'le panneau droit',
    'RIGHT': 'le côté droit', 'LEFT': 'le côté gauche',
    'RIGHT SIDE': 'le côté droit', 'LEFT SIDE': 'le côté gauche',
    'INSIDE': 'l\'intérieur', 'SUBLIMATION': 'toute la surface',
    'FRONT ABOVE POCKET': 'la face avant, au-dessus de la poche',
}

# --------------------------------------------------------------------- LECTURE
noms = {}
for l in csv.DictReader(open(NOMS, encoding='utf-8'), delimiter='|'):
    famille, silhouette = famille_de(l)
    matiere = matiere_de(l.get('matiere'))
    if famille and matiere:
        noms[l['ref_produit']] = (famille, matiere, silhouette)

lignes = defaultdict(list)
ecartees = Counter()
retenues = 0
for l in csv.DictReader(open(MARQUAGE, encoding='utf-8')):
    identite = noms.get(l['code'])
    if not identite:
        continue
    zone = re.sub(r'\s+', ' ', l['zone']).strip().upper()
    if zone not in POSITIONS:
        ecartees[zone] += 1
        continue
    try:
        largeur, hauteur = float(l['largeur_mm']), float(l['hauteur_mm'])
    except (ValueError, TypeError):
        continue
    if largeur <= 0 or hauteur <= 0:
        continue
    retenues += 1
    lignes[identite[:2]].append({
        'code': l['code'], 'position': POSITIONS[zone],
        'largeur': largeur, 'hauteur': hauteur,
        'technique': re.sub(r'\s+', ' ', l['technique']).strip(),
        'couleurs_max': str(l['couleurs_max']).strip(),
        'par_defaut': str(l.get('par_defaut', '')).strip() in ('1', 'True', 'true'),
        'silhouette': identite[2],
    })

# ------------------------------------------------------------------ AGREGATION
#
# La taille d'une zone d'archetype est une MEDIANE, jamais une moyenne : une
# seule reference geante deplacerait la moyenne de tout le groupe. Le plafond de
# couleurs d'une technique est sa valeur DOMINANTE, jamais la plus genereuse :
# annoncer huit couleurs parce qu'une reference sur cent les accepte ferait
# refuser le fichier chez les quatre-vingt-dix-neuf autres.
def dominant(valeurs):
    return Counter(valeurs).most_common(1)[0][0]

archetypes = []
for (famille, matiere), obs in lignes.items():
    produits = len({o['code'] for o in obs})
    par_position = defaultdict(list)
    for o in obs:
        par_position[o['position']].append(o)
    zones = []
    for position, groupe in par_position.items():
        # Une position vue sur moins d'un dixieme des produits du groupe n'est
        # pas une position de cet archetype, c'est une particularite d'une
        # reference. On ne l'affiche pas.
        if len({o['code'] for o in groupe}) < max(2, produits * 0.1):
            continue
        par_technique = defaultdict(list)
        for o in groupe:
            par_technique[o['technique']].append(o)
        techniques = []
        for nom, sous in par_technique.items():
            cmax = dominant([s['couleurs_max'] for s in sous])
            techniques.append({
                'technique': nom,
                # 0 dans la source = quadrichromie, sans limite de separation.
                # « 0 couleur » a l'ecran serait une bourde ; la traduction se
                # fait ici, une fois pour toutes.
                'couleursMax': None if cmax in ('0', '', 'None') else int(float(cmax)),
                'parDefaut': sum(1 for s in sous if s['par_defaut']) * 2 >= len(sous),
                'observations': len(sous),
            })
        techniques.sort(key=lambda t: -t['observations'])
        zones.append({
            'libelle': position,
            'largeurMm': round(median([o['largeur'] for o in groupe])),
            'hauteurMm': round(median([o['hauteur'] for o in groupe])),
            'techniques': techniques,
            'observations': len(groupe),
        })
    # UN ARCHETYPE PEU PEUPLE N'ENSEIGNE RIEN. Sous huit produits, la mediane
    # n'est plus une mediane, c'est une anecdote : on ne le publie pas.
    if not zones or produits < 8:
        continue
    zones.sort(key=lambda z: -z['observations'])
    archetypes.append({
        'famille': famille,
        'matiere': matiere,
        'libelle': f'{famille} en {matiere}',
        'silhouette': obs[0]['silhouette'],
        'produits': produits,
        'observations': len(obs),
        'zones': zones,
    })

archetypes.sort(key=lambda a: -a['observations'])
ecartes = [a for a in archetypes if (a['famille'], a['matiere']) not in PUBLIABLES]
archetypes = [a for a in archetypes if (a['famille'], a['matiere']) in PUBLIABLES]

sortie = {
    'version': 1,
    'genere_le': '21/08/2026',
    'doctrine': [
        "DERIVE de la base de travail fournisseurs, instantane du 05/08/2026. La base brute reste hors du depot ; ce fichier n'en garde que ce qui sert a l'ecran.",
        "Aucun code interne, aucune URL de gabarit, aucun nom de grossiste : ces trois choses identifieraient la source commerciale et n'ont rien a faire dans un depot public.",
        "Un archetype est un couple FAMILLE x MATIERE, pas une reference de catalogue. Le produit est la porte d'entree, la matiere est le discriminant reel, la technique est la consequence.",
        "Les tailles de zone sont des MEDIANES sur le groupe, pas des moyennes : une reference geante deplacerait une moyenne. Un plafond de couleurs est la valeur DOMINANTE, pas la plus genereuse.",
        "couleurs_max vaut null pour la quadrichromie, jamais 0 : la source code la quadri par 0, la traduction se fait a la derivation, une fois.",
        "Les libelles de zone nomment une POSITION, jamais une technique, et les doublons de position fusionnent. Un nom de zone non traduit est ECARTE, jamais approxime.",
        "Derive de la source A seule : c'est la seule des trois qui declare la technique proposee PAR DEFAUT sur chaque zone, et cette declaration est ce qui evite de recommander la sangle d'un gobelet plutot que sa face avant.",
        "Etat : AGREGAT IAG, contexte objet. Ces valeurs decrivent ce qu'un grossiste propose reellement ; elles ne sont pas un seuil de marquage general et ne se citent pas comme tel.",
    ],
    'archetypes': archetypes,
}

os.makedirs(os.path.dirname(CIBLE), exist_ok=True)
with open(CIBLE, 'w', encoding='utf-8') as f:
    json.dump(sortie, f, ensure_ascii=False, indent=1)
    f.write('\n')

# Garde-fou de cloison, verifie sur le fichier ECRIT. Il porte sur les DONNEES
# servies : la doctrine, elle, a le droit de nommer ce qu'elle interdit, sinon
# le garde-fou attrape sa propre phrase.
brut = json.dumps(sortie['archetypes'], ensure_ascii=False)
for interdit in ['midocean', 'pf concept', 'xd connects', 'MO2', 'cdn.', 'http',
                 'code_interne', 'gabarit', 'print-template', 'printposition']:
    if interdit.lower() in brut.lower():
        raise SystemExit(f'FUITE : « {interdit} » dans les donnees derivees')

total = retenues + sum(ecartees.values())
print(f"{len(archetypes)} archetypes, "
      f"{sum(len(a['zones']) for a in archetypes)} zones, ecrits dans {CIBLE}")
print(f"{retenues} positions retenues sur {total} lues, "
      f"{sum(ecartees.values())} ecartees faute de libelle francais")
print('les dix noms de zone ecartes les plus frequents : '
      + ', '.join(f'{z} ({n})' for z, n in ecartees.most_common(10)))
print('archetypes assez peuples mais NON publies, a trancher par Alex : '
      + ', '.join(f"{a['libelle']} ({a['produits']} produits)" for a in ecartes))
print('aucune trace fournisseur dans le fichier derive')
