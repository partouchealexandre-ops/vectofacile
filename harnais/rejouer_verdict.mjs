#!/usr/bin/env node
/**
 * Harnais de la couche verdict.
 *
 * Il ne verifie pas que le verdict SAIT dire oui. Il verifie qu'il ne dit pas
 * oui quand il ne sait pas, et qu'il ne dit pas plus que ce qu'il mesure.
 * Les trois familles de controles, dans l'ordre de ce qu'elles coutent si
 * elles manquent :
 *
 *   L'ABSENCE DE SEUIL N'AUTORISE RIEN. C'est le bogue naturel de tout code
 *   de comparaison : `mesure > seuil` avec un seuil indefini passe. Un site
 *   qui valide par defaut ce qu'il ignore est pire qu'inutile, il est nuisible.
 *
 *   UN ETAT QUI NE SERT PAS NE SERT PAS. Une valeur INFEREE ou AGREGEE
 *   ressemble en tout point a une valeur sourcee une fois qu'elle est un
 *   nombre dans un JSON. Seule une verification mecanique les distingue.
 *
 *   LES MOTS SONT DES ENGAGEMENTS. P0.5 fixe l'enveloppe COMMERCIALE : le
 *   verdict dit « refusé chez la plupart des fabricants » et jamais
 *   « impossible ». Et la charte interdit tout pourcentage de confiance.
 */

import { juger, jugerCritere, jugerTechnique, CRITERES } from '../src/verdict/juger.js';
import { direCritere, direBase, MOTS_INTERDITS, MOTIF_CONFIANCE, LIBELLES }
  from '../src/verdict/formulation.js';
import { sert } from '../src/verdict/etats.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const SEUILS = JSON.parse(fs.readFileSync(
  path.join(ICI, '..', 'src', 'verdict', 'seuils.json'), 'utf-8'));
const VALEURS = JSON.parse(fs.readFileSync(
  path.join(ICI, '..', 'src', 'verdict', 'valeurs_sourcees.json'), 'utf-8'));
const PRODUITS = JSON.parse(fs.readFileSync(
  path.join(ICI, '..', 'src', 'verdict', 'produits.json'), 'utf-8'));
const CHEMIN_GRILLE = path.join(ICI, '..', 'src', 'verdict', 'produits_grille.json');
const GRILLE = JSON.parse(fs.readFileSync(CHEMIN_GRILLE, 'utf-8'));

/**
 * Un jeu de mesures propre, celui d'un logo qui n'a aucun probleme.
 *
 * Depuis l'inversion du 20/08, il porte AUSSI les pixels : le calcul des
 * tailles minimales n'utilise que le trait en pixels et la largeur de
 * l'image, jamais une taille saisie. Les millimetres restent la pour les
 * criteres a seuil, et ils sont COHERENTS avec les pixels : 1,2 mm pour
 * 12 px sur 1000 px de large, c'est un marquage saisi de 100 mm.
 */
function mesuresImpeccables() {
  return {
    m1Dimensions: { largeurPx: 1000, hauteurPx: 1000 },
    m2Couleurs: { couleursReelles: 2 },
    m5TraitLePlusFin: { encadrementPx: { basse: 12, haute: 14 },
                        encadrementMm: { basse: 1.2, haute: 1.4 } },
    m6ContreFormes: { ecartMinimalMm: { basse: 1.5, haute: 1.7 } },
    m7HauteurDeCapitale: { hauteurMm: 6.0 },
  };
}

const resultats = [];
const controle = (libelle, ok, detail) => resultats.push({ libelle, ok, detail });

// ------------------------------------------------------------------------ 1
// Aucun seuil du tout : tout est inconnu, RIEN n'est favorable.
{
  const v = juger({ mesures: mesuresImpeccables(),
                    seuils: { version: 0, techniques: { x: { libelle: 'X', criteres: {} } } } });
  controle('sans seuil, aucune technique favorable',
           v.resume.favorables === 0 && v.techniques[0].etat === 'inconnu',
           `favorables=${v.resume.favorables} etat=${v.techniques[0].etat}`);
}

// ------------------------------------------------------------------------ 2
// LE BOGUE NATUREL. Un logo impeccable, aucun seuil : la tentation du code
// est de le declarer bon. Il doit rester inconnu.
{
  const v = juger({ mesures: mesuresImpeccables(), seuils: SEUILS });
  controle('un logo impeccable sans seuils reste inconnu partout',
           v.resume.favorables === 0 && v.resume.defavorables === 0,
           `favorables=${v.resume.favorables} defavorables=${v.resume.defavorables} inconnues=${v.resume.inconnues}`);
}

