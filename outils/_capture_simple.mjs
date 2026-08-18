import path from 'node:path'; import { chromium } from 'playwright';
const [fichier, sortie, largeur] = process.argv.slice(2);
let nav; try { nav = await chromium.launch(); } catch { nav = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}); }
const page = await nav.newPage({viewport:{width:+(largeur||1180), height:900}, deviceScaleFactor:2});
const erreurs = []; page.on('pageerror', e=>erreurs.push(e.message));
await page.goto('file://'+path.resolve(fichier));
await page.waitForTimeout(400);
await page.screenshot({path: sortie, fullPage:true});
console.log(erreurs.length ? 'erreurs : '+erreurs.join(' | ') : 'ok');
await nav.close();
