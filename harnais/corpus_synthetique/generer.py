#!/usr/bin/env python3
"""
Generateur du corpus synthetique du moteur de mesure.

Pourquoi synthetique, et pas des logos clients. Un vrai logo ne dit pas quelle
est la bonne reponse : il faudrait mesurer son trait le plus fin a la main,
au pixel, pour savoir si le moteur a raison, et on aurait alors mesure a la
main ce que le moteur doit mesurer. Une image qu'on dessine soi meme, elle,
porte sa verite terrain par construction : un trait de trois pixels fait trois
pixels, un ecart de cinq en fait cinq, un aplat de 22 500 pixels en fait
22 500. Le harnais peut donc echouer, ce qui est la seule qualite qui compte
chez un harnais.

Les logos clients servent a autre chose, et ils serviront : ils testent la
robustesse et la plausibilite du verdict, c'est la recette, pas le test
unitaire. Les deux ne se remplacent pas.

Sortie, dans images/ :
  <nom>.png ou .jpg   apercu, pour l'oeil humain
  <nom>.rgba          les pixels bruts, RVBA, ce que lit le harnais
  verite_terrain.json le contrat que le moteur doit honorer

Le format .rgba n'est pas un caprice : il retire le decodage d'image du
perimetre du test. Le moteur ne decode pas, il mesure. Ce qui decode, ce sont
les adaptateurs, et ils ont leurs propres tests.
"""

import json
import os
import random
from PIL import Image, ImageDraw

ICI = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(ICI, "images")

BLANC = (255, 255, 255)
NOIR = (0, 0, 0)

# Neuf couleurs choisies pour etre separees d'au moins 25 en ecart Lab, donc
# tres au dela du seuil de fusion du moteur. Si deux d'entre elles etaient
# proches, le test ne testerait plus le comptage mais la chance.
NEUF_COULEURS = [
    (198, 32, 38),    # rouge
    (0, 104, 178),    # bleu
    (245, 196, 0),    # jaune
    (0, 133, 74),     # vert
    (120, 41, 139),   # violet
    (238, 118, 24),   # orange
    (0, 0, 0),        # noir
    (128, 128, 128),  # gris
    (0, 176, 196),    # cyan
]

cas = []


def enregistrer(nom, image, attendus, commentaire, format_apercu="PNG", vectorisation="attendue"):
    os.makedirs(IMAGES, exist_ok=True)
    rvba = image.convert("RGBA")
    extension = "png" if format_apercu == "PNG" else "jpg"
    apercu = f"{nom}.{extension}"
    if format_apercu == "PNG":
        rvba.save(os.path.join(IMAGES, apercu))
    else:
        # Le .rgba doit porter les pixels APRES compression, sinon le cas JPEG
        # ne teste rien du tout : il rejouerait l'original. Piege attrape par le
        # harnais, qui trouvait 9 couleurs brutes la ou il en attendait 2000.
        image.convert("RGB").save(os.path.join(IMAGES, apercu), quality=75)
        rvba = Image.open(os.path.join(IMAGES, apercu)).convert("RGBA")
    with open(os.path.join(IMAGES, f"{nom}.rgba"), "wb") as f:
        f.write(rvba.tobytes())
    cas.append({
        "nom": nom,
        "fichier": f"{nom}.rgba",
        "apercu": apercu,
        "largeur": rvba.width,
        "hauteur": rvba.height,
        "commentaire": commentaire,
        # "attendue" ou "refusee". Le harnais de vectorisation verifie les DEUX
        # sens : qu'un dessin passe, et qu'une photo soit refusee. Un garde-fou
        # dont on ne teste que le silence n'est pas teste.
        "vectorisation": vectorisation,
        "attendus": attendus,
    })


def egal(chemin, valeur):
    return {"chemin": chemin, "operateur": "egal", "valeur": valeur}


def proche(chemin, valeur, tolerance):
    return {"chemin": chemin, "operateur": "proche", "valeur": valeur, "tolerance": tolerance}