// ------------------------------------------------------------------------ 3
// Un etat qui ne sert pas ne sert pas, meme avec une valeur parfaitement
// utilisable et un logo qui la respecte.
{
  const seuils = { version: 1, techniques: { laser: { libelle: 'Laser', criteres: {
    couleurs: { valeur: 1, etat: 'AGRÉGAT IAG', source: 'source A', date: '05/08/2026' },
  } } } };
  const m = { m2Couleurs: { couleursReelles: 1 } };
  const v = juger({ mesures: m, seuils });
  const c = v.techniques[0].criteres.find((x) => x.cle === 'couleurs');
  controle('un AGRÉGAT ne produit pas de verdict, meme respecte',
           c.etat_verdict === 'inconnu' && /agrégat/i.test(c.raison), c.raison);
}
{
  const seuils = { version: 1, techniques: { t: { libelle: 'T', criteres: {
    couleurs: { valeur: 4, etat: 'INFÉRÉ' },
  } } } };
  const v = juger({ mesures: { m2Couleurs: { couleursReelles: 2 } }, seuils });
  const c = v.techniques[0].criteres.find((x) => x.cle === 'couleurs');
  controle('un INFÉRÉ ne produit pas de verdict', c.etat_verdict === 'inconnu', c.raison);
}

// ------------------------------------------------------------------------ 4
// Un etat qui sert produit bien un verdict, dans les deux sens.
{
  const seuils = { version: 1, techniques: { t: { libelle: 'T', criteres: {
    couleurs: { valeur: 4, etat: 'ARBITRÉ ALEX', date: '19/08/2026' },
  } } } };
  // On juge le CRITERE, pas la technique : les trois autres criteres restent
  // inconnus, donc la technique le reste aussi. Mon premier ecrit attendait
  // « favorable » sur la technique, et le harnais m'a rappele ma propre regle
  // d'agregation. Le controle est garde sous cette forme comme rappel.
  const bon = juger({ mesures: { m2Couleurs: { couleursReelles: 3 } }, seuils });
  const mauvais = juger({ mesures: { m2Couleurs: { couleursReelles: 9 } }, seuils });
  const cBon = bon.techniques[0].criteres.find((x) => x.cle === 'couleurs');
  const cMauvais = mauvais.techniques[0].criteres.find((x) => x.cle === 'couleurs');
  controle('un ARBITRÉ ALEX juge le critere, dans les deux sens',
           cBon.etat_verdict === 'favorable'
           && cMauvais.etat_verdict === 'defavorable',
           `${cBon.etat_verdict} / ${cMauvais.etat_verdict}`);
  controle('un critere favorable isole ne suffit pas a ouvrir la technique',
           bon.techniques[0].etat === 'inconnu', bon.techniques[0].etat);
}

// ------------------------------------------------------------------------ 5
// L'inconnu ne se laisse pas absorber : trois criteres au vert et un ignore
// ne font pas un feu vert.
{
  const seuils = { version: 1, techniques: { t: { libelle: 'T', criteres: {
    couleurs: { valeur: 8, etat: 'SOURCÉ', source: 's', date: '19/08/2026' },
    trait_minimal: { valeur: 0.3, etat: 'SOURCÉ', source: 's', date: '19/08/2026' },
    ecart_minimal: { valeur: 0.4, etat: 'SOURCÉ', source: 's', date: '19/08/2026' },
  } } } };
  const v = juger({ mesures: mesuresImpeccables(), seuils });
  const t = v.techniques[0];
  const verts = t.criteres.filter((c) => c.etat_verdict === 'favorable').length;
  controle('trois criteres favorables et un inconnu ne font pas un feu vert',
           verts === 3 && t.etat === 'inconnu', `${verts} verts, etat ${t.etat}`);
}

// ------------------------------------------------------------------------ 6
// Un seul critere defavorable suffit a fermer, meme noye dans des favorables.
{
  const seuils = { version: 1, techniques: { t: { libelle: 'T', criteres: {
    couleurs: { valeur: 8, etat: 'SOURCÉ', source: 's', date: '19/08/2026' },
    trait_minimal: { valeur: 0.3, etat: 'SOURCÉ', source: 's', date: '19/08/2026' },
    ecart_minimal: { valeur: 0.4, etat: 'SOURCÉ', source: 's', date: '19/08/2026' },
    hauteur_de_capitale: { valeur: 20, etat: 'SOURCÉ', source: 's', date: '19/08/2026' },
  } } } };
  const v = juger({ mesures: mesuresImpeccables(), seuils });
  controle('un seul critere defavorable ferme la technique',
           v.techniques[0].etat === 'defavorable', v.techniques[0].etat);
}

// ------------------------------------------------------------------------ 7
// La borne PRUDENTE d'un encadrement est retenue sur un minimum.
{
  const seuils = { version: 1, techniques: { t: { libelle: 'T', criteres: {
    trait_minimal: { valeur: 1.3, etat: 'SOURCÉ', source: 's', date: '19/08/2026' },
  } } } };
  // encadrement {basse: 1.2, haute: 1.4} : la borne haute passerait, la basse non.
  const v = juger({ mesures: mesuresImpeccables(), seuils });
  const c = v.techniques[0].criteres.find((x) => x.cle === 'trait_minimal');
  controle('la borne basse d\'un encadrement est retenue sur un minimum',
           c.mesure === 1.2 && c.etat_verdict === 'defavorable',
           `mesure=${c.mesure} verdict=${c.etat_verdict}`);
}

