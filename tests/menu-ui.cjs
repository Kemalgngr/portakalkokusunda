const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../public');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const categories=['Kahvaltı','Sıkma & Börek','Yemekler','Tatlılar','İçecekler','Yöresel ve Doğal Ürünler'];
 const products=[{id:2,name:'Menemen',price:180,description:'Tavada.',category:'Kahvaltı',badge:'',available:true,sort_order:2},{id:90,name:'Köy Yumurtası (30 adet)',price:250,description:'30 adetlik koli.',category:'Yöresel ve Doğal Ürünler',badge:'',available:true},{id:1,name:'Serpme Kahvaltı',price:250,description:'Yöresel peynirler, zeytin, ev reçelleri, bal, tereyağı ve yumurta. 1 adet çay ikramımızdır.',category:'Kahvaltı',badge:'',available:true}];
 await page.route('https://qbwgpqkuqnmhsnepblmx.supabase.co/**',async route=>{
  const r=route.request(),url=new URL(r.url());let result=null;
  if(url.pathname.endsWith('/token'))result={access_token:'test',refresh_token:'test',expires_at:Date.now()/1000+3600};
  else if(url.pathname.endsWith('/is_menu_admin'))result=true;
  else if(url.pathname.endsWith('/reorder_products'))r.postDataJSON().product_ids.forEach((id,i)=>{products.find(p=>p.id===id).sort_order=i+1;});
  else if(url.pathname.endsWith('/categories')){
   if(r.method()==='POST')categories.push(r.postDataJSON().name);
   else if(r.method()==='PATCH'){
    const old=url.searchParams.get('name').slice(3),name=r.postDataJSON().name;
    categories[categories.indexOf(old)]=name;
    products.filter(p=>p.category===old).forEach(p=>p.category=name);
   }else if(r.method()==='DELETE')categories.splice(categories.indexOf(url.searchParams.get('name').slice(3)),1);
   else result=categories.map(name=>({name}));
  }else if(url.pathname.endsWith('/products')){
   if(r.method()==='POST')products.push({id:products.length+100,...r.postDataJSON()});
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
 await page.locator('#product-form').getByRole('button',{name:'Kaydet',exact:true}).click();
 await page.getByText('Salatalar / Mevsim Salata · 90 ₺',{exact:true}).waitFor();
 assert.equal(products.at(-1).category,'Salatalar');
 await page.reload();
 await page.getByText('Salatalar / Mevsim Salata · 90 ₺',{exact:true}).waitFor();
 await page.goto('http://menu.test/');
 await page.getByRole('button',{name:'Salatalar',exact:true}).click();
 await page.getByRole('heading',{name:'Mevsim Salata',exact:true}).waitFor();
 await page.getByRole('button',{name:'Yöresel ve Doğal Ürünler',exact:true}).click();
 await page.getByRole('heading',{name:'Köy Yumurtası (30 adet)',exact:true}).waitFor();
 await page.getByRole('button',{name:'Tatlılar',exact:true}).click();
 await page.getByText('Bu kategori için şu anda ürün bulunmuyor.').waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:844});
  await page.getByRole('button',{name:'Kahvaltı',exact:true}).click();
  const metrics=await page.evaluate(()=>{
   const nav=document.querySelector('.tabs'),card=document.querySelector('.product');
   const rect=nav.getBoundingClientRect();
   return {pageOverflow:document.documentElement.scrollWidth>innerWidth,
    tabsOverflow:nav.scrollWidth>nav.clientWidth,
    allTabsVisible:[...nav.children].every(b=>{const r=b.getBoundingClientRect();return r.left>=rect.left-1&&r.right<=rect.right+1&&r.top>=rect.top&&r.bottom<=rect.bottom+1;}),
    height:card.getBoundingClientRect().height,clipped:card.scrollHeight>card.clientHeight};
  });
  assert.equal(metrics.pageOverflow,false);assert.equal(metrics.tabsOverflow,false);
  assert.equal(metrics.allTabsVisible,true);assert.equal(metrics.clipped,false);
  assert(metrics.height<=100,`Kart çok yüksek: ${width}px / ${metrics.height}px`);
  console.log(`Mobil ${width}px: kart ${metrics.height}px; tüm kategoriler kaydırmadan erişilebilir.`);
 }
 await page.screenshot({path:'/tmp/portakal-compact-menu.png',fullPage:true});
 await page.goto('http://menu.test/admin.html');
 const breakfast=page.locator('.menu-edit-row').filter({has:page.getByRole('textbox',{name:'Kahvaltı menü adı',exact:true})});
 await breakfast.getByRole('textbox').fill('Köy Kahvaltısı');
 await breakfast.getByRole('button',{name:'Kaydet',exact:true}).click();
 await page.getByText('Köy Kahvaltısı / Serpme Kahvaltı · 250 ₺',{exact:true}).waitFor();
 assert.equal(products.find(p=>p.id===1).category,'Köy Kahvaltısı');
 await page.locator('.menu-edit-row').filter({has:page.getByRole('textbox',{name:'Köy Kahvaltısı menü adı',exact:true})}).getByRole('button',{name:'Menüyü sil'}).click();
 await page.locator('#menus-status').filter({hasText:'Önce ürünleri'}).waitFor();
 assert(categories.includes('Köy Kahvaltısı'));
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('.menu-edit-row').filter({has:page.getByRole('textbox',{name:'Tatlılar menü adı',exact:true})}).getByRole('button',{name:'Menüyü sil'}).click();
 await page.locator('#menus-status').filter({hasText:'Menü silindi.'}).waitFor();
 assert(!categories.includes('Tatlılar'));
 await page.getByLabel('Sıralanacak menü').selectOption('Köy Kahvaltısı');
 await page.getByRole('spinbutton',{name:'Serpme Kahvaltı sıra numarası',exact:true}).fill('1');
 await page.getByRole('spinbutton',{name:'Serpme Kahvaltı sıra numarası',exact:true}).press('Tab');
 await page.getByRole('button',{name:'Sıralamayı kaydet',exact:true}).click();
 await page.locator('#order-status').filter({hasText:'Sıralama kaydedildi.'}).waitFor();
 assert.equal(products.find(p=>p.id===1).sort_order,1);
 await page.reload();
 await page.getByLabel('Sıralanacak menü').selectOption('Köy Kahvaltısı');
 assert.equal(await page.locator('.order-row').first().locator('span').textContent(),'Serpme Kahvaltı');
 await page.getByRole('button',{name:'Menemen yukarı taşı',exact:true}).click();
 await page.getByRole('button',{name:'Sıralamayı kaydet',exact:true}).click();
 await page.locator('#order-status').filter({hasText:'Sıralama kaydedildi.'}).waitFor();
 await page.goto('http://menu.test/');
 await page.getByRole('button',{name:'Köy Kahvaltısı',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Tatlılar',exact:true}).count(),0);
 await page.getByRole('button',{name:'Köy Kahvaltısı',exact:true}).click();
 assert.equal(await page.locator('.product h3').first().textContent(),'Menemen');
 console.log('PASS: sıra numarası, yukarı taşıma, kaydetme, yenileme sonrası kalıcılık ve müşteri sırası (Supabase taklidi).');
 console.log('PASS: menü yeniden adlandırma ve ürünlerin taşınması; dolu menü silme koruması; boş menü silme ve müşteri görünümü.');
 console.log('PASS: yönetici kategori ekleme, yeni kategoriye ürün kaydetme, yenileme sonrası görünürlük, müşteri sekmeleri, boş Tatlılar, mobil taşma kontrolü (Supabase taklidi).');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