def entre(chemin, mini, maxi):
    return {"chemin": chemin, "operateur": "entre", "min": mini, "max": maxi}


def au_moins(chemin, valeur):
    return {"chemin": chemin, "operateur": "au_moins", "valeur": valeur}


def au_plus(chemin, valeur):
    return {"chemin": chemin, "operateur": "au_plus", "valeur": valeur}


def est_nul(chemin):
    return {"chemin": chemin, "operateur": "est_nul"}


# --------------------------------------------------------------- traits

def cas_trait(largeur_trait):
    img = Image.new("RGB", (300, 300), BLANC)
    d = ImageDraw.Draw(img)
    d.rectangle([60, 40, 60 + largeur_trait - 1, 260], fill=NOIR)
    d.rectangle([150, 150, 280, 150 + largeur_trait - 1], fill=NOIR)
    nom = f"trait_{largeur_trait:02d}px"
    impair = largeur_trait % 2 == 1
    if impair:
        attendus = [
            egal("m5TraitLePlusFin.encadrementPx.basse", largeur_trait),
            egal("m5TraitLePlusFin.encadrementPx.haute", largeur_trait + 1),
            egal("m2Couleurs.couleursReelles", 1),
            egal("m2Couleurs.couleursBrutes", 1),
        ]
        commentaire = (
            f"Deux barres de {largeur_trait} px, une verticale et une horizontale. "
            "Epaisseur impaire : la transformee de distance tombe juste, la borne "
            "basse doit valoir exactement la largeur dessinee."
        )
    else:
        attendus = [
            entre("m5TraitLePlusFin.encadrementPx.basse", largeur_trait - 1, largeur_trait),
            egal("m2Couleurs.couleursReelles", 1),
        ]
        commentaire = (
            f"Deux barres de {largeur_trait} px. Epaisseur PAIRE : la convention "
            "centre de pixel a centre de pixel ne peut pas trancher, le moteur "
            "sous estime d'au plus un pixel. Biais connu, prudent, et teste ici "
            "pour qu'il reste d'au plus un pixel."
        )
    enregistrer(nom, img, attendus, commentaire)


for w in (1, 3, 4, 5, 9):
    cas_trait(w)


# ------------------------------------------------------ dessin colle au bord

img = Image.new("RGB", (300, 300), BLANC)
d = ImageDraw.Draw(img)
d.rectangle([50, 0, 249, 199], fill=NOIR)
enregistrer(
    "bloc_au_bord", img,
    [
        est_nul("m6ContreFormes.ecartMinimalPx"),
        egal("m5TraitLePlusFin.encadrementPx.basse", 199),
    ],
    "Un aplat de 200 x 200 qui touche le haut de son propre fichier. Il n'y a "
    "AUCUN ecart dans ce dessin. Le hors fichier compte comme du fond pour "
    "mesurer un trait, et ne compte PAS comme de l'encre pour mesurer un "
    "ecart : compter l'inverse fabriquait un ecart fantome tout le long du "
    "bord. Cas trouve sur le symbole Vecto Facile lui meme.",
)


# --------------------------------------------------- trait avec crenelage

img = Image.new("RGB", (300, 300), BLANC)
d = ImageDraw.Draw(img)
d.rectangle([60, 40, 68, 260], fill=NOIR)          # barre de 9 px
pixels = img.load()
# Six trous d'un pixel, dont trois colles au bord de la barre. C'est ce que
# fabrique le crenelage d'un JPEG le long d'un contour : entre le trou et le
# bord, il ne reste qu'un pixel d'encre.
trous = [(61, 70), (61, 150), (61, 230), (64, 100), (66, 180), (63, 210)]
for x, y in trous:
    pixels[x, y] = BLANC
enregistrer(
    "trait_09px_crenele", img,
    [
        egal("m5TraitLePlusFin.encadrementPx.basse", 9),
        egal("proprete.trousBouches", len(trous)),
        egal("proprete.pixelsBouches", len(trous)),
    ],
    "Une barre de 9 px percee de six trous d'un pixel, dont trois a un pixel du "
    "bord. Sans bouchage des trous minuscules, le moteur trouvait un trait de "
    "1 px la ou le dessin en fait neuf, et tout JPEG de logo tombait dans ce "
    "piege. Le nombre de trous bouches est rendu, il n'est pas avale.",
)


