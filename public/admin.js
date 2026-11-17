const $=id=>document.getElementById(id);let products=[];
function status(message){$('status').textContent=message;}
async function api(path,body){return MenuBackend.api(path,body);}
function show(auth){$('login-panel').hidden=auth;$('management').hidden=!auth;}
function reset(){$('product-form').reset();$('product-id').value='';$('form-title').textContent='Yeni ürün ekle';}
async function load(){const selected=$('category').value;const data=await api('menu');products=data.products;renderCategories(data.categories);orderedCategories=data.categories.slice();renderMenuOrdering();initOrdering(data.categories);$('category').replaceChildren();data.categories.forEach(c=>{const o=document.createElement('option');o.textContent=c;$('category').append(o);});if(data.categories.includes(selected))$('category').value=selected;$('admin-products').replaceChildren();products.forEach(p=>{const row=document.createElement('div');row.className='admin-item';const name=document.createElement('span');name.textContent=`${p.category} / ${p.name} · ${p.price} ₺${p.available?'':' · Gizli'}`;const actions=document.createElement('div');const edit=document.createElement('button');edit.className='outline';edit.textContent='Düzenle';edit.onclick=()=>{$('product-id').value=p.id;['name','description','price','category','badge'].forEach(k=>$(k).value=p[k]);$('available').checked=!!p.available;$('form-title').textContent='Ürünü düzenle';$('product-form').scrollIntoView({behavior:'smooth'});};const del=document.createElement('button');del.className='outline';del.textContent='Sil';del.onclick=async()=>{if(!confirm(`${p.name} silinsin mi?`))return;try{await api('products/delete',{id:p.id});reset();await load();status('Ürün silindi.');}catch(e){status(e.message);}};actions.append(edit,del);row.append(name,actions);$('admin-products').append(row);});}
$('login-form').onsubmit=async e=>{e.preventDefault();try{await api('login',{email:$('email').value.trim(),password:$('password').value});$('password').value='';show(true);await load();await loadLocationSettings();status('Giriş yapıldı.');}catch(e){status(e.message);}};
$('logout').onclick=async()=>{try{await api('logout',{});show(false);reset();status('Çıkış yapıldı.');}catch(e){status(e.message);}};
$('cancel').onclick=reset;
$('product-form').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{const body={id:$('product-id').value||undefined,available:$('available').checked};['name','description','price','category','badge'].forEach(k=>body[k]=$(k).value);await api('products',body);await load();reset();status('Kaydedildi. Müşteriler menüyü açtığında güncel bilgileri görecek.');}catch(e){status(e.message);}finally{button.disabled=false;}};


$('category-form').onsubmit=async e=>{
 e.preventDefault();const b=e.submitter;b.disabled=true;
 try{const name=$('category-name').value.trim();await api('categories',{name});await load();reset();$('category').value=name;$('category-form').reset();$('category-status').textContent='Kategori eklendi. Aşağıdaki formdan bu kategoriye ürün ekleyebilirsiniz.';}
 catch(e){$('category-status').textContent='Kategori eklenemedi: '+e.message;}
 finally{b.disabled=false;}
};

