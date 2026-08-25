# -*- coding: utf-8 -*-
"""Derive le LOT DE SIMULATION depuis la base de travail.

REGLE DE CLOISON, inchangee : la base de travail reste hors du depot, seul ce
qui en est DERIVE y entre. Les photos arrivent deja renommees, sans trace
d'origine ; ce script les reduit et recalcule les coordonnees de zone.

CE QUE CE SCRIPT TRADUIT, ET POURQUOI ICI PLUTOT QU'A L'ECRAN.

  LA QUADRICHROMIE. La source la code par 0. Le site la code par null. Les deux
  conventions se rencontreraient dans le meme composant, et `3 <= 0` est faux :
  la technique la plus permissive deviendrait la plus fermee, et un logo
  parfaitement marquable s'entendrait dire non. La traduction se fait ici, une
  fois, comme pour les archetypes.

  LES NOMS DE ZONE. Le fournisseur les ecrit en anglais telegraphique,
  « FRONT TOP PAD ». La traduction se fait PAR JETONS, jamais par une liste des
  cas rencontres : un lot nouveau doit se traduire sans qu'on touche au code.
  Un jeton inconnu n'est pas avale en silence, il est compte et affiche.

  LES DOUBLONS DE PHOTO. Sur le tote bag, l'avant et l'arriere portent la meme
  photo ET les memes coordonnees : le fournisseur ne photographie qu'une face.
  Proposer deux choix produirait deux images identiques et l'outil paraitrait
  casse. On fusionne les libelles au lieu de jeter une position.

CE QU'IL NE FAIT PAS. Il ne corrige aucun plafond de couleurs. Trois anomalies
fournisseur sont connues et declarees plus bas ; s'il en rencontre une, il la
SIGNALE et s'arrete. Corriger en silence serait plus grave que l'anomalie.

Usage :
    cd .../site && python3 outils/deriver_simulation.py

Sans la base de travail, il ne fait rien et le dit : le fichier derive est
versionne, il suffit au site.
"""
import hashlib
import json
import os
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
BASE = os.environ.get('BASE_TRAVAIL') or os.path.join(ICI, '..', '..', 'referentiel')
SOURCE = os.path.join(BASE, 'simulation_lot1')
MANIFESTE = os.path.join(SOURCE, 'simulation_lot1.json')
CIBLE = os.path.join(ICI, '..', 'src', 'simulation', 'lot1.json')
IMAGES = os.path.join(ICI, '..', 'public', 'simulation')

LARGEUR_MAX = 700          # parametre d'instrument : la page doit rester legere
QUALITE = 72
TOLERANCE = 0.004          # 0,4 % : ce que la reduction a le droit d'ajouter
DECALAGE_TEMOIN_PX = 7

# ---------------------------------------------------------------------------
# ANOMALIES FOURNISSEUR CONNUES, comptees par le fil metier le 25/08/2026 sur
# les 20 064 couples position-technique du catalogue. Une gravure laser en huit
# couleurs n'existe pas. On ne les corrige pas, on refuse de les servir.
ANOMALIES = {
    ('L3', 8): 'gravure laser a 8 couleurs, 5 entrees contre 1 144 a 1',
    ('L2', 8): 'gravure laser a 8 couleurs, 2 entrees contre 820 a 1',
    ('B', 8): 'embossage a 8 couleurs, 1 entree sur 211',
}

# ---------------------------------------------------------------------------
# TRADUCTION DES ZONES, PAR JETONS.
FACES = {'FRONT': 'devant', 'BACK': 'dos', 'CHEST': 'poitrine', 'ARM': 'manche',
         'SLEEVE': 'manche', 'STRIP': 'bande', 'POCKET': 'poche', 'SIDE': 'côté',
         'HANDLE': 'anse', 'LID': 'couvercle', 'BAMBOO': 'partie bambou'}
