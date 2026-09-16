const BACKUP_SCHEMA=1;
function backupPayload(data){return {app:'Todo PWA',appVersion:APP_VERSION,schemaVersion:BACKUP_SCHEMA,exportedAt:new Date().toISOString(),...data}}
async function checksum(text){const bytes=new TextEncoder().encode(text);const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function exportBackup(){
  const payload=backupPayload({tasks:await DB.all('tasks'),categories:await DB.all('categories'),priorities:await DB.all('priorities'),settings:await DB.all('settings')});
  const core=JSON.stringify(payload);payload.checksum=await checksum(core);const final=JSON.stringify(payload,null,2);JSON.parse(final);
  const blob=new Blob([final],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`todo-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);return payload
}
async function validateBackup(obj){
  if(!obj||obj.app!=='Todo PWA')throw new Error('不是有效的 Todo PWA 備份');
  if(!Number.isInteger(obj.schemaVersion)||obj.schemaVersion<1)throw new Error('缺少有效 schemaVersion');
  if(obj.schemaVersion>BACKUP_SCHEMA)throw new Error('此備份來自較新的資料格式');
  if(!Array.isArray(obj.tasks)||!Array.isArray(obj.categories)||!Array.isArray(obj.priorities))throw new Error('備份缺少必要資料');
  for(const t of obj.tasks){if(!t||typeof t.id!=='string'||typeof t.content!=='string')throw new Error('待辦資料結構不完整')}
  if(obj.checksum){const copy={...obj};delete copy.checksum;const sum=await checksum(JSON.stringify(copy));if(sum!==obj.checksum)throw new Error('checksum 驗證失敗')}
  return true
}
async function importBackup(obj,mode='merge'){
  await validateBackup(obj);
  const snapshot={tasks:await DB.all('tasks'),categories:await DB.all('categories'),priorities:await DB.all('priorities'),settings:await DB.all('settings')};
  try{
    if(mode==='replace'){
      for(const s of ['tasks','categories','priorities','settings'])await DB.clear(s);
      if(obj.tasks.length)await DB.bulkPut('tasks',obj.tasks);if(obj.categories.length)await DB.bulkPut('categories',obj.categories);if(obj.priorities.length)await DB.bulkPut('priorities',obj.priorities);if(Array.isArray(obj.settings)&&obj.settings.length)await DB.bulkPut('settings',obj.settings)
    }else{
      const existing=Object.fromEntries((await DB.all('tasks')).map(t=>[t.id,t]));
      for(const t of obj.tasks){if(!existing[t.id]||new Date(t.updatedAt||0)>=new Date(existing[t.id].updatedAt||0))await DB.put('tasks',t)}
      for(const c of obj.categories)await DB.put('categories',c);for(const p of obj.priorities)await DB.put('priorities',p);if(Array.isArray(obj.settings))for(const s of obj.settings)await DB.put('settings',s)
    }
    await ensurePostImportDefaults();return true
  }catch(e){
    for(const s of ['tasks','categories','priorities','settings'])await DB.clear(s);
    if(snapshot.tasks.length)await DB.bulkPut('tasks',snapshot.tasks);if(snapshot.categories.length)await DB.bulkPut('categories',snapshot.categories);if(snapshot.priorities.length)await DB.bulkPut('priorities',snapshot.priorities);if(snapshot.settings.length)await DB.bulkPut('settings',snapshot.settings);throw e
  }
}
async function ensurePostImportDefaults(){if(!(await DB.get('settings','tabs')))await DB.put('settings',{key:'tabs',value:DEFAULT_TABS});if(!(await DB.get('settings','theme')))await DB.put('settings',{key:'theme',value:'system'})}
