const money = n => new Intl.NumberFormat('tr-TR', {style:'currency', currency:'TRY', maximumFractionDigits:0}).format(n);
const el = (tag, cls, text) => {const e=document.createElement(tag); if(cls)e.className=cls; if(text)e.textContent=text;return e;};
let products=[], category='Kahvaltı';
function render(){
 document.querySelectorAll('.tab').forEach(b=>{b.classList.toggle('active',b.textContent===category);b.setAttribute('aria-pressed',String(b.textContent===category));});
 document.querySelector('#category-caption').textContent=category==='Yemekler'?'Öğle sofranız için, ev yapımı lezzetler.':category==='Yöresel ve Doğal Ürünler'?'Sofranızdan evinize, yöresel ürünlerimiz.':'Özenle hazırlanan, tadı damağınızda kalan lezzetler.';
 const grid=document.querySelector('#products');grid.replaceChildren();
 products.filter(p=>p.category===category&&p.available).forEach(p=>{const card=el('article','product');const icon=el('div','product-icon');icon.textContent=({'Kahvaltı':'☀','Sıkma & Börek':'✳','Yemekler':'♨','Tatlılar':'♡','İçecekler':'◡','Yöresel ve Doğal Ürünler':'❧'})[category]||'✳';card.append(icon);const content=el('div','product-content');if(p.badge)content.append(el('span','badge',p.badge));const row=el('div','product-title');row.append(el('h3','',p.name),el('strong','price',money(p.price)));content.append(row,el('p','',p.description));card.append(content);grid.append(card);});
 if(!grid.children.length)grid.append(el('p','empty','Bu kategori için şu anda ürün bulunmuyor.'));
}
async function load(){try{const data=await MenuBackend.api('menu');products=data.products;if(!data.categories.includes(category))category=data.categories[0]||'';const nav=document.querySelector('#categories');nav.replaceChildren();data.categories.forEach(c=>{const b=el('button','tab',c);b.onclick=()=>{category=c;render();};nav.append(b);});render();}catch{const p=document.querySelector('#products');p.replaceChildren(el('p','','Menü yüklenemedi.'));const retry=el('button','outline','Tekrar dene');retry.onclick=load;p.append(retry);}}
load();document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