function renderCategories(categories){
 const list=$('admin-categories');list.replaceChildren();
 categories.forEach(category=>{
  const count=products.filter(p=>p.category===category).length;
  const form=document.createElement('form');form.className='menu-edit-row';
  const label=document.createElement('label');label.textContent=`${category} (${count} ürün)`;
  const input=document.createElement('input');input.value=category;input.required=true;input.maxLength=60;input.setAttribute('aria-label',category+' menü adı');label.append(input);
  const actions=document.createElement('div');actions.className='admin-actions';
  const save=document.createElement('button');save.className='outline';save.type='submit';save.textContent='Kaydet';
  const del=document.createElement('button');del.className='outline';del.type='button';del.textContent='Menüyü sil';
  form.onsubmit=async e=>{
   e.preventDefault();const name=input.value.trim();if(name===category)return;
   save.disabled=del.disabled=true;
   try{await api('categories/update',{oldName:category,name});reset();await load();$('category').value=name;$('menus-status').textContent='Menü adı ve ürünlerin menü bilgisi güncellendi.';}
   catch(e){$('menus-status').textContent=e.message;}
   finally{save.disabled=del.disabled=false;}
  };
  del.onclick=async()=>{
   if(count){$('menus-status').textContent=`${category} menüsünde ${count} ürün var. Önce ürünleri başka bir menüye taşıyın veya silin. Gizli ürünler de bu sayıya dahildir.`;return;}
   if(!confirm(`${category} menüsü silinsin mi?`))return;
   save.disabled=del.disabled=true;
   try{await api('categories/delete',{name:category});reset();await load();$('menus-status').textContent='Menü silindi.';}
   catch(e){$('menus-status').textContent=e.message;}
   finally{save.disabled=del.disabled=false;}
  };
  actions.append(save,del);form.append(label,actions);list.append(form);
 });
 if(!categories.length)list.textContent='Henüz menü bulunmuyor. Yukarıdaki formdan yeni menü ekleyebilirsiniz.';
}

let orderedProducts=[],orderedCategories=[];
function initOrdering(categories){
 const select=$('order-category'),selected=select.value;select.replaceChildren();
 categories.forEach(c=>{const option=document.createElement('option');option.textContent=c;select.append(option);});
 if(categories.includes(selected))select.value=selected;
 resetOrdering();
}
function resetOrdering(){
 orderedProducts=products.filter(p=>p.category===$('order-category').value).slice();
 $('order-status').textContent='';renderOrdering();
}
function moveProduct(from,to){
 const [item]=orderedProducts.splice(from,1);orderedProducts.splice(to,0,item);
 renderOrdering();$('order-status').textContent='Sıra değişti. Uygulamak için “Sıralamayı kaydet” düğmesine basın.';
}
function renderOrdering(){
 const list=$('order-products');list.replaceChildren();$('save-order').disabled=!orderedProducts.length;
 orderedProducts.forEach((p,index)=>{
  const row=document.createElement('div');row.className='order-row';
  const input=document.createElement('input');input.type='number';input.min=1;input.max=orderedProducts.length;input.step=1;input.value=index+1;input.setAttribute('aria-label',p.name+' sıra numarası');
  input.onchange=()=>{const position=Number(input.value);if(!Number.isInteger(position)||position<1||position>orderedProducts.length){input.value=index+1;$('order-status').textContent='Geçerli bir sıra numarası girin.';return;}moveProduct(index,position-1);};
  const name=document.createElement('span');name.textContent=p.name+(p.available?'':' (Gizli)');
  const actions=document.createElement('div');actions.className='order-arrows';
  [['↑',index-1,'yukarı taşı'],['↓',index+1,'aşağı taşı']].forEach(([text,to,label])=>{
   const button=document.createElement('button');button.type='button';button.className='outline';button.textContent=text;button.setAttribute('aria-label',p.name+' '+label);button.disabled=to<0||to>=orderedProducts.length;button.onclick=()=>moveProduct(index,to);actions.append(button);
  });
  row.append(input,name,actions);list.append(row);
 });
 if(!orderedProducts.length)list.textContent='Bu menüde sıralanacak ürün yok.';
}
$('order-category').onchange=resetOrdering;
$('save-order').onclick=async()=>{
 const button=$('save-order');button.disabled=true;$('order-category').disabled=true;
 const list=$('order-products');list.inert=true;
 try{await api('products/reorder',{category:$('order-category').value,ids:orderedProducts.map(p=>p.id)});await load();$('order-status').textContent='Sıralama kaydedildi. Müşteri menüsünde sayfa yenilendiğinde görünür.';}
 catch(e){$('order-status').textContent='Sıralama kaydedilemedi: '+e.message;}
 finally{button.disabled=!orderedProducts.length;$('order-category').disabled=false;list.inert=false;}
};

