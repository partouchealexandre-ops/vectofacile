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
  const { rendreFeux } = await import('../src/verdict/rendu_feux.js');
  const v = juger({ mesures: mesuresImpeccables(), seuils: SEUILS });
  const html = rendreVerdict(v, [], { origine: 'vectoriel' });
  const bas = html.toLowerCase();
  const fautif = MOTS_INTERDITS.find((mot) => bas.includes(mot));
  controle('le rendu ne contient aucun mot interdit', !fautif, fautif || 'aucun');
  controle('le rendu ne contient ni pourcentage ni confiance',
           !MOTIF_CONFIANCE.test(bas), (bas.match(MOTIF_CONFIANCE) || ['aucun'])[0]);
  // UN LIBELLE HOSTILE NE PASSE PAS, et le controle verifie l'echappement ET
  // son effet : la chaine doit etre la, echappee, pas disparue.
  //
  // IL A CHANGE DE SURFACE LE 01/09/2026, avec la suppression de la grille de
  // produits. C'etait le SEUL controle d'echappement du projet, et il vivait
  // sur un ecran que plus personne n'affichait : le retirer avec le reste
  // aurait supprime une garde de securite sans que rien ne le signale. Il
  // porte desormais sur la grille des feux, celle que le visiteur lit, et sur
  // le champ qui vient des donnees : le nom de la technique.
  const hostile = rendreFeux([{
    cle: 'serigraphie', nom: '<img src=x onerror=alert(1)>', feu: 'vert',
    definition: 'Une couleur, un écran, un passage.', produits: '', chiffres: {},
  }]);
  controle('un libelle venu des donnees est echappe dans le rendu',
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
  const { rendreActionFichier, rendreSuite, rendreReprise, PRIX_REDESSIN_HT_EUR,
          CONTACT, CONTACT_OPERATIONNEL } =
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
  // LE FAUX VECTORIEL A TROIS ETATS DEPUIS LE 01/09/2026, et le harnais les
  // eprouve tous les trois. Il ne s'arrete plus a la porte : son image se
  // vectorise comme n'importe quelle image, parce que les memes pixels deposes
  // en JPEG l'etaient deja. Ce qui ne change pas : le constat passe en premier,
  // et le reflexe gratuit, le fichier source du graphiste, passe avant l'offre.
  const fauxAttente = rendreActionFichier({ origine: 'faux_vectoriel', vectorise: null });
  const fauxFait = rendreActionFichier({ origine: 'faux_vectoriel', vectorise: true });
  const faux = rendreActionFichier({ origine: 'faux_vectoriel', vectorise: false });
  controle('un faux vectoriel est nomme pour ce qu\'il est, dans les trois etats',
           [fauxAttente, fauxFait, faux].every((t) => /n'en est pas un/.test(t)));
  controle('en attente, il annonce le trace sans le promettre livre',
           /dans un instant/.test(fauxAttente) && !/en bas de page/.test(fauxAttente));
  controle('une fois trace, il dit ce qu\'on a fait',
           /retracé l\'image/.test(fauxFait));
  controle('et il place le fichier source du graphiste AVANT notre trace',
           fauxFait.indexOf('réclamez-le') > fauxFait.indexOf('retracé'));
  controle('si le trace echoue, la sortie est la meme que pour une image',
           /comment-vectoriser-un-jpeg/.test(faux) && /graphiste/.test(faux));
  // P0.5 tient sur TOUTES les variantes, « impossible » compris.
  const toutes = [imageOk, imageRefus, vrai, faux, fauxAttente, fauxFait].join(' ').toLowerCase();
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
  // LE BLOC « ET MAINTENANT » SUIT L'ETAT REEL DE L'ADRESSE, dans les deux
  // sens : ferme, il ne rend rien ; ouvert, il donne l'adresse. Depuis le
  // 31/08 il la donne comme l'offre de redessin, en toutes lettres et sans
  // formulaire : un bouton `mailto:` ne repond pas chez qui lit son courrier
  // dans un navigateur.
  const diagPrix = 'Diagnostic fait sur bonamarquer.fr :\n- 3 couleur(s) réelle(s)';
  const suite = rendreSuite(diagPrix, { adresseOuverte: true });
  controle('le bloc de demande ne rend rien tant que l\'adresse ne recoit pas',
           rendreSuite(diagPrix, { adresseOuverte: false }) === '');
  controle('et il suit le drapeau par defaut, sans qu\'on ait a le lui dire',
           rendreSuite(diagPrix) === (CONTACT_OPERATIONNEL ? suite : ''),
           CONTACT_OPERATIONNEL ? 'adresse operationnelle' : 'adresse pas encore ouverte');
  controle('il donne l\'adresse en toutes lettres, pas seulement en lien',
           suite.includes(`>${CONTACT}<`), CONTACT);
  controle('et le diagnostic s\'y copie, il ne se retape pas',
           /class="feu-copier"[^>]*data-copier="[^"]+"/.test(suite));
  // AUCUN FORMULAIRE, ET AUCUN BOUTON QUI OUVRE UNE MESSAGERIE. Les deux
  // reposaient sur une adresse `mailto:` qui ne repond pas partout, et le
  // champ email redemandait ce que la messagerie du visiteur connait deja.
  controle('il ne fabrique plus de formulaire ni de bouton mailto',
           !/<input/.test(suite) && !/id="suite_envoyer"/.test(suite));
  const motSuite = MOTS_INTERDITS.find((m) => suite.toLowerCase().includes(m));
  controle('aucun mot interdit dans le bloc de demande', !motSuite, motSuite || 'aucun');

  // L'OFFRE DE REDESSIN, 30/08/2026, arbitrage Alex.
  //
  // Les avertissements du moteur nommaient la sortie du metier et s'arretaient
  // la. L'offre la rend accessible, et elle obeit a deux conditions, chacune
  // eprouvee dans LES DEUX SENS : elle ne parait que si une limite a ete
  // nommee, et que si l'adresse peut recevoir. Un controle qui ne saurait
  // eprouver qu'un seul des deux etats ne dirait rien le jour de la bascule.
  const limite = [{ gravite: 'notable', titre: 'Les petits textes sortiront approximatifs' }];
  const diag = 'Diagnostic fait sur bonamarquer.fr :\n- image de 416 par 300 pixels';
  const ouverte = rendreReprise(limite, { adresseOuverte: true, diagnostic: diag });
  const fermee = rendreReprise(limite, { adresseOuverte: false, diagnostic: diag });
  const sansLimite = rendreReprise([], { adresseOuverte: true, diagnostic: diag });
  controle('l\'offre de redessin ne parait pas tant que l\'adresse ne recoit pas',
           fermee === '');
  controle('et elle parait des que l\'adresse recoit',
           /Faire redessiner ce logo/.test(ouverte));
  controle('elle ne se propose PAS quand aucune limite n\'a ete nommee',
           sansLimite === '');
  // ON DEMANDE UN MAIL, ON NE FABRIQUE PAS UN FORMULAIRE. Une adresse
  // `mailto:` ne fait rien sur une machine sans logiciel de courrier
  // configure, et c'est le cas courant chez qui lit son courrier dans un
  // navigateur. L'adresse est donc ECRITE, lisible et recopiable meme si le
  // lien ne s'ouvre pas.
  controle('elle donne l\'adresse en toutes lettres, pas seulement en lien',
           ouverte.includes(`>${CONTACT}<`), CONTACT);
  controle('elle dit de joindre le logo au message',
           /pièce jointe/.test(ouverte));
  // Le diagnostic se copie, il ne se retape pas. Motif du brief de graphiste,
  // pose le 21/08 : un seul ecouteur pour tous les boutons `data-copier`.
  controle('le diagnostic mesure se copie en un clic',
           /class="feu-copier"[^>]*data-copier="[^"]+"/.test(ouverte));
  controle('et sans diagnostic, aucun bouton de copie vide',
           !/feu-copier/.test(rendreReprise(limite, { adresseOuverte: true })));
  // LE PRIX EST HORS TAXES, ET IL EST ECRIT HORS TAXES. On s'adresse a des
  // entreprises ; un prix affiche sans mention se lit TTC, et la difference se
  // decouvre a la facture, ce qui est la pire facon de la decouvrir.
  controle('elle annonce son prix, une fois, et hors taxes',
           new RegExp(`${PRIX_REDESSIN_HT_EUR}\\s*€\\s*HT`).test(ouverte),
           `${PRIX_REDESSIN_HT_EUR} € HT`);
  // LA RESERVE DE FAISABILITE, arbitrage Alex du 30/08. Elle est ecrite a cote
  // du prix, pas decouverte au moment de la facture.
  controle('elle pose la reserve de faisabilite avant de prendre la commande',
           /avant de nous engager/.test(ouverte) && /assez d'information/.test(ouverte));
  // ET ELLE NE JUGE PAS LE FICHIER POUR AUTANT : un fait sur l'image, jamais
  // un adjectif sur le logo. Meme regle que les avertissements du moteur.
  controle('et elle ne porte aucun jugement sur le logo du client',
           !/mauvais|pourri|médiocre|mediocre|décevant|decevant|moche/i.test(ouverte));
  // LE PRIX D'ACHAT ET LE FOURNISSEUR NE SONT PAS DANS LE DEPOT. Cet
  // arbitrage vit dans briefs/arbitrages_vecto.md, et lui seul.
  const moduleServi = fs.readFileSync(
    path.join(ICI, '..', 'src', 'verdict', 'rendu_grille.js'), 'utf-8').toLowerCase();
  controle('aucun nom de fournisseur ni prix d\'achat dans le module servi',
           !/superpictor|prix_achat|prix_achat_eur/.test(moduleServi));
  controle('elle redit que le logo ne part pas de la page',
           /ne part pas/.test(ouverte));
  const motRepris = MOTS_INTERDITS.find((m) => ouverte.toLowerCase().includes(m));
  controle('aucun mot interdit dans l\'offre de redessin', !motRepris, motRepris || 'aucun');
  controle('aucun pourcentage ni confiance dans l\'offre de redessin',
           !MOTIF_CONFIANCE.test(ouverte));

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

// LES DONNEES DE LA GRILLE, ET LA CLOISON.
//
// CE BLOC A MAIGRI LE 01/09/2026, avec la suppression de la grille de produits.
// Il portait quarante-trois controles, dont trente-cinq passaient par
// jugerGrille, jugerProduit ou rendreGrille : ils eprouvaient un ecran que plus
// aucune page n'affichait depuis le 24/08. Un instrument vert sur un ecran
// invisible ne dit pas qu'une chose est saine, il dit seulement qu'elle n'a pas
// bouge, et il donne l'illusion d'une fonctionnalite tenue.
//
// CE QUI RESTE ne depend d'aucun rendu : les DONNEES SERVIES doivent etre
// saines, et la CLOISON doit tenir. archetypes.json est toujours charge par la
// grille des feux, donc ces gardes protegent un fichier vivant.
//
// Ce que la suppression emporte se relit dans l'historique, au commit qui la
// fait : « pas la, mais la », « le refus dit a combien de couleurs ca se
// rouvre », la selection a huit cartes. Si la grille revient un jour, ces
// regles sont la, ecrites.
{
  const { techniquesInconnues, avecArticle } = await import('../src/verdict/techniques.js');
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
  // Le drapeau de l'adresse et l'adresse elle-meme, lus a la source : ce bloc
  // ne les recopie pas, sinon il mesurerait sa propre copie.
  const { CONTACT, CONTACT_OPERATIONNEL } =
    await import('../src/verdict/rendu_grille.js');
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
             && /Votre logo compte 9 couleurs/.test(rendreFeux([neuf.tampographie])));
  // LA PHRASE DIT DE QUOI ELLE PARLE, et elle ne promet pas plus que le fichier
  // de seuils ne contient. Le plafond de tampographie est un ARBITRÉ ALEX, pas
  // une valeur SOURCÉE : aucune fiche d'atelier du referentiel ne le publie. Il
  // se dit donc au regime de l'usage, jamais comme une borne du metier.
  controle('le brief compte des COULEURS, il ne compte pas dans le vide',
           /compte 9 couleurs/.test(rendreFeux([neuf.tampographie])));
  controle('et le plafond arbitre se dit « generalement », « au maximum »',
           /généralement 4 au maximum/.test(rendreFeux([neuf.tampographie])),
           rendreFeux([neuf.tampographie]).match(/en acceptent[^:]*/)?.[0] ?? '');
  controle('(temoin) la phrase ne pose plus le plafond comme un fait etabli',
           !/Les ateliers en acceptent 4 :/.test(rendreFeux([neuf.tampographie])));
  // LE TROISIEME BLOC DE CONTACT, celui qui vit sous un brief de graphiste.
  //
  // Il avait dormi derriere le drapeau avec un champ email et un bouton sans
  // gestionnaire, pendant que les deux autres etaient corriges le 31/08.
  // Personne ne l'a vu parce qu'aucun ecran ne l'affichait. Il est desormais
  // mesure comme les deux autres, et dans les deux sens.
  const briefRouge = rendreFeux([neuf.tampographie]);
  controle('sous un rouge, l\'offre suit le drapeau de l\'adresse',
           /Envoyez-nous votre logo/.test(briefRouge) === CONTACT_OPERATIONNEL,
           CONTACT_OPERATIONNEL ? 'adresse operationnelle' : 'adresse pas encore ouverte');
  controle('elle ne fabrique ni formulaire ni bouton sans gestionnaire',
           !/<input/.test(briefRouge) && !/id="brief_envoyer"/.test(briefRouge));
  controle('et elle donne l\'adresse en toutes lettres',
           !CONTACT_OPERATIONNEL || briefRouge.includes(`>${CONTACT}<`), CONTACT);
  controle('le reflexe gratuit reste avant l\'offre',
           briefRouge.indexOf('elle vous appartient') < briefRouge.indexOf('€ HT')
             || !CONTACT_OPERATIONNEL);

  // 5 bis. LE NOMBRE DE COULEURS SE LIT SUR LES EMPLACEMENTS, 26/08/2026.
  //
  // Les controles ci-dessus passent une grille NULLE : ils testent le secours,
  // celui qui retombe sur le chiffre unique de seuils.json. Ceux qui suivent
  // passent la VRAIE grille, celle que la page charge, et c'est le seul moyen
  // de verifier ce que verra un visiteur.
  //
  // Ce qui se joue ici : un chiffre unique par technique etait contraire a la
  // doctrine du site depuis le premier jour. Le plafond appartient a
  // l'EMPLACEMENT. Nos propres archetypes le prouvent : sous le mot
  // « serigraphie » cohabitent des emplacements a une couleur, a quatre et a
  // huit.
  {
    const grille = GRILLE;
    const NOMS = {
      serigraphie: ['Sérigraphie', 'Sérigraphie circulaire', 'Transfert sérigraphique'],
      tampographie: ['Tampographie'],
      gravure_laser: ['Gravure laser', 'Gravure laser 360'],
      broderie: ['Broderie'],
      numerique_uv: ['Impression numérique', 'Impression numérique 360',
                     'Étiquette numérique', 'Doming'],
      transfert_dtf: ['Transfert numérique', 'Sublimation'],
      marquage_a_chaud: ['Embossage', 'Marquage à chaud'],
    };
    const surGrille = (n) => par(jugerFeux(
      { ...base, nCouleurs: n, fichierVectoriel: true, nomsParFamille: NOMS }, grille));

    // LA REGLE DE REALISME EXISTE ET ELLE EST ARBITREE. Si elle perdait son
    // etat, le moteur cesserait silencieusement de prononcer ses oranges.
    controle('le seuil de realisme est ARBITRÉ ALEX, sinon il ne sert pas',
             seuils.realisme_couleurs?.etat === 'ARBITRÉ ALEX'
               && Number.isFinite(seuils.realisme_couleurs?.vert_jusqua),
             seuils.realisme_couleurs?.etat ?? 'absent');
    controle('et il ne publie aucun montant ni aucun code de procede fournisseur',
             !/[0-9][0-9,.]*\s*(€|EUR)|\b(ST1|S1|S2|S3|S4|P4)\b/
               .test(JSON.stringify(seuils.realisme_couleurs ?? {})));

    // LE CAS D'ALEX DU 26/08 : un vectoriel a sept couleurs. La serigraphie
    // etait VERTE, parce qu'aucun plafond ne servait pour elle. Elle est
    // desormais orange, et pour la bonne raison : une partie des emplacements
    // l'accepte, l'autre non.
    const sept = surGrille(7);
    controle('sept couleurs mettent la serigraphie en orange, plus en vert',
             sept.serigraphie.feu === 'orange' && sept.serigraphie.nuance === 'couleurs',
             `${sept.serigraphie.feu} / ${sept.serigraphie.nuance ?? ''}`);
    controle('et l\'orange compte les emplacements au lieu d\'annoncer un seuil',
             sept.serigraphie.chiffres.accepte > 0
               && sept.serigraphie.chiffres.accepte < sept.serigraphie.chiffres.total,
             `${sept.serigraphie.chiffres.accepte}/${sept.serigraphie.chiffres.total}`);
    controle('la tampographie, elle, reste rouge : aucun emplacement n\'en prend sept',
             sept.tampographie.feu === 'rouge' && sept.tampographie.cause === 'couleurs');
    // LA BRODERIE DECLARE HUIT PARTOUT. Elle est donc exempte de seuil de
    // realisme par la REGLE, et non par exception : sa chaine monte les fils
    // ensemble. Ce qui la limite est ailleurs, dans le rendu en fils, et cela
    // ne se dit pas par un feu.
    controle('la broderie reste verte a sept couleurs : ses emplacements montent a huit',
             sept.broderie.feu === 'vert', sept.broderie.feu);

    // LE TEXTE PARLE DU MARQUAGE DU VISITEUR, PAS DE NOTRE INVENTAIRE,
    // arbitrage Alex du 01/09/2026. Il disait « sur les 56 emplacements que
    // nous connaissons pour cette technique, 31 acceptent 6 couleurs » : vrai,
    // verifiable, et sans usage. Le visiteur ne sait pas ce qu'est notre
    // corpus, et le chiffre l'invite a juger notre echantillon au lieu de
    // decider de son marquage.
    //
    // Le controle est ecrit sur ce que la phrase DOIT dire, et un temoin
    // separe interdit le retour de l'ancienne : un controle ecrit en negation
    // seule passerait au vert sur une phrase vide.
    const texteSept = rendreFeux([sept.serigraphie]);
    controle('l\'orange couleurs parle de marqueurs et de devis',
             /marqueurs? acceptent/.test(texteSept) && /devis/.test(texteSept));
    controle('et il laisse le plafond a l\'emplacement, jamais a la technique',
             /à l'emplacement, pas à la technique/.test(texteSept)
               && !/la sérigraphie accepte/i.test(texteSept));
    controle('(temoin) il ne publie plus la taille de notre releve',
             !/que nous connaissons/.test(texteSept)
               && !new RegExp(`\\b${sept.serigraphie.chiffres.total}\\b`).test(texteSept));
    controle('(temoin) et il ne dit jamais qu\'un marquage est impossible',
             !/impossible/i.test(texteSept));

    // LES TECHNIQUES A UNE TEINTE NE SE JUGENT PAS AU NOMBRE DE COULEURS. Un
    // logo a sept couleurs grave au laser sort en monochrome, c'est le cas
    // standard, et c'est la FUSION qui decide, jamais le compte.
    controle('la gravure et le marquage a chaud ignorent le compte de couleurs',
             sept.gravure_laser.feu === 'vert' && sept.marquage_a_chaud.feu === 'vert',
             `${sept.gravure_laser.feu} / ${sept.marquage_a_chaud.feu}`);
    // ET LES DEUX NUMERIQUES IMPRIMENT TOUT EN UN PASSAGE. couleursMax y vaut
    // null, jamais zero : la quadrichromie n'est pas une absence de couleur.
    controle('les deux numeriques restent vertes quel que soit le compte',
             sept.numerique_uv.feu === 'vert' && sept.transfert_dtf.feu === 'vert');

    // LES BORNES. Une couleur ne derange personne ; neuf ne passent nulle part
    // la ou un plafond existe.
    const une = surGrille(1);
    controle('un logo en une seule couleur passe partout',
             compterFeux(Object.values(une)).vert === 7,
             JSON.stringify(compterFeux(Object.values(une))));
    const neufSurGrille = surGrille(9);
    controle('neuf couleurs ferment la serigraphie, la tampographie et la broderie',
             ['serigraphie', 'tampographie', 'broderie']
               .every((c) => neufSurGrille[c].feu === 'rouge'
                          && neufSurGrille[c].cause === 'couleurs'));
    controle('et le brief demande le plus grand plafond rencontre, pas le plus petit',
             /Une version à 8 couleurs maximum/.test(rendreFeux([neufSurGrille.serigraphie])),
             rendreFeux([neufSurGrille.serigraphie]).match(/Une version à \d+ couleurs?/)?.[0] ?? '');

    // LA RESERVE DE BRODERIE EST PERMANENTE, elle ne depend d'aucun feu. Le
    // rendu en fils n'est pas un obstacle a lever, c'est une propriete du
    // procede : l'atelier reconstruit le logo en points de couture, et le
    // resultat n'est pas la meme image. Elle doit donc se lire AUSSI sur un
    // vert, sinon elle ne servirait qu'a ceux qui ont deja un probleme.
    const brodVert = rendreFeux([une.broderie]);
    controle('la broderie porte sa reserve de rendu meme au feu vert',
             /feu-reserve/.test(brodVert) && /points de couture/.test(brodVert));
    controle('et elle est la SEULE : une reserve sur chaque ligne ne serait plus lue',
             Object.values(une).filter((l) => l.reserve).length === 1);

    // LE FORMAT GARDE LA PRIORITE SUR LE COMPTE DE COULEURS. C'est un choix, et
    // il se justifie : la conversion est gratuite et immediate, elle se fait
    // ici, alors qu'une version a moins de couleurs demande un graphiste. Un
    // visiteur qui a les deux problemes doit regler le notre d'abord.
    const imageSept = par(jugerFeux({ ...base, nCouleurs: 7, fichierVectoriel: false,
                                      largeurPx: 4000, nomsParFamille: NOMS }, grille));
    controle('une image a sept couleurs montre d\'abord le format, que nous reglons',
             imageSept.serigraphie.nuance === 'format', imageSept.serigraphie.nuance ?? '');
  }

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
  // LE LASER NE POSE PAS DE MATIERE, IL EN RETIRE, signale par Alex le
  // 26/08/2026. Le texte partage par les deux techniques monochromes disait
  // « ne pose qu'une matiere » : vrai du marquage a chaud, qui presse une
  // feuille, faux du laser, qui creuse. Il contredisait la definition de sa
  // propre ligne, deux blocs plus haut, sur le meme ecran.
  controle('le texte monochrome dit le RESULTAT, une teinte, pas le geste',
           /ne rend qu'une seule teinte/.test(rendreFeux([fusionne.gravure_laser])));
  controle('(temoin) il ne fait plus poser de matiere a un laser qui en retire',
           !/ne pose qu'une matière/.test(rendreFeux([fusionne.gravure_laser]))
             && !/ne pose qu'une matière/.test(rendreFeux([fusionne.marquage_a_chaud])));

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

  // LE LOGO ENTIEREMENT BLANC, trouve sur trois fichiers reels le 24/08. Sept
  // feux verts sans un mot laissaient partir le visiteur sans savoir que sa
  // declinaison ne se marque que sur du fonce.
  const { logoClair, rendreFaitPrincipal } =
    await import('../src/verdict/rendu_feux.js');
  const blanc = { m2Couleurs: { couleursReelles: 1,
    palette: [{ rvb: [255, 255, 255], part: 1 }] }, boiteEncre: { rapport: 1.5 } };
  const lettrage = { m2Couleurs: { couleursReelles: 2, palette: [
    { rvb: [255, 255, 255], part: 0.25 }, { rvb: [20, 40, 60], part: 0.75 }] },
    boiteEncre: { rapport: 1.5 } };
  controle('un logo entierement blanc est reconnu comme tel', Boolean(logoClair(blanc)));
  controle('et il est NOMME blanc, pas « une couleur presque blanche »',
           pointsAttention(blanc).some((p) => p.titre === 'Votre logo est blanc'));
  controle('la reponse le dit des la premiere ligne, pas seulement sous la grille',
           /support foncé/.test(rendreFaitPrincipal(1,
             [{ feu: 'vert' }, { feu: 'vert' }], blanc)));
  controle('et elle ne le dit pas quand le logo n\'est pas blanc',
           !/support foncé/.test(rendreFaitPrincipal(2,
             [{ feu: 'vert' }, { feu: 'vert' }], lettrage)));
  // LA TETE DE PAGE NE PROMET PLUS UNE ACCEPTATION, arbitrage Alex du
  // 26/08/2026. Elle disait « votre logo part tel quel sur 3 des 7 techniques »,
  // au present, ce qui se lit comme une acceptation deja acquise chez le
  // marqueur. Ce que nous savons s'arrete au FICHIER : rien dedans ne bloque
  // ces techniques. La suite appartient a l'atelier, a ses presses et a ses
  // encres, et le site le dit partout ailleurs. La tete de page etait le seul
  // endroit qui l'oubliait.
  const troisVerts = [
    { feu: 'vert' }, { feu: 'vert' }, { feu: 'vert' },
    { feu: 'orange' }, { feu: 'orange' }, { feu: 'rouge' }, { feu: 'rouge' },
  ];
  const teteTrois = rendreFaitPrincipal(2, troisVerts, lettrage);
  controle('la tete de page compte les techniques qui passent, et le total',
           /3 des 7 techniques/.test(teteTrois),
           teteTrois.match(/Bonne nouvelle[^<]*/)?.[0] ?? teteTrois.slice(0, 80));
  controle('elle dit que le logo POURRAIT partir, elle ne l\'affirme pas',
           /pourrait partir en fabrication/.test(teteTrois));
  controle('et elle dit que les sept ont ete etudiees, pas seulement celles qui passent',
           /techniques étudiées/.test(teteTrois));
  controle('(temoin) elle ne promet plus que le logo « part tel quel »',
           !/part tel quel/.test(teteTrois));
  // L'ETIQUETTE DE LA CARTE, ELLE, GARDE SON IMPERATIF. Elle porte une action
  // sur UNE technique ; la tete de page porte un bilan sur les sept. Affaiblir
  // les deux retirerait au visiteur la seule phrase qui lui dit quoi faire.
  controle('la carte verte, elle, dit toujours « Envoyez tel quel »',
           /Envoyez tel quel/.test(rendreFeux([{ ...TECHNIQUES_FEUX[0], feu: 'vert' }])));

  // TEMOIN. Un logo fonce portant un lettrage blanc de 25 % n'est PAS un logo
  // blanc : c'est le cas le plus ordinaire qui soit, et une fausse alerte
  // dessus decredibiliserait toutes les vraies.
  controle('temoin : un lettrage blanc sur fond fonce n\'est pas un logo blanc',
           logoClair(lettrage) === null);
  controle('mais l\'alerte support clair, elle, se declenche quand meme',
           pointsAttention(lettrage).some((p) => p.cle === 'support'));

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