# ----------------------------------------------------------------- ecart

img = Image.new("RGB", (300, 300), BLANC)
d = ImageDraw.Draw(img)
d.rectangle([50, 50, 99, 249], fill=NOIR)       # colonnes 50 a 99
d.rectangle([105, 50, 154, 249], fill=NOIR)     # colonnes 105 a 154
# Il reste exactement les colonnes 100 a 104, soit cinq pixels de blanc.
enregistrer(
    "ecart_05px", img,
    [
        egal("m6ContreFormes.ecartMinimalPx.basse", 5),
        egal("m6ContreFormes.nombreContreFormes", 0),
    ],
    "Deux blocs separes par exactement cinq colonnes de blanc. Teste aussi le "
    "test d'opposition : le blanc AUTOUR des blocs est bien plus etroit en "
    "certains points de la boite, mais il n'a pas d'encre des deux cotes, il ne "
    "doit donc pas etre pris pour un ecart.",
)


# ----------------------------------------------------------- contre forme

img = Image.new("RGB", (300, 300), BLANC)
d = ImageDraw.Draw(img)
d.rectangle([50, 50, 249, 249], fill=NOIR)
d.rectangle([146, 146, 154, 154], fill=BLANC)   # trou de 9 x 9
enregistrer(
    "contreforme_09px", img,
    [
        egal("m6ContreFormes.plusPetiteContreFormePx.basse", 9),
        egal("m6ContreFormes.nombreContreFormes", 1),
        egal("m8PlusGrandAplat.airePx", 200 * 200 - 81),
    ],
    "Un aplat perce d'un trou carre de 9 px de cote. La contre forme est fermee, "
    "elle ne se joint pas au fond exterieur. L'aplat vaut la surface du carre "
    "moins celle du trou, soit 39 919 pixels, verifiable a la main.",
)


# ------------------------------------------------------------- couleurs

def bandes_neuf_couleurs():
    img = Image.new("RGB", (380, 380), BLANC)
    d = ImageDraw.Draw(img)
    largeur_bande = 36
    for i, couleur in enumerate(NEUF_COULEURS):
        x0 = 40 + i * largeur_bande
        d.rectangle([x0, 40, x0 + largeur_bande - 1, 339], fill=couleur)
    return img


img = bandes_neuf_couleurs()
enregistrer(
    "couleurs_09_plat", img,
    [
        egal("m2Couleurs.couleursReelles", 9),
        egal("m2Couleurs.couleursBrutes", 9),
        egal("m10IndicesExport.partInterieurVariable", 0),
        # Le revers du controle de bruit : sur un dessin a aplats francs, la
        # part hors palette doit etre nulle. Les deux bornes se tiennent.
        au_plus("m2Couleurs.partHorsPalette", 0.02),
    ],
    "Neuf aplats francs, en PNG. Couleurs reelles et couleurs brutes doivent "
    "coincider : c'est le cas ou le fichier est deja propre.",
)

img = bandes_neuf_couleurs()
enregistrer(
    "couleurs_09_jpeg", img,
    [
        egal("m2Couleurs.couleursReelles", 9),
        # Borne posee par le RAISONNEMENT, pas recopiee de la sortie du
        # moteur : la compression doit fabriquer au moins cent fois plus de
        # teintes que le dessin n'en porte. Un attendu recopie d'un resultat
        # observe ne testerait plus rien, il enregistrerait le bug du jour.
        au_moins("m2Couleurs.couleursBrutes", 9 * 100),
        au_plus("m10IndicesExport.partInterieurVariable", 0.05),
        # Verite par construction : les neuf bandes forment un seul bloc
        # d'encre de 324 x 300 px, dont le trait est donc de 300 px. Le
        # crenelage du JPEG depose autour du bloc des amas de quatre a dix
        # pixels, epais d'un ou deux : sans seuil de salissure RELATIF a la
        # quantite d'encre, le moteur rendait "trait de 1 px" pour ce bloc.
        # Toute image compressee, c'est a dire la quasi totalite des logos
        # qu'un client depose, tombait dans ce piege.
        au_moins("m5TraitLePlusFin.encadrementPx.basse", 250),
    ],
    "Les MEMES neuf aplats, passes en JPEG qualite 75. Le fichier porte "
    "desormais plusieurs milliers de teintes, le client en a toujours dessine "
    "neuf. C'est le cas d'usage central du diagnostic couleur, et le seul test "
    "qui justifie le filtre de stabilite du moteur.",
    format_apercu="JPEG",
)


