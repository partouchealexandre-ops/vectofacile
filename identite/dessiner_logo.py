#!/usr/bin/env python3
"""
Dessin VECTORIEL du symbole Vecto Facile, en courbes exactes.

Pourquoi ce fichier existe. L'analyse de la charte v2 pose le point bloquant :
il n'existe aucun vectoriel du logo. Tous les fichiers livres sont des PNG
produits par un generateur d'images, 13 290 couleurs brutes pour un dessin qui
en contient deux, sans couche alpha, et surtout redessines a chaque fois : trois
navys et trois oranges differents dans une meme livraison. Un generateur
d'images ne produit pas de courbes, il produit des pixels : il n'y a rien a
reclamer a personne, il faut redessiner une fois, en geometrie.

Les proportions ci dessous ne sont pas estimees a l'oeil : elles sont MESUREES
sur symbole_v2.png, par la crete de sa transformee de distance pour les
epaisseurs, par la presence de navy angle par angle pour les arcs, par
regression orthogonale sur la crete pour l'axe de la coche.

Deux faits sont ressortis de ces mesures, et ils simplifient tout le dessin :

  1. L'anneau et la coche ont LA MEME EPAISSEUR, 13,5 pour cent du diametre.
     Ce n'est donc pas deux epaisseurs a tenir, c'en est une.
     Au passage : l'analyse annoncait 18,7 pour cent pour la coche. C'est la
     diagonale du trait, pas le trait.

  2. Les deux branches de la coche sont a EXACTEMENT 45 degres, et l'anneau ne
     s'ouvre pas sur un angle, il s'ecarte de la coche d'un BLANC CONSTANT.
     Les deux coupes du haut sont donc paralleles a la coche, pas radiales.
     C'est ce qui donne au dessin son blanc regulier, et c'est ce qui rend le
     blanc pilotable par un seul nombre.

Ce blanc constant est la grandeur qui decide de la tenue en marquage : c'est lui
qui se bouchera le premier, en broderie comme en tampographie. Le mettre en
parametre, c'est pouvoir repondre a la question "et a 12 mm, ca tient ?" en
changeant un chiffre au lieu de redessiner.

Les contours sortent en APLATS, jamais en traits : un trait a une epaisseur qui
depend de l'echelle, un aplat non, et la chaine EPS et PDF du projet ne lit que
des remplissages, par choix. Un fichier de marquage n'a pas de contour.
"""

import json
import math
import os

ICI = os.path.dirname(os.path.abspath(__file__))

# ------------------------------------------------- proportions, en % du diametre

DIAMETRE = 100.0
CX = CY = 50.0
R_EXT = DIAMETRE / 2

EPAISSEUR = 13.5          # anneau ET coche, mesure sur la reference
R_INT = R_EXT - EPAISSEUR
DEMI = EPAISSEUR / 2

BLANC = 7.3               # ecart constant entre la coche et l'anneau
BLANC_BAS = 7.0           # ouverture entre le grand arc et le fragment

# Axe de la coche, releve sur la reference : deux branches a 45 degres exacts.
P1 = (27.4, 45.4)
P2 = (48.0, 66.0)
P3 = (91.0, 23.0)

# Fins d'arc en bas, en degres, repere ecran, 0 a l'est et positif vers le bas.
FIN_GRAND_ARC = 45.5
FIN_FRAGMENT = 34.5

MARGE = 0.08 * DIAMETRE   # zone de protection, definie sur la boite englobante

NAVY = "#0A2D4D"
ORANGE = "#FF6A00"


def n(v):
    return f"{round(v, 3):g}"


def raccord_arrondi(depuis, vers, centre, rayon, balayage):
    """Le raccord de la pointe, en cubiques lui aussi. Meme raison que arc()."""
    a = math.atan2(depuis[1] - centre[1], depuis[0] - centre[0])
    b = math.atan2(vers[1] - centre[1], vers[0] - centre[0])
    if balayage:
        while b < a:
            b += 2 * math.pi
    else:
        while b > a:
            b -= 2 * math.pi
    total = b - a
    morceaux = max(1, math.ceil(abs(total) / (math.pi / 2)))
    pas = total / morceaux
    k = 4 / 3 * math.tan(pas / 4)
    sortie = []
    for i in range(morceaux):
        t0 = a + i * pas
        t1 = t0 + pas
        p0 = (centre[0] + rayon * math.cos(t0), centre[1] + rayon * math.sin(t0))
        p3 = (centre[0] + rayon * math.cos(t1), centre[1] + rayon * math.sin(t1))
        p1 = (p0[0] - k * rayon * math.sin(t0), p0[1] + k * rayon * math.cos(t0))
        p2 = (p3[0] + k * rayon * math.sin(t1), p3[1] - k * rayon * math.cos(t1))
        sortie.append(f"C{n(p1[0])},{n(p1[1])} {n(p2[0])},{n(p2[1])} {n(p3[0])},{n(p3[1])}")
    return "".join(sortie)