// ------------------------------------------------------------------------ 8
// LES MOTS. Aucune sortie ne contient un mot interdit ni un pourcentage.
{
  const seuils = { version: 1, techniques: { t: { libelle: 'T', criteres: {
    couleurs: { valeur: 2, etat: 'SOURCÉ', source: 's', date: '19/08/2026' },
    trait_minimal: { valeur: 5, etat: 'SOURCÉ', source: 's', date: '19/08/2026' },
  } } } };
  const v = juger({ mesures: mesuresImpeccables(), seuils });
  const phrases = [
    ...v.techniques.flatMap((t) => t.criteres.map(direCritere)),
    ...Object.values(LIBELLES),
    direBase({ description: 'un mug standard de 8 cm de diamètre' }) ?? '',
  ];
  const texte = phrases.join(' ').toLowerCase();
  const fautif = MOTS_INTERDITS.find((mot) => texte.includes(mot));
  controle('aucun mot interdit dans les phrases produites', !fautif,
           fautif ? `trouve : ${fautif}` : 'aucun');
  controle('aucun pourcentage ni mention de confiance',
           !MOTIF_CONFIANCE.test(texte),
           (texte.match(MOTIF_CONFIANCE) || ['aucun'])[0]);
  controle('le refus se dit « refusé chez la plupart des fabricants »',
           texte.includes('refusé chez la plupart des fabricants'));
}

// ------------------------------------------------------------------------ 9
// Un verdict calcule sur une mediane DIT sur quoi il calcule.
{
  const avecBase = direBase({ description: 'un mug standard de 8 cm de diamètre' });
  const saisi = direBase({ origine: 'saisie', description: '82 mm de diamètre' });
  controle('un calcul sur mediane annonce sa base et sa reserve',
           /peut différer/.test(avecBase) && /vous avez indiquées/.test(saisi),
           avecBase);
}

// ----------------------------------------------------------------------- 10
// Le fichier de seuils reel ne contient AUCUN etat inconnu du vocabulaire.
{
  const etats = [];
  for (const t of Object.values(SEUILS.techniques)) {
    for (const c of Object.values(t.criteres ?? {})) etats.push(c.etat);
  }
  const inconnus = etats.filter((e) => !['SOURCÉ', 'ARBITRÉ ALEX', 'INFÉRÉ', 'AGRÉGAT IAG'].includes(e));
  controle('seuils.json n\'utilise que des etats du vocabulaire',
           inconnus.length === 0, inconnus.join(', ') || 'aucun');
  const quiServent = etats.filter(sert).length;
  controle(`seuils.json : ${quiServent} critere(s) servent sur ${etats.length}`,
           true, 'constat, pas un jugement');
}

// ----------------------------------------------------------------------- 11
// Chaque inconnu dit CE QUI MANQUE. Sans ca, on ne sait pas quoi aller chercher.
{
  const v = juger({ mesures: mesuresImpeccables(), seuils: SEUILS });
  const sansRaison = v.techniques.flatMap((t) => t.manques)
    .filter((m) => !m.raison);
  controle('chaque inconnu porte la raison de son inconnu',
           sansRaison.length === 0, `${sansRaison.length} sans raison`);
}

// ----------------------------------------------------------------------- 12
// LE RENDU respecte les regles de mots, et il n'affiche plus aucune source.
//
// Pivot du 20/08 : l'ecran de resultat ne montre plus de carte par technique
// ni de rubrique de sources. Les controles qui les visaient sont partis avec
// elles ; ceux de la grille produits les remplacent, plus bas. Restent ici
// ceux qui ne dependent pas de la mise en page : les mots, et l'echappement.
{
  const { rendreVerdict } = await import('../src/verdict/rendu.js');
  const { rendreGrille } = await import('../src/verdict/rendu_grille.js');
  const { jugerGrille } = await import('../src/verdict/grille.js');
  const v = juger({ mesures: mesuresImpeccables(), seuils: SEUILS });
  const html = rendreVerdict(v, [], { origine: 'vectoriel' });
  const bas = html.toLowerCase();
  const fautif = MOTS_INTERDITS.find((mot) => bas.includes(mot));
  controle('le rendu ne contient aucun mot interdit', !fautif, fautif || 'aucun');
  controle('le rendu ne contient ni pourcentage ni confiance',
           !MOTIF_CONFIANCE.test(bas), (bas.match(MOTIF_CONFIANCE) || ['aucun'])[0]);
  // Un libelle de produit hostile ne doit pas passer. Le controle verifie
  // l'echappement ET son effet : la chaine doit etre la, echappee.
  const hostile = rendreGrille(jugerGrille(
    { produits: [{ famille: 'X', libelle: '<img src=x onerror=alert(1)>', silhouette: 'sac',
                   zones: [{ libelle: 'la face avant', largeurMm: 100, hauteurMm: 100,
                             techniques: [{ technique: 'Sérigraphie', couleursMax: 4 }] }] }] },
    { nCouleurs: 2, ratio: 1, fichierVectoriel: true }));
  controle('un libelle de produit hostile est echappe dans le rendu',
           !hostile.includes('<img src=x') && hostile.includes('&lt;img'));
}

