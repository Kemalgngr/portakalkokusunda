const money = n => new Intl.NumberFormat('tr-TR', {style:'currency', currency:'TRY', maximumFractionDigits:0}).format(n);
const el = (tag, cls, text) => {const e=document.createElement(tag); if(cls)e.className=cls; if(text)e.textContent=text;return e;};
let products=[], menuCategories=[], category='Kahvaltı';
function render(){
 document.querySelectorAll('.tab').forEach(b=>{b.classList.toggle('active',b.textContent===category);b.setAttribute('aria-pressed',String(b.textContent===category));});
 document.querySelector('#category-caption').textContent=category==='Ek Hizmetler'?'Siz getirin, biz pişirelim. Sofrayı birlikte tamamlayalım.':category==='Salatalar'?'Yemeğinizin yanına taze ve ferah eşlikçiler.':category==='Yemekler'?'Öğle sofranız için, ev yapımı lezzetler.':category==='Yöresel ve Doğal Ürünler'?'Sofranızdan evinize, yöresel ürünlerimiz.':'Özenle hazırlanan, tadı damağınızda kalan lezzetler.';
 const grid=document.querySelector('#products');grid.replaceChildren();
 products.filter(p=>p.category===category&&p.available).forEach(p=>{const card=el('article','product');const icon=el('div','product-icon');icon.textContent=({'Kahvaltı':'☀','Sıkma & Börek':'✳','Yemekler':'♨','Tatlılar':'♡','Salatalar':'❧','Ek Hizmetler':'♨','İçecekler':'◡','Yöresel ve Doğal Ürünler':'❧'})[category]||'✳';card.append(icon);const content=el('div','product-content');if(p.badge)content.append(el('span','badge',p.badge));const row=el('div','product-title');row.append(el('h3','',p.name),el('strong','price',money(p.price)));content.append(row,el('p','',p.description));card.append(content);grid.append(card);});
 if(category==='Ek Hizmetler'&&products.some(p=>p.category===category&&p.available)){
  const offer=el('aside','service-offer');offer.append(el('h3','','Sofranızı tamamlayın'),el('p','','Pişirme hizmetimizin yanına salatanızı ve içeceğinizi seçin. Salata ve içecekler ayrıca ücretlendirilir.'));
  const actions=el('div','service-links');
  ['Salatalar','İçecekler'].filter(c=>menuCategories.includes(c)).forEach(c=>{const button=el('button','outline',c+' →');button.type='button';button.onclick=()=>{category=c;render();};actions.append(button);});
  offer.append(actions);grid.append(offer);
 }
 if(!grid.children.length)grid.append(el('p','empty','Bu kategori için şu anda ürün bulunmuyor.'));
}
async function load(){try{const data=await MenuBackend.api('menu');products=data.products;menuCategories=data.categories;if(!data.categories.includes(category))category=data.categories[0]||'';const nav=document.querySelector('#categories');nav.replaceChildren();data.categories.forEach(c=>{const b=el('button','tab',c);b.onclick=()=>{category=c;render();};nav.append(b);});render();}catch{const p=document.querySelector('#products');p.replaceChildren(el('p','','Menü yüklenemedi.'));const retry=el('button','outline','Tekrar dene');retry.onclick=load;p.append(retry);}}
load();document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});

async function loadLocation(){
 try{
  const settings=await MenuBackend.api('settings');
  const url=new URL(settings.map_url);
  if(url.protocol!=='https:'||url.username||url.password)throw Error('Geçersiz harita bağlantısı');
  document.getElementById('business-address').textContent=settings.address;
  document.querySelectorAll('[data-map-link]').forEach(link=>link.href=url.href);
 }catch{
  // Keep the existing address and working directions if settings are not installed or unreachable.
 }
}
loadLocation();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadLocation();});
