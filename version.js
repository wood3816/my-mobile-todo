const APP_VERSION='1.0.0';
async function checkVersion(showIfCurrent=false){try{const r=await fetch(`version.json?t=${Date.now()}`,{cache:'no-store'});const v=await r.json();if(compareVersions(v.version,APP_VERSION)>0){showUpdate(v.version);return v.version}if(showIfCurrent)toast(`目前已是最新版本 v${APP_VERSION}`)}catch(e){if(showIfCurrent)toast('目前無法檢查版本')}return null}
function compareVersions(a,b){const A=a.split('.').map(Number),B=b.split('.').map(Number);for(let i=0;i<Math.max(A.length,B.length);i++){const x=A[i]||0,y=B[i]||0;if(x>y)return 1;if(x<y)return -1}return 0}
function showUpdate(v){document.querySelectorAll('[data-latest-version]').forEach(el=>el.textContent=v);document.getElementById('updateBox').classList.remove('hidden')}
async function applyUpdate(){if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations();for(const reg of regs)await reg.update()}location.reload()}