// ------------------------------------------------------------------------
// LES VALEURS SOURCEES, ET CE QU'ELLES N'ONT PAS LE DROIT D'ETRE.
//
// Ce fichier est la seule chose qui autorise le site a dire un millimetre a un
// visiteur. Une seule ligne mal formee suffit a transformer une valeur inferee
// en fait publie, et personne ne s'en apercevrait a l'ecran : un nombre dans un
// tableau ressemble a un autre nombre dans un tableau.
//
// Les controles ci-dessous verifient donc le FICHIER, pas le rendu.
{
  const toutes = Object.values(VALEURS.techniques)
    .flatMap((t) => t.criteres?.trait_minimal?.valeurs ?? []);

  controle('le fichier de valeurs contient quelque chose', toutes.length > 0,
           `${toutes.length} valeurs`);
  controle('toutes les valeurs sont a l\'etat SOURCE',
           toutes.every((v) => v.etat === 'SOURCÉ' && sert(v.etat)),
           toutes.filter((v) => v.etat !== 'SOURCÉ').map((v) => v.etat).join(', '));
  controle('chaque valeur nomme une matiere',
           toutes.every((v) => typeof v.support === 'string' && v.support.trim().length > 2),
           toutes.filter((v) => !v.support?.trim()).map((v) => `${v.source} L${v.ligne}`).join(', '));
  controle('chaque valeur porte sa source, son rang et sa date',
           toutes.every((v) => v.source && Number.isInteger(v.rang) && v.date));
  controle('chaque valeur dit d\'ou elle vient dans le referentiel',
           toutes.every((v) => Number.isInteger(v.fiche) && Number.isInteger(v.ligne)));
  controle('chaque millimetre est un nombre fini et positif',
           toutes.every((v) => Number.isFinite(v.mm) && v.mm > 0));
  // Un support declare au niveau SOURCE doit dire OU la source le nomme,
  // sinon la tracabilite s'arrete a une affirmation de notre part.
  controle('un support declare au niveau source cite sa ligne',
           toutes.filter((v) => v.support_niveau === 'source')
                 .every((v) => Number.isInteger(v.ligne_support)));
}