def unitaire(a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    d = math.hypot(dx, dy)
    return (dx / d, dy / d)


def point_angle(angle, rayon):
    a = math.radians(angle)
    return (CX + rayon * math.cos(a), CY + rayon * math.sin(a))


def angle_de(p):
    return math.degrees(math.atan2(p[1] - CY, p[0] - CX))


def croisements_droite_cercle(origine, direction, rayon):
    """Les deux intersections d'une droite avec le cercle centre en (CX, CY)."""
    ox, oy = origine[0] - CX, origine[1] - CY
    b = 2 * (ox * direction[0] + oy * direction[1])
    c = ox * ox + oy * oy - rayon * rayon
    delta = b * b - 4 * c
    if delta < 0:
        return []
    racine = math.sqrt(delta)
    return sorted(
        [(origine[0] + t * direction[0], origine[1] + t * direction[1])
         for t in ((-b - racine) / 2, (-b + racine) / 2)],
        key=lambda p: angle_de(p),
    )


d1 = unitaire(P1, P2)
d2 = unitaire(P2, P3)
n1 = (-d1[1], d1[0])
n2 = (-d2[1], d2[0])

# Les deux droites du couloir : les bords de la coche ecartes du blanc voulu.
recul = DEMI + BLANC
bord_haut = (P2[0] - recul * n2[0], P2[1] - recul * n2[1])
bord_bas = (P2[0] + recul * n2[0], P2[1] + recul * n2[1])

coupe_haut_ext = croisements_droite_cercle(bord_haut, d2, R_EXT)[-1]
coupe_haut_int = croisements_droite_cercle(bord_haut, d2, R_INT)[-1]
coupe_bas_ext = croisements_droite_cercle(bord_bas, d2, R_EXT)[-1]
coupe_bas_int = croisements_droite_cercle(bord_bas, d2, R_INT)[-1]


def arc(depuis, vers, rayon, sens_horaire):
    """
    Arc de cercle rendu en COURBES CUBIQUES, jamais en commande A.

    Deux raisons, et la seconde est la bonne.

    La commande A du SVG est exacte et parfaitement lisible par un navigateur.
    Mais ni PostScript ni PDF n'ont d'operateur d'arc elliptique : tout
    convertisseur doit de toute facon la transformer en courbes. Le lecteur de
    chemins du projet, lui, REFUSE les arcs plutot que de les approximer en
    silence, parce qu'une approximation silencieuse deforme un logo client sans
    prevenir.

    Ce refus s'est retourne contre nous : le symbole du projet ne passait pas
    dans la chaine du projet. Plutot que d'assouplir la regle, on produit
    directement ce que la regle accepte. L'approximation est faite ICI, une
    fois, par un dessinateur qui sait ce qu'il dessine, avec la formule exacte
    et des segments de 90 degres au plus : l'erreur maximale est alors de
    l'ordre du dix millieme de rayon, trois ordres de grandeur sous le pixel a
    toute taille de marquage.
    """
    depart = math.radians(angle_de(depuis))
    arrivee = math.radians(angle_de(vers))
    if sens_horaire:
        while arrivee < depart:
            arrivee += 2 * math.pi
    else:
        while arrivee > depart:
            arrivee -= 2 * math.pi
    total = arrivee - depart

    morceaux = max(1, math.ceil(abs(total) / (math.pi / 2)))
    pas = total / morceaux
    k = 4 / 3 * math.tan(pas / 4)
    sortie = []
    a = depart
    for _ in range(morceaux):
        b = a + pas
        p0 = (CX + rayon * math.cos(a), CY + rayon * math.sin(a))
        p3 = (CX + rayon * math.cos(b), CY + rayon * math.sin(b))
        p1 = (p0[0] - k * rayon * math.sin(a), p0[1] + k * rayon * math.cos(a))
        p2 = (p3[0] + k * rayon * math.sin(b), p3[1] - k * rayon * math.cos(b))
        sortie.append(f"C{n(p1[0])},{n(p1[1])} {n(p2[0])},{n(p2[1])} {n(p3[0])},{n(p3[1])}")
        a = b
    return "".join(sortie)


# Grand arc : du bord haut du couloir, dans le sens des angles decroissants,
# jusqu'a la coupe radiale du bas.
fin_grand_ext = point_angle(FIN_GRAND_ARC, R_EXT)
fin_grand_int = point_angle(FIN_GRAND_ARC, R_INT)
chemin_grand_arc = (
    f"M{n(coupe_haut_ext[0])},{n(coupe_haut_ext[1])}"
    + arc(coupe_haut_ext, fin_grand_ext, R_EXT, sens_horaire=False)
    + f"L{n(fin_grand_int[0])},{n(fin_grand_int[1])}"
    + arc(fin_grand_int, coupe_haut_int, R_INT, sens_horaire=True)
    + "Z"
)

# Fragment : du bord bas du couloir a la coupe radiale du bas.
fin_frag_ext = point_angle(FIN_FRAGMENT, R_EXT)
fin_frag_int = point_angle(FIN_FRAGMENT, R_INT)
chemin_fragment = (
    f"M{n(coupe_bas_ext[0])},{n(coupe_bas_ext[1])}"
    + arc(coupe_bas_ext, fin_frag_ext, R_EXT, sens_horaire=True)
    + f"L{n(fin_frag_int[0])},{n(fin_frag_int[1])}"
    + arc(fin_frag_int, coupe_bas_int, R_INT, sens_horaire=False)
    + "Z"
)


def coche_en_aplat():
    """
    La ligne brisee de la coche devient un contour ferme.

    Du cote CONVEXE de l'angle, les deux bords decales ne se rejoignent pas : on
    pose un arc de raccord de rayon la demi epaisseur. Du cote CONCAVE, ils se
    croisent, et le croisement EST le sommet.

    Raccord arrondi plutot qu'angle vif, et c'est un choix de marquage : une
    pointe vive se remplit en broderie et se bouche en tampographie. Le dessin
    doit tenir a 15 mm, pas seulement a l'ecran.
    """
    produit = d1[0] * d2[1] - d1[1] * d2[0]
    s = 1 if produit < 0 else -1

    def bord(signe):
        return (
            (P1[0] + signe * DEMI * n1[0], P1[1] + signe * DEMI * n1[1]),
            (P2[0] + signe * DEMI * n1[0], P2[1] + signe * DEMI * n1[1]),
            (P2[0] + signe * DEMI * n2[0], P2[1] + signe * DEMI * n2[1]),
            (P3[0] + signe * DEMI * n2[0], P3[1] + signe * DEMI * n2[1]),
        )

    convexe, concave = bord(s), bord(-s)
    det = d1[0] * (-d2[1]) - d1[1] * (-d2[0])
    dx, dy = concave[3][0] - concave[0][0], concave[3][1] - concave[0][1]
    t = (dx * (-d2[1]) - dy * (-d2[0])) / det
    sommet = (concave[0][0] + t * d1[0], concave[0][1] + t * d1[1])

    # Repere ou Y descend : un angle qui diminue se trace avec le balayage a
    # zero. Mis a un, le raccord creusait une encoche dans la pointe.
    balayage = 0 if s > 0 else 1
    chemin = (
        f"M{n(convexe[0][0])},{n(convexe[0][1])}"
        f"L{n(convexe[1][0])},{n(convexe[1][1])}"
        + raccord_arrondi(convexe[1], convexe[2], P2, DEMI, balayage)
        + f"L{n(convexe[3][0])},{n(convexe[3][1])}"
        f"L{n(concave[3][0])},{n(concave[3][1])}"
        f"L{n(sommet[0])},{n(sommet[1])}"
        f"L{n(concave[0][0])},{n(concave[0][1])}"
        "Z"
    )
    return chemin, list(convexe) + list(concave) + [sommet]


chemin_coche, points_coche = coche_en_aplat()

# ------------------------------------------------------------- boite et sortie

x_min = min([0.0] + [p[0] for p in points_coche])
x_max = max([DIAMETRE] + [p[0] for p in points_coche])
y_min = min([0.0] + [p[1] for p in points_coche])
y_max = max([DIAMETRE] + [p[1] for p in points_coche])
boite = (x_min - MARGE, y_min - MARGE,
         x_max - x_min + 2 * MARGE, y_max - y_min + 2 * MARGE)


def svg(couleur_anneau, couleur_coche, titre):
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" '
        f'viewBox="{n(boite[0])} {n(boite[1])} {n(boite[2])} {n(boite[3])}" '
        f'width="{n(boite[2])}" height="{n(boite[3])}">\n'
        f'<title>{titre}</title>\n'
        f'<path d="{chemin_grand_arc}" fill="{couleur_anneau}"/>\n'
        f'<path d="{chemin_fragment}" fill="{couleur_anneau}"/>\n'
        f'<path d="{chemin_coche}" fill="{couleur_coche}"/>\n'
        '</svg>\n'
    )


