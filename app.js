const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];
const uid=p=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
const todayISO=()=>{const d=new Date(),off=d.getTimezoneOffset();return new Date(d.getTime()-off*60000).toISOString().slice(0,10)};
const DEFAULT_CATS=[{id:'work',name:'工作',color:'#3b82f6',order:1},{id:'family',name:'家庭',color:'#22c55e',order:2},{id:'personal',name:'個人',color:'#8b5cf6',order:3}];
const DEFAULT_PRI=[{id:'high',name:'高',color:'#ef4444',order:1},{id:'medium',name:'一般',color:'#f59e0b',order:2},{id:'low',name:'低',color:'#22c55e',order:3}];
const DEFAULT_PRIORITY_ID='medium';
const DEFAULT_TABS=['all','open','done','today'];
const TAB_LABEL={all:'全部',open:'未完成',done:'已完成',today:'今天'};
let state={tasks:[],categories:[],priorities:[],tab:'all',categoryFilter:'',priorityFilter:'',filterStartDate:'',filterEndDate:'',filterCompletedOnly:false,filterNext7Days:false,filterDraftPriority:'',searchTerm:'',selectedTask:null,calendarDate:new Date(),selectedDate:todayISO(),taskOrderMode:false,pendingImport:null};

async function init(){
  await openDB();
  // 只在真正的全新安裝建立預設分類/優先級。
  // 舊版本若使用者已把分類或優先級全部刪除，不應在重新開啟後自動長回來。
  const [existingTasks,existingCats,existingPri,existingSettings]=await Promise.all([
    DB.all('tasks'),DB.all('categories'),DB.all('priorities'),DB.all('settings')
  ]);
  const isFreshInstall=!existingTasks.length&&!existingCats.length&&!existingPri.length&&!existingSettings.length;
  if(isFreshInstall){await DB.bulkPut('categories',DEFAULT_CATS);await DB.bulkPut('priorities',DEFAULT_PRI)}
  else{
    // 相容舊版：只把未被自訂過的舊預設『中』安全改名為『一般』；使用者自訂名稱不動。
    const legacyMedium=existingPri.find(x=>x.id===DEFAULT_PRIORITY_ID);
    if(legacyMedium&&legacyMedium.name==='中'&&String(legacyMedium.color||'').toLowerCase()==='#f59e0b'){
      await DB.put('priorities',{...legacyMedium,name:'一般'});
    }
  }
  await ensureSetting('tabs',DEFAULT_TABS);await ensureSetting('theme','system');await ensureSetting('initialized',true);
  const savedTabs=await DB.get('settings','tabs');
  const normalized=normalizeTabs(savedTabs?.value);
  if(JSON.stringify(normalized)!==JSON.stringify(savedTabs?.value||[]))await DB.put('settings',{key:'tabs',value:normalized});
  state.categories=await DB.all('categories');state.priorities=await DB.all('priorities');
  bind();
  applyTheme((await DB.get('settings','theme'))?.value||'system');
  await refresh();await renderTabs();await renderTabManager();renderManagers();renderCalendar();syncDateLabel();
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  setTimeout(()=>checkVersion(false),900);
}
async function ensureSetting(key,value){if(!(await DB.get('settings',key)))await DB.put('settings',{key,value})}

