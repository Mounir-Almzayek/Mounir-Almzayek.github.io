import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFile(resolve(root,path), 'utf8');
const templates = Object.fromEntries(await Promise.all((await readdir(resolve(root,'src/templates'))).filter(name=>name.endsWith('.html')).map(async name=>[name.slice(0,-5),await read('src/templates/'+name)])));

function renderSite(templates,messages,locale){
  const ar=locale==="ar";
  const config={lang:locale,direction:ar?' dir="rtl"':"",route:ar?"/ar/":"/",otherRoute:ar?"/":"/ar/",otherLang:ar?"en":"ar",otherCode:ar?"EN":"AR",assetPrefix:ar?"/":"",fontLink:ar?'<link rel="stylesheet" href="/assets/css/arabic-fonts.css">\n':"",technicalAttrs:ar?' class="technical-list" dir="ltr"':""};
  const escape=s=>s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  const used=new Set();
  function expand(name,stack=[]){
    if(stack.includes(name)||!Object.hasOwn(templates,name))throw Error("Invalid template include: "+name);
    return templates[name].replace(/\{\{(>|@|t\.)([a-zA-Z0-9_.-]+)\}\}/g,(_,type,key)=>{
      if(type===">")return expand(key,[...stack,name]);
      if(type==="@"){if(!Object.hasOwn(config,key))throw Error("Unknown config: "+key);return config[key];}
      if(!Object.hasOwn(messages,key)||typeof messages[key]!=="string"||!messages[key].trim())throw Error("Missing translation ("+locale+"): "+key);
      used.add(key);return escape(messages[key]);
    });
  }
  const html=expand("page");
  if(/\{\{[^{}]+\}\}/.test(html))throw Error("Unresolved template token");
  const unused=Object.keys(messages).filter(k=>!used.has(k));
  if(unused.length)throw Error("Unused keys: "+unused.join(", "));
  return html;
}

const locales = { en: 'index.html', ar: 'ar/index.html' };
const catalogs = Object.fromEntries(await Promise.all(Object.keys(locales).map(async locale=>[locale,JSON.parse(await read('i18n/'+locale+'.json'))])));
if (JSON.stringify(Object.keys(catalogs.en).sort()) !== JSON.stringify(Object.keys(catalogs.ar).sort())) throw Error('Locale keys must match');
const check=process.argv.includes('--check');
for (const [locale,path] of Object.entries(locales)) {
  const html=renderSite(templates,catalogs[locale],locale);
  if (check) {
    if (await read(path)!==html) throw Error(path+' is outdated. Run node scripts/build.mjs');
  } else {
    await mkdir(dirname(resolve(root,path)),{recursive:true});
    await writeFile(resolve(root,path),html);
  }
  console.log((check?'Verified ':'Generated ')+path);
}
