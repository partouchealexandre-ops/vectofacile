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
const CHEMIN_GRILLE = path.join(ICI, '..', 'src', 'verdict', 'archetypes.json');
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

// L'ACTION SUR LE FICHIER, C2 du brief du 21/08, ET LES COULEURS EN TROP QUI
// COUTENT DE L'ARGENT, PAS UN REFUS.
//
// Le bandeau de six lignes a ete retire : il expliquait un procede avant de
// donner un resultat. Ne restent que le verdict, en tete, et l'ACTION, avec sa
// sortie. Un refus sans sortie est un mur ; ces controles verifient qu'aucune
// variante n'en est un.
{
  const { rendreVerdict } = await import('../src/verdict/rendu.js');
  const { rendreActionFichier, rendreSuite, CONTACT, CONTACT_OPERATIONNEL } =
    await import('../src/verdict/rendu_grille.js');
  const { direCouleurs } = await import('../src/verdict/formulation.js');
  const v = juger({ mesures: mesuresImpeccables(), seuils: SEUILS,
                    valeurs: VALEURS, produits: PRODUITS });

  const imageOk = rendreActionFichier({ origine: 'image', vectorise: true });
  // C2 : le bouton, et la ligne qui dit ce qu'on recoit. Rien de plus.
  controle('une image vectorisee rend le bouton, pas un cours sur les procedes',
           /cta-large/.test(imageOk) && /href="#telechargements"/.test(imageOk)
             && /\.eps/.test(imageOk) && /\.pdf/.test(imageOk));
  controle('le pave sur les outils et les courbes a bien disparu',
           !/fabriquent d'abord un outil/.test(imageOk)
             && !/oubliez la tampographie/.test(imageOk));
  // §7.3 du brief precedent, toujours valable : on n'annonce pas la
  // vectorisation comme FAITE, on rend l'action au visiteur.
  controle('la vectorisation reste une action, jamais une annonce',
           !/nous l'avons déjà vectorisée/.test(imageOk));
  const imageRefus = rendreActionFichier({ origine: 'image', vectorise: false });
  controle('image non vectorisable : la sortie est le graphiste',
           /graphiste/.test(imageRefus) && /comment-vectoriser-un-jpeg/.test(imageRefus));
  const vrai = rendreActionFichier({ origine: 'vectoriel' });
  controle('un vrai vectoriel est felicite, pas sermonne',
           /déjà vectoriel/.test(vrai) && !/refus[ée]/i.test(vrai));
  const faux = rendreActionFichier({ origine: 'faux_vectoriel', vectorise: false });
  controle('un faux vectoriel garde sa sortie : l\'image d\'origine',
           /href="\/vectoriser"/.test(faux));
  // P0.5 tient sur TOUTES les variantes, « impossible » compris.
  const toutes = [imageOk, imageRefus, vrai, faux].join(' ').toLowerCase();
  const fautif = MOTS_INTERDITS.find((m) => toutes.includes(m));
  controle('aucun mot interdit dans les actions sur le fichier', !fautif, fautif || 'aucun');
  // Sans etat de fichier connu, aucune action : pas de mensonge par defaut.
  controle('sans origine connue, aucune action de fichier', rendreActionFichier(null) === '');
  // C4 : l'adresse de contact ne diverge pas de celle des mentions legales.
  // Deux adresses sur un site, c'est une de trop, et c'est toujours la
  // mauvaise qui reste.
  const institution = fs.readFileSync(
    path.join(ICI, '..', 'contenu', 'institution.mjs'), 'utf-8');
  controle('l\'adresse de contact est celle des mentions legales',
           institution.includes(CONTACT), CONTACT);
  // ET ON NE DEMANDE PAS UN EMAIL QU'ON NE SAIT PAS RECEVOIR. Le domaine n'est
  // pas achete : un formulaire qui ecrit dans le vide est pire que pas de
  // formulaire. Le controle marche dans les DEUX sens, pour que le jour du
  // domaine, oublier de rebrancher le bloc se voie tout de suite.
  const suite = rendreSuite();
  controle('le bloc de demande suit l\'etat reel de l\'adresse',
           CONTACT_OPERATIONNEL ? /Demander un prix/.test(suite) : suite === '',
           CONTACT_OPERATIONNEL ? 'adresse operationnelle' : 'adresse pas encore ouverte');

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

// LA GRILLE : le verdict que le visiteur lit, et la cloison.
//
// Pivot du 20/08, archetypes du 21/08. Trois familles de controles, et les
// deux dernieres comptent autant que la premiere :
//
//   le VERDICT doit etre juste sur des cas calcules a la main. Ils sont ecrits
//   ICI, en dur, jamais recopies d'une sortie : un attendu qui vient du code
//   teste ne teste rien ;
//   les DONNEES SERVIES doivent etre saines : le fichier que le site charge,
//   pas une intention ;
//   la CLOISON doit tenir : la base de travail fournisseurs reste hors du
//   depot, et le fichier derive ne porte aucune trace de sa source.
{
  const { jugerGrille, jugerProduit, tailleDansZone, choisirPourContraste, signature,
          LISIBILITE_MM } = await import('../src/verdict/grille.js');
  const { rendreGrille, direProduit } = await import('../src/verdict/rendu_grille.js');
  const { exigeVectoriel, techniquesInconnues, avecArticle, compatibilite,
          DPI_PLANCHER, DPI_RECOMMANDE } = await import('../src/verdict/techniques.js');
  const par = (juges) => Object.fromEntries(juges.map((p) => [p.famille, p]));

  // LE JEU TEMOIN, ecrit a la main et rien d'autre. Trois cas, choisis parce
  // que chacun a produit un defaut reel : le gobelet dont la plus grande zone
  // refuse (« pas la, mais la »), le stylo dont toutes les zones sont basses
  // et dont les techniques fabriquent un outil, le carnet dont la zone est
  // large, ce qui isole le blocage de FORMAT du blocage de TAILLE.
  const TEMOIN = { produits: [
    { famille: 'Gobelet', libelle: 'Gobelet témoin', silhouette: 'gobelet', zones: [
      { libelle: 'tout le tour', largeurMm: 180, hauteurMm: 45, techniques: [
        { technique: 'Sérigraphie circulaire', couleursMax: 1, parDefaut: true }] },
      { libelle: 'la face avant, en haut', largeurMm: 35, hauteurMm: 14, techniques: [
        { technique: 'Tampographie', couleursMax: 4, parDefaut: true }] },
    ] },
    { famille: 'Stylo', libelle: 'Stylo témoin', silhouette: 'stylo', zones: [
      { libelle: 'le corps', largeurMm: 60, hauteurMm: 7, techniques: [
        { technique: 'Tampographie', couleursMax: 4, parDefaut: true },
        { technique: 'Gravure laser', couleursMax: 1, parDefaut: false }] },
      { libelle: 'le clip', largeurMm: 30, hauteurMm: 7, techniques: [
        { technique: 'Tampographie', couleursMax: 4, parDefaut: true }] },
    ] },
    { famille: 'Carnet', libelle: 'Carnet témoin', silhouette: 'carnet', zones: [
      { libelle: 'la couverture', largeurMm: 90, hauteurMm: 60, techniques: [
        { technique: 'Sérigraphie', couleursMax: 4, parDefaut: true }] },
    ] },
  ] };

  // 1. LA TAILLE DANS UNE ZONE, calculee a la main. Un logo au rapport 2,5
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

  // 2. LE CAS DU GOBELET, celui qui a motive le pivot. Sa plus grande zone
  // fait le tour et n'accepte QU'UNE couleur ; un logo a deux couleurs n'y
  // passe pas, mais passe sur la face avant, en tampographie.
  const deux = par(jugerGrille(TEMOIN, { nCouleurs: 2, ratio: 2.5, fichierVectoriel: true }));
  const mug = deux.Gobelet;
  controle('un logo a deux couleurs passe sur le gobelet, mais pas n\'importe ou',
           mug.etat === 'oui' && mug.refusee?.zone === 'tout le tour'
             && mug.meilleure.zone === 'la face avant, en haut'
             && mug.meilleure.technique === 'Tampographie',
           `${mug.etat} / ${mug.meilleure?.zone} / ${mug.meilleure?.technique}`);
  // C3 du brief du 21/08 : une info par phrase, et la taille en REFERENCE
  // PHYSIQUE avant le chiffre. « Votre logo ferait 35 × 14 mm » ne se visualise
  // pas ; « un timbre-poste » se voit tout de suite.
  controle('et la phrase dit « pas la, mais la », avec la taille calculee',
           direProduit(mug) === 'Pas sur tout le tour, qui n\'accepte qu\'une seule couleur. '
             + 'Sur la face avant, en haut, en tampographie. '
             + 'Taille maximale de la zone : 35 × 14 mm.', direProduit(mug));

  // 3. LE STYLO. Neuf couleurs ne passent nulle part, et le refus porte son
  // palier : a quatre couleurs, les deux emplacements se rouvrent.
  const neuf = par(jugerGrille(TEMOIN, { nCouleurs: 9, ratio: 2.5, fichierVectoriel: true }));
  const stylo = neuf.Stylo;
  controle('neuf couleurs ne passent sur aucun emplacement du stylo',
           stylo.etat === 'non' && stylo.plafond === 4,
           `${stylo.etat} / plafond ${stylo.plafond}`);
  controle('et le refus dit a combien de couleurs ca se rouvre',
           /En 4 couleurs, 2 emplacements s'ouvrent\./.test(direProduit(stylo)),
           direProduit(stylo));

  // 4. UN REFUS NE SE DIT QU'APRES AVOIR ESSAYE TOUTES LES ZONES, sur le jeu
  // temoin ET sur les donnees servies.
  const menteurs = [
    ...jugerGrille(TEMOIN, { nCouleurs: 9, ratio: 2.5, fichierVectoriel: true }),
    ...jugerGrille(GRILLE, { nCouleurs: 9, ratio: 2.5, fichierVectoriel: true }),
    ...jugerGrille(GRILLE, { nCouleurs: 2, ratio: 1, fichierVectoriel: true }),
  ].filter((p) => p.etat === 'non' && p.zonesQuiPassent > 0);
  controle('aucun « ca ne passe pas » ne cache un emplacement qui passe',
           menteurs.length === 0, menteurs.map((p) => p.famille).join(', ') || 'aucun');

  // 5. CE QUE LE FICHIER OUVRE, ET CE QU'IL LAISSE FERME. §1 du brief du
  // 20/08 : le site fermait des portes ouvertes.
  const image = par(jugerGrille(TEMOIN,
    { nCouleurs: 2, ratio: 1.5, fichierVectoriel: false, largeurPx: 2400 }));
  controle('un produit dont toutes les techniques fabriquent un outil reste « si »',
           image.Carnet.etat === 'si' && image.Carnet.raison === 'vectoriel',
           `${image.Carnet.etat} / ${image.Carnet.raison}`);
  controle('et la carte dit l\'outil, pas les pixels',
           /fabrique un outil/.test(rendreGrille([image.Carnet], {}))
             && !/sortirait floue/.test(rendreGrille([image.Carnet], {})));
  // « Accepte un raster » ne veut pas dire « accepte n'importe quelle image ».
  // Un logo de 120 pixels sur une zone de 300 mm fait 10 dpi : dire oui la
  // serait l'erreur SYMETRIQUE de celle qu'on corrige.
  const IMAGE_SEULE = { produits: [{ famille: 'Sac', libelle: 'Sac témoin', silhouette: 'sac',
    zones: [{ libelle: 'la face avant', largeurMm: 300, hauteurMm: 300, techniques: [
      { technique: 'Transfert numérique', couleursMax: null, parDefaut: true }] }] }] };
  const nette = par(jugerGrille(IMAGE_SEULE,
    { nCouleurs: 2, ratio: 1, fichierVectoriel: false, largeurPx: 4000 }));
  const floue = par(jugerGrille(IMAGE_SEULE,
    { nCouleurs: 2, ratio: 1, fichierVectoriel: false, largeurPx: 120 }));
  controle('une image nette passe TEL QUEL sur une technique d\'image',
           nette.Sac.etat === 'oui' && !exigeVectoriel(nette.Sac.meilleure.technique),
           nette.Sac.etat);
  controle('la meme image, trop peu definie pour la zone, ne donne pas « oui »',
           floue.Sac.etat === 'si' && floue.Sac.raison === 'definition',
           `${floue.Sac.etat} / ${floue.Sac.raison}`);
  controle('et la carte dit le flou, avec la taille en cause',
           /À 300 mm de large, votre image sortirait floue/
             .test(rendreGrille([floue.Sac], {})));
  controle('le plancher de definition est celui du corpus, pas un chiffre invente',
           DPI_PLANCHER === 150 && DPI_RECOMMANDE === 300);
  // Le vectoriel n'a pas disparu du discours : il est devenu un GAIN chiffre.
  const gain = par(jugerGrille(TEMOIN,
    { nCouleurs: 2, ratio: 1.5, fichierVectoriel: false, largeurPx: 2400 })).Stylo;
  controle('sur un produit qui passe deja, le vectoriel s\'annonce comme un gain',
           gain.etat === 'si' || gain.gain?.techniques.length > 0, gain.etat);

  // 6. LE PLANCHER DE LISIBILITE, §5 du brief. « Le clip : votre logo ferait
  // 12 × 7 mm » est arithmetiquement juste et commercialement absurde.
  const petit = par(jugerGrille(TEMOIN, { nCouleurs: 1, ratio: 2.5, fichierVectoriel: true }));
  controle('sous le plancher, on ne dit pas oui sec : on pose la reserve',
           petit.Stylo.etat === 'oui' && petit.Stylo.reserveLisibilite === true,
           `${petit.Stylo.etat} / ${petit.Stylo.meilleure?.taille?.largeurMm} mm`);
  controle('et la carte le dit, avec la sortie : une version simplifiee',
           /techniquement possible mais votre logo n'y serait plus lisible/
             .test(rendreGrille([petit.Stylo], {}))
             && /version simplifiée/.test(rendreGrille([petit.Stylo], {})));
  controle('l\'etiquette cesse de dire « oui » tout court',
           /techniquement, oui/.test(rendreGrille([petit.Stylo], {})));
  controle('temoin : au-dessus du plancher, aucune reserve',
           petit.Gobelet.reserveLisibilite === false && LISIBILITE_MM === 20);

  // 7. LA REGLE DU CONTRASTE, §4 du brief. Une grille ou tout dit la meme
  // chose n'apprend rien : la selection retient ce qui DIVERGE.
  const tous = jugerGrille(GRILLE, { nCouleurs: 2, ratio: 1.6, fichierVectoriel: true });
  const choix = choisirPourContraste(tous, 8);
  controle('la selection ne depasse jamais huit cartes',
           choix.choisis.length <= 8, String(choix.choisis.length));
  controle('elle ne retient pas deux fois la meme reponse tant qu\'il en reste d\'autres',
           new Set(choix.choisis.slice(0, choix.signatures).map(signature)).size
             === Math.min(choix.signatures, choix.choisis.length),
           `${choix.signatures} signatures pour ${tous.length} archetypes`);
  controle('deux archetypes qui repondent la meme chose ont la meme signature',
           signature({ etat: 'oui', meilleure: { technique: 'Sérigraphie',
                                                 taille: { largeurMm: 100 } } })
             === signature({ etat: 'oui', meilleure: { technique: 'Transfert sérigraphique',
                                                       taille: { largeurMm: 120 } } }));
  controle('et deux qui repondent autre chose ne l\'ont pas',
           signature({ etat: 'oui', meilleure: { technique: 'Sérigraphie',
                                                 taille: { largeurMm: 100 } } })
             !== signature({ etat: 'oui', meilleure: { technique: 'Gravure laser',
                                                       taille: { largeurMm: 12 } } }));

  // 8. LES DONNEES SERVIES, et la cloison. Le fichier que le site charge.
  const brutGrille = fs.readFileSync(CHEMIN_GRILLE, 'utf-8');
  const donnees = JSON.stringify(GRILLE.archetypes);
  const traces = ['midocean', 'pf concept', 'xd connects', 'cdn.', 'http',
                  'code_interne', 'MO2', 'print-template'];
  const fuite = traces.find((t) => donnees.toLowerCase().includes(t.toLowerCase()));
  controle('la grille derivee ne porte aucune trace de son fournisseur',
           !fuite, fuite ? `trouve : ${fuite}` : 'aucune');
  // CONTROLE NEGATIF : la detection detecte. Sans lui, une garde qui ne
  // regarde pas au bon endroit passe au vert en ne trouvant rien.
  controle('(temoin) le detecteur de trace fournisseur detecte',
           traces.some((t) => (donnees + ' https://cdn.exemple').toLowerCase().includes(t)));
  controle('la base de travail brute n\'est pas dans le depot',
           !fs.existsSync(path.join(ICI, '..', 'referentiel')));
  // LA QUADRICHROMIE NE VAUT JAMAIS ZERO COULEUR. La source code la quadri par
  // 0 ; un « 0 couleur » a l'ecran serait la bourde qui coute la credibilite.
  const tousPlafonds = GRILLE.archetypes.flatMap((p) => p.zones.flatMap(
    (z) => z.techniques.map((t) => t.couleursMax)));
  controle('aucun plafond de couleurs ne vaut 0 dans la grille',
           !tousPlafonds.includes(0),
           `${tousPlafonds.filter((n) => n === null).length} quadri sur ${tousPlafonds.length}`);
  // UN ARCHETYPE EST UN COUPLE FAMILLE x MATIERE, pas une reference. Sans la
  // matiere, la carte redevient un produit de catalogue.
  controle('chaque archetype porte sa matiere et son volume d\'observation',
           GRILLE.archetypes.every((a) => a.matiere && a.produits >= 8),
           `${GRILLE.archetypes.length} archetypes`);
  // UNE TECHNIQUE ABSENTE DE LA TABLE N'EST PAS AUTORISEE PAR DEFAUT. La base
  // de travail evolue ; si elle introduit un nom inconnu, ce controle tombe et
  // quelqu'un tranche, au lieu qu'un verdict se rende tout seul.
  const nomsGrille = GRILLE.archetypes.flatMap((p) => p.zones)
    .flatMap((z) => z.techniques).map((t) => t.technique);
  const inconnues = techniquesInconnues(nomsGrille);
  controle('toute technique servie est classee vectoriel ou image',
           inconnues.length === 0, inconnues.join(', ') || 'aucune');
  controle('temoin : une technique inventee serait bien signalee',
           techniquesInconnues(['Marquage sur nuage']).length === 1);
  controle('toute technique servie sait se dire avec son article',
           nomsGrille.every((n) => /^(le |la |l')/.test(avecArticle(n))),
           [...new Set(nomsGrille)].map(avecArticle).slice(0, 3).join(', '));

  // 8 bis. CE QUI EST PHYSIQUEMENT IMPOSSIBLE NE S'AFFICHE JAMAIS. B1 du brief
  // du 20/08 : la page a annonce « toute la surface : en sublimation » sur une
  // bouteille en acier inoxydable. La sublimation teint le polyester ou un
  // revetement, pas le metal nu. Une seule affirmation de ce genre, relevee par
  // un professionnel, suffit a tuer la credibilite du site.
  //
  // Le controle porte sur les OFFRES RETENUES, toutes matieres et tous
  // contextes : c'est une garde de classe, pas un cas particulier.
  const contextes = [
    { nCouleurs: 1, ratio: 1, fichierVectoriel: true },
    { nCouleurs: 4, ratio: 1.4, fichierVectoriel: true },
    { nCouleurs: 9, ratio: 2.5, fichierVectoriel: false, largeurPx: 3000 },
  ];
  const impossibles = [];
  for (const ctx of contextes) {
    for (const p of jugerGrille(GRILLE, ctx)) {
      for (const offre of [p.meilleure, p.refusee, p.gain?.meilleure]) {
        if (!offre) continue;
        if (compatibilite(p.matiere, offre.technique).etat === 'non') {
          impossibles.push(`${p.libelle} / ${offre.technique}`);
        }
      }
    }
  }
  controle('aucune offre retenue n\'est physiquement impossible sur sa matiere',
           impossibles.length === 0, impossibles.slice(0, 3).join(', ') || 'aucune');
  controle('temoin : la table sait dire non, et sait dire sous condition',
           compatibilite('coton', 'Sublimation').etat === 'non'
             && compatibilite('verre', 'Broderie').etat === 'non'
             && compatibilite('acier inoxydable', 'Sublimation').etat === 'conditionnel'
             && compatibilite('coton', 'Sérigraphie').etat === 'oui');
  // Et une condition ne se tait jamais : « en sublimation » sur de l'inox sans
  // « à revêtement sublimable » est exactement l'affirmation fausse qu'on
  // vient de corriger.
  const inox = jugerGrille(GRILLE, { nCouleurs: 1, ratio: 1.33, fichierVectoriel: true })
    .find((p) => p.matiere === 'acier inoxydable' && p.meilleure?.condition);
  controle('une offre sous condition affiche toujours sa condition',
           !inox || /revêtement sublimable/.test(rendreGrille([inox], {})),
           inox ? direProduit(inox) : 'aucune offre conditionnelle dans ce cas');

  // 8 ter. B3 : QUAND LA ZONE PROPOSEE N'EST PAS L'EVIDENTE, LA CARTE DIT
  // POURQUOI. Sans cette phrase, la casquette proposait le côté sans un mot sur
  // le devant, et la carte paraissait absurde alors qu'elle avait raison.
  const casquette = jugerGrille(GRILLE,
    { nCouleurs: 4, ratio: 1.4, fichierVectoriel: false, largeurPx: 2400 })
    .find((p) => p.famille === 'Casquette');
  controle('un ecart a la zone evidente est explique, jamais tu',
           !casquette?.refusee
             || /(réclame un fichier vectoriel|n'accepte|manquerait de pixels)/
               .test(direProduit(casquette)),
           casquette ? direProduit(casquette) : 'pas de casquette dans la grille');
  // Et il ne se dit PAS quand la zone evidente passe : « pas sur la face avant »
  // serait faux si elle marche et qu'on propose plus grand ailleurs.
  const menteursEcart = jugerGrille(GRILLE, { nCouleurs: 4, ratio: 1.4, fichierVectoriel: true })
    .filter((p) => p.refusee && p.refusee.accepte && p.refusee.fichierPasse);
  controle('aucun ecart annonce sur une zone qui passe',
           menteursEcart.length === 0, menteursEcart.map((p) => p.libelle).join(', ') || 'aucun');

  // 9. LE RENDU ne cite plus aucune source et ne porte plus un seul lien
  // externe : decision d'Alex du 20/08, le visiteur n'a pas besoin de savoir
  // d'ou vient un chiffre, il a besoin de savoir si ca passe.
  const html = rendreGrille(choix.choisis, { contraste: choix });
  controle('la grille ne porte aucun lien externe', !/<a href="https?:/.test(html));
  controle('la grille ne cite aucune source',
           !/(relevé le|d'où viennent)/i.test(html.replace(/<[^>]+>/g, ' ')));
  controle('elle affiche une carte par archetype retenu',
           (html.match(/<article class="produit /g) || []).length === choix.choisis.length);
  controle('un seul appel a l\'action sur l\'ecran, celui de la vectorisation',
           (html.match(/cta-entete/g) || []).length <= 1);
  controle('aucun mot interdit dans la grille',
           !MOTS_INTERDITS.some((m) => html.toLowerCase().includes(m)));
  controle('aucun pourcentage ni confiance dans la grille',
           !MOTIF_CONFIANCE.test(html.replace(/<[^>]+>/g, ' ')));
  // Le nom d'origine des zones ne sort jamais a l'ecran : il est en anglais et
  // il ne veut rien dire pour un acheteur.
  const anglais = ['ROUNDSCREEN', 'FRONT UPPER', 'BARREL', 'CHEST', 'LID TOP', 'TD1', ' PD',
                   'SEGMENT', 'POUCH', 'SHOULDER'];
  const anglicisme = anglais.find((z) => html.toUpperCase().includes(z));
  controle('aucun nom de zone d\'origine ne sort a l\'ecran', !anglicisme, anglicisme || 'aucun');
  // Et la page dit sur quoi elle a calcule : REGLE 3 de formulation.js, un
  // verdict calcule sur une mediane de famille doit DIRE sur quoi il calcule.
  controle('la page dit qu\'elle agrege des matieres, pas des references',
           /matières/.test(html) && /médiane/.test(html) && /peut différer/.test(html));
}

// LA GRILLE DE FEUX PAR TECHNIQUE, lot 1 du 21/08.
//
// Le feu repond a UNE QUESTION D'ACTION, jamais a un jugement de valeur :
// puis-je envoyer ce fichier tel quel pour cette technique ? Les controles
// portent donc sur la SEMANTIQUE, cas par cas, avec des contextes ecrits a la
// main : un feu qui glisse d'une couleur a l'autre change ce que le visiteur
// va faire de sa journee.
{
  const { jugerFeux, compterFeux, TECHNIQUES_FEUX, MARQUAGE_COURANT_MM } =
    await import('../src/verdict/feux.js');
  const { rendreFeux, pointsAttention, luminance } =
    await import('../src/verdict/rendu_feux.js');
  const seuils = SEUILS;
  const base = { fusion: { fusionne: false }, degrade: false, seuils };
  const par = (feux) => Object.fromEntries(feux.map((f) => [f.cle, f]));

  // 1. LA CARTE EST COMPLETE ET SON ORDRE NE BOUGE PAS. Sept techniques, c'est
  // tout le metier : c'est ce qui rend le « sur 7 » non arbitraire, la ou un
  // echantillon de produits l'etait. Et un visiteur qui revient doit retrouver
  // la serigraphie a la meme place.
  controle('la grille porte les sept techniques du referentiel',
           TECHNIQUES_FEUX.length === 7);
  controle('chacune porte sa definition et ses produits, jamais l\'une sans l\'autre',
           TECHNIQUES_FEUX.every((t) => t.definition && t.produits
             && t.produits.split(',').length >= 5));
  controle('l\'ordre est celui de la frequence d\'usage, pas l\'alphabet',
           TECHNIQUES_FEUX[0].cle === 'numerique_uv'
             && TECHNIQUES_FEUX[1].cle === 'transfert_dtf'
             && TECHNIQUES_FEUX[6].cle === 'marquage_a_chaud');

  // 2. VERT : un vectoriel simple passe partout. C'est le cas ou le visiteur
  // est servi, et il ne doit rien avoir a lire.
  const vectoriel = jugerFeux({ ...base, nCouleurs: 2, fichierVectoriel: true });
  controle('un vectoriel a deux couleurs, sans fusion, passe sur les sept',
           compterFeux(vectoriel).vert === 7, JSON.stringify(compterFeux(vectoriel)));

  // 3. ORANGE A, LE FORMAT. Une image nette bute sur les cinq techniques qui
  // fabriquent un outil, et sur elles SEULEMENT : les deux numeriques
  // impriment une image, c'est le correctif du 20/08 et il tient.
  const image = par(jugerFeux({ ...base, nCouleurs: 2, fichierVectoriel: false,
                               largeurPx: 4000 }));
  controle('une image nette reste verte sur les deux techniques numeriques',
           image.numerique_uv.feu === 'vert' && image.transfert_dtf.feu === 'vert');
  controle('et orange FORMAT sur les cinq qui fabriquent un outil',
           ['serigraphie', 'tampographie', 'gravure_laser', 'broderie', 'marquage_a_chaud']
             .every((c) => image[c].feu === 'orange' && image[c].nuance === 'format'));

  // 4. ORANGE B, LA DEFINITION, et la distinction est le coeur du lot : ce
  // n'est pas la meme personne qui regle le probleme. Le format, NOUS le
  // reglons ; la definition, nous ne le pouvons pas, vectoriser un logo de
  // deux cents pixels donne un fichier propre et une forme fausse.
  const floue = par(jugerFeux({ ...base, nCouleurs: 2, fichierVectoriel: false,
                               largeurPx: 60 }));
  controle('une image trop petite passe en orange DEFINITION, pas en rouge',
           floue.numerique_uv.feu === 'orange' && floue.numerique_uv.nuance === 'definition',
           `${floue.numerique_uv.feu} / ${floue.numerique_uv.nuance}`);
  controle('et la sortie proposee est de chercher un fichier plus grand',
           /plus grande version/.test(rendreFeux([floue.numerique_uv]))
             && !/Obtenir mon fichier vectoriel/.test(rendreFeux([floue.numerique_uv])));
  controle('le format, lui, propose le bouton : c\'est nous qui le reglons',
           /Obtenir mon fichier vectoriel/.test(rendreFeux([image.serigraphie])));
  // LE MOT S'APPREND, il ne se contourne pas. La raison disait « des courbes »
  // et le bouton disait « fichier vectoriel » : deux mots pour une seule chose,
  // et aucun des deux n'expliquait l'autre. Le marqueur, lui, dit « vectoriel »
  // au telephone : c'est ce mot la que le visiteur doit repartir en sachant.
  controle('et la raison NOMME le fichier vectoriel, elle ne dit pas que « des courbes »',
           /fichier vectoriel/.test(rendreFeux([image.serigraphie])
             .match(/class="feu-raison">([^<]*)</)?.[1] ?? ''));

  // 5. ROUGE R1, TROP DE COULEURS, et seulement la ou le plafond SERT. La
  // tampographie a son seuil ARBITRÉ ALEX du 20/08 ; la serigraphie n'a qu'un
  // AGREGAT, qui ne produit aucun verdict. Un plafond observe chez un
  // grossiste n'est pas un plafond d'atelier.
  const neuf = par(jugerFeux({ ...base, nCouleurs: 9, fichierVectoriel: true }));
  controle('neuf couleurs ferment la tampographie, dont le plafond est arbitre',
           neuf.tampographie.feu === 'rouge' && neuf.tampographie.cause === 'couleurs');
  controle('mais pas la serigraphie, dont le plafond n\'est qu\'un agregat',
           neuf.serigraphie.feu !== 'rouge' || neuf.serigraphie.cause !== 'couleurs',
           `${neuf.serigraphie.feu} / ${neuf.serigraphie.cause ?? ''}`);
  controle('et le rouge ecrit le brief du graphiste, avec le chiffre',
           /Une version à 4 couleurs maximum/.test(rendreFeux([neuf.tampographie]))
             && /Il en compte 9/.test(rendreFeux([neuf.tampographie])));

  // 6. ROUGE R2, LE LOGO CASSE EN MONOCHROME. C'est la mesure qui distingue le
  // site de tout ce qui existe, et elle ne se pose QUE sur les techniques qui
  // ne posent qu'une matiere. Un logo a trois couleurs grave au laser n'est
  // PAS un rouge par principe : il sort en monochrome, c'est le cas standard.
  const fusionne = par(jugerFeux({ ...base, nCouleurs: 3, fichierVectoriel: true,
    fusion: { fusionne: true, partPerdue: 0.18,
              confusion: { absorbee: [246, 238, 222], absorbante: [198, 40, 50] } } }));
  controle('un logo qui se referme en monochrome ferme la gravure et le marquage a chaud',
           fusionne.gravure_laser.feu === 'rouge' && fusionne.gravure_laser.cause === 'monochrome'
             && fusionne.marquage_a_chaud.cause === 'monochrome');
  controle('et il ne ferme RIEN sur les techniques a plusieurs couleurs',
           fusionne.serigraphie.feu === 'vert' && fusionne.transfert_dtf.feu === 'vert',
           `${fusionne.serigraphie.feu} / ${fusionne.transfert_dtf.feu}`);
  controle('temoin : sans fusion, la gravure repasse au vert',
           par(jugerFeux({ ...base, nCouleurs: 3, fichierVectoriel: true }))
             .gravure_laser.feu === 'vert');
  controle('le rouge monochrome nomme ce qui se confond, et quoi demander',
           /partie claire/.test(rendreFeux([fusionne.gravure_laser]))
             && /ajoutant un contour/.test(rendreFeux([fusionne.gravure_laser])));

  // 7. ROUGE R6, LE DEGRADE, sur les techniques sans demi-teinte seulement.
  const degrade = par(jugerFeux({ ...base, nCouleurs: 3, fichierVectoriel: true,
                                 degrade: true }));
  controle('un degrade ferme les techniques a passages, jamais les numeriques',
           degrade.serigraphie.cause === 'degrade' && degrade.numerique_uv.feu === 'vert');

  // 8. LE BRIEF SE COPIE. Cout nul, valeur immediate, et le texte emporte notre
  // raisonnement chez un professionnel qui decouvre le site au passage.
  const htmlRouge = rendreFeux([neuf.tampographie]);
  controle('chaque rouge porte un bouton de copie, avec le texte complet dedans',
           /class="feu-copier"/.test(htmlRouge)
             && /data-copier="[^"]*Ce qu&#039;il faut demander|data-copier="[^"]*faut demander/
               .test(htmlRouge));
  // LE REFLEXE GRATUIT PASSE AVANT L'OFFRE. C'est la signature du site.
  controle('et il rappelle d\'abord que la version existe peut-etre deja',
           /demandez-la à qui a fait votre\s+logo/.test(htmlRouge.replace(/\s+/g, ' ')));

  // 9. AUCUN SEUIL INVENTE. Trois causes de rouge attendent P0 : le trait trop
  // fin, l'ecart trop etroit, le texte trop petit. Le moteur les mesure depuis
  // longtemps ; tant que le seuil n'est pas arbitre, elles se taisent. Un seuil
  // invente se recopie longtemps.
  const tous = [vectoriel, ...Object.values(image), ...Object.values(neuf),
                ...Object.values(fusionne)].flat();
  controle('aucune cause de rouge ne s\'appuie sur un seuil non arbitre',
           tous.every((f) => !f.cause || ['couleurs', 'monochrome', 'degrade'].includes(f.cause)),
           [...new Set(tous.map((f) => f.cause).filter(Boolean))].join(', '));
  controle('le plancher de marquage courant est nomme, pas cache dans le code',
           MARQUAGE_COURANT_MM === 50);

  // 10. LES POINTS D'ATTENTION. Le premier n'existe nulle part ailleurs : une
  // couleur presque blanche disparait sur un objet blanc, qui est le cas par
  // defaut du coton et de la ceramique.
  const clair = pointsAttention({
    m2Couleurs: { couleursReelles: 2, palette: [
      { rvb: [246, 240, 226], part: 0.3 }, { rvb: [198, 40, 50], part: 0.7 }] },
    boiteEncre: { rapport: 1.5 } });
  controle('une couleur presque blanche declenche l\'alerte support clair',
           clair.some((p) => p.cle === 'support'), clair.map((p) => p.cle).join(', '));
  controle('temoin : deux couleurs foncees ne la declenchent pas',
           !pointsAttention({ m2Couleurs: { couleursReelles: 2, palette: [
             { rvb: [20, 40, 60], part: 0.5 }, { rvb: [198, 40, 50], part: 0.5 }] },
             boiteEncre: { rapport: 1.5 } }).some((p) => p.cle === 'support'));
  controle('un logo tres allonge previent qu\'il exclut les objets a zone basse',
           pointsAttention({ m2Couleurs: { couleursReelles: 1, palette: [] },
             boiteEncre: { rapport: 4 } }).some((p) => p.cle === 'proportion'));
  controle('la luminance sait distinguer un creme d\'un rouge fonce',
           luminance([246, 240, 226]) > 0.8 && luminance([198, 40, 50]) < 0.3);

  // 11. LES REGLES DE CHARTE TIENNENT SUR LE NOUVEL ECRAN.
  const ecran = rendreFeux(jugerFeux({ ...base, nCouleurs: 9, fichierVectoriel: false,
    largeurPx: 2000, fusion: { fusionne: true, partPerdue: 0.2, confusion: null } }));
  controle('aucun mot interdit dans la grille de feux',
           !MOTS_INTERDITS.some((m) => ecran.toLowerCase().includes(m)));
  controle('aucun pourcentage ni confiance dans la grille de feux',
           !MOTIF_CONFIANCE.test(ecran.replace(/<[^>]+>/g, ' ')));
  controle('aucun lien externe dans la grille de feux', !/<a href="https?:/.test(ecran));

  // 12. LA DIRECTION VISUELLE DU 24/08 : DEUX CARTES, UN BOITIER, DES PICTOS.
  //
  // Ce qui se controle ici n'est pas du gout : ce sont les trois choses qui
  // cassent en silence. Une lampe allumee de trop, et le feu ment. Un sprite
  // repete sept fois, et la page triple de poids sans que rien ne se voie. Un
  // picto absent, et une puce sort avec un rond neutre que personne ne
  // remarque a la relecture.
  const { spritePictos, pictoProduit, pictosManquants, PICTOS_TECHNIQUE,
    PARTAGES_VOULUS, objets } = await import('../src/verdict/pictos.js');

  controle('le sprite des pictos est pose UNE seule fois dans la grille',
           (ecran.match(/class="sprite-pictos"/g) ?? []).length === 1);
  controle('chaque carte porte exactement une lampe allumee',
           (ecran.match(/<article class="feu /g) ?? []).length
             === (ecran.match(/feu-lampe lampe-\w+ allumee/g) ?? []).length);
  const cartesVertes = (ecran.match(/class="feu feu-vert"/g) ?? []).length;
  controle('et la lampe allumee est bien celle de la couleur du feu',
           (ecran.match(/lampe-vert allumee/g) ?? []).length === cartesVertes,
           `${cartesVertes} carte(s) verte(s)`);
  controle('les sept techniques ont chacune leur picto',
           TECHNIQUES_FEUX.every((t) => PICTOS_TECHNIQUE[t.cle])
             && Object.keys(PICTOS_TECHNIQUE).length === TECHNIQUES_FEUX.length);
  controle('chaque objet frequent sort avec une puce illustree',
           (ecran.match(/class="feu-objet"/g) ?? []).length
             === TECHNIQUES_FEUX.reduce((n, t) => n + objets(t.produits).length, 0));

  // LE RAPPORT DES PICTOS A COMMANDER. Ce n'est pas un echec : c'est une
  // demande a passer au dessin, et le harnais la tient a jour tout seul. La
  // regle du 24/08 est de NE PAS improviser une icone dans un autre style.
  const manquants = pictosManquants(TECHNIQUES_FEUX);
  // LA LISTE DES PARTAGES VOULUS NE DOIT PAS DERIVER. Un partage declare qui
  // n'en est plus un laisse croire qu'un choix a ete fait, alors que le dessin
  // a change sous lui. On verifie les deux moities : les deux objets portent
  // bien le meme picto, et ils ne se croisent dans AUCUNE carte, sinon ce
  // n'etait pas un partage voulu mais un manque non declare.
  controle('chaque partage de picto declare en est vraiment un',
           PARTAGES_VOULUS.every((v) =>
             pictoProduit(v.produit) === pictoProduit(v.partageAvec)
             && !TECHNIQUES_FEUX.some((t) => {
               const l = objets(t.produits);
               return l.includes(v.produit) && l.includes(v.partageAvec);
             })),
           PARTAGES_VOULUS.filter((v) =>
             pictoProduit(v.produit) !== pictoProduit(v.partageAvec))
             .map((v) => v.produit).join(', '));
  controle('aucun picto absent n\'est ignore : le rapport les nomme tous',
           TECHNIQUES_FEUX.flatMap((t) => objets(t.produits))
             .filter((n) => pictoProduit(n) === 'defaut')
             .every((n) => manquants.some((m) => m.produit === n)));
  if (manquants.length) {
    console.log('');
    console.log('  PICTOGRAMMES A COMMANDER, dans le meme langage graphique :');
    for (const m of manquants) {
      console.log(`    - ${m.produit} (${m.technique}) : `
        + (m.motif === 'absent' ? 'aucun dessin, tombe sur le rond neutre'
                                : `porte le meme picto que « ${m.partageAvec} »`));
    }
  }
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
