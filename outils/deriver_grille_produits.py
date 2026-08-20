# -*- coding: utf-8 -*-
"""Derive la grille produits PUBLIABLE depuis la base de travail.

Regle de cloison : la base de travail reste hors du depot, seul ce qui en est
DERIVE y entre. Ce script retire donc le code interne, les URL de gabarit qui
nomment le grossiste, et traduit chaque zone en francais d'usage.
"""
import json, re

# La base de travail vit HORS du depot, dans referentiel/, a cote de site/.
# Ce script ne tourne donc que sur une machine qui l'a ; le fichier derive, lui,
# est versionne, et c'est lui que le site lit.
import os, sys
ICI = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.environ.get('GRILLE_SOURCE') or os.path.join(
    ICI, '..', '..', 'referentiel', 'produits_grille_v1.json')
CIBLE = os.path.join(ICI, '..', 'src', 'verdict', 'produits_grille.json')
if not os.path.exists(SOURCE):
    print(f"  base de travail introuvable : {SOURCE}")
    print("  Elle reste hors du depot, c'est normal sur une machine qui ne l'a pas.")
    print("  Le fichier derive src/verdict/produits_grille.json est versionne, il suffit au site.")
    sys.exit(0)

# Libelles de zone CURATES, produit par produit. Pas de table automatique : huit
# produits se relisent a la main, et un libelle faux coute plus cher qu'un
# libelle ecrit une fois.
#
# REGLE : un libelle nomme une POSITION sur l'objet, jamais une technique. La
# source enregistre parfois deux fois le meme endroit parce que deux procedes y
# ont des gabarits differents ; ces doublons portent alors le meme libelle et se
# fondent a l'affichage, ce qui est la verite pour le visiteur : un sac a une
# face avant, pas trois. Premier ecrit de cette table : la technique etait dans
# le libelle, et la page a produit « pas sur la face avant, mais sur la face
# avant, en transfert ». Un libelle qui contient un procede fabrique ce genre de
# phrase.
LIBELLES = {
 ('Mug', 'ROUNDSCREEN'): 'tout le tour du gobelet',
 ('Mug', 'STRAP'): 'la sangle',
 ('Mug', 'FRONT UPPER'): 'la face avant, en haut',
 ('Mug', 'FRONT LOWER'): 'la face avant, en bas',
 ('Gourde', '360'): 'tout le tour de la bouteille',
 ('Gourde', 'ROUNDSCREEN'): 'tout le tour de la bouteille',
 ('Gourde', 'FRONT'): 'la face avant',
 ('Gourde', 'LID TOP'): 'le dessus du bouchon',
 ('Gourde', 'SUBLIMATION'): 'toute la surface',
 ('Stylo', 'CLIP RIGHT HANDED'): 'le clip',
 ('Stylo', 'CLIP LEFT HANDED'): 'le clip, côté gaucher',
 ('Stylo', 'BARREL RIGHT HANDED'): 'le corps',
 ('Stylo', 'BARREL LEFT HANDED'): 'le corps, côté gaucher',
 ('Stylo', 'OPPOSITE THE CLIP'): 'en face du clip',
 ('Tote bag', 'FRONT'): 'la face avant',
 ('Tote bag', 'BACK'): 'le dos',
 ('Tote bag', 'EMBROIDERY'): 'la face avant',
 ('Tote bag', 'FRONT TD1'): 'la face avant',
 ('Tote bag', 'BACK TD1'): 'le dos',
 ('T-shirt', 'FRONT'): 'la face avant',
 ('T-shirt', 'BACK'): 'le dos',
 ('T-shirt', 'CHEST'): 'la poitrine, à gauche',
 ('T-shirt', 'ARM RIGHT'): 'la manche droite',
 ('T-shirt', 'ARM LEFT'): 'la manche gauche',
 ('Carnet', 'FRONT'): 'la couverture',
 ('Carnet', 'FRONT PD'): 'la couverture',
 ('Carnet', 'BACK'): 'la quatrième de couverture',
 ('Carnet', 'BACK PD'): 'la quatrième de couverture',
 ('Carnet', 'FRONT PAD'): 'une pastille sur la couverture',
 ('Casquette', 'FRONT EMBROIDERY'): 'le devant',
 ('Casquette', 'BACK'): 'le dos',
 ('Casquette', 'SEGMENT LEFT'): 'le panneau gauche',
 ('Casquette', 'SEGMENT RIGHT'): 'le panneau droit',
 ('Casquette', 'BACK TRANSFER'): 'le dos',
 ('Powerbank', 'TOP PD'): 'la face avant',
 ('Powerbank', 'BOTTOM PD'): 'la face arrière',
 ('Powerbank', 'TOP'): 'la face avant',
 ('Powerbank', 'BOTTOM'): 'la face arrière',
}