# ------------------------------------------------------------------ halo

# Boite d'encre exactement connue : un carre de 300 x 300 dans une marge
# blanche. Le denominateur du halo vaut donc 90 000 pixels, sans discussion.
img = Image.new("RGB", (340, 340), BLANC)
d = ImageDraw.Draw(img)
d.rectangle([20, 20, 319, 319], fill=NOIR)
alea = random.Random(20260818)
positions = alea.sample(range(300 * 300), 3330)
pixels = img.load()
for k, pos in enumerate(positions):
    x = 20 + pos % 300
    y = 20 + pos // 300
    # Teintes moyennes, largement etalees : chacune est trop rare pour devenir
    # une couleur reelle, et toutes sont loin du noir comme du blanc.
    pixels[x, y] = (60 + (k * 37) % 140, 60 + (k * 61) % 140, 60 + (k * 97) % 140)
enregistrer(
    "halo_0370", img,
    [
        proche("m3Halo.pourcentBoite", 3.70, 0.02),
        egal("m2Couleurs.couleursReelles", 1),
    ],
    "Un aplat noir de 300 x 300 dans lequel on a sali exactement 3 330 pixels, "
    "soit 3,70 pour cent de la boite. Chaque pixel sale porte une teinte "
    "differente, comme le fait un detourage a la main sauve en JPEG. Aucune de "
    "ces teintes ne doit devenir une couleur du logo.",
)


# --------------------------------------------------------------- capitales

img = Image.new("RGB", (400, 300), BLANC)
d = ImageDraw.Draw(img)
x = 40
ordre = [20, 20, 13, 20, 13, 20, 20, 13, 20]
for h in ordre:
    d.rectangle([x, 200 - h + 1, x + 11, 200], fill=NOIR)
    x += 32
enregistrer(
    "capitales_20px", img,
    [
        egal("m7HauteurDeCapitale.hauteurPx", 20),
        est_nul("m7HauteurDeCapitale.motif"),
    ],
    "Neuf blocs alignes sur une meme ligne de pied : six de 20 px, trois de "
    "13 px. La hauteur de capitale est 20. Les trois blocs courts jouent le "
    "role des bas de casse sans jambage, qui ne doivent pas tirer la mesure "
    "vers le bas.",
)

img = Image.new("RGB", (300, 300), BLANC)
d = ImageDraw.Draw(img)
d.ellipse([60, 60, 240, 240], fill=NOIR)
enregistrer(
    "sans_texte", img,
    [est_nul("m7HauteurDeCapitale.hauteurPx")],
    "Un disque, aucun texte. Le moteur doit rendre null et le dire, pas "
    "fabriquer une hauteur. Une hauteur de texte inventee deviendrait un feu "
    "rouge ou vert injustifie : c'est exactement ce que la doctrine interdit.",
)


# ------------------------------------------------------------- degrade

img = Image.new("RGB", (380, 380), BLANC)
pixels = img.load()
for x in range(40, 340):
    t = (x - 40) / 299
    couleur = (int(200 * (1 - t) + 10 * t), int(30 * (1 - t) + 40 * t), int(40 * (1 - t) + 190 * t))
    for y in range(40, 340):
        pixels[x, y] = couleur
