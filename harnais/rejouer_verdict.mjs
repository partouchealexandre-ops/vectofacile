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
// Le RENDU aussi respecte les regles de mots, et l'inconnu y est un etat
// dessine, pas un vide.
{
  const { rendreVerdict, rendreEntete } = await import('../src/verdict/rendu.js');
  const v = juger({ mesures: mesuresImpeccables(), seuils: SEUILS });
  const html = rendreVerdict(v);
  const bas = html.toLowerCase();
  const fautif = MOTS_INTERDITS.find((mot) => bas.includes(mot));
  controle('le rendu ne contient aucun mot interdit', !fautif, fautif || 'aucun');
  controle('le rendu ne contient ni pourcentage ni confiance',
           !MOTIF_CONFIANCE.test(bas), (bas.match(MOTIF_CONFIANCE) || ['aucun'])[0]);
  controle('l\'inconnu est un etat dessine, avec sa classe propre',
           html.includes('verdict-inconnu'));
  controle('quand tout est inconnu, le bandeau l\'explique au lieu de laisser vide',
           /Nous ne savons pas encore/.test(rendreEntete(v))
           && /valeur plausible/.test(rendreEntete(v)));
  controle('le rendu rappelle qu\'il decrit le commercial, pas le physique',
           /pas les limites physiques/.test(html));
  // Aucune injection : un libelle de technique hostile ne doit pas passer.
  const hostile = juger({ mesures: {}, seuils: { version: 1, techniques: {
    x: { libelle: '<img src=x onerror=alert(1)>', criteres: {} } } } });
  controle('un libelle hostile est echappe dans le rendu',
           !rendreVerdict(hostile).includes('<img src=x'));
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

  // Les phrases produites restent soumises a la charte.
  const { rendreVerdict, rendreTechnique } = await import('../src/verdict/rendu.js');
  const html = rendreVerdict(v);
  controle('aucun mot interdit dans les phrases de tailles',
           !MOTS_INTERDITS.some((m) => html.toLowerCase().includes(m)));
  controle('aucun pourcentage ni confiance dans les phrases de tailles',
           !MOTIF_CONFIANCE.test(html.replace(/<[^>]+>/g, ' ')));
  controle('le rendu jamais ne parle DU seuil d\'une technique',
           !/\ble seuil de (la|l\'|le)/i.test(html));

  // LE JARGON EST INTERDIT DE SEJOUR, arbitrage Alex du 20/08 : « tient les
  // minimums publiés » et « tient sur une partie des matières » decrivaient
  // notre comparaison, pas la decision du visiteur. S'ils reviennent, c'est
  // une regression.
  const jargon = ['tient les minimums publiés', 'tient sur une partie des matières',
                  'donnez une largeur de marquage', 'tient sur une partie des matieres'];
  const jargonTrouve = jargon.find((j) => html.toLowerCase().includes(j.toLowerCase()));
  controle('aucune etiquette jargon du 19/08 dans le rendu', !jargonTrouve,
           jargonTrouve || 'aucun');
  // CONTROLE NEGATIF du controle precedent : la detection detecte bien. Un
  // rendu qui contiendrait l'etiquette doit etre attrape. Lecon des deux
  // controles negatifs rates : on verifie l'INJECTION avant de conclure.
  const temoin = html + ' tient les minimums publiés';
  controle('(temoin) le detecteur de jargon detecte',
           jargon.some((j) => temoin.toLowerCase().includes(j.toLowerCase())));

  // Chaque carte repond en langage d'usage : une etiquette « dès NN mm de
  // large » et une phrase « Marquez ce logo à NN mm ». Attendu par
  // construction pour la serigraphie : dès 15 mm.
  const carteSeri = rendreTechnique(parCle.serigraphie);
  controle('la carte dit « dès NN mm de large » avec la taille calculee',
           carteSeri.includes('dès 15 mm de large')
             && /Marquez ce logo à 15 mm de large ou plus/.test(carteSeri));
  // Et elle dit les couleurs par la MECANIQUE, avec le compte du logo : deux
  // couleurs mesurees, donc deux ecrans en serigraphie. Aucun maximum
  // n'etant sourcé, aucun chiffre limite ne doit apparaitre.
  controle('la carte dit la mecanique des couleurs avec le compte mesure',
           /2 couleurs = 2 écrans/.test(carteSeri));
  controle('chaque technique situee montre ses sources dans un tableau',
           v.techniques.every((t) => t.situation?.etat !== 'tailles'
             || (rendreTechnique(t).includes('trait minimal publié')
                 && rendreTechnique(t).includes('avec les sources'))));

  // Une carte ne doit pas se contredire : elle donne une taille calculee sur
  // vingt-et-une valeurs, puis annonce qu'AUCUN critere n'est documente.
  // C'etait le premier rendu du 19/08, garde comme regression.
  controle('une carte qui donne une taille ne dit pas qu\'elle ne sait rien',
           v.techniques.filter((t) => t.situation?.etat === 'tailles')
             .every((t) => !/Aucun de nos \d+ critères/.test(rendreTechnique(t))));
  controle('elle nomme en revanche les criteres qui manquent encore',
           v.techniques.filter((t) => t.situation?.etat === 'tailles')
             .every((t) => /autres critères ne sont pas encore documentés/.test(rendreTechnique(t))));
  controle('le tableau des tailles porte des liens verifiables',
           (html.match(/<a href="https?:\/\//g) || []).length >= 20,
           `${(html.match(/<a href="https?:\/\//g) || []).length} liens`);
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
