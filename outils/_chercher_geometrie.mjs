import { execFileSync } from 'node:child_process'; import fs from 'node:fs';
import { chromium } from 'playwright';
import { detecterFond, masqueEncre, nettoyerSalissures, boucherTrous, boiteEnglobante, aireMinimalePour } from '../src/moteur/image.js';
import { transformeeDistance, pointsDeCrete, cotesOpposes } from '../src/moteur/distance.js';
let nav; try { nav = await chromium.launch(); } catch { nav = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}); }
const page = await nav.newPage();
async function ecartMini(png, unites) {
  const b64 = fs.readFileSync(png).toString('base64');
  const r = await page.evaluate(async (b64) => { const img=await createImageBitmap(await (await fetch('data:image/png;base64,'+b64)).blob()); const c=new OffscreenCanvas(img.width,img.height); const x=c.getContext('2d'); x.drawImage(img,0,0); const d=x.getImageData(0,0,img.width,img.height); return {w:d.width,h:d.height,data:Array.from(d.data)}; }, b64);
  const L=r.w,H=r.h,image={largeur:L,hauteur:H,donnees:new Uint8ClampedArray(r.data)};
  const fond=detecterFond(image); const brut=masqueEncre(image,fond);
  let aire=0; for(let i=0;i<brut.length;i++) aire+=brut[i];
  const am=aireMinimalePour(aire);
  const m=boucherTrous(nettoyerSalissures(brut,L,H,am).masque,L,H,am).masque;
  const boite=boiteEnglobante(m,L,H);
  const df=transformeeDistance(m,L,H);
  const fondM=new Uint8Array(m.length); for(let i=0;i<m.length;i++) fondM[i]=m[i]?0:1;
  const cr=pointsDeCrete(df,fondM,L,H).filter(i=>{const x=i%L,y=(i/L)|0; if(x<boite.xMin||x>boite.xMax||y<boite.yMin||y>boite.yMax) return false; return cotesOpposes(i,df[i]+1,m,L,H,120,16,false);});
  if(!cr.length) return null;
  let min=Infinity; for(const i of cr) if(df[i]<min) min=df[i];
  return 100*(2*min-1)/(L*100/unites);
}
const essais = [];
for (const p3x of [86, 88, 90, 92]) for (const p3y of [16, 19, 22, 25]) for (const b1 of [-24, -20, -16]) essais.push([p3x, p3y, b1]);
let meilleur = null;
for (const [px, py, b1] of essais) {
  execFileSync('python3', ['-c', `
import re
s = open('/root/vecto/planches/identite/dessiner_logo.py', encoding='utf-8').read()
s = re.sub(r'COCHE = \\[\\(28\\.5, 51\\.5\\), \\(46\\.5, 68\\.5\\), \\([-\\d.]+, [-\\d.]+\\)\\]', 'COCHE = [(28.5, 51.5), (46.5, 68.5), (${px}.0, ${py}.0)]', s)
s = re.sub(r'FRAGMENT = \\([-\\d.]+, ([\\d.]+)\\)', 'FRAGMENT = (${b1}.0, \\\\1)', s)
open('/root/vecto/planches/identite/dessiner_logo.py','w',encoding='utf-8').write(s)
`]);
  execFileSync('python3', ['/root/vecto/planches/identite/dessiner_logo.py'], {cwd:'/root/vecto/planches/identite', stdio:'pipe'});
  const svg = fs.readFileSync('/root/vecto/planches/identite/symbole.svg','utf-8');
  const vb = /viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg);
  const unites = Number(vb[3]);
  await page.setContent(`<style>html,body{margin:0;background:#fff}svg{width:900px;height:900px;display:block}</style>${svg}`);
  await page.screenshot({path:'/tmp/g.png', clip:{x:0,y:0,width:900,height:900}});
  const e = await ecartMini('/tmp/g.png', unites);
  if (e !== null && (!meilleur || e > meilleur.e)) meilleur = {px, py, b1, e};
  console.log(`  coche ${px},${py}  fragment ${b1}  ecart mini ${e === null ? 'n/a' : e.toFixed(2)+' %'}`);
}
console.log('\n  MEILLEUR :', JSON.stringify(meilleur));
await nav.close();
