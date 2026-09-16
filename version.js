const APP_VERSION='1.0.6';
async function checkVersion(showIfCurrent=false){
  try{
    const r=await fetch(`version.json?t=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)throw new Error('version fetch failed');
    const v=await r.json();
    if(compareVersions(v.version,APP_VERSION)>0){showUpdate(v.version);return v.version}
    if(showIfCurrent)toast(`目前已是最新版本 v${APP_VERSION}`)
  }catch(e){if(showIfCurrent)toast('目前無法檢查版本')}
  return null
}
function compareVersions(a,b){
  const clean=v=>String(v??'').trim().replace(/^v/i,'').split('.').map(x=>Number.parseInt(x,10)||0);
  const A=clean(a),B=clean(b);
  for(let i=0;i<Math.max(A.length,B.length);i++){const x=A[i]||0,y=B[i]||0;if(x>y)return 1;if(x<y)return -1}
  return 0
}
function showUpdate(v){document.querySelectorAll('[data-latest-version]').forEach(el=>el.textContent=v);showPage('backupPage');document.getElementById('updateBox').classList.remove('hidden');closeDrawer()}
async function applyUpdate(){
  const btn=document.getElementById('applyUpdateBtn');
  if(btn){btn.disabled=true;btn.textContent='更新中…'}
  try{
    if(!('serviceWorker'in navigator)){location.reload();return}
    const reg=await navigator.serviceWorker.getRegistration();
    if(!reg){location.reload();return}
    const oldController=navigator.serviceWorker.controller;
    let settled=false;
    const controllerChanged=new Promise(resolve=>{
      const done=()=>{if(settled)return;settled=true;resolve()};
      navigator.serviceWorker.addEventListener('controllerchange',done,{once:true});
      setTimeout(done,3500);
    });
    await reg.update();
    if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
    if(oldController)await controllerChanged;
    location.reload();
  }catch(e){
    if(btn){btn.disabled=false;btn.textContent='立即更新'}
    toast('更新失敗，請稍後再試')
  }
}
