// Public configuration contains no privileged key. Database RLS enforces access.
window.MenuBackend = (() => {
 const config=window.MENU_CONFIG;
 let session=null;
 try{session=JSON.parse(sessionStorage.getItem('menu-session')||'null');}catch{}
 function save(value){session=value;if(value)sessionStorage.setItem('menu-session',JSON.stringify(value));else sessionStorage.removeItem('menu-session');}
 async function request(path,{method='GET',body,token,representation=false}={}){
  const headers={apikey:config.publishableKey,'Content-Type':'application/json'};
  if(representation)headers.Prefer='return=representation';
  if(token)headers.Authorization='Bearer '+token;
  const r=await fetch(config.url+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
  const text=await r.text();let data;try{data=text?JSON.parse(text):null;}catch{data=null;}
  if(!r.ok){if(data?.code==='23503')throw Error('Bu menüde ürün var. Önce ürünleri başka bir menüye taşıyın veya silin.');if(data?.code==='23505')throw Error('Bu isimde bir menü zaten var. Farklı bir isim seçin.');if(r.status===401)throw Error('Oturum geçersiz. Lütfen tekrar giriş yapın.');throw Error(data?.error_description||data?.msg||data?.message||'İşlem tamamlanamadı.');}
  return data;
 }
 async function token(){
  if(!session)return undefined;
  if(session.expires_at<Date.now()/1000+60){
   try{const s=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}});save(s);}catch(e){save(null);throw e;}
  }
  return session.access_token;
 }
 async function isAdmin(){const t=await token();if(!t)return false;return await request('/rest/v1/rpc/is_menu_admin',{method:'POST',body:{},token:t})===true;}
 async function api(path,body){
  if(path==='menu'){
   const t=await token();
   const products=await request('/rest/v1/products?select=*&order=id.asc',{token:t});
   products.sort((a,b)=>(a.sort_order??2147483647)-(b.sort_order??2147483647)||Number(a.id)-Number(b.id));
   let categories;
   try{categories=(await request('/rest/v1/categories?select=name&order=sort_order.asc,name.asc',{token:t})).map(c=>c.name);}
   catch{categories=[...new Set(products.map(p=>p.category))];}
   return {categories,products};
  }
  if(path==='settings'){
   const rows=await request('/rest/v1/site_settings?id=eq.1&select=address,map_url');
   if(!rows?.length)throw Error('Adres ayarları henüz kurulmadı.');
   return rows[0];
  }
  if(path==='session')return {authenticated:await isAdmin()};
  if(path==='login'){
   const s=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:body.email,password:body.password}});save(s);
   try{if(!await isAdmin())throw Error('Bu hesap için menü yönetim yetkisi tanımlanmamış.');}catch(e){save(null);throw e;}
   return {ok:true};
  }
  if(path==='logout'){try{const t=await token();if(t)await request('/auth/v1/logout',{method:'POST',body:{},token:t});}finally{save(null);}return {ok:true};}
  const t=await token();if(!t)throw Error('Yönetici girişi gerekli.');
  if(path==='settings/update'){
   const address=String(body.address||'').trim(),map_url=String(body.map_url||'').trim();
   if(!address||address.length>1000)throw Error('Adres 1–1000 karakter olmalı.');
   let url;try{url=new URL(map_url);}catch{throw Error('Geçerli bir harita bağlantısı girin.');}
   if(url.protocol!=='https:'||url.username||url.password||map_url.length>2048)throw Error('Harita bağlantısı https:// ile başlamalı ve kullanıcı bilgisi içermemeli.');
   const rows=await request('/rest/v1/site_settings?id=eq.1&select=address,map_url',{
    method:'PATCH',body:{address,map_url},token:t,representation:true});
   if(!rows?.length)throw Error('Adres ayarları bulunamadı veya düzenleme yetkiniz yok.');
   return {ok:true};
  }
  if(path==='categories/reorder'){
   await request('/rest/v1/rpc/reorder_categories',{method:'POST',body:{menu_names:body.names},token:t});return {ok:true};
  }
  if(path==='products/reorder'){
   await request('/rest/v1/rpc/reorder_products',{method:'POST',body:{menu_name:body.category,product_ids:body.ids},token:t});
   return {ok:true};
  }
  if(path==='categories/update'||path==='categories/delete'){
   const name=String(body.name||'').trim();
   if(!name||name.length>60)throw Error('Menü adı 1–60 karakter olmalı.');
   const oldName=path==='categories/update'?body.oldName:name;
   await request('/rest/v1/categories?name=eq.'+encodeURIComponent(oldName),{
    method:path==='categories/update'?'PATCH':'DELETE',
    body:path==='categories/update'?{name}:undefined,token:t});
   return {ok:true};
  }
  if(path==='categories'){
   const name=String(body.name||'').trim();
   if(!name||name.length>60)throw Error('Kategori adı 1–60 karakter olmalı.');
   await request('/rest/v1/categories',{method:'POST',body:{name},token:t});return {ok:true};
  }
  if(path==='products/delete'){await request('/rest/v1/products?id=eq.'+encodeURIComponent(body.id),{method:'DELETE',token:t});return {ok:true};}
  if(path==='products'){
   const row={name:body.name,description:body.description,price:Number(body.price),category:body.category,badge:body.badge,available:body.available};
   await request('/rest/v1/products'+(body.id?'?id=eq.'+encodeURIComponent(body.id):''),{method:body.id?'PATCH':'POST',body:row,token:t});return {ok:true};
  }
  throw Error('Bilinmeyen işlem.');
 }
 return {api};
})();