function bind(){
  $('#menuBtn').onclick=openDrawer;$('#overlay').onclick=closeAll;
  $('#addBtn').onclick=addTask;$('#taskInput').addEventListener('input',autoGrow);
  $('#dueDate').addEventListener('change',syncDateLabel);
  $('#searchBtn').onclick=openSearch;
  $('#closeSearch').onclick=()=>closeModal('searchModal');
  $('#applySearch').onclick=applySearch;
  $('#searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')applySearch()});
  $('#clearSearch').onclick=clearSearch;
  $('#closeFilter').onclick=()=>closeModal('filterModal');
  $('#cancelFilter').onclick=()=>closeModal('filterModal');
  $('#applyFilter').onclick=applyAdvancedFilter;
  $('#clearFilter').onclick=clearAdvancedFilter;
  $$('[data-nav]').forEach(b=>b.addEventListener('click',()=>{showPage(b.dataset.nav);closeDrawer()}));
  $$('[data-manage]').forEach(b=>b.addEventListener('click',()=>{openManageSection(b.dataset.manage);closeDrawer()}));
  $$('[data-open-version]').forEach(b=>b.addEventListener('click',()=>{openModal('aboutModal');closeDrawer()}));
  $('#closeAbout').onclick=()=>closeModal('aboutModal');
  $('#themeSelect').onchange=async e=>{applyTheme(e.target.value);await DB.put('settings',{key:'theme',value:e.target.value})};
  const scheme=window.matchMedia?.('(prefers-color-scheme: dark)');
  scheme?.addEventListener?.('change',async()=>{const saved=(await DB.get('settings','theme'))?.value||'system';if(saved==='system')applyTheme('system')});
  $('#settingsVersionCheck').onclick=()=>checkVersion(true);

  $('#exportBtn').onclick=async()=>{try{await exportBackup();showBackupOK('備份完整性檢查通過','備份已產生並通過格式檢查。');toast('備份已匯出')}catch(e){toast('備份匯出失敗')}};
  $('#importInput').onchange=prepareImport;
  $('#verifyInput').onchange=verifyBackupFile;
  $('#mergeImport').onclick=()=>performImport('merge');$('#replaceImport').onclick=()=>performImport('replace');$('#cancelImport').onclick=()=>{state.pendingImport=null;closeModal('importModal')};
  $('#checkVersionBtn').onclick=()=>checkVersion(true);$('#applyUpdateBtn').onclick=applyUpdate;$('#laterUpdateBtn').onclick=()=>$('#updateBox').classList.add('hidden');

  $('#addCategory').onclick=()=>editManager('categories');$('#addPriority').onclick=()=>editManager('priorities');
  $('#prevMonth').onclick=()=>{state.calendarDate=new Date(state.calendarDate.getFullYear(),state.calendarDate.getMonth()-1,1);renderCalendar()};
  $('#nextMonth').onclick=()=>{state.calendarDate=new Date(state.calendarDate.getFullYear(),state.calendarDate.getMonth()+1,1);renderCalendar()};
  $('#todayMonth').onclick=()=>{state.calendarDate=new Date();state.selectedDate=todayISO();renderCalendar()};

  $('#saveTaskEdit').onclick=saveTaskEdit;$('#cancelTaskEdit').onclick=()=>closeModal('taskModal');
  $('#saveManager').onclick=saveManager;$('#cancelManager').onclick=()=>closeModal('managerModal');
  $('#actionEdit').onclick=()=>{const id=state.selectedTask;closeTaskMenu();openTaskEdit(id)};
  $('#actionDelete').onclick=()=>{const id=state.selectedTask;closeTaskMenu();deleteTask(id)};
  $('#actionOrder').onclick=()=>{state.taskOrderMode=true;closeTaskMenu();renderTasks();toast('排序模式已開啟')};

  document.addEventListener('click',e=>{if($('#taskMenu').classList.contains('show')&&!e.target.closest('#taskMenu')&&!e.target.closest('.more'))closeTaskMenu()});
  window.addEventListener('resize',closeTaskMenu,{passive:true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll()});
  $$('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)}));
}