// L'INVERSION D'USAGE NE DOIT NI MENTIR NI DEVENIR UNE AUTORISATION.
{
  const impeccable = mesuresImpeccables();
  const v = juger({ mesures: impeccable, seuils: SEUILS, valeurs: VALEURS });
  const parCle = Object.fromEntries(v.techniques.map((t) => [t.technique, t]));

  controle('une taille est calculee pour chaque technique, sans rien demander',
           v.techniques.every((t) => t.situation?.etat === 'tailles'));

  // ATTENDU PAR CONSTRUCTION, calcule a la main et pas recopie d'une sortie :
  // le minimum le plus accessible publie en serigraphie est 0,18 mm ; avec un
  // trait de 12 px (borne BASSE de {12, 14}) sur 1000 px de large,
  // 0,18 × 1000 / 12 = 15 mm tout rond. Si le code retenait la borne haute,
  // il dirait ceil(180/14) = 13 mm, un conseil trop optimiste de 2 mm.
  controle('la taille la plus accessible est calculee sur la borne basse du trait',
           parCle.serigraphie.situation.des === 15,
           `des=${parCle.serigraphie.situation.des}, attendu 15`);
  // Le plus exigeant en serigraphie est 1,00 mm (toile de jute) :
  // 1,00 × 1000 / 12 = 83,33, et l'arrondi doit etre SUPERIEUR : 84. Un
  // arrondi au plus proche (83) conseillerait une taille ou le trait est
  // encore sous le minimum publie.
  controle('l\'arrondi de la taille est superieur, jamais au plus proche',
           parCle.serigraphie.situation.jusqu_a === 84,
           `jusqu_a=${parCle.serigraphie.situation.jusqu_a}, attendu 84`);
  // Pour une meme matiere citee par plusieurs sources, la ligne servie est la
  // PLUS EXIGEANTE. Invariant verifie sur le fichier reel, pas sur un attendu
  // recopie : aucune valeur du fichier ne doit etre plus severe que la ligne
  // retenue pour sa matiere.
  const plusExigeantes = v.techniques.every((t) => {
    const valeurs = VALEURS.techniques[t.technique]?.criteres?.trait_minimal?.valeurs ?? [];
    return t.situation.parSupport.every((ligne) =>
      valeurs.filter((x) => x.support.trim() === ligne.support.trim())
             .every((x) => x.mm <= ligne.mm));
  });
  controle('pour une meme matiere, la source la plus exigeante est retenue', plusExigeantes);

  // Le jeu impeccable porte des millimetres coherents avec 100 mm saisis :
  // 100 mm >= 84 mm, la taille saisie passe partout en serigraphie… et la
  // technique NE DOIT PAS passer au vert pour autant, ses trois autres
  // criteres restent inconnus.
  controle('une taille saisie qui passe partout ne rend pas la technique favorable',
           parCle.serigraphie.verdictLargeur === 'passe_partout'
             && parCle.serigraphie.etat !== 'favorable',
           `verdictLargeur=${parCle.serigraphie.verdictLargeur}`);

  // Une taille saisie SOUS la plus accessible ferme la technique : c'est le
  // seul verdict defavorable que l'inversion sait produire, et il repose
  // uniquement sur des valeurs sourcees. 12 px sur 1000 px avec 0,12 mm de
  // trait, c'est un marquage saisi de 10 mm, sous les 15 mm calcules.
  const fin = juger({
    mesures: { ...impeccable,
               m5TraitLePlusFin: { encadrementPx: { basse: 12, haute: 14 },
                                   encadrementMm: { basse: 0.12, haute: 0.14 } } },
    seuils: SEUILS, valeurs: VALEURS });
  const serFin = fin.techniques.find((t) => t.technique === 'serigraphie');
  controle('une taille saisie sous la plus accessible ferme la technique',
           serFin.verdictLargeur === 'trop_petit' && serFin.etat === 'defavorable',
           `verdictLargeur=${serFin.verdictLargeur} etat=${serFin.etat}`);

  // SANS AUCUNE SAISIE, les tailles s'affichent quand meme : c'est tout
  // l'objet de l'inversion. Et sans saisie, rien n'est defavorable : une
  // taille minimale n'est pas un refus, c'est un conseil.
  const sansSaisie = juger({
    mesures: { m1Dimensions: { largeurPx: 1000 },
               m5TraitLePlusFin: { encadrementPx: { basse: 12, haute: 14 } } },
    seuils: SEUILS, valeurs: VALEURS });
  controle('sans taille saisie, les tailles sont calculees et rien n\'est refuse',
           sansSaisie.techniques.every((t) => t.situation.etat === 'tailles'
             && t.verdictLargeur === null)
             && sansSaisie.resume.defavorables === 0);

  // Un logo fait d'aplats, sans trait fin : pas de taille a calculer, et
  // surtout pas de message qui reclamerait une saisie. Le badge du 20/08 a
  // affiche « donnez une largeur » avec le champ deja rempli ; cet etat
  // distinct existe pour que ca ne se reproduise pas.
  const aplats = juger({
    mesures: { m1Dimensions: { largeurPx: 1000 },
               m5TraitLePlusFin: { encadrementPx: { basse: null, haute: null } } },
    seuils: SEUILS, valeurs: VALEURS });
  controle('un logo d\'aplats est sans_trait, jamais defavorable',
           aplats.techniques.every((t) => t.situation.etat === 'sans_trait')
             && aplats.resume.defavorables === 0
             && aplats.resume.sansTrait === aplats.resume.total);

  // Le resume trie les techniques de la plus accessible a la plus exigeante :
  // c'est l'ordre que l'en-tete annonce au visiteur.
  const tailles = v.resume.parTaille.map((t) => t.des);
  controle('le resume trie les techniques par taille croissante',
           tailles.every((t, i) => i === 0 || tailles[i - 1] <= t)
             && v.resume.parTaille.length === v.resume.situees);

  // LE CALCUL DES TAILLES DORT, IL N'EST PLUS AFFICHE.
  //
  // Pivot du 20/08 : la page de resultat ne montre plus les tailles calculees
  // sur les minimums publies, ni leurs sources. Le calcul reste ici, teste,
  // parce qu'il reviendra le jour ou les seuils P0 seront rendus ; ce qui a
  // disparu, ce sont les controles de SON RENDU, avec l'ecran qu'ils
  // decrivaient. Ne pas confondre « le code n'est plus appele » et « le code
  // est faux » : les controles ci-dessus portent sur le calcul et tiennent.
  controle('les tailles restent calculees meme si la page ne les montre plus',
           v.techniques.every((t) => t.situation?.etat === 'tailles'
             && Number.isInteger(t.situation.des)));
}

