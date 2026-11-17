const $=id=>document.getElementById(id);let products=[];
function status(message){$('status').textContent=message;}
async function api(path,body){return MenuBackend.api(path,body);}
function show(auth){$('login-panel').hidden=auth;$('management').hidden=!auth;}
function reset(){$('product-form').reset();$('product-id').value='';$('form-title').textContent='Yeni ürün ekle';}
async function load(){const selected=$('category').value;const data=await api('menu');products=data.products;renderCategories(data.categories);$('category').replaceChildren();data.categories.forEach(c=>{const o=document.createElement('option');o.textContent=c;$('category').append(o);});if(data.categories.includes(selected))$('category').value=selected;$('admin-products').replaceChildren();products.forEach(p=>{const row=document.createElement('div');row.className='admin-item';const name=document.createElement('span');name.textContent=`${p.category} / ${p.name} · ${p.price} ₺${p.available?'':' · Gizli'}`;const actions=document.createElement('div');const edit=document.createElement('button');edit.className='outline';edit.textContent='Düzenle';edit.onclick=()=>{$('product-id').value=p.id;['name','description','price','category','badge'].forEach(k=>$(k).value=p[k]);$('available').checked=!!p.available;$('form-title').textContent='Ürünü düzenle';$('product-form').scrollIntoView({behavior:'smooth'});};const del=document.createElement('button');del.className='outline';del.textContent='Sil';del.onclick=async()=>{if(!confirm(`${p.name} silinsin mi?`))return;try{await api('products/delete',{id:p.id});reset();await load();status('Ürün silindi.');}catch(e){status(e.message);}};actions.append(edit,del);row.append(name,actions);$('admin-products').append(row);});}
$('login-form').onsubmit=async e=>{e.preventDefault();try{await api('login',{email:$('email').value.trim(),password:$('password').value});$('password').value='';show(true);await load();status('Giriş yapıldı.');}catch(e){status(e.message);}};
$('logout').onclick=async()=>{try{await api('logout',{});show(false);reset();status('Çıkış yapıldı.');}catch(e){status(e.message);}};
$('cancel').onclick=reset;
$('product-form').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{const body={id:$('product-id').value||undefined,available:$('available').checked};['name','description','price','category','badge'].forEach(k=>body[k]=$(k).value);await api('products',body);await load();reset();status('Kaydedildi. Müşteriler menüyü açtığında güncel bilgileri görecek.');}catch(e){status(e.message);}finally{button.disabled=false;}};
(async()=>{try{const s=await api('session');show(s.authenticated);if(s.authenticated)await load();}catch{status('Sunucuya ulaşılamadı. Sayfayı yeniden yükleyin.');}})();

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