PLACES = {'RIGHT': 'droite', 'LEFT': 'gauche', 'TOP': 'en haut',
          'BOTTOM': 'en bas', 'MIDDLE': 'au centre', 'CENTER': 'au centre',
          'CENTRE': 'au centre', 'UPPER': 'en haut', 'LOWER': 'en bas'}
# Un repere SEUL doit se lire comme un endroit, pas comme une precision
# suspendue : « UPPER » sur une serviette nomme la partie haute de l'objet.
SEULS = {'en haut': 'partie haute', 'en bas': 'partie basse',
         'au centre': 'partie centrale', 'droite': 'côté droit',
         'gauche': 'côté gauche'}
FACONS = {'EMBROIDERY': 'broderie', 'PAD': 'tampographie', 'LASER': 'gravure laser',
          'DEBOSSING': 'marquage en creux', 'EMBOSSING': 'marquage en relief',
          'SCREEN': 'sérigraphie', 'DOMING': 'résine', 'SUBLIMATION': 'sublimation',
          'TRANSFER': 'transfert', 'PART': None}
LIAISONS = {'OU', 'AND', '&', 'THE', 'OF'}
inconnus = set()


def traduire_zone(brut):
    faces, places, facons, restes = [], [], [], []
    for jeton in str(brut).split():
        j = jeton.upper()
        if j in LIAISONS:
            continue
        if j.isdigit():
            restes.append('(%s)' % j)
            continue
        if j in FACES:
            if FACES[j] not in faces:
                faces.append(FACES[j])
            continue
        if j in PLACES:
            if PLACES[j] not in places:
                places.append(PLACES[j])
            continue
        if j in FACONS:
            if FACONS[j] and FACONS[j] not in facons:
                facons.append(FACONS[j])
            continue
        inconnus.add(j)
        restes.append(jeton.lower())
    if not faces and places:
        faces.append(SEULS.get(places[0], places[0]))
        places = places[1:]
    sur_manche = 'manche' in faces
    lieu = [('à ' + m) if (m in ('droite', 'gauche') and not sur_manche) else m
            for m in places]
    texte = ' ou '.join(faces)
    suite = ' '.join(lieu + restes)
    if suite:
        texte = (texte + ' ' + suite) if texte else suite
    if facons:
        texte = (texte + ', ' if texte else '') + ' et '.join(facons)
    return texte[:1].upper() + texte[1:] if texte else str(brut)


def temoin_traduction():
    """Controle negatif. Un detecteur de jetons inconnus qui ne se declenche
    jamais ne detecte rien."""
    avant = set(inconnus)
    traduire_zone('FRONT ZORGLUB')
    vu = 'ZORGLUB' in inconnus
    inconnus.clear()
    inconnus.update(avant)
    return vu


# ---------------------------------------------------------------------------
def rectangle(zone_px):
    xs = [q['x'] for q in zone_px]
    ys = [q['y'] for q in zone_px]
    return {'x': min(xs), 'y': min(ys),
            'largeur': max(xs) - min(xs), 'hauteur': max(ys) - min(ys)}


def ecarts_de_reduction(avant_zone, avant_img, apres_zone, apres_img,
                        largeur_mm, hauteur_mm):
    """Ce que la REDUCTION ajoute, pas l'arrondi deja present chez le
    fournisseur. Une bande de 5 mm ne tient que sur dix-sept pixels : son
    rapport de forme est faux avant qu'on y touche."""
    attendu = largeur_mm / hauteur_mm

    def derive(z):
        return abs((z['largeur'] / z['hauteur']) - attendu) / attendu if z['hauteur'] else 9.9

    r = [('rapport de forme ajoute', max(0.0, derive(apres_zone) - derive(avant_zone)))]
    for axe, dim in (('x', 'largeur'), ('y', 'hauteur')):
        r.append(('position relative ' + axe,
                  abs(apres_zone[axe] / apres_img[dim] - avant_zone[axe] / avant_img[dim])))
    return r