enregistrer(
    "degrade_lineaire", img,
    [
        au_moins("m10IndicesExport.partInterieurVariable", 0.8),
    ],
    "Un degrade rouge vers bleu sur 300 px. Un degrade est LOCALEMENT plat : le "
    "filtre de stabilite ne le voit pas, et c'est pour ce cas precis que la "
    "mesure de variation interne regarde a huit pixels au lieu d'un.",
)


# --------------------------------------------------------- bruit de photo

img = Image.new("RGB", (300, 300), BLANC)
pixels = img.load()
alea_bruit = random.Random(180820261)
for y in range(40, 260):
    for x in range(40, 260):
        pixels[x, y] = (alea_bruit.randrange(0, 256),
                        alea_bruit.randrange(0, 256),
                        alea_bruit.randrange(0, 256))
enregistrer(
    "bruit_photographique", img,
    [
        au_moins("m2Couleurs.partHorsPalette", 0.5),
        au_moins("m2Couleurs.couleursBrutes", 10000),
    ],
    "Un carre de bruit pur : aucune teinte n'est majoritaire, donc presque aucun "
    "pixel ne rejoint une couleur retenue. C'est la signature d'une photo, et "
    "c'est ce qui distingue un fichier a vectoriser d'un fichier a refuser. Sans "
    "ce controle, une photo deposee par un visiteur produisait 457 260 formes en "
    "34 secondes et gelait son onglet.",
    vectorisation="refusee",
)


# ------------------------------------------------------------ salissures

img = Image.new("RGB", (400, 400), BLANC)
d = ImageDraw.Draw(img)
d.rectangle([150, 150, 249, 249], fill=NOIR)
pixels = img.load()
poses = 0
for gy in range(12):
    for gx in range(12):
        x = 8 + gx * 32
        y = 8 + gy * 32
        if 145 <= x <= 254 and 145 <= y <= 254:
            continue
        pixels[x, y] = NOIR
        poses += 1
assert poses == 135, poses
enregistrer(
    "salissures_135", img,
    [
        egal("proprete.composantesRetirees", 135),
        egal("proprete.pixelsRetires", 135),
        egal("m8PlusGrandAplat.airePx", 100 * 100),
        egal("m5TraitLePlusFin.encadrementPx.basse", 99),
    ],
    "Un carre propre de 100 x 100 et 135 pixels orphelins isoles. Sans "
    "nettoyage, le trait le plus fin du fichier vaudrait 1 px et tous les "
    "verdicts passeraient au rouge a cause de poussieres. Le nombre de "
    "poussieres est rendu a part : c'est un signal utile au client, pas un "
    "detail a cacher.",
)


# ----------------------------------------------------------- transparence

img = Image.new("RGBA", (300, 300), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.ellipse([60, 60, 240, 240], fill=(20, 40, 200, 255))
for r in range(6):
    d.ellipse([54 + r, 54 + r, 246 - r, 246 - r], outline=(20, 40, 200, 30 + r * 30), width=1)
enregistrer(
    "transparence_bord", img,
    [
        egal("fond.type", "transparent"),
        au_moins("m4Transparence.pixelsSemiTransparents", 100),
        egal("m2Couleurs.couleursReelles", 1),
    ],
    "Un disque bleu sur fond transparent, borde de six anneaux semi opaques. "
    "Le fond doit etre reconnu transparent et non blanc, et la semi "
    "transparence doit etre comptee : plusieurs techniques la refusent.",
)


# ------------------------------------------------------------------ sortie

sortie = {
    "genere_par": "harnais/corpus_synthetique/generer.py",
    "convention": (
        "Chaque valeur attendue est vraie PAR CONSTRUCTION de l'image, pas par "
        "observation d'une sortie du moteur. Un attendu qui aurait ete recopie "
        "d'un resultat de moteur ne testerait plus rien."
    ),
    "cas": cas,
}
with open(os.path.join(IMAGES, "verite_terrain.json"), "w", encoding="utf-8") as f:
    json.dump(sortie, f, ensure_ascii=False, indent=2)

print(f"{len(cas)} cas ecrits dans {IMAGES}")