// LA PREMIERE QUESTION EST LE FICHIER, PAS LA TAILLE (arbitrage Alex 20/08),
// ET LES COULEURS EN TROP COUTENT DE L'ARGENT, PAS UN REFUS.
{
  const { rendreVerdict } = await import('../src/verdict/rendu.js');
  const { direCouleurs } = await import('../src/verdict/formulation.js');
  const v = juger({ mesures: mesuresImpeccables(), seuils: SEUILS,
                    valeurs: VALEURS, produits: PRODUITS });

  // Le bandeau selon l'origine du depot. Chaque variante porte sa SORTIE :
  // un refus sans sortie est un mur.
  const imageOk = rendreVerdict(v, {}, { origine: 'image', vectorise: true });
  controle('image vectorisee : exigence du vectoriel, refus en l\'etat, et le .eps en sortie',
           imageOk.includes('Sans fichier vectoriel, oubliez la tampographie, la sérigraphie et la gravure laser')
             && imageOk.includes('refusée en l\'état')
             && imageOk.includes('Téléchargez'));
  // Les trois grands sont NOMMES et le secteur est dit : l'outil vise l'objet
  // publicitaire, arbitrage Alex du 20/08. Et la bascule est gratuite.
  controle('le bandeau nomme l\'objet publicitaire et la gratuite de la bascule',
           imageOk.includes('objet publicitaire')
             && imageOk.includes('ça ne vous coûte rien'));
  const imageRefus = rendreVerdict(v, {}, { origine: 'image', vectorise: false });
  controle('image non vectorisable : la sortie est le graphiste',
           imageRefus.includes('graphiste')
             && imageRefus.includes('comment-vectoriser-un-jpeg'));
  const vrai = rendreVerdict(v, {}, { origine: 'vectoriel' });
  controle('un vrai vectoriel est felicite, pas sermonne',
           vrai.includes('déjà vectoriel') && !vrai.includes('refusé en l\'état'));
  const faux = rendreVerdict(v, {}, { origine: 'faux_vectoriel' });
  controle('un faux vectoriel est refuse en l\'etat, avec la page vectoriser en sortie',
           faux.includes('sera refusé')
             && /href="\/vectoriser"/.test(faux));
  // P0.5 tient sur TOUTES les variantes du bandeau, « impossible » compris,
  // alors meme que la demande d'origine employait ce mot.
  const toutes = [imageOk, imageRefus, vrai, faux].join(' ').toLowerCase();
  const fautif = MOTS_INTERDITS.find((m) => toutes.includes(m));
  controle('aucun mot interdit dans les bandeaux du fichier', !fautif, fautif || 'aucun');
  // Sans etat de fichier fourni (harnais, anciens appels), aucun bandeau :
  // pas de mensonge par defaut.
  controle('sans origine connue, aucun bandeau de fichier',
           !rendreVerdict(v, {}).includes('etat-fichier'));

  // LES COULEURS : au dela de 3 couleurs sur une technique a passages, la
  // carte recommande l'economie. Jamais sur les techniques a passage unique,
  // ou reduire n'economise rien : la recommandation y serait un mensonge.
  controle('9 couleurs en serigraphie declenchent la recommandation d\'economie',
           /version en 1 ou 2 couleurs/.test(direCouleurs('serigraphie', 9))
             && /économie/.test(direCouleurs('serigraphie', 9)));
  controle('2 couleurs ne declenchent rien', !/économie/.test(direCouleurs('serigraphie', 2)));
  controle('9 couleurs en numerique UV ne declenchent rien : un seul passage',
           !/économie/.test(direCouleurs('numerique_uv', 9)));
  controle('la recommandation reste une affaire de facture, pas de refus',
           !MOTS_INTERDITS.some((m) => direCouleurs('serigraphie', 9).toLowerCase().includes(m))
             && !/refus/i.test(direCouleurs('serigraphie', 9)));

  // LE PREMIER SEUIL QUI SERT : tampographie, 4 couleurs maximum, ARBITRÉ
  // ALEX 20/08. Au-dela, la technique ferme ET la carte dit la sortie :
  // retravailler le logo. En dessous, le critere passe au vert mais la
  // technique reste inconnue, la regle d'agregation ne bouge pas.
  const neuf = juger({ mesures: { ...mesuresImpeccables(), m2Couleurs: { couleursReelles: 9 } },
                       seuils: SEUILS, valeurs: VALEURS, produits: PRODUITS });
  const tampoNeuf = neuf.techniques.find((t) => t.technique === 'tampographie');
  const critNeuf = tampoNeuf.criteres.find((c) => c.cle === 'couleurs');
  controle('9 couleurs ferment la tampographie sur le seuil arbitre de 4',
           critNeuf.etat_verdict === 'defavorable' && critNeuf.seuil === 4
             && critNeuf.etat === 'ARBITRÉ ALEX' && tampoNeuf.etat === 'defavorable',
           `critere=${critNeuf.etat_verdict} seuil=${critNeuf.seuil} technique=${tampoNeuf.etat}`);
  const trois = juger({ mesures: { ...mesuresImpeccables(), m2Couleurs: { couleursReelles: 3 } },
                        seuils: SEUILS, valeurs: VALEURS, produits: PRODUITS });
  const tampoTrois = trois.techniques.find((t) => t.technique === 'tampographie');
  controle('3 couleurs passent le critere sans ouvrir la technique',
           tampoTrois.criteres.find((c) => c.cle === 'couleurs').etat_verdict === 'favorable'
             && tampoTrois.etat === 'inconnu');
  controle('au dela de 4, la carte tampo dit la sortie : retravailler le logo',
           /retravailler votre logo/.test(direCouleurs('tampographie', 9))
             && /maximum en tampographie : 4/.test(direCouleurs('tampographie', 9)));
  controle('a 3 couleurs, pas de sermon : la mecanique des cliches, rien d\'autre',
           !/retravailler/.test(direCouleurs('tampographie', 3)));
  // Les autres techniques ne heritent PAS du seuil tampo : 9 couleurs ne
  // ferment ni la serigraphie ni l'UV, aucun maximum n'y est arbitre.
  controle('le seuil de 4 ne deborde pas sur les autres techniques',
           neuf.techniques.filter((t) => t.etat === 'defavorable').length === 1);
}

