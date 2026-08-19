/**
 * Ce que TOUS les harnais de navigateur partagent.
 *
 * Extrait le 19/08 parce qu'un deuxieme harnais de navigateur arrivait, et
 * qu'une table de types MIME dupliquee est une table qui divergera : la
 * premiere version de celle-ci ne connaissait pas les feuilles de style et
 * servait du octet-stream, que Chromium refuse. Corrige a un seul endroit,
 * c'est corrige pour tout le monde.
 */

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

export const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

/**
 * Chromium peut venir de Playwright ou d'une installation deja presente sur la
 * machine. On essaie le chemin normal, puis on cherche : un harnais qui refuse
 * de demarrer pour une histoire de chemin d'executable ne serait pas lance, et
 * un harnais qu'on ne lance pas ne sert a rien.
 */
export async function ouvrirChromium() {
  try {
    return await chromium.launch();
  } catch (premiereErreur) {
    const racines = ['/opt/pw-browsers', process.env.PLAYWRIGHT_BROWSERS_PATH].filter(Boolean);
    for (const racine of racines) {
      if (!fs.existsSync(racine)) continue;
      for (const entree of fs.readdirSync(racine)) {
        for (const suffixe of ['chrome-linux/chrome', 'chrome-linux/headless_shell']) {
          const chemin = path.join(racine, entree, suffixe);
          if (fs.existsSync(chemin)) {
            return await chromium.launch({ executablePath: chemin });
          }
        }
      }
    }
    // Playwright installe mais SANS navigateur : c'est le cas normal apres un
    // npm ci lance avec PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD, qui est justement ce
    // qu'on recommande pour ne pas telecharger des centaines de mega octets a
    // chaque construction. En local, le navigateur se pose une fois, a la main.
    if (/Executable doesn't exist|playwright install/i.test(premiereErreur.message || '')) {
      console.log('');
      console.log('  HARNAIS DE BOUT EN BOUT : SAUTE, pas reussi.');
      console.log('  Playwright est installe, mais aucun navigateur ne l\'accompagne.');
      console.log('  Pour l\'avoir, une seule fois : npx playwright install chromium');
      console.log('');
      process.exit(0);
    }
    throw premiereErreur;
  }
}