for nom, contenu in {
    "symbole.svg": svg(NAVY, ORANGE, "Vecto Facile, symbole"),
    "symbole_monochrome.svg": svg("#000000", "#000000", "Vecto Facile, symbole monochrome"),
    "symbole_negatif.svg": svg("#FFFFFF", "#FFFFFF", "Vecto Facile, symbole en negatif"),
}.items():
    with open(os.path.join(ICI, nom), "w", encoding="utf-8") as f:
        f.write(contenu)

controles = {
    "epaisseur_anneau_et_coche_pct": EPAISSEUR,
    "blanc_constant_coche_anneau_pct": BLANC,
    "ouverture_bas_pct": round((FIN_GRAND_ARC - FIN_FRAGMENT) * math.pi / 180 * (R_EXT + R_INT) / 2, 2),
    "depassement_coche_pct": round(max(math.hypot(p[0] - CX, p[1] - CY) for p in points_coche) - R_EXT, 2),
    "boite_avec_zone_de_protection": [round(boite[2], 2), round(boite[3], 2)],
}
with open(os.path.join(ICI, "controles_geometrie.json"), "w", encoding="utf-8") as f:
    json.dump(controles, f, ensure_ascii=False, indent=2)

for cle, valeur in controles.items():
    print(f"  {cle:38s} {valeur}")
