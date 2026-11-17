// Public configuration contains no privileged key. Database RLS enforces access.
window.MenuBackend = (() => {
 const config=window.MENU_CONFIG;
 const categories=['Kahvaltı','Sıkma & Gözleme','Günün Menüsü','İçecekler'];
 let session=null;
 try{session=JSON.parse(sessionStorage.getItem('menu-session')||'null');}catch{}
 function save(value){session=value;if(value)sessionStorage.setItem('menu-session',JSON.stringify(value));else sessionStorage.removeItem('menu-session');}
 async function request(path,{method='GET',body,token}={}){
  const headers={apikey:config.publishableKey,'Content-Type':'application/json'};
  if(token)headers.Authorization='Bearer '+token;
  const r=await fetch(config.url+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
  const text=await r.text();let data;try{data=text?JSON.parse(text):null;}catch{data=null;}
  if(!r.ok){if(r.status===401)throw Error('Oturum geçersiz. Lütfen tekrar giriş yapın.');throw Error(data?.error_description||data?.msg||data?.message||'İşlem tamamlanamadı.');}
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
  if(path==='menu')return {categories,products:await request('/rest/v1/products?select=*&order=id.asc',{token:await token()})};
  if(path==='session')return {authenticated:await isAdmin()};
  if(path==='login'){
   const s=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:body.email,password:body.password}});save(s);
   try{if(!await isAdmin())throw Error('Bu hesap için menü yönetim yetkisi tanımlanmamış.');}catch(e){save(null);throw e;}
   return {ok:true};
  }
  if(path==='logout'){try{const t=await token();if(t)await request('/auth/v1/logout',{method:'POST',body:{},token:t});}finally{save(null);}return {ok:true};}
  const t=await token();if(!t)throw Error('Yönetici girişi gerekli.');
  if(path==='products/delete'){await request('/rest/v1/products?id=eq.'+encodeURIComponent(body.id),{method:'DELETE',token:t});return {ok:true};}
  if(path==='products'){
   const row={name:body.name,description:body.description,price:Number(body.price),category:body.category,badge:body.badge,available:body.available};
   await request('/rest/v1/products'+(body.id?'?id=eq.'+encodeURIComponent(body.id):''),{method:body.id?'PATCH':'POST',body:row,token:t});return {ok:true};
  }
  throw Error('Bilinmeyen işlem.');
 }
 return {api};
})();