async function refresh(){
  state.tasks=(await DB.all('tasks')).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
  state.categories=(await DB.all('categories')).sort((a,b)=>(a.order??0)-(b.order??0));
  state.priorities=(await DB.all('priorities')).sort((a,b)=>(a.order??0)-(b.order??0));
  fillSelects();await renderTabs();renderTasks();renderCalendarTasks();
}
function fillSelects(){
  const c=$('#categorySelect'),p=$('#prioritySelect');
  const cv=c.value,pv=p.value;
  c.innerHTML='<option value="">分類</option>'+state.categories.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
  p.innerHTML=state.priorities.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
  if([...c.options].some(o=>o.value===cv))c.value=cv;
  if([...p.options].some(o=>o.value===pv))p.value=pv;
  else if([...p.options].some(o=>o.value===DEFAULT_PRIORITY_ID))p.value=DEFAULT_PRIORITY_ID;
  else if(p.options.length)p.selectedIndex=0;
  const fc=$('#filterCategory');
  if(state.categoryFilter&&!state.categories.some(x=>x.id===state.categoryFilter))state.categoryFilter='';
  if(state.priorityFilter&&!state.priorities.some(x=>x.id===state.priorityFilter))state.priorityFilter='';
  if(state.filterDraftPriority&&!state.priorities.some(x=>x.id===state.filterDraftPriority))state.filterDraftPriority='';
  if(fc){fc.innerHTML='<option value="">全部類別</option>'+state.categories.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}
}
function normalizeTabs(raw){const src=Array.isArray(raw)?raw:DEFAULT_TABS;const out=src.filter((x,i)=>DEFAULT_TABS.includes(x)&&src.indexOf(x)===i);for(const id of DEFAULT_TABS)if(!out.includes(id))out.push(id);return out}
function hasAdvancedFilter(){return !!(state.categoryFilter||state.priorityFilter||state.filterStartDate||state.filterEndDate||state.filterCompletedOnly||state.filterNext7Days)}
function openAdvancedFilter(){
  const fc=$('#filterCategory');fc.value=state.categoryFilter||'';
  $('#filterStartDate').value=state.filterStartDate||'';$('#filterEndDate').value=state.filterEndDate||'';
  $('#filterCompletedOnly').checked=!!state.filterCompletedOnly;$('#filterNext7Days').checked=!!state.filterNext7Days;
  state.filterDraftPriority=state.priorityFilter||'';renderFilterPriorityChips();openModal('filterModal')
}
function renderFilterPriorityChips(){
  const root=$('#filterPriorityChips');if(!root)return;
  const all=`<button type="button" class="filter-chip ${!state.filterDraftPriority?'selected':''}" data-filter-priority="">全部</button>`;
  root.innerHTML=all+state.priorities.map(x=>`<button type="button" class="filter-chip ${state.filterDraftPriority===x.id?'selected':''}" data-filter-priority="${x.id}" style="--chip-color:${x.color}">${esc(x.name)}</button>`).join('');
  root.querySelectorAll('[data-filter-priority]').forEach(b=>b.onclick=()=>{state.filterDraftPriority=b.dataset.filterPriority;renderFilterPriorityChips()})
}
function applyAdvancedFilter(){
  state.categoryFilter=$('#filterCategory').value||'';state.priorityFilter=state.filterDraftPriority||'';
  state.filterStartDate=$('#filterStartDate').value||'';state.filterEndDate=$('#filterEndDate').value||'';
  if(state.filterStartDate&&state.filterEndDate&&state.filterStartDate>state.filterEndDate)[state.filterStartDate,state.filterEndDate]=[state.filterEndDate,state.filterStartDate];
  state.filterCompletedOnly=$('#filterCompletedOnly').checked;state.filterNext7Days=$('#filterNext7Days').checked;
  closeModal('filterModal');renderTabs();renderTasks();toast(hasAdvancedFilter()?'已套用篩選':'已清除篩選')
}
function clearAdvancedFilter(){
  state.categoryFilter='';state.priorityFilter='';state.filterStartDate='';state.filterEndDate='';state.filterCompletedOnly=false;state.filterNext7Days=false;state.filterDraftPriority='';
  closeModal('filterModal');renderTabs();renderTasks();toast('已清除篩選')
}
function openSearch(){$('#searchInput').value=state.searchTerm||'';$('#clearSearch').classList.toggle('hidden',!state.searchTerm);openModal('searchModal');setTimeout(()=>$('#searchInput').focus(),60)}
function applySearch(){state.searchTerm=$('#searchInput').value.trim();closeModal('searchModal');renderTasks();toast(state.searchTerm?'已套用搜尋':'已清除搜尋')}
function clearSearch(){state.searchTerm='';$('#searchInput').value='';closeModal('searchModal');renderTasks();toast('已清除搜尋')}
function autoGrow(e){const el=e.currentTarget;el.style.height='auto';el.style.height=Math.min(el.scrollHeight,126)+'px'}
function syncDateLabel(){const v=$('#dueDate').value;$('#dueDateShell').classList.toggle('has-date',!!v);$('#dueDateText').textContent=v?v.slice(5).replace('-','/'):'日期'}
async function addTask(){
  const content=$('#taskInput').value.trim();if(!content){toast('請先輸入待辦內容');return}
  const now=new Date().toISOString(),max=state.tasks.length?Math.max(...state.tasks.map(x=>x.sortOrder||0)):0;
  const t={id:uid('task'),content,completed:false,categoryId:$('#categorySelect').value||null,priorityId:$('#prioritySelect').value||(state.priorities.some(x=>x.id===DEFAULT_PRIORITY_ID)?DEFAULT_PRIORITY_ID:null),dueDate:$('#dueDate').value||null,sortOrder:max+100,createdAt:now,updatedAt:now,completedAt:null};
  try{await DB.put('tasks',t);$('#taskInput').value='';$('#taskInput').style.height='';$('#dueDate').value='';syncDateLabel();await refresh();toast('已新增待辦')}catch(e){toast('儲存失敗，請重新嘗試')}
}
function filterTasks(){
  let arr=[...state.tasks],t=todayISO();
  if(state.tab==='open')arr=arr.filter(x=>!x.completed);
  if(state.tab==='done')arr=arr.filter(x=>x.completed);
  if(state.tab==='today')arr=arr.filter(x=>x.dueDate===t);
  if(state.categoryFilter)arr=arr.filter(x=>x.categoryId===state.categoryFilter);
  if(state.priorityFilter)arr=arr.filter(x=>x.priorityId===state.priorityFilter);
  if(state.filterStartDate)arr=arr.filter(x=>x.dueDate&&x.dueDate>=state.filterStartDate);
  if(state.filterEndDate)arr=arr.filter(x=>x.dueDate&&x.dueDate<=state.filterEndDate);
  if(state.filterCompletedOnly)arr=arr.filter(x=>x.completed);
  if(state.filterNext7Days){const end=new Date(t+'T12:00:00');end.setDate(end.getDate()+7);const e=end.toISOString().slice(0,10);arr=arr.filter(x=>x.dueDate&&x.dueDate>=t&&x.dueDate<=e)}
  if(state.searchTerm){const q=state.searchTerm.toLocaleLowerCase('zh-Hant');arr=arr.filter(x=>`${x.content} ${catName(x.categoryId)} ${priName(x.priorityId)}`.toLocaleLowerCase('zh-Hant').includes(q))}
  return arr;
}
function catName(id){return state.categories.find(x=>x.id===id)?.name||''}
function priName(id){return state.priorities.find(x=>x.id===id)?.name||''}
function colorOf(list,id){return list.find(x=>x.id===id)?.color||'#94a3b8'}
function dueChip(t){if(!t.dueDate)return'';const today=todayISO();const label=t.dueDate===today?'今天':t.dueDate.slice(5).replace('-','/');const cls=t.dueDate===today?' due-today':(t.dueDate<today&&!t.completed?' due-overdue':'');return `<span class="chip due-chip${cls}">${label}</span>`}
function renderTasks(){
  const list=$('#taskList'),items=filterTasks();
  let html=state.taskOrderMode?'<div class="order-mode-bar"><span>排序模式：使用 ↑ ↓ 調整</span><button id="finishOrder">完成</button></div>':'';
  if(!items.length)html+='<div class="empty">目前沒有待辦事項</div>';
  else html+=items.map(t=>`<article class="task ${t.completed?'done':''} ${state.taskOrderMode?'ordering':''}" data-id="${t.id}">
    <input class="check" type="checkbox" ${t.completed?'checked':''} aria-label="完成">
    <div class="task-main"><div class="task-title">${esc(t.content)}</div><div class="meta">
      ${t.categoryId?`<span class="chip" style="background:${hexAlpha(colorOf(state.categories,t.categoryId),.14)};color:${colorOf(state.categories,t.categoryId)}">${esc(catName(t.categoryId))}</span>`:''}
      ${t.priorityId?`<span class="chip" style="background:${hexAlpha(colorOf(state.priorities,t.priorityId),.14)};color:${colorOf(state.priorities,t.priorityId)}">${esc(priName(t.priorityId))}</span>`:''}
      ${dueChip(t)}
    </div></div>
    ${state.taskOrderMode?'<div class="task-order-actions"><button data-move="-1" aria-label="上移">↑</button><button data-move="1" aria-label="下移">↓</button></div>':'<button class="more" aria-label="更多功能">⋮</button>'}
  </article>`).join('');
  list.innerHTML=html;
  const completed=items.filter(x=>x.completed).length;const sum=$('#listSummary');if(sum)sum.textContent=`${items.length} 項待辦${completed?` · ${completed} 項已完成`:''}${state.searchTerm?' · 搜尋中':''}`;
  list.querySelector('#finishOrder')?.addEventListener('click',()=>{state.taskOrderMode=false;renderTasks();toast('排序已儲存')});
  list.querySelectorAll('.task').forEach(el=>{
    const id=el.dataset.id;const check=el.querySelector('.check');if(check)check.onchange=()=>toggleTask(id);
    const more=el.querySelector('.more');if(more)more.onclick=e=>{e.stopPropagation();openTaskMenu(id,more)};
    el.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>moveTask(id,Number(b.dataset.move)));
  });
}
async function moveTask(id,dir){const visible=filterTasks(),i=visible.findIndex(x=>x.id===id),j=i+dir;if(i<0||j<0||j>=visible.length)return;const a=visible[i],b=visible[j],[ao,bo]=[a.sortOrder,b.sortOrder];a.sortOrder=bo;b.sortOrder=ao;a.updatedAt=b.updatedAt=new Date().toISOString();await DB.put('tasks',a);await DB.put('tasks',b);await refresh()}
async function toggleTask(id){const t=state.tasks.find(x=>x.id===id);if(!t)return;t.completed=!t.completed;t.completedAt=t.completed?new Date().toISOString():null;t.updatedAt=new Date().toISOString();try{await DB.put('tasks',t);await refresh()}catch(e){toast('儲存失敗，請重新嘗試')}}

