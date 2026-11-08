const STORAGE_KEY = "my-links-v1";
const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const editor = document.getElementById("editor");
const form = document.getElementById("linkForm");
let links = loadLinks();

function loadLinks(){
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const backup = localStorage.getItem(STORAGE_KEY + "-backup");
    return JSON.parse(current || backup || "[]");
  } catch {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY + "-backup") || "[]"); }
    catch { return []; }
  }
}

// Ask the browser to keep this site's local data when the browser supports it.
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then(granted => {
    const status = document.getElementById("saveStatus");
    if (status) status.textContent = granted
      ? "自動保存済み・端末内データの保持を要求済み"
      : "自動保存済み（大切なデータは定期的にバックアップしてください）";
  }).catch(() => {});
}
function saveLinks(){
  const data = JSON.stringify(links);
  try {
    localStorage.setItem(STORAGE_KEY, data);
    // Keep a second local snapshot as a simple recovery fallback.
    localStorage.setItem(STORAGE_KEY + "-backup", data);
    const status = document.getElementById("saveStatus");
    if (status) status.textContent = "自動保存済み";
  } catch {
    const status = document.getElementById("saveStatus");
    if (status) status.textContent = "保存できませんでした。バックアップを書き出してください。";
  }
  render();
}
function safeHost(url){
  try { return new URL(url).hostname; } catch { return url; }
}
function render(){
  const query = document.getElementById("search").value.trim().toLowerCase();
  const tagFilter = document.getElementById("filter").value;
  const filtered = links.filter(item => {
    const haystack = [item.title,item.url,...(item.tags||[])].join(" ").toLowerCase();
    return haystack.includes(query) && (!tagFilter || (item.tags||[]).includes(tagFilter));
  });
  grid.innerHTML = "";
  filtered.forEach(item => {
    const card = document.createElement("article");
    card.className = "card";
    const thumb = document.createElement("div");
    thumb.className = "thumb";
    if(item.image){
      const img = document.createElement("img");
      img.src = item.image; img.alt = ""; img.onerror = () => { thumb.innerHTML = '<span class="placeholder">↗</span>'; };
      thumb.append(img);
    } else {
      const mark = document.createElement("span"); mark.className="placeholder"; mark.textContent="↗"; thumb.append(mark);
    }
    const body = document.createElement("div"); body.className="card-body";
    const title = document.createElement("h2"); title.className="card-title"; title.textContent=item.title;
    const url = document.createElement("div"); url.className="card-url"; url.textContent=safeHost(item.url);
    const tags = document.createElement("div"); tags.className="tags";
    (item.tags||[]).forEach(t=>{const span=document.createElement("span");span.className="tag";span.textContent=t;tags.append(span);});
    const actions=document.createElement("div");actions.className="card-actions";
    const visit=document.createElement("button");visit.className="primary";visit.textContent="開く";visit.onclick=()=>window.open(item.url,"_blank","noopener");
    const edit=document.createElement("button");edit.className="secondary";edit.textContent="編集";edit.onclick=()=>editLink(item.id);
    const del=document.createElement("button");del.className="secondary";del.textContent="削除";del.onclick=()=>deleteLink(item.id);
    actions.append(visit,edit,del);body.append(title,url,tags,actions);card.append(thumb,body);grid.append(card);
  });
  empty.hidden = filtered.length !== 0;
  document.getElementById("count").textContent = `${filtered.length} LINKS`;
  const status = document.getElementById("saveStatus");
  if (status && !status.textContent) status.textContent = "このブラウザに自動保存";
  updateFilters();
}
function updateFilters(){
  const select=document.getElementById("filter"), current=select.value;
  const all=[...new Set(links.flatMap(x=>x.tags||[]))].sort();
  select.innerHTML='<option value="">すべてのタグ</option>';
  all.forEach(t=>{const op=document.createElement("option");op.value=t;op.textContent=t;select.append(op);});
  select.value=all.includes(current)?current:"";
}
function openNew(){
  form.reset();document.getElementById("linkId").value="";
  document.getElementById("dialogTitle").textContent="リンクを追加";editor.showModal();
}
function editLink(id){
  const item=links.find(x=>x.id===id);if(!item)return;
  document.getElementById("linkId").value=item.id;
  document.getElementById("title").value=item.title;
  document.getElementById("url").value=item.url;
  document.getElementById("image").value=item.image||"";
  document.getElementById("tags").value=(item.tags||[]).join(", ");
  document.getElementById("dialogTitle").textContent="リンクを編集";editor.showModal();
}
function deleteLink(id){
  if(!confirm("このリンクを削除しますか？"))return;
  links=links.filter(x=>x.id!==id);saveLinks();
}
document.getElementById("openAdd").onclick=openNew;
document.getElementById("close").onclick=()=>editor.close();
document.getElementById("cancel").onclick=()=>editor.close();
form.onsubmit=e=>{
  e.preventDefault();
  const id=document.getElementById("linkId").value || crypto.randomUUID();
  const item={id,title:document.getElementById("title").value.trim(),url:document.getElementById("url").value.trim(),image:document.getElementById("image").value.trim(),tags:document.getElementById("tags").value.split(",").map(x=>x.trim()).filter(Boolean)};
  const index=links.findIndex(x=>x.id===id);
  if(index>=0)links[index]=item;else links.unshift(item);
  saveLinks();editor.close();
};
document.getElementById("search").addEventListener("input",render);
document.getElementById("filter").addEventListener("change",render);
document.getElementById("export").onclick=()=>{
  const blob=new Blob([JSON.stringify({version:1,links},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="my-links-backup.json";a.click();URL.revokeObjectURL(a.href);
};
document.getElementById("import").onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    const imported=Array.isArray(data)?data:data.links;
    if(!Array.isArray(imported)||!confirm("現在のリンクをバックアップ内容で置き換えますか？"))return;
    links=imported.filter(x=>x&&x.title&&x.url).map(x=>({...x,id:x.id||crypto.randomUUID(),tags:Array.isArray(x.tags)?x.tags:[]}));
    saveLinks();alert("復元しました。");
  }catch{alert("バックアップファイルを読み込めませんでした。");}
  e.target.value="";
};
render();
