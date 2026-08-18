/**
 * Reecriture du SVG a partir du programme de trace.
 *
 * Pourquoi reecrire un SVG que le vectoriseur vient de produire. Parce que
 * celui du vectoriseur est invalide, et cela s'est vu pour de bon.
 *
 * VTracer 1.0.0-alpha.3 emet des chemins ou un sous chemin commence par une
 * commande de trace apres un Z, sans nouveau moveto. La grammaire SVG l'interdit.
 * Chromium a refuse net une dizaine de chemins avec le message "Expected moveto
 * path command", pendant que le harnais de bout en bout tournait le 18/08 : le
 * fichier propose au telechargement etait donc casse, et l'apercu affiche a
 * l'ecran, amputé.
 *
 * Le lecteur de chemins du projet, lui, sait rattraper ce cas, parce qu'il a
 * ete corrige la veille sur la meme faute reperee par Ghostscript. On repasse
 * donc par lui, et les TROIS fichiers proposes au visiteur, EPS, PDF et SVG,
 * sortent du meme programme de trace. Aucun des trois ne peut plus raconter une
 * histoire differente des deux autres.
 *
 * Rappel : le SVG n'est PAS le livrable vectoriel du projet. Decision metier
 * ARBITREE ALEX le 17/08, les fabricants de goodies le refusent. Il reste
 * propose en second, pour le site web du client.
 */

import { emettreForme, nb } from './geometrie.js';

const MOTS = { allerA: 'M', ligne: 'L', courbe: 'C', fermer: 'Z', prefixe: true };

export function versSvg(programme, options = {}) {
  const cadre = { echelle: 1 };
  const transformation = { X: (x) => nb(x), Y: (y) => nb(y) };

  const chemins = programme.formes.map((forme) => {
    const morceaux = emettreForme(forme, cadre, programme.hauteur, MOTS, transformation);
    const d = morceaux.join(' ').replace(/([MLC]) /g, '$1');
    const couleur = '#' + forme.rvb.map((v) => v.toString(16).padStart(2, '0')).join('');
    const regle = forme.regle === 'evenodd' ? ' fill-rule="evenodd"' : '';
    return `<path d="${d}" fill="${couleur}"${regle}/>`;
  });

  const titre = (options.titre || '').replace(/[<>&]/g, '');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${nb(programme.largeur)}" `
      + `height="${nb(programme.hauteur)}" viewBox="0 0 ${nb(programme.largeur)} ${nb(programme.hauteur)}">`,
    titre ? `<title>${titre}</title>` : '',
    ...chemins,
    '</svg>',
  ].filter(Boolean).join('\n') + '\n';
}
