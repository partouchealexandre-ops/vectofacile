import fs from 'node:fs'; import { chromium } from 'playwright';
import { detecterFond, masqueEncre, nettoyerSalissures, boucherTrous, boiteEnglobante, aireMinimalePour } from '../src/moteur/image.js';
import { transformeeDistance, pointsDeCrete, cotesOpposes } from '../src/moteur/distance.js';
const [png, unitesParFichier] = process.argv.slice(2);
let nav; try { nav = await chromium.launch(); } catch { nav = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}); }
const page = await nav.newPage();
const b64 = fs.readFileSync(png).toString('base64');
const r = await page.evaluate(async (b64) => { const img=await createImageBitmap(await (await fetch('data:image/png;base64,'+b64)).blob()); const c=new OffscreenCanvas(img.width,img.height); const x=c.getContext('2d'); x.drawImage(img,0,0); const d=x.getImageData(0,0,img.width,img.height); return {w:d.width,h:d.height,data:Array.from(d.data)}; }, b64);
await nav.close();
const L=r.w,H=r.h,image={largeur:L,hauteur:H,donnees:new Uint8ClampedArray(r.data)};
const fond=detecterFond(image); const brut=masqueEncre(image,fond);
let aire=0; for(let i=0;i<brut.length;i++) aire+=brut[i];
const am=aireMinimalePour(aire);
const m=boucherTrous(nettoyerSalissures(brut,L,H,am).masque,L,H,am).masque;
const boite=boiteEnglobante(m,L,H);
const df=transformeeDistance(m,L,H);
const fondM=new Uint8Array(m.length); for(let i=0;i<m.length;i++) fondM[i]=m[i]?0:1;
const cr=pointsDeCrete(df,fondM,L,H).filter(i=>{const x=i%L,y=(i/L)|0; if(x<boite.xMin||x>boite.xMax||y<boite.yMin||y>boite.yMax) return false; return cotesOpposes(i,df[i]+1,m,L,H,120,16,false);});
const tri=cr.slice().sort((a,b)=>df[a]-df[b]);
const pxParDiametre = L*100/Number(unitesParFichier);
const vus=[]; const sortie=[];
for(const i of tri){ const x=i%L,y=(i/L)|0; if(vus.some(v=>Math.hypot(v[0]-x,v[1]-y)<60)) continue; vus.push([x,y]);
  sortie.push({x: +(-Number(unitesParFichier)/2+50+ (x-L/2)*Number(unitesParFichier)/L).toFixed(1), y: +(-Number(unitesParFichier)/2+50+(y-H/2)*Number(unitesParFichier)/L).toFixed(1), pct: +(100*(2*df[i]-1)/pxParDiametre).toFixed(2)});
  if(vus.length>=5) break; }
console.log(JSON.stringify(sortie));