function openTaskMenu(id,anchor){
  state.selectedTask=id;const menu=$('#taskMenu');menu.classList.add('show');
  const r=anchor.getBoundingClientRect(),w=138,margin=8;let left=Math.min(window.innerWidth-w-margin,r.right-w+5),top=r.bottom+2;
  const h=118;if(top+h>window.innerHeight-margin)top=Math.max(margin,r.top-h+1);left=Math.max(margin,left);
  menu.style.left=left+'px';menu.style.top=top+'px';
}
function closeTaskMenu(){$('#taskMenu').classList.remove('show')}
function openTaskEdit(id){const t=state.tasks.find(x=>x.id===id);if(!t)return;state.selectedTask=id;$('#editContent').value=t.content;$('#editDate').value=t.dueDate||'';$('#editCompleted').checked=t.completed;$('#editCategory').innerHTML='<option value="">未分類</option>'+state.categories.map(x=>`<option value="${x.id}" ${x.id===t.categoryId?'selected':''}>${esc(x.name)}</option>`).join('');$('#editPriority').innerHTML='<option value="">無</option>'+state.priorities.map(x=>`<option value="${x.id}" ${x.id===t.priorityId?'selected':''}>${esc(x.name)}</option>`).join('');openModal('taskModal')}
async function saveTaskEdit(){const t=state.tasks.find(x=>x.id===state.selectedTask);if(!t)return;const content=$('#editContent').value.trim();if(!content){toast('內容不能空白');return}t.content=content;t.categoryId=$('#editCategory').value||null;t.priorityId=$('#editPriority').value||null;t.dueDate=$('#editDate').value||null;const was=t.completed;t.completed=$('#editCompleted').checked;if(t.completed&&!was)t.completedAt=new Date().toISOString();if(!t.completed)t.completedAt=null;t.updatedAt=new Date().toISOString();try{await DB.put('tasks',t);closeModal('taskModal');await refresh();toast('已修改')}catch(e){toast('儲存失敗，請重新嘗試')}}
async function deleteTask(id){const t=state.tasks.find(x=>x.id===id);if(!t)return;if(!confirm(`確定刪除「${t.content.slice(0,24)}${t.content.length>24?'…':''}」？`))return;await DB.delete('tasks',id);await refresh();showUndo(t)}
function showUndo(t){const bar=$('#undo');bar.innerHTML='待辦已刪除　<button id="undoBtn">復原</button>';bar.classList.add('show');clearTimeout(showUndo._t);showUndo._t=setTimeout(()=>bar.classList.remove('show'),5000);$('#undoBtn').onclick=async()=>{clearTimeout(showUndo._t);await DB.put('tasks',t);bar.classList.remove('show');await refresh();toast('已復原')}}

