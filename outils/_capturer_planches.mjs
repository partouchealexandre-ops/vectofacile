import fs from 'node:fs'; import path from 'node:path'; import { chromium } from 'playwright';
const fichier = process.argv[2]; const dossier = process.argv[3];
fs.mkdirSync(dossier, {recursive:true});
let nav; try { nav = await chromium.launch(); } catch { nav = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}); }
const page = await nav.newPage({viewport:{width:1180,height:900}, deviceScaleFactor:2});
const erreurs = [];
page.on('pageerror', e => erreurs.push(e.message));
page.on('console', m => { if (m.type()==='error') erreurs.push(m.text()); });
for (const n of ['1','2','3','4','5','6','7']) {
  await page.goto('file://'+path.resolve(fichier)+'#etat-'+n);
  await page.waitForTimeout(300);
  await page.evaluate((n)=>{ const b=[...document.querySelectorAll('#etapes button')].find(x=>x.dataset.n===n); b&&b.click(); }, n);
  await page.waitForTimeout(250);
  await page.screenshot({path: path.join(dossier, 'etat_'+n+'.png'), fullPage:true});
}
if (erreurs.length) { console.log('ERREURS :'); erreurs.slice(0,8).forEach(e=>console.log('  '+e)); }
else console.log('aucune erreur de page');
await nav.close();
