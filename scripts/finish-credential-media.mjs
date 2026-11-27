import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const root='assets/credentials';
const report=JSON.parse(await fs.readFile(root+'/report.json','utf8'));
let template=await fs.readFile('src/templates/about.html','utf8');
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1280,height:900},locale:'en-US'});
async function captureLogo(id, source, direct, selectors) {
  const page=await context.newPage();
  try {
    if(direct){
      const response=await page.request.get(direct,{timeout:12000});
      const type=(response.headers()['content-type']||'').split(';')[0];
      if(!response.ok()||!/^image\/(png|jpeg|webp|avif)$/.test(type))return;
      const data=await response.body();
      if(data.length>1e6)return;
      await page.setContent('<body style="margin:0;background:white"><img style="display:block;max-width:350px;max-height:250px" src="data:'+type+';base64,'+data.toString('base64')+'"></body>');
    }else{
      await page.goto(source,{waitUntil:'domcontentloaded',timeout:16000});
    }
    for(const selector of direct?['img']:selectors){
      const items=page.locator(selector);
      for(let i=0;i<Math.min(await items.count(),6);i++){
        const el=items.nth(i);
        if(!await el.isVisible())continue;
        const sz=await el.boundingBox();
        if(!sz||sz.width<25||sz.height<18||sz.width/sz.height>10)continue;
        if(await el.evaluate(n=>n.tagName==='IMG'&&!n.naturalWidth))continue;
        const imageUrl=direct||await el.evaluate(n=>n.currentSrc||n.src||null);
        await el.screenshot({path:root+'/'+id+'-logo.png',timeout:5000});
        return {id,status:'original',source,imageUrl};
      }
    }
  }catch{}finally{await page.close();}
}
try{
  const more=await Promise.all([
    captureLogo('ovaluate','https://ae.linkedin.com/company/ovaluate','https://media.licdn.com/dms/image/v2/D4D0BAQFdL_URfGCOWA/company-logo_200_200/company-logo_200_200/0/1719256454532/ovaluate_logo?e=2147483647&t=M4DfSz4ggAvQ3r9AagMKSJmxecwbaPB-vjdo0A3VLvY&v=beta',[]),
    captureLogo('rs4it','https://www.rs4it.sa/',null,['header img[alt*="الحلول الواقعية"]','header img[alt*="RS4IT" i]','header a[href="/"] img[src*="logo" i]','header .custom-logo']),
    captureLogo('misbar','https://misbar.education/',null,['header img[alt*="misbar" i]','header img[alt*="مسبار"]','img[src*="misbar" i][src*="logo" i]']),
    captureLogo('aram','https://www.arambs.com/',null,['img[alt="Aram Tech" i]','img[alt="Aram" i]','img[src*="aram-logo" i]','img[src*="aram_logo" i]'])
  ]);
  for(const b of more.filter(Boolean)){
    const index=report.brands.findIndex(x=>x.id===b.id);
    report.brands[index]=b;
    template=template.replaceAll('<!--brand:'+b.id+'-->','<img loading="lazy" decoding="async" src="{{@assetPrefix}}'+root+'/'+b.id+'-logo.png" alt="">');
  }
  await fs.writeFile('src/templates/about.html',template);
  await fs.writeFile(root+'/report.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