async function renderTabs(){
  const st=await DB.get('settings','tabs'),tabs=normalizeTabs(st?.value);
  $('#tabs').innerHTML=tabs.map(id=>`<button class="tab ${state.tab===id?'active':''}" data-tab="${id}">${TAB_LABEL[id]}</button>`).join('')+`<button id="filterBtn" class="tab filter-tab ${hasAdvancedFilter()?'filter-active':''}" aria-label="開啟篩選"><span class="filter-funnel" aria-hidden="true"></span> 篩選${hasAdvancedFilter()?'<i></i>':''}</button>`;
  $$('.tab[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;renderTabs();renderTasks()});
  $('#filterBtn').onclick=openAdvancedFilter;
}
async function renderTabManager(){const root=$('#tabManager');if(!root)return;const st=await DB.get('settings','tabs'),tabs=normalizeTabs(st?.value);root.innerHTML=tabs.map((id,i)=>`<div class="tab-manager-row"><strong>${TAB_LABEL[id]}</strong><button class="order-btn" data-tab-up="${id}" ${i===0?'disabled':''}>↑</button><button class="order-btn" data-tab-down="${id}" ${i===tabs.length-1?'disabled':''}>↓</button></div>`).join('')+'<div class="tab-manager-note">「篩選」固定在最右側，不參與排序。</div>';$$('[data-tab-up]').forEach(b=>b.onclick=()=>moveTab(b.dataset.tabUp,-1));$$('[data-tab-down]').forEach(b=>b.onclick=()=>moveTab(b.dataset.tabDown,1))}
async function moveTab(id,dir){const st=await DB.get('settings','tabs'),tabs=normalizeTabs(st?.value),i=tabs.indexOf(id),j=i+dir;if(i<0||j<0||j>=tabs.length)return;[tabs[i],tabs[j]]=[tabs[j],tabs[i]];await DB.put('settings',{key:'tabs',value:tabs});await renderTabs();await renderTabManager();toast('頁籤順序已儲存')}

function openDrawer(){$('#drawer').classList.add('show');$('#overlay').classList.add('show');$('#overlay').setAttribute('aria-hidden','false')}
function closeDrawer(){$('#drawer').classList.remove('show');$('#overlay').classList.remove('show');$('#overlay').setAttribute('aria-hidden','true')}
function closeAll(){closeDrawer();closeTaskMenu();$$('.modal').forEach(m=>m.classList.remove('show'))}
function showPage(id){$$('.page').forEach(p=>p.classList.remove('active'));$('#'+id)?.classList.add('active');$$('.nav-item[data-nav]').forEach(n=>n.classList.toggle('active',n.dataset.nav===id));if(id==='calendarPage')renderCalendar();if(id==='managePage')renderManagers();if(id==='tabPage')renderTabManager();if(id==='backupPage'){}window.scrollTo({top:0,behavior:'auto'})}
function openModal(id){$('#'+id).classList.add('show')}
function closeModal(id){$('#'+id).classList.remove('show')}

function openManageSection(type){
  const cat=type==='categories';$('#managerPageTitle').textContent=cat?'分類管理':'優先級管理';
  $('#categoryManageSection').classList.toggle('hidden',!cat);$('#priorityManageSection').classList.toggle('hidden',cat);
  showPage('managePage');renderManagers();$$('.nav-item').forEach(n=>n.classList.remove('active'));document.querySelector(`[data-manage="${type}"]`)?.classList.add('active')
}

function renderManagers(){
  for(const [store,root] of [['categories','#categoryManager'],['priorities','#priorityManager']]){
    $(root).innerHTML=state[store].sort((a,b)=>(a.order??0)-(b.order??0)).map(x=>`<div class="manager-row"><span class="drag-handle">⁝⁝</span><span class="swatch" style="background:${x.color}"></span><span class="manager-name">${esc(x.name)}</span><button class="manager-icon" data-edit-${store}="${x.id}" aria-label="修改">✎</button><button class="manager-icon" data-del-${store}="${x.id}" aria-label="刪除">⌫</button></div>`).join('')
  }
  $$('[data-edit-categories]').forEach(b=>b.onclick=()=>editManager('categories',b.dataset.editCategories));$$('[data-edit-priorities]').forEach(b=>b.onclick=()=>editManager('priorities',b.dataset.editPriorities));$$('[data-del-categories]').forEach(b=>b.onclick=()=>deleteManager('categories',b.dataset.delCategories));$$('[data-del-priorities]').forEach(b=>b.onclick=()=>deleteManager('priorities',b.dataset.delPriorities));
}
function editManager(type,id=null){const item=id?state[type].find(x=>x.id===id):null;$('#managerType').value=type;$('#managerId').value=id||'';$('#managerTitle').textContent=(id?'修改':'新增')+(type==='categories'?'分類':'優先級');$('#managerName').value=item?.name||'';$('#managerColor').value=item?.color||'#3b82f6';openModal('managerModal')}
async function saveManager(){const type=$('#managerType').value,id=$('#managerId').value||uid(type==='categories'?'cat':'pri'),arr=state[type],old=arr.find(x=>x.id===id),name=$('#managerName').value.trim();if(!name){toast('請輸入名稱');return}const item={id,name,color:$('#managerColor').value,order:old?.order||(arr.length+1)};await DB.put(type,item);closeModal('managerModal');await refresh();renderManagers();toast('已儲存')}
async function deleteManager(type,id){const item=state[type].find(x=>x.id===id);if(!item)return;if(!confirm(`確定刪除「${item.name}」？相關待辦不會被刪除。`))return;if(type==='categories'){for(const t of state.tasks.filter(x=>x.categoryId===id)){t.categoryId=null;t.updatedAt=new Date().toISOString();await DB.put('tasks',t)}}else{for(const t of state.tasks.filter(x=>x.priorityId===id)){t.priorityId=null;t.updatedAt=new Date().toISOString();await DB.put('tasks',t)}}await DB.delete(type,id);await refresh();renderManagers();toast('已刪除')}

function renderCalendar(){
  const d=state.calendarDate,y=d.getFullYear(),m=d.getMonth();$('#monthLabel').textContent=`${y} 年 ${m+1} 月`;
  const first=new Date(y,m,1),startDay=first.getDay(),gridStart=new Date(y,m,1-startDay),cells=[];
  for(let i=0;i<42;i++){
    const cur=new Date(gridStart.getFullYear(),gridStart.getMonth(),gridStart.getDate()+i),cy=cur.getFullYear(),cm=cur.getMonth(),cd=cur.getDate(),iso=`${cy}-${String(cm+1).padStart(2,'0')}-${String(cd).padStart(2,'0')}`;
    const has=state.tasks.some(t=>t.dueDate===iso),today=iso===todayISO(),sel=iso===state.selectedDate,outside=cm!==m;
    cells.push(`<button class="day ${has?'has':''} ${today?'today':''} ${sel?'selected':''} ${outside?'outside':''}" data-date="${iso}" data-month="${cm}">${cd}</button>`)
  }
  $('#calendarGrid').innerHTML='<div class="day-name">日</div><div class="day-name">一</div><div class="day-name">二</div><div class="day-name">三</div><div class="day-name">四</div><div class="day-name">五</div><div class="day-name">六</div>'+cells.join('');
  $$('[data-date]').forEach(b=>b.onclick=()=>{state.selectedDate=b.dataset.date;const chosen=new Date(state.selectedDate+'T12:00:00');if(chosen.getMonth()!==state.calendarDate.getMonth())state.calendarDate=new Date(chosen.getFullYear(),chosen.getMonth(),1);renderCalendar()});renderCalendarTasks();
}
function renderCalendarTasks(){
  const root=$('#calendarTasks');if(!root)return;const arr=state.tasks.filter(t=>t.dueDate===state.selectedDate),d=new Date(state.selectedDate+'T12:00:00');
  const wk=['日','一','二','三','四','五','六'][d.getDay()];$('#selectedDateLabel').textContent=`${state.selectedDate.replaceAll('-','/')} (${wk})`;$('#selectedDateCount').textContent=`${arr.length} 項待辦`;
  root.innerHTML=arr.length?arr.map(t=>`<article class="task ${t.completed?'done':''}"><input class="check" type="checkbox" ${t.completed?'checked':''} data-calendar-toggle="${t.id}"><div class="task-main"><div class="task-title">${esc(t.content)}</div><div class="meta">${t.categoryId?`<span class="chip" style="background:${hexAlpha(colorOf(state.categories,t.categoryId),.14)};color:${colorOf(state.categories,t.categoryId)}">${esc(catName(t.categoryId))}</span>`:''}${t.priorityId?`<span class="chip" style="background:${hexAlpha(colorOf(state.priorities,t.priorityId),.14)};color:${colorOf(state.priorities,t.priorityId)}">${esc(priName(t.priorityId))}</span>`:''}</div></div><button class="more" data-calendar-more="${t.id}">⋮</button></article>`).join(''):'<div class="empty">這天沒有待辦</div>';
  $$('[data-calendar-toggle]').forEach(b=>b.onchange=()=>toggleTask(b.dataset.calendarToggle));$$('[data-calendar-more]').forEach(b=>b.onclick=e=>{e.stopPropagation();openTaskMenu(b.dataset.calendarMore,b)});
}

async function prepareImport(e){const file=e.target.files?.[0];e.target.value='';if(!file)return;try{const obj=JSON.parse(await file.text());await validateBackup(obj);state.pendingImport=obj;$('#importPreview').innerHTML=`<span>待辦：<strong>${obj.tasks.length}</strong> 筆</span><span>分類：<strong>${obj.categories.length}</strong> 個</span><span>優先級：<strong>${obj.priorities.length}</strong> 個</span><span>資料版本：<strong>${obj.schemaVersion}</strong></span><span style="grid-column:1/-1">備份時間：<strong>${formatDateTime(obj.exportedAt)}</strong></span>`;openModal('importModal')}catch(err){toast('備份檔案格式錯誤：'+err.message)}}
async function performImport(mode){if(!state.pendingImport)return;try{await importBackup(state.pendingImport,mode);state.pendingImport=null;closeModal('importModal');const theme=(await DB.get('settings','theme'))?.value||'system';applyTheme(theme);await refresh();await renderTabs();await renderTabManager();renderManagers();renderCalendar();showBackupOK('匯入完成','資料已安全'+(mode==='merge'?'合併':'取代')+'。');toast('備份匯入完成')}catch(err){toast('匯入失敗：'+err.message)}}
async function verifyBackupFile(e){const file=e.target.files?.[0];e.target.value='';if(!file)return;try{const obj=JSON.parse(await file.text());await validateBackup(obj);showBackupOK('備份完整性檢查通過','備份檔案完整，資料可正常還原。');toast('檢查通過')}catch(err){$('#backupStatus').classList.add('hidden');toast('備份檢查失敗：'+err.message)}}
function showBackupOK(title,desc){const box=$('#backupStatus');box.innerHTML=`<span class="success-mark">✓</span><div><strong>${esc(title)}</strong><small>${esc(desc)}</small></div>`;box.classList.remove('hidden')}

function applyTheme(v){const prefersDark=window.matchMedia?.('(prefers-color-scheme: dark)').matches??false;const actual=v==='system'?(prefersDark?'dark':'light'):v;document.documentElement.dataset.theme=actual;const select=$('#themeSelect');if(select)select.value=v;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',actual==='dark'?'#10141a':'#fbfcfe')}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),2300)}
function formatDateTime(v){if(!v)return'未知';const d=new Date(v);return Number.isNaN(d.getTime())?'未知':d.toLocaleString('zh-TW',{hour12:false})}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function hexAlpha(hex,a){if(!/^#([A-Fa-f0-9]{6})$/.test(hex))return hex;const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return `rgba(${r},${g},${b},${a})`}
window.addEventListener('DOMContentLoaded',init);