(async()=>{try{const s=await api('session');show(s.authenticated);if(s.authenticated){await load();await loadLocationSettings();}}catch{status('Sunucuya ulaşılamadı. Sayfayı yeniden yükleyin.');}})();

function updateLocationPreview(){
 const preview=$('location-preview');
 try{const url=new URL($('location-map').value.trim());if(url.protocol!=='https:'||url.username||url.password)throw Error();preview.href=url.href;preview.hidden=false;}
 catch{preview.hidden=true;preview.removeAttribute('href');}
}
async function loadLocationSettings(){
 try{
  const settings=await api('settings');$('location-address').value=settings.address;$('location-map').value=settings.map_url;
  $('location-address').disabled=false;$('location-map').disabled=false;$('save-location').disabled=false;updateLocationPreview();$('location-status').textContent='';
 }catch{$('save-location').disabled=true;$('location-status').textContent='Adres ayarları yüklenemedi. location-settings.sql kurulumunu kontrol edip sayfayı yenileyin.';}
}
$('location-map').oninput=updateLocationPreview;
$('location-form').onsubmit=async e=>{
 e.preventDefault();const button=$('save-location');button.disabled=true;
 try{await api('settings/update',{address:$('location-address').value,map_url:$('location-map').value});updateLocationPreview();$('location-status').textContent='Adres ve harita bağlantısı kaydedildi. Müşteri menüsünde her iki yol tarifi düğmesi de güncellendi.';}
 catch(e){$('location-status').textContent='Kaydedilemedi: '+e.message;}
 finally{button.disabled=false;}
};

function moveCategory(from,to){
 const [name]=orderedCategories.splice(from,1);orderedCategories.splice(to,0,name);
 renderMenuOrdering();$('menu-order-status').textContent='Sıra değişti. Uygulamak için menü sıralamasını kaydedin.';
}
function renderMenuOrdering(){
 const list=$('menu-order-list');list.replaceChildren();$('save-menu-order').disabled=!orderedCategories.length;
 orderedCategories.forEach((name,index)=>{
  const row=document.createElement('div');row.className='order-row';
  const input=document.createElement('input');input.type='number';input.min=1;input.max=orderedCategories.length;input.step=1;input.value=index+1;input.setAttribute('aria-label',name+' menü sıra numarası');
  input.onchange=()=>{const position=Number(input.value);if(!Number.isInteger(position)||position<1||position>orderedCategories.length){input.value=index+1;$('menu-order-status').textContent='Geçerli bir sıra numarası girin.';return;}moveCategory(index,position-1);};
  const text=document.createElement('span');text.textContent=name;
  const actions=document.createElement('div');actions.className='order-arrows';
  [['↑',index-1,'menüsünü yukarı taşı'],['↓',index+1,'menüsünü aşağı taşı']].forEach(([symbol,to,label])=>{
   const button=document.createElement('button');button.type='button';button.className='outline';button.textContent=symbol;button.setAttribute('aria-label',name+' '+label);button.disabled=to<0||to>=orderedCategories.length;button.onclick=()=>moveCategory(index,to);actions.append(button);
  });row.append(input,text,actions);list.append(row);
 });
 if(!orderedCategories.length)list.textContent='Sıralanacak menü yok.';
}
$('save-menu-order').onclick=async()=>{
 const button=$('save-menu-order'),list=$('menu-order-list');button.disabled=true;list.inert=true;
 try{await api('categories/reorder',{names:orderedCategories.slice()});await load();$('menu-order-status').textContent='Menü sıralaması kaydedildi. Müşteri menüsünü yenileyerek görebilirsiniz.';}
 catch(e){$('menu-order-status').textContent='Sıralama kaydedilemedi: '+e.message;}
 finally{button.disabled=!orderedCategories.length;list.inert=false;}
};