# Une silhouette par famille, dessinee en SVG aux couleurs de la charte. Elle
# remplace la photo catalogue tant que la question des droits n'est pas
# tranchee par Alex : le brief du 20/08 propose lui meme cette parade.
SILHOUETTE = {
 'Mug': 'gobelet', 'Gourde': 'bouteille', 'Stylo': 'stylo', 'Tote bag': 'sac',
 'T-shirt': 't-shirt', 'Carnet': 'carnet', 'Casquette': 'casquette',
 'Powerbank': 'powerbank',
}

source = json.load(open(SOURCE, encoding='utf-8'))
sortie = {
  'version': 1,
  'genere_le': '20/08/2026',
  'doctrine': [
    "DERIVE de la base de travail fournisseurs, instantane du 05/08/2026. La base brute reste hors du depot ; ce fichier n'en garde que ce qui sert a l'ecran.",
    "Aucun code interne, aucune URL de gabarit, aucun nom de grossiste : ces trois choses identifieraient la source commerciale et n'ont rien a faire dans un depot public.",
    "couleurs_max vaut null pour la quadrichromie, jamais 0 : « 0 couleur » a l'ecran serait une bourde. La source code la quadri par 0, la traduction se fait ici, une fois.",
    "Les libelles de zone sont ecrits en francais d'usage, produit par produit. Le nom d'origine de la zone ne sort jamais a l'ecran.",
    "Etat : AGREGAT IAG, contexte objet. Ces valeurs decrivent ce qu'un grossiste propose reellement sur ces produits ; elles ne sont pas un seuil de marquage general et ne se citent pas comme tel.",
  ],
  'produits': [],
}

for p in source:
    fam = p['famille']
    zones = []
    for z in p['zones']:
        cle = (fam, z['zone'])
        if cle not in LIBELLES:
            raise SystemExit(f'zone sans libelle curate : {cle}')
        techniques = []
        for t in z['techniques']:
            cmax = t['couleurs_max']
            techniques.append({
              'technique': re.sub(r'\s+', ' ', t['technique']).strip(),
              # 0 dans la source = quadrichromie, sans limite de separation.
              'couleursMax': None if str(cmax).strip() == '0' else int(cmax),
              'parDefaut': bool(t.get('par_defaut')),
            })
        zones.append({
          'libelle': LIBELLES[cle],
          'largeurMm': round(float(z['largeur_mm'])),
          'hauteurMm': round(float(z['hauteur_mm'])),
          'techniques': techniques,
        })
    sortie['produits'].append({
      'famille': fam,
      'libelle': p['libelle'],
      'silhouette': SILHOUETTE[fam],
      'zones': zones,
    })

with open(CIBLE, 'w', encoding='utf-8') as f:
    json.dump(sortie, f, ensure_ascii=False, indent=1)
    f.write('\n')

# Garde-fou de cloison, verifie sur le fichier ECRIT et pas sur la memoire.
# Il porte sur les DONNEES servies : la doctrine, elle, a le droit de nommer ce
# qu'elle interdit, sinon le garde-fou attrape sa propre phrase. Premiere
# version de ce controle : elle est tombee sur le mot « gabarit » de sa propre
# doctrine, ce qui est exactement le faux positif qu'un garde-fou doit eviter.
brut = json.dumps(sortie['produits'], ensure_ascii=False)
for interdit in ['midocean', 'MO2', 'cdn.', 'http', 'code_interne', 'gabarit',
                 'print-template', 'printposition']:
    if interdit.lower() in brut.lower():
        raise SystemExit(f'FUITE : « {interdit} » dans les donnees derivees')
print(f"{len(sortie['produits'])} produits, "
      f"{sum(len(x['zones']) for x in sortie['produits'])} zones ecrits dans {CIBLE}")
print('aucune trace fournisseur dans le fichier derive')