// LA GRILLE DE PRODUITS : le verdict que le visiteur lit, et la cloison.
//
// Pivot du 20/08. Deux familles de controles, et la seconde compte autant que
// la premiere :
//
//   le VERDICT doit etre juste sur des cas calcules a la main, pas recopies
//   d'une sortie ;
//   la CLOISON doit tenir : la base de travail fournisseurs reste hors du
//   depot, et le fichier derive ne doit porter aucune trace de sa source.
{
  const { jugerGrille, jugerProduit, tailleDansZone } = await import('../src/verdict/grille.js');
  const { rendreGrille, direProduit } = await import('../src/verdict/rendu_grille.js');
  const par = (juges) => Object.fromEntries(juges.map((p) => [p.famille, p]));

  // 1. LA CLOISON, verifiee sur le FICHIER SERVI et pas sur une intention.
  const brutGrille = fs.readFileSync(CHEMIN_GRILLE, 'utf-8');
  const donnees = JSON.stringify(GRILLE.produits);
  const traces = ['midocean', 'cdn.', 'http', 'code_interne', 'MO2', 'print-template'];
  const fuite = traces.find((t) => donnees.toLowerCase().includes(t.toLowerCase()));
  controle('la grille derivee ne porte aucune trace de son fournisseur',
           !fuite, fuite ? `trouve : ${fuite}` : 'aucune');
  // CONTROLE NEGATIF : la detection detecte. Sans lui, une garde qui ne
  // regarde pas au bon endroit passe au vert en ne trouvant rien.
  controle('(temoin) le detecteur de trace fournisseur detecte',
           traces.some((t) => (donnees + ' https://cdn.exemple').toLowerCase().includes(t)));
  controle('la base de travail brute n\'est pas dans le depot',
           !fs.existsSync(path.join(ICI, '..', 'referentiel')));

  // 2. LA QUADRICHROMIE NE VAUT JAMAIS ZERO COULEUR. La source code la quadri
  // par 0 ; un « 0 couleur » a l'ecran serait la bourde qui coute la
  // credibilite. La derivation la traduit en null, une fois.
  const tousPlafonds = GRILLE.produits.flatMap((p) => p.zones.flatMap(
    (z) => z.techniques.map((t) => t.couleursMax)));
  controle('aucun plafond de couleurs ne vaut 0 dans la grille',
           !tousPlafonds.includes(0),
           `${tousPlafonds.filter((n) => n === null).length} quadri sur ${tousPlafonds.length}`);

  // 3. LA TAILLE DANS UNE ZONE, calculee a la main. Un logo au rapport 2,5
  // dans une zone de 300 x 300 : la largeur gagne, 300 x 120. Dans une zone
  // de 60 x 7, c'est la hauteur qui decide, donc 17,5 arrondi a 18 x 7.
  const large = tailleDansZone({ largeurMm: 300, hauteurMm: 300 }, 2.5);
  controle('dans une zone carree, un logo large est limite par la largeur',
           large.largeurMm === 300 && large.hauteurMm === 120 && large.limitePar === 'largeur',
           JSON.stringify(large));
  const clip = tailleDansZone({ largeurMm: 60, hauteurMm: 7 }, 2.5);
  controle('dans une zone basse, c\'est la hauteur qui decide',
           clip.largeurMm === 18 && clip.hauteurMm === 7 && clip.limitePar === 'hauteur',
           JSON.stringify(clip));

  // 4. LE CAS DU GOBELET, celui qui a motive le pivot. Sa plus grande zone
  // fait le tour et n'accepte QU'UNE couleur ; un logo a deux couleurs n'y
  // passe pas, mais passe sur la face avant, en tampographie. Le verdict doit
  // donc etre « oui », et la phrase doit dire « pas la, mais la ».
  const deux = par(jugerGrille(GRILLE, { nCouleurs: 2, ratio: 2.5, fichierVectoriel: true }));
  const mug = deux.Mug;
  controle('un logo a deux couleurs passe sur le gobelet, mais pas n\'importe ou',
           mug.etat === 'oui' && mug.refusee?.zone === 'tout le tour du gobelet'
             && mug.meilleure.zone === 'la face avant, en haut'
             && mug.meilleure.technique === 'Tampographie',
           `${mug.etat} / ${mug.meilleure?.zone} / ${mug.meilleure?.technique}`);
  controle('et la phrase dit « pas la, mais la »',
           /^Pas sur tout le tour du gobelet, qui n'accepte qu'une seule couleur\. Mais oui sur la face avant, en haut/
             .test(direProduit(mug)), direProduit(mug));

  // 5. LE STYLO, contrainte geometrique de famille : ses cinq emplacements
  // font 7 mm de haut, aucune exception. Neuf couleurs n'y passent pas, et le
  // refus doit porter son palier : a quatre couleurs, tout se rouvre.
  const neuf = par(jugerGrille(GRILLE, { nCouleurs: 9, ratio: 2.5, fichierVectoriel: true }));
  const stylo = neuf.Stylo;
  controle('neuf couleurs ne passent sur aucun emplacement du stylo',
           stylo.etat === 'non' && stylo.plafond === 4, `${stylo.etat} / plafond ${stylo.plafond}`);
  controle('et le refus dit a combien de couleurs ca se rouvre',
           /En 4 couleurs, 5 emplacements s'ouvrent\./.test(direProduit(stylo)),
           direProduit(stylo));

  // 6. UN REFUS NE SE DIT QU'APRES AVOIR ESSAYE TOUTES LES ZONES. Le controle
  // le verifie par construction : aucun produit declare « non » ne doit avoir
  // la moindre offre acceptante, toutes zones et techniques confondues.
  const menteurs = [...jugerGrille(GRILLE, { nCouleurs: 9, ratio: 2.5, fichierVectoriel: true }),
                    ...jugerGrille(GRILLE, { nCouleurs: 2, ratio: 1, fichierVectoriel: true })]
    .filter((p) => p.etat === 'non' && p.zonesQuiPassent > 0);
  controle('aucun « ca ne passe pas » ne cache un emplacement qui passe',
           menteurs.length === 0, menteurs.map((p) => p.famille).join(', ') || 'aucun');

  // 7. LE TROISIEME ETAT, celui qui vaut de l'argent : une image passe, mais
  // seulement une fois vectorisee. Le meme logo, deja vectoriel, passe tout
  // court. Rien d'autre ne change entre les deux.
  const image = par(jugerGrille(GRILLE, { nCouleurs: 2, ratio: 2.5, fichierVectoriel: false }));
  controle('une image donne « oui, apres vectorisation » la ou un vectoriel donne « oui »',
           image['T-shirt'].etat === 'si' && deux['T-shirt'].etat === 'oui'
             && image['T-shirt'].meilleure.zone === deux['T-shirt'].meilleure.zone);

  // 8. LE RENDU ne cite plus aucune source et ne porte plus un seul lien
  // externe : decision d'Alex du 20/08, le visiteur n'a pas besoin de savoir
  // d'ou vient un chiffre, il a besoin de savoir si ca passe.
  const html = rendreGrille(jugerGrille(GRILLE, { nCouleurs: 2, ratio: 2.5, fichierVectoriel: true }));
  controle('la grille ne porte aucun lien externe', !/<a href="https?:/.test(html));
  controle('la grille ne cite aucune source',
           !/(source|relevé le|d'où viennent)/i.test(html.replace(/<[^>]+>/g, ' ')));
  controle('elle affiche une carte par produit',
           (html.match(/<article class="produit /g) || []).length === GRILLE.produits.length);
  controle('un seul appel a l\'action sur l\'ecran, celui de la vectorisation',
           (html.match(/cta-entete/g) || []).length <= 1);
  controle('aucun mot interdit dans la grille',
           !MOTS_INTERDITS.some((m) => html.toLowerCase().includes(m)));
  controle('aucun pourcentage ni confiance dans la grille',
           !MOTIF_CONFIANCE.test(html.replace(/<[^>]+>/g, ' ')));
  // Le nom d'origine des zones ne sort jamais a l'ecran : il est en anglais et
  // il ne veut rien dire pour un acheteur.
  const anglais = ['ROUNDSCREEN', 'FRONT UPPER', 'BARREL', 'CHEST', 'LID TOP', 'TD1', ' PD'];
  const anglicisme = anglais.find((z) => html.includes(z));
  controle('aucun nom de zone d\'origine ne sort a l\'ecran', !anglicisme, anglicisme || 'aucun');
}

// ------------------------------------------------------------------------
console.log('');
console.log('  HARNAIS DE LA COUCHE VERDICT');
console.log('  ' + '-'.repeat(66));
let echecs = 0;
for (const r of resultats) {
  console.log(`  ${r.ok ? 'ok   ' : 'ECHEC'} ${r.libelle}`
    + (r.detail && !r.ok ? `\n          ${r.detail}` : ''));
  if (!r.ok) echecs++;
}
console.log('  ' + '-'.repeat(66));
console.log('');
const v = juger({ mesures: mesuresImpeccables(), seuils: SEUILS, valeurs: VALEURS });
console.log(`  Etat reel du fichier de seuils : ${v.resume.favorables} favorable(s), `
  + `${v.resume.defavorables} defavorable(s), ${v.resume.inconnues} inconnue(s) `
  + `sur ${v.resume.total} techniques.`);
const total = Object.values(VALEURS.techniques)
  .reduce((n, t) => n + (t.criteres?.trait_minimal?.valeurs?.length ?? 0), 0);
console.log(`  Valeurs SOURCEES servies : ${total} minimums de trait, sur `
  + `${Object.keys(VALEURS.techniques).length} techniques.`);
console.log(`  Tailles calculees (trait 12 px sur 1000 px) : `
  + v.resume.parTaille.map((t) => `${t.libelle} des ${t.des} mm`).join(', ') + '.');
console.log('');
console.log(`  ${resultats.length} controles, ${echecs} echec(s).`);
console.log('');
process.exit(echecs === 0 ? 0 : 1);
