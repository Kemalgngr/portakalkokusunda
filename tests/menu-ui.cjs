const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../public');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const categories=['Kahvaltı','Sıkma & Börek','Yemekler','Tatlılar','İçecekler'];
 const products=[{id:1,name:'Serpme Kahvaltı',price:250,description:'1 adet çay ikramımızdır.',category:'Kahvaltı',badge:'',available:true}];
 await page.route('https://qbwgpqkuqnmhsnepblmx.supabase.co/**',async route=>{
  const r=route.request(),url=new URL(r.url());let result=null;
  if(url.pathname.endsWith('/token'))result={access_token:'test',refresh_token:'test',expires_at:Date.now()/1000+3600};
  else if(url.pathname.endsWith('/is_menu_admin'))result=true;
  else if(url.pathname.endsWith('/categories')){
   if(r.method()==='POST')categories.push(r.postDataJSON().name);
   else result=categories.map(name=>({name}));
  }else if(url.pathname.endsWith('/products')){
   if(r.method()==='POST')products.push({id:products.length+1,...r.postDataJSON()});
   else result=products;
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result),headers:{'Access-Control-Allow-Origin':'*'}});
 });
 await page.route('http://menu.test/**',async route=>{
  let name=new URL(route.request().url()).pathname.slice(1)||'index.html';
  const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'};
  await route.fulfill({body:fs.readFileSync(path.join(root,name)),contentType:types[path.extname(name)]||'text/plain'});
 });
 await page.goto('http://menu.test/admin.html');
 await page.getByLabel('E-posta adresi').fill('test@example.test');
 await page.getByLabel('Yönetici şifresi').fill('test-password');
 await page.getByRole('button',{name:'Giriş yap'}).click();
 await page.getByLabel('Yeni menü sekmesinin adı').fill('Salatalar');
 await page.getByRole('button',{name:'Kategori ekle',exact:true}).click();
 await page.waitForFunction(()=>document.getElementById('category').value==='Salatalar');
 await page.getByLabel('Ürün adı',{exact:true}).fill('Mevsim Salata');
 await page.getByLabel('Fiyat (₺)').fill('90');
 await page.getByRole('button',{name:'Kaydet',exact:true}).click();
 await page.getByText('Salatalar / Mevsim Salata · 90 ₺',{exact:true}).waitFor();
 assert.equal(products.at(-1).category,'Salatalar');
 await page.reload();
 await page.getByText('Salatalar / Mevsim Salata · 90 ₺',{exact:true}).waitFor();
 await page.goto('http://menu.test/');
 await page.getByRole('button',{name:'Salatalar',exact:true}).click();
 await page.getByRole('heading',{name:'Mevsim Salata',exact:true}).waitFor();
 await page.getByRole('button',{name:'Tatlılar',exact:true}).click();
 await page.getByText('Bu kategori için şu anda ürün bulunmuyor.').waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 console.log('PASS: yönetici kategori ekleme, yeni kategoriye ürün kaydetme, yenileme sonrası görünürlük, müşteri sekmeleri, boş Tatlılar, mobil taşma kontrolü (Supabase taklidi).');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
