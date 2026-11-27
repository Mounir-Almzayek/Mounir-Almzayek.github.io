import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const spec=JSON.parse(await fs.readFile('scripts/credential-media-sources.json','utf8'));
const root='assets/credentials';
await fs.mkdir(root,{recursive:true});
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1280,height:900},locale:'en-US',reducedMotion:'reduce'});
const report={brands:[],credentials:[]};
let template=await fs.readFile('src/templates/about.html','utf8');
const catalogs=Object.fromEntries(await Promise.all(['en','ar'].map(async l=>[l,JSON.parse(await fs.readFile('i18n/'+l+'.json','utf8'))])));
const norm=s=>s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim();
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const nameMatches=s=>{const n=norm(s);return n.includes('mounir')&&n.includes('almzayek')};
async function logo(id,brand){
  const page=await context.newPage();
  try{
    if(brand.direct){
      try{
        const response=await page.request.get(brand.direct,{timeout:15000});
        const type=(response.headers()['content-type']||'').split(';')[0];
        if(response.ok()&&/^image\/(png|jpeg|webp|avif)$/.test(type)){
          const data=await response.body();
          if(data.length<1e6){
            await page.setContent('<body style="margin:0;background:#fff"><img style="max-width:600px;max-height:400px" src="data:'+type+';base64,'+data.toString('base64')+'"></body>');
            const img=page.locator('img');await img.evaluate(i=>i.decode());
            const size=await img.evaluate(i=>[i.naturalWidth,i.naturalHeight]);
            if(Math.min(...size)>=32){await img.screenshot({path:root+'/'+id+'-logo.png'});return {id,status:'original',source:brand.direct,size};}
          }
        }
      }catch{}
    }
    for(const source of brand.pages){
      try{
        await page.goto(source,{waitUntil:'domcontentloaded',timeout:18000});
        const candidates=page.locator(brand.selector);
        const count=Math.min(await candidates.count(),12);
        for(let i=0;i<count;i++){
          const img=candidates.nth(i);
          const size=await img.evaluate(async n=>{try{await n.decode();}catch{}return [n.naturalWidth,n.naturalHeight]});
          if(Math.min(...size)<24||size[0]/size[1]>10||!(await img.isVisible()))continue;
          const url=await img.evaluate(n=>n.currentSrc||n.src);
          if(!url||!/^https?:/.test(url))continue;
          await img.screenshot({path:root+'/'+id+'-logo.png',timeout:5000});
          return {id,status:'original',source,imageUrl:url,size};
        }
      }catch{}
    }
    return {id,status:'text-fallback',reason:'No attributable logo accessible; initials are not a logo'};
  }finally{await page.close();}
}
async function credential(c){
  if(!c.code)return {id:c.id,status:'overview',reason:'No public credential ID'};
  const page=await context.newPage();
  const urls=[...new Set([c.id==='ml'?'https://www.coursera.org/account/accomplishments/specialization/'+c.code:'https://www.coursera.org/account/accomplishments/verify/'+c.code,'https://www.coursera.org/account/accomplishments/certificate/'+c.code])];
  try{
    for(const source of urls){
      try{
        const response=await page.goto(source,{waitUntil:'domcontentloaded',timeout:18000});
        if(!response?.ok())continue;
        await page.waitForTimeout(1800);
        const body=await page.locator('body').innerText({timeout:5000});
        const titleMatches=norm(body).includes(norm(c.title));
        if(!nameMatches(body)||!titleMatches)continue;
        // Capture only an actual issuer credential element or the certificate image,
        // never the generic course artwork or an error/sign-in page.
        const selectors=['img[alt*="certificate" i]','img[src*="CERTIFICATE_LANDING_PAGE"]','[data-testid="certificate-image"]','[data-testid="certificate"]','.certificate-content'];
        for(const selector of selectors){
          const loc=page.locator(selector);
          for(let i=0;i<Math.min(await loc.count(),5);i++){
            const el=loc.nth(i);
            if(!(await el.isVisible()))continue;
            const b=await el.boundingBox();
            if(!b||b.width<300||b.height<180||b.width/b.height>2.5)continue;
            const tag=await el.evaluate(n=>n.tagName);
            if(tag==='IMG'){
              const ok=await el.evaluate(async n=>{try{await n.decode();return n.naturalWidth>=300&&n.naturalHeight>=180}catch{return false}});
              if(!ok)continue;
            }else{
              const content=await el.innerText();
              if(!nameMatches(content)||!norm(content).includes(norm(c.title)))continue;
            }
            await el.screenshot({path:root+'/'+c.id+'-certificate.png',timeout:6000});
            return {id:c.id,status:'original',source};
          }
        }
        // A confirmed public verification page is useful even without a certificate image.
        return {id:c.id,status:'verified-page',source};
      }catch{}
    }
    return {id:c.id,status:'overview',reason:'Public page could not be verified against holder and title'};
  }finally{await page.close();}
}
try{
  report.brands=await Promise.all(Object.entries(spec.brands).map(([id,b])=>logo(id,b)));
  report.credentials=await Promise.all(spec.certs.map(credential));
  for(const b of report.brands){
    if(b.status!=='original')continue;
    template=template.replaceAll('<!--brand:'+b.id+'-->', '<img loading="lazy" decoding="async" src="{{@assetPrefix}}'+root+'/'+b.id+'-logo.png" alt="">');
  }
  let original=false,verified=false;
  for(const c of report.credentials){
    if(c.status==='original'){
      original=true;
      const re=new RegExp('<!--credential:'+c.id+':start-->[\\s\\S]*?<!--credential:'+c.id+':end-->');
      template=template.replace(re,'<a href="'+escape(c.source)+'"><img class="credential-original" loading="lazy" decoding="async" src="{{@assetPrefix}}'+root+'/'+c.id+'-certificate.png" alt="{{t.media.credential-original}}"></a><figcaption>{{t.media.credential-original}}</figcaption>');
    }
    if(c.status==='original'||c.status==='verified-page'){
      verified=true;
      const re=new RegExp('<!--credential-link:'+c.id+':start-->[\\s\\S]*?<!--credential-link:'+c.id+':end-->');
      template=template.replace(re,'<a class="pill" href="'+escape(c.source)+'">{{t.media.credential-verify}}</a>');
    }
  }
  const values={
    'media.credential-original':['Original credential · issuer public page','الشهادة الأصلية · صفحة الجهة المانحة العامة'],
    'media.credential-verify':['View credential ↗','عرض الشهادة ↗']
  };
  for(const [key,vals] of Object.entries(values)){if(template.includes('{{t.'+key+'}}')){catalogs.en[key]=vals[0];catalogs.ar[key]=vals[1];}}
  for(const key of ['media.credential-preview','media.credential-issuer','media.credential-profile']){if(!template.includes('{{t.'+key+'}}'))for(const l of ['en','ar'])delete catalogs[l][key];}
  await fs.writeFile('src/templates/about.html',template);
  for(const l of ['en','ar'])await fs.writeFile('i18n/'+l+'.json',JSON.stringify(catalogs[l],null,2)+'\n');
  await fs.writeFile(root+'/report.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