def main():
    if not os.path.exists(MANIFESTE):
        print('  base de travail introuvable dans %s' % SOURCE)
        print("  Elle reste hors du depot, c'est normal sur une machine qui ne l'a pas.")
        print('  Le fichier derive src/simulation/lot1.json est versionne, il suffit au site.')
        return 0

    try:
        from PIL import Image
    except ImportError:
        print('  Pillow manquant : pip3 install --user Pillow')
        return 1

    if not temoin_traduction():
        print('  TEMOIN EN ECHEC : le detecteur de jetons inconnus est aveugle.')
        return 1
    print('  temoin : un jeton inventé est bien signalé.')

    lot = json.load(open(MANIFESTE, encoding='utf-8'))
    os.makedirs(IMAGES, exist_ok=True)

    vues, deja, pire, alertes, poids = [], {}, 0.0, [], 0
    for produit in lot:
        for position in produit['positions']:
            if position.get('forme') != 'Rectangle' or len(position.get('zone_px', [])) < 2:
                alertes.append('%s %s : forme %s ecartee'
                               % (produit['id'], position['libelle'], position.get('forme')))
                continue

            avant_zone = rectangle(position['zone_px'])
            avant_img = dict(position['image_px'])
            chemin = os.path.join(SOURCE, position['photo_nue'])
            if not os.path.exists(chemin):
                alertes.append('%s %s : photo absente' % (produit['id'], position['libelle']))
                continue
            # LA CLE DE DOUBLON EST UNE EMPREINTE DU CONTENU, PAS UN NOM DE
            # FICHIER. Sur le tote bag, l'avant et l'arriere portent la meme
            # image sous deux noms differents, p01_pos1_nue.jpg et
            # p01_pos2_nue.jpg. Une cle par nom trouve zero doublon et laisse
            # passer deux vignettes identiques : l'outil parait casse.
            empreinte = hashlib.md5(open(chemin, 'rb').read()).hexdigest()
            cle = (produit['id'], empreinte,
                   avant_zone['x'], avant_zone['y'], avant_zone['largeur'], avant_zone['hauteur'])

            # DOUBLON DE PHOTO : on fusionne le libelle, on ne jette pas la position.
            if cle in deja:
                vue = deja[cle]
                if position['libelle'] not in vue['zonesSource']:
                    vue['zonesSource'].append(position['libelle'])
                    # On traduit la CONCATENATION, pas les traductions : le
                    # traducteur dedoublonne deja les faces et les facons, et
                    # « Devant, broderie ou dos, broderie » n'est pas du
                    # francais.
                    vue['zone'] = traduire_zone(' OU '.join(vue['zonesSource']))
                continue

            image = Image.open(chemin).convert('RGB')
            if image.size != (avant_img['largeur'], avant_img['hauteur']):
                alertes.append('%s %s : la photo ne fait pas la taille declaree'
                               % (produit['id'], position['libelle']))
                continue

            facteur = min(1.0, LARGEUR_MAX / image.width)
            apres_img = {'largeur': round(image.width * facteur),
                         'hauteur': round(image.height * facteur)}
            apres_zone = {k: v * facteur for k, v in avant_zone.items()}
            for nom, ecart in ecarts_de_reduction(avant_zone, avant_img, apres_zone, apres_img,
                                                  position['largeur_mm'], position['hauteur_mm']):
                pire = max(pire, ecart)
                if ecart > TOLERANCE:
                    alertes.append('%s %s : %s, ecart %.4f'
                                   % (produit['id'], position['libelle'], nom, ecart))

            nom_fichier = '%s_%02d.jpg' % (produit['id'], len(vues) + 1)
            image.resize((apres_img['largeur'], apres_img['hauteur']),
                         Image.LANCZOS).save(os.path.join(IMAGES, nom_fichier),
                                             'JPEG', quality=QUALITE, optimize=True)
            poids += os.path.getsize(os.path.join(IMAGES, nom_fichier))

            techniques = []
            for t in position['techniques']:
                if not t.get('technique_id'):
                    alertes.append('%s %s : technique sans identifiant'
                                   % (produit['id'], position['libelle']))
                    continue
                if (t['technique_id'], t['couleurs_max']) in ANOMALIES:
                    alertes.append('%s %s %s : %s'
                                   % (produit['id'], position['libelle'], t['technique_id'],
                                      ANOMALIES[(t['technique_id'], t['couleurs_max'])]))
                    continue
                techniques.append({
                    'id': t['technique_id'],
                    'nom': t['nom'],
                    # LA TRADUCTION DE LA QUADRI, ICI ET NULLE PART AILLEURS.
                    'couleursMax': None if t['couleurs_max'] == 0 else t['couleurs_max'],
                })

            vue = {
                'produit': produit['id'],
                'objet': produit['libelle'],
                'matiere': produit['matiere'],
                'zonesSource': [position['libelle']],
                'zone': traduire_zone(position['libelle']),
                'largeurMm': position['largeur_mm'],
                'hauteurMm': position['hauteur_mm'],
                'image': nom_fichier,
                'imagePx': apres_img,
                'zonePx': {k: round(v, 2) for k, v in apres_zone.items()},
                'techniques': techniques,
            }
            vues.append(vue)
            deja[cle] = vue

    sortie = {
        'version': 1,
        'genere_le': '25/08/2026',
        'doctrine': [
            "DERIVE de la base de travail fournisseurs, instantane du 05/08/2026. La base brute reste hors du depot ; ce fichier n'en garde que ce qui sert a l'ecran.",
            "Aucun nom de fournisseur, aucune reference, aucune URL, aucun prix : le depot est destine a devenir public.",
            "couleursMax vaut null pour la quadrichromie, jamais 0 : la source code la quadri par 0, la traduction se fait ici, une fois.",
            "Le plafond de couleurs appartient a la POSITION, jamais a la technique, ni par son nom ni par son identifiant : sur le catalogue complet, 18 identifiants sur 49 portent un plafond qui varie selon la position.",
            "Les photos sont reduites et les coordonnees de zone reduites avec elles : reduire, c'est recalculer. Un controle a temoin le verifie a chaque derivation.",
            "Les positions qui partagent la meme photo ET les memes coordonnees fusionnent leur libelle : le fournisseur ne photographie qu'une face.",
            "Les plafonds fournisseur reconnus faux ne sont pas corriges, ils sont refuses et signales.",
        ],
        'vues': vues,
    }

    os.makedirs(os.path.dirname(CIBLE), exist_ok=True)
    with open(CIBLE, 'w', encoding='utf-8') as f:
        json.dump(sortie, f, ensure_ascii=False, indent=1)
        f.write('\n')

    # Garde-fou de cloison, verifie sur le fichier ECRIT, sur les DONNEES
    # seules : la doctrine a le droit de nommer ce qu'elle interdit.
    brut = json.dumps(sortie['vues'], ensure_ascii=False).lower()
    for interdit in ['midocean', 'mid ocean', 'pf concept', 'xd connects',
                     'http', 'cdn.', 'gabarit', 'printposition', 'prix']:
        if interdit in brut:
            print('  CLOISON : "%s" present dans les donnees servies.' % interdit)
            return 1

    print('  %d vues derivees sur %d positions, %d photos, %.0f ko.'
          % (len(vues), sum(len(p['positions']) for p in lot), len(vues), poids / 1024))
    print('  pire ecart ajoute par la reduction : %.5f (tolerance %.3f)' % (pire, TOLERANCE))
    print('  jetons de zone non traduits : %s' % (', '.join(sorted(inconnus)) or 'aucun'))
    if alertes:
        print('\n  %d SIGNALEMENTS :' % len(alertes))
        for a in alertes:
            print('    ' + a)
        return 1
    print('  aucun signalement.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
