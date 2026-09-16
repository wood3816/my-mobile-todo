const DB_NAME='todo-pwa-db'; const DB_VERSION=1;
let dbPromise;
function openDB(){if(dbPromise)return dbPromise;dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('tasks')){const s=db.createObjectStore('tasks',{keyPath:'id'});s.createIndex('sortOrder','sortOrder')}if(!db.objectStoreNames.contains('categories'))db.createObjectStore('categories',{keyPath:'id'});if(!db.objectStoreNames.contains('priorities'))db.createObjectStore('priorities',{keyPath:'id'});if(!db.objectStoreNames.contains('settings'))db.createObjectStore('settings',{keyPath:'key'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return dbPromise}
async function tx(store,mode,fn){const db=await openDB();return new Promise((res,rej)=>{const t=db.transaction(store,mode),s=t.objectStore(store);let out;try{out=fn(s,t)}catch(e){rej(e);return}t.oncomplete=()=>res(out);t.onerror=()=>rej(t.error)})}
const DB={
 async all(store){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})},
 async get(store,key){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})},
 async put(store,val){return tx(store,'readwrite',s=>s.put(val))},
 async delete(store,key){return tx(store,'readwrite',s=>s.delete(key))},
 async clear(store){return tx(store,'readwrite',s=>s.clear())},
 async bulkPut(store,items){const db=await openDB();return new Promise((res,rej)=>{const t=db.transaction(store,'readwrite'),s=t.objectStore(store);items.forEach(i=>s.put(i));t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}
};
