/* Studio Konten Humas — aplikasi (tampilan, data, alur kirim ke Humas) */
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const STATUSES=["Draf","Siap kirim","Terkirim ke Humas","Tayang","Perlu revisi"];
const DEFAULT_FORM="https://docs.google.com/forms/d/e/1FAIpQLSfm0uFqvNo6xJxjU4XfYJMkmnL6iuCCmawkNWZvsICT54v-RA/viewform";
const DEFAULT_TAGS="#PoltekkesMakassar #Kemenkes";
const TITLES={dashboard:"Dashboard",buat:"Buat Desain",tersimpan:"Desain Tersimpan",kalender:"Kalender Konten",pengaturan:"Pengaturan"};

/* ---------- pengaturan & server ---------- */
function loadSettings(){let s={};try{s=JSON.parse(localStorage.getItem("skh-settings")||"{}");}catch{}return {url:s.url||"",pin:s.pin||"",form:s.form||DEFAULT_FORM,tags:s.tags||DEFAULT_TAGS};}
let settings=loadSettings();
function saveSettings(){try{localStorage.setItem("skh-settings",JSON.stringify(settings));}catch{}}
let connected=false;
async function api(action,payload){
  if(!settings.url) {const e=new Error("Alamat server belum diisi di menu Pengaturan.");e.code="NOURL";throw e;}
  let res;
  try{res=await fetch(settings.url,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,pin:settings.pin,...(payload||{})})});}
  catch{const e=new Error("Server tidak bisa dihubungi. Periksa internet dan alamat server.");e.code="NET";setConn(false,e.message);throw e;}
  let j; try{j=await res.json();}catch{const e=new Error("Jawaban server tidak terbaca. Pastikan Web app di-deploy dengan akses Anyone.");setConn(false,e.message);throw e;}
  if(!j.ok){const e=new Error(j.error||"Permintaan gagal.");e.code=j.code;if(j.code==="PIN"||j.code==="SETUP")setConn(false,e.message);throw e;}
  if(!connected) setConn(true);
  return j.data;
}
function setConn(ok,msg){
  connected=ok;
  $("connDot").className="dot "+(ok?"on":"off");
  $("connTitle").textContent=ok?"Terhubung":"Tidak terhubung";
  $("connMsg").textContent=ok?"Draf tersimpan di Google Drive dan Sheet.":msg;
  const a=$("globalAlert");
  if(ok){a.hidden=true;} else {a.hidden=false;a.innerHTML=esc(msg)+' <a href="#pengaturan">Buka Pengaturan</a>.';}
}

/* ---------- dialog bantu ---------- */
function confirmDlg(title,text,yes){
  return new Promise(ok=>{const d=$("dlgConfirm");$("cfTitle").textContent=title;$("cfText").textContent=text;$("cfYes").textContent=yes||"Ya";
    const done=v=>{d.close();$("cfYes").onclick=$("cfNo").onclick=null;ok(v);};
    $("cfYes").onclick=()=>done(true);$("cfNo").onclick=()=>done(false);d.oncancel=()=>done(false);d.showModal();});
}
function toast(m){$("toast").textContent=m;}
function fmtDate(s){if(!s)return "";const d=new Date(s.length<=10?s+"T00:00":s);if(isNaN(d))return s;return d.toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"});}
function todayStr(off){const d=new Date();d.setDate(d.getDate()+(off||0));return d.toLocaleDateString("sv-SE");}
function pill(status){const cls="st-"+String(status||"Draf").split(" ")[0];return `<span class="pill ${cls}">${esc(status||"Draf")}</span>`;}

/* ---------- data desain ---------- */
let designs=[], loaded=false;
async function loadList(force){
  if(loaded&&!force) return designs;
  try{designs=await api("list");loaded=true;}catch(e){designs=designs||[];}
  return designs;
}
function rowHtml(r,opts){
  const thumb=r.thumb?`<img src="${esc(r.thumb)}" alt="">`:`<div class="thumb-ph"></div>`;
  const meta=[pill(r.status)];
  if(r.jadwal) meta.push(`<span>Unggah ${fmtDate(r.jadwal)}</span>`);
  if(r.slides) meta.push(`<span>${esc(r.slides)} slide</span>`);
  if(r.terkirim) meta.push(`<span>Dikirim ${fmtDate(r.terkirim)}</span>`);
  if(r.tayangUrl) meta.push(`<a href="${esc(r.tayangUrl)}" target="_blank" rel="noopener">Lihat postingan</a>`);
  if(r.catatan) meta.push(`<span title="${esc(r.catatan)}">Catatan: ${esc(r.catatan.slice(0,60))}</span>`);
  const acts=[`<button class="btn sm primary" data-open="${esc(r.id)}" type="button">Buka</button>`,`<button class="btn sm" data-status="${esc(r.id)}" type="button">Status</button>`];
  if(opts&&opts.del) acts.push(`<button class="btn sm danger" data-del="${esc(r.id)}" type="button">Hapus</button>`);
  return `<div class="row">${thumb}<div><h3>${esc(r.judul||"(tanpa judul)")}</h3><div class="meta">${meta.join("")}</div></div><div class="acts">${acts.join("")}</div></div>`;
}
document.addEventListener("click",async e=>{
  const o=e.target.closest("[data-open]"); if(o){openDesign(o.dataset.open);return;}
  const s=e.target.closest("[data-status]"); if(s){openStatus(s.dataset.status);return;}
  const d=e.target.closest("[data-del]"); if(d){
    const r=designs.find(x=>x.id===d.dataset.del);
    if(await confirmDlg("Hapus desain?",`"${r?.judul||"Desain"}" beserta foto drafnya akan dipindah ke Sampah Google Drive.`,"Hapus")){
      try{await api("remove",{id:d.dataset.del});await loadList(true);renderSaved();}catch(err){alertMsg(err.message);}
    }
  }
});
function alertMsg(m){const a=$("globalAlert");a.hidden=false;a.textContent=m;}

/* ---------- router ---------- */
let view="";
function go(v){
  if(!TITLES[v]) v="dashboard";
  view=v;
  document.querySelectorAll("[data-page]").forEach(s=>s.hidden=s.dataset.page!==v);
  document.querySelectorAll(".nav a").forEach(a=>{if(a.dataset.view===v)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
  $("pageTitle").textContent=TITLES[v];
  closeMenu();
  if(v==="dashboard") renderDashboard();
  if(v==="tersimpan") renderSaved();
  if(v==="kalender") renderCalendar();
  if(v==="pengaturan") fillSettings();
  if(v==="buat"){ if(!post) setPost(newPost()); syncUI(); }
  window.scrollTo(0,0);
}
document.addEventListener("click",async e=>{
  const a=e.target.closest('a[href^="#"]'); if(!a) return;
  const target=a.getAttribute("href").slice(1), isNew=a.hasAttribute("data-new");
  if(view==="buat"&&dirty&&(target!=="buat"||isNew)){
    e.preventDefault();
    if(!await confirmDlg("Tinggalkan desain ini?","Ada perubahan yang belum disimpan sebagai draf.","Tinggalkan")) return;
    dirty=false; if(isNew) setPost(newPost()); location.hash=target; if(target==="buat") go("buat"); return;
  }
  if(isNew){ setPost(newPost()); if(location.hash==="#buat"){e.preventDefault();go("buat");} }
});
window.addEventListener("hashchange",()=>go(location.hash.slice(1)));
window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue="";}});
function closeMenu(){$("side").classList.remove("open");$("scrim").hidden=true;}
$("menuBtn").onclick=()=>{$("side").classList.add("open");$("scrim").hidden=false;};
$("scrim").onclick=closeMenu;

/* ---------- dashboard ---------- */
async function renderDashboard(){
  $("stats").innerHTML=STATUSES.map(s=>`<a class="stat${s==="Perlu revisi"?" accent":""}" href="#tersimpan" data-filter="${s}"><b>…</b><span>${s}</span></a>`).join("");
  const list=await loadList(true);
  const count=s=>list.filter(r=>r.status===s).length;
  $("stats").innerHTML=STATUSES.map(s=>`<a class="stat${s==="Perlu revisi"&&count(s)?" accent":""}" href="#tersimpan" data-filter="${s}"><b>${count(s)}</b><span>${s}</span></a>`).join("");
  $("recentList").innerHTML=list.length?list.slice(0,6).map(r=>rowHtml(r)).join(""):`<div class="empty">Belum ada desain. <a href="#buat" data-new>Buat desain pertama</a>.</div>`;
  const t0=todayStr(0), t14=todayStr(14);
  const up=list.filter(r=>r.jadwal&&r.jadwal>=t0&&r.jadwal<=t14&&r.status!=="Tayang").sort((a,b)=>a.jadwal<b.jadwal?-1:1);
  $("upcomingList").innerHTML=up.length?up.map(r=>rowHtml(r)).join(""):`<div class="empty">Tidak ada jadwal unggah dalam 14 hari ke depan.</div>`;
  const m=t0.slice(0,7);
  const made=list.filter(r=>(r.dibuat||"").startsWith(m)).length, sent=list.filter(r=>(r.terkirim||"").startsWith(m)).length, live=list.filter(r=>r.status==="Tayang"&&(r.diubah||"").startsWith(m)).length;
  $("monthRecap").textContent=connected?`Bulan ini: ${made} desain dibuat, ${sent} dikirim ke Humas, ${live} ditandai tayang.`:"";
}
document.addEventListener("click",e=>{const f=e.target.closest("[data-filter]");if(f){savedFilter=f.dataset.filter;}});

/* ---------- desain tersimpan ---------- */
let savedFilter="Semua";
async function renderSaved(){
  $("statusChips").innerHTML=["Semua",...STATUSES].map(s=>`<button type="button" class="chip" aria-pressed="${s===savedFilter}" data-chip="${s}">${s}</button>`).join("");
  const list=await loadList();
  const q=$("q").value.trim().toLowerCase();
  const rows=list.filter(r=>(savedFilter==="Semua"||r.status===savedFilter)&&(!q||(r.judul+" "+r.caption).toLowerCase().includes(q)));
  $("savedList").innerHTML=rows.length?rows.map(r=>rowHtml(r,{del:true})).join(""):`<div class="empty">${list.length?"Tidak ada desain yang cocok.":connected?"Belum ada desain tersimpan.":"Hubungkan aplikasi ke server di menu Pengaturan untuk melihat desain tersimpan."}</div>`;
}
$("statusChips").addEventListener("click",e=>{const c=e.target.closest("[data-chip]");if(c){savedFilter=c.dataset.chip;renderSaved();}});
$("q").addEventListener("input",()=>renderSaved());

/* ---------- kalender ---------- */
let calMonth=new Date(); calMonth.setDate(1);
async function renderCalendar(){
  const list=await loadList();
  const y=calMonth.getFullYear(), m=calMonth.getMonth();
  $("calTitle").textContent=calMonth.toLocaleDateString("id-ID",{month:"long",year:"numeric"});
  const first=new Date(y,m,1), start=new Date(first); start.setDate(1-((first.getDay()+6)%7));
  const today=todayStr(0);
  let html=["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(d=>`<div class="dow">${d}</div>`).join("");
  for(let i=0;i<42;i++){
    const d=new Date(start); d.setDate(start.getDate()+i); const ds=d.toLocaleDateString("sv-SE");
    const evs=list.filter(r=>r.jadwal===ds);
    html+=`<div class="day${d.getMonth()!==m?" out":""}${ds===today?" today":""}"><span class="num">${d.getDate()}</span>${evs.map(r=>`<button class="ev" type="button" data-open="${esc(r.id)}" title="${esc(r.judul)} (${esc(r.status)})">${esc(r.judul||"Tanpa judul")}</button>`).join("")}</div>`;
    if(i>=34&&d.getMonth()!==m&&d.getDay()===0) break;
  }
  $("cal").innerHTML=html;
  const mk=`${y}-${String(m+1).padStart(2,"0")}`;
  const inMonth=list.filter(r=>(r.jadwal||"").startsWith(mk)).sort((a,b)=>a.jadwal<b.jadwal?-1:1);
  $("calList").innerHTML=inMonth.length?inMonth.map(r=>rowHtml(r)).join(""):`<div class="empty">Belum ada rencana unggah di bulan ini. Isi "Rencana tanggal unggah" saat membuat desain.</div>`;
}
$("calPrev").onclick=()=>{calMonth.setMonth(calMonth.getMonth()-1);renderCalendar();};
$("calNext").onclick=()=>{calMonth.setMonth(calMonth.getMonth()+1);renderCalendar();};
$("calToday").onclick=()=>{calMonth=new Date();calMonth.setDate(1);renderCalendar();};

/* ---------- pengaturan ---------- */
function fillSettings(){$("sUrl").value=settings.url;$("sPin").value=settings.pin;$("sForm").value=settings.form;$("sTags").value=settings.tags;}
$("setForm").addEventListener("submit",async e=>{
  e.preventDefault();
  settings={url:$("sUrl").value.trim(),pin:$("sPin").value.trim(),form:$("sForm").value.trim()||DEFAULT_FORM,tags:$("sTags").value.trim()||DEFAULT_TAGS};
  saveSettings(); $("setMsg").textContent="Menghubungkan…";
  try{await api("ping");setConn(true);$("setMsg").textContent="Tersimpan. Aplikasi terhubung ke server.";loaded=false;}
  catch(err){$("setMsg").textContent=err.message;}
});

/* ---------- status ---------- */
let statusId=null;
function openStatus(id){
  const r=designs.find(x=>x.id===id); if(!r) return;
  statusId=id; $("stTitle").textContent=r.judul||"(tanpa judul)";
  $("stSel").innerHTML=STATUSES.map(s=>`<option ${s===r.status?"selected":""}>${s}</option>`).join("");
  $("stLink").value=r.tayangUrl||""; $("stNote").value=r.catatan||"";
  $("dlgStatus").showModal();
}
$("stCancel").onclick=()=>$("dlgStatus").close();
$("statusForm").addEventListener("submit",async e=>{
  e.preventDefault();
  try{
    const r=await api("setStatus",{id:statusId,status:$("stSel").value,tayangUrl:$("stLink").value.trim(),catatan:$("stNote").value.trim()});
    $("dlgStatus").close();
    if(post&&post.id===statusId){post.status=r.status;showStatus();}
    await loadList(true); go(view);
  }catch(err){alertMsg(err.message);$("dlgStatus").close();}
});

/* =================== EDITOR =================== */
let post=null, cur=0, dirty=false;
function S(){return post.slides[cur];}
function newSlide(tpl){return {tpl:tpl||"t1",kind:"info",layout:1,sel:0,photos:[null,null,null,null],text:JSON.parse(JSON.stringify(DEF)),thumb:""};}
function newPost(){return {id:null,judul:"",jadwal:"",status:"",caption:"",info:"",tags:settings.tags,tone:"informatif",slides:[newSlide()]};}
function setPost(p){post=p;cur=0;dirty=false;fillPostFields();}
function markDirty(){dirty=true;}
function fillPostFields(){
  $("pJudul").value=post.judul;$("pJadwal").value=post.jadwal;$("cInfo").value=post.info;$("cTags").value=post.tags||settings.tags;$("cOut").value=post.caption;
  $("capCount").textContent=post.caption?post.caption.length+"/2200 karakter":"";$("capNote").textContent="";
  setTone(post.tone||"informatif"); showStatus(); loadFields(); toast("");
}
function showStatus(){const el=$("pStatus");const s=post.status||"";el.className="pill st-"+(s?s.split(" ")[0]:"Draf");el.textContent=s||"Belum disimpan";}
$("pJudul").addEventListener("input",()=>{post.judul=$("pJudul").value;markDirty();});
$("pJadwal").addEventListener("input",()=>{post.jadwal=$("pJadwal").value;markDirty();});
$("cInfo").addEventListener("input",()=>{post.info=$("cInfo").value;markDirty();});
$("cTags").addEventListener("input",()=>{post.tags=$("cTags").value;markDirty();});
$("cOut").addEventListener("input",()=>{post.caption=$("cOut").value;$("capCount").textContent=post.caption.length+"/2200 karakter";markDirty();});

/* --- kolom teks slide --- */
function loadFields(){
  const t=txt(), K=KIND[S().kind];
  $("tLabel").value=t.label;$("tJ1").value=t.j1;$("tJ2").value=t.j2;$("tBody").value=t.body;$("tAngka").value=t.angka;$("tSatuan").value=t.satuan;
  [["lLabel",0],["lJ1",1],["lJ2",2],["lBody",3]].forEach(([id,i])=>$(id).textContent=K.labels[i]);
  $("tBody").maxLength=K.bodyMax;$("tBody").rows=S().kind==="pengumuman"?6:3;updateCount();
}
function updateCount(){$("bodyCount").textContent=$("tBody").value.length+"/"+KIND[S().kind].bodyMax;}
[["tLabel","label"],["tJ1","j1"],["tJ2","j2"],["tBody","body"],["tAngka","angka"],["tSatuan","satuan"]].forEach(([id,k])=>$(id).addEventListener("input",()=>{txt()[k]=$(id).value;updateCount();markDirty();draw();}));

/* --- gambar --- */
let thumbTimer=null;
function draw(){render(false);clearTimeout(thumbTimer);thumbTimer=setTimeout(()=>{S().thumb=snap(150);renderStrip();},350);}
function snap(w){const c=document.createElement("canvas");c.width=w;c.height=Math.round(w*1.25);c.getContext("2d").drawImage(cv,0,0,c.width,c.height);return c.toDataURL("image/jpeg",.6);}
function renderStrip(){
  const el=$("slideStrip");
  if(post.slides.some((s,i)=>i!==cur&&!s.thumb)){const keep=cur;post.slides.forEach((s,i)=>{if(i!==keep&&!s.thumb){cur=i;render(true);s.thumb=snap(150);}});cur=keep;render(false);}
  el.innerHTML=post.slides.map((s,i)=>`<button type="button" class="slide-btn" data-slide="${i}" aria-current="${i===cur}" aria-label="Slide ${i+1}">${s.thumb?`<img src="${s.thumb}" alt="">`:""}<span>${i+1}</span></button>`).join("")+(post.slides.length<10?`<button type="button" class="slide-add" id="addSlide" aria-label="Tambah slide">+</button>`:"");
  $("btnDelSlide").disabled=post.slides.length<2; $("btnLeft").disabled=cur===0; $("btnRight").disabled=cur===post.slides.length-1;
}
$("slideStrip").addEventListener("click",e=>{
  const b=e.target.closest("[data-slide]"); if(b){cur=+b.dataset.slide;loadFields();syncUI();return;}
  if(e.target.closest("#addSlide")){post.slides.push(newSlide(S().tpl));cur=post.slides.length-1;markDirty();loadFields();syncUI();toast("Slide "+(cur+1)+" ditambahkan.");}
});
function cloneSlide(s){return {...s,photos:s.photos.map(p=>p?{...p}:null),text:JSON.parse(JSON.stringify(s.text))};}
$("btnDup").onclick=()=>{if(post.slides.length>=10){toast("Formulir Humas menerima maksimal 10 gambar.");return;}post.slides.splice(cur+1,0,cloneSlide(S()));cur++;markDirty();loadFields();syncUI();};
$("btnDelSlide").onclick=async()=>{if(post.slides.length<2)return;if(!await confirmDlg("Hapus slide "+(cur+1)+"?","Slide ini akan dihapus dari desain.","Hapus"))return;post.slides.splice(cur,1);cur=Math.max(0,cur-1);markDirty();loadFields();syncUI();};
$("btnLeft").onclick=()=>{if(cur<1)return;const s=post.slides;[s[cur-1],s[cur]]=[s[cur],s[cur-1]];cur--;markDirty();syncUI();};
$("btnRight").onclick=()=>{const s=post.slides;if(cur>=s.length-1)return;[s[cur+1],s[cur]]=[s[cur],s[cur+1]];cur++;markDirty();syncUI();};

function syncUI(){
  document.querySelectorAll("#tplSeg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.tpl===S().tpl));
  document.querySelectorAll("#kindSeg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.kind===S().kind));
  document.querySelectorAll("#laySeg button").forEach(b=>b.setAttribute("aria-pressed",+b.dataset.lay===S().layout));
  const P=KIND[S().kind].photos, n=photoCount();
  $("photoSec").hidden=!P;$("laySeg").hidden=P!=="multi";
  $("photoTitle").textContent=P==="one"?"Foto (opsional)":"Foto";
  $("textStep").textContent=P?"Langkah 4":"Langkah 3";$("capStep").textContent=P?"Langkah 5":"Langkah 4";
  $("numRow").hidden=S().kind!=="angka";
  if(S().sel>=Math.max(n,1)) S().sel=0;
  const sl=$("slots"); sl.innerHTML="";
  for(let i=0;i<n;i++){
    const b=document.createElement("button");b.type="button";b.className="slot";b.setAttribute("aria-pressed",i===S().sel);b.setAttribute("aria-label","Foto "+(i+1));
    const p=S().photos[i];
    if(p){const im=document.createElement("img");im.src=p.thumb;im.alt="";b.append(im);const s=document.createElement("span");s.textContent=i+1;b.append(s);}
    else b.textContent="+"+(i+1);
    b.onclick=()=>{S().sel=i;if(!S().photos[i])pick(i);syncUI();};
    sl.append(b);
  }
  const p=n?S().photos[S().sel]:null;
  $("photoTools").hidden=!p; if(p) $("zoom").value=p.zoom;
  $("hint").textContent=!P?"Layout ini tanpa foto.":P==="one"?"Foto boleh dikosongkan. Kalau diisi, foto tampil di atas ucapan.":"Ketuk kotak foto untuk mengunggah. Geser foto untuk mengatur posisinya.";
  draw(); renderStrip();
}
document.querySelectorAll("#tplSeg button").forEach(b=>b.onclick=()=>{S().tpl=b.dataset.tpl;markDirty();syncUI();});
document.querySelectorAll("#kindSeg button").forEach(b=>b.onclick=()=>{S().kind=b.dataset.kind;if(cur===0&&TONE_FOR[S().kind])setTone(TONE_FOR[S().kind]);markDirty();loadFields();syncUI();});
document.querySelectorAll("#laySeg button").forEach(b=>b.onclick=()=>{S().layout=+b.dataset.lay;markDirty();syncUI();});

/* --- foto --- */
let pickTarget=0;
function pick(i){pickTarget=i;$("file").value="";$("file").click();}
$("file").onchange=async e=>{
  const files=[...e.target.files],n=photoCount();let i=pickTarget,skipped=0;
  for(const f of files){
    while(i<n&&S().photos[i]&&i!==pickTarget)i++;
    if(i>=n){skipped++;continue;}
    try{S().photos[i]=await prepPhoto(f);markDirty();}catch{toast("Foto "+f.name+" tidak bisa dibaca.");}
    i++;
  }
  if(skipped)toast(`${skipped} foto tidak dipakai karena kotaknya penuh.`);
  syncUI();
};
function canvasFrom(img,max){const s=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext("2d").drawImage(img,0,0,c.width,c.height);return c;}
function thumbOf(c){const t=document.createElement("canvas"),ts=128/Math.min(c.width,c.height);t.width=Math.round(c.width*ts);t.height=Math.round(c.height*ts);t.getContext("2d").drawImage(c,0,0,t.width,t.height);return t.toDataURL("image/jpeg",.7);}
async function prepPhoto(file){
  const url=URL.createObjectURL(file);const img=await loadImg(url);const c=canvasFrom(img,1800);URL.revokeObjectURL(url);
  return {img:c,zoom:1,cx:.5,cy:c.height>c.width?.42:.5,thumb:thumbOf(c)};
}
$("zoom").oninput=e=>{const p=S().photos[S().sel];if(p){p.zoom=+e.target.value;markDirty();draw();}};
$("btnReplace").onclick=()=>pick(S().sel);
$("btnCenter").onclick=()=>{const p=S().photos[S().sel];if(p){p.cx=.5;p.cy=.5;p.zoom=1;markDirty();syncUI();}};
$("btnRemove").onclick=()=>{S().photos[S().sel]=null;markDirty();syncUI();};
let drag=null;
function toCanvas(e){const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
function hit(pt){return lastCells.findIndex(c=>pt.x>=c.x&&pt.x<=c.x+c.w&&pt.y>=c.y&&pt.y<=c.y+c.h);}

/* --- ekspor --- */
function missingPhotos(){const out=[];post.slides.forEach((s,i)=>{if(KIND[s.kind].photos==="multi"&&s.photos.slice(0,s.layout).some(p=>!p))out.push(i+1);});return out;}
function exportAll(type){
  const keep=cur, out=[];
  post.slides.forEach((s,i)=>{cur=i;render(true);out.push(cv.toDataURL(type||"image/jpeg",.92));});
  cur=keep; render(false); return out;
}
function baseName(){return (post.judul||txt().j1||"konten").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50)||"konten";}
async function downloadAll(){
  const miss=missingPhotos(); if(miss.length){toast("Kotak foto masih kosong di slide "+miss.join(", ")+".");return false;}
  const imgs=exportAll();
  for(let i=0;i<imgs.length;i++){
    const a=document.createElement("a");a.href=imgs[i];a.download=`${baseName()}-${String(i+1).padStart(2,"0")}.jpg`;document.body.append(a);a.click();a.remove();
    await new Promise(r=>setTimeout(r,350));
  }
  toast(imgs.length+" gambar diunduh.");return true;
}
$("btnDownload").onclick=downloadAll;

/* --- simpan & buka draf --- */
function serialize(){
  const uploads={};
  const slides=post.slides.map(s=>({tpl:s.tpl,kind:s.kind,layout:s.layout,text:s.text,
    photos:s.photos.map(p=>{if(!p)return null;const o={cx:+p.cx.toFixed(4),cy:+p.cy.toFixed(4),zoom:+p.zoom.toFixed(3)};
      if(p.ref)o.ref=p.ref;else{p.key=p.key||Math.random().toString(36).slice(2,9);o.key=p.key;uploads[p.key]=p.img.toDataURL("image/jpeg",.86);}return o;})}));
  return {design:{id:post.id,judul:post.judul,jadwal:post.jadwal,caption:post.caption,info:post.info,tags:post.tags,tone:post.tone,slides},uploads};
}
async function saveDraft(){
  if(!post.judul.trim()){const t=post.slides[0].text[post.slides[0].kind];post.judul=(t.j1+" "+t.j2).trim()||"Konten tanpa judul";$("pJudul").value=post.judul;}
  const btn=$("btnSaveDraft");btn.disabled=true;btn.textContent="Menyimpan…";
  try{
    const keep=cur;cur=0;render(true);const thumb=snap(240);cur=keep;render(false);
    const {design,uploads}=serialize();
    const r=await api("save",{design,uploads,thumb});
    post.id=r.id;post.status=r.status;
    post.slides.forEach(s=>s.photos.forEach(p=>{if(p&&p.key&&r.photoMap[p.key]){p.ref=r.photoMap[p.key];delete p.key;}}));
    dirty=false;showStatus();loaded=false;toast("Draf tersimpan di Google Drive.");return true;
  }catch(err){toast("Gagal menyimpan: "+err.message);return false;}
  finally{btn.disabled=false;btn.textContent="Simpan draf";}
}
$("btnSaveDraft").onclick=saveDraft;
async function openDesign(id){
  if(view==="buat"&&dirty&&!await confirmDlg("Tinggalkan desain ini?","Ada perubahan yang belum disimpan sebagai draf.","Tinggalkan"))return;
  alertMsg("Membuka desain…");
  try{
    const r=await api("get",{id});
    const d=r.design, imgs={};
    for(const [ref,url] of Object.entries(r.photos||{})) if(url){try{imgs[ref]=canvasFrom(await loadImg(url),1800);}catch{}}
    const p={id:r.row.id,judul:d.judul||"",jadwal:d.jadwal||"",status:r.row.status,caption:d.caption||"",info:d.info||"",tags:d.tags||settings.tags,tone:d.tone||"informatif",
      slides:(d.slides||[]).map(s=>({tpl:s.tpl,kind:s.kind,layout:s.layout||1,sel:0,thumb:"",text:Object.assign(JSON.parse(JSON.stringify(DEF)),s.text||{}),
        photos:[0,1,2,3].map(i=>{const q=(s.photos||[])[i];if(!q||!imgs[q.ref])return null;return {img:imgs[q.ref],ref:q.ref,cx:q.cx,cy:q.cy,zoom:q.zoom,thumb:thumbOf(imgs[q.ref])};})}))};
    if(!p.slides.length)p.slides=[newSlide()];
    $("globalAlert").hidden=true;
    setPost(p);
    p.slides.forEach((s,i)=>{cur=i;render(true);s.thumb=snap(150);});cur=0;
    if(location.hash==="#buat")go("buat");else location.hash="#buat";
  }catch(err){alertMsg("Gagal membuka desain: "+err.message);}
}

/* --- kirim ke humas --- */
function oneLine(t){return String(t||"").replace(/\s*\n+\s*/g," ").trim();}
$("btnSend").onclick=async()=>{
  const miss=missingPhotos(); if(miss.length){toast("Kotak foto masih kosong di slide "+miss.join(", ")+".");return;}
  if(!post.caption.trim()){toast("Caption masih kosong. Buat caption dulu di langkah terakhir.");$("btnCap").scrollIntoView({behavior:"smooth",block:"center"});return;}
  if(dirty||!post.id){ if(!await saveDraft()) return; }
  ["s1","s2","s3","s4","s5"].forEach(id=>$(id).classList.remove("done"));
  $("sJudul").textContent=post.judul;$("sCaption").textContent=oneLine(post.caption);
  $("sForm").href=settings.form||DEFAULT_FORM;$("sFolder").hidden=true;$("sToast").textContent="";
  $("dlgSend").showModal();
};
$("sClose").onclick=()=>$("dlgSend").close();
$("sExport").onclick=async()=>{
  const b=$("sExport");b.disabled=true;b.textContent="Menyimpan…";
  try{const r=await api("exportImages",{id:post.id,images:exportAll()});
    $("sFolder").href=r.url;$("sFolder").hidden=false;$("s1").classList.add("done");
    $("s1Msg").textContent=`Tersimpan di Drive: Studio Konten Humas › Hasil › ${r.folderName}`;post.status=r.status;showStatus();loaded=false;}
  catch(err){$("sToast").textContent="Gagal menyimpan ke Drive: "+err.message;}
  finally{b.disabled=false;b.textContent="Simpan ke Drive";}
};
$("sDownload").onclick=async()=>{if(await downloadAll())$("s1").classList.add("done");};
async function copyText(t,stepId){
  try{await navigator.clipboard.writeText(t);$(stepId).classList.add("done");$("sToast").textContent="Tersalin. Tempel di formulir.";}
  catch{$("sToast").textContent="Tidak bisa menyalin otomatis. Pilih teksnya lalu salin manual.";}
}
$("sCopyJudul").onclick=()=>copyText(post.judul,"s2");
$("sCopyCap").onclick=()=>copyText(oneLine(post.caption),"s3");
$("sForm").addEventListener("click",()=>$("s4").classList.add("done"));
$("sDone").onclick=async()=>{
  try{const r=await api("setStatus",{id:post.id,status:"Terkirim ke Humas"});post.status=r.status;showStatus();$("s5").classList.add("done");
    $("sToast").textContent="Status diubah menjadi Terkirim ke Humas.";loaded=false;}
  catch(err){$("sToast").textContent=err.message;}
};

/* --- caption --- */
const CAP={
  hook:{informatif:["Kabar dari lapangan hari ini.","Ada kabar baik dari sivitas Poltekkes Kemenkes Makassar.","Begini cerita kegiatan kami kali ini."],
    edukatif:["Tahukah Sobat Sehat? Gizi baik dimulai dari rumah.","Kesehatan keluarga dimulai dari langkah kecil yang konsisten.","Yuk, belajar bersama dari kegiatan ini."],
    promotif:["Kesempatan ini sayang untuk dilewatkan!","Saatnya ambil langkah untuk masa depan yang lebih sehat.","Kabar penting untuk Sobat Sehat semua!"],
    inspiratif:["Setiap langkah kecil bisa membawa perubahan besar.","Kerja tulus selalu menemukan jalannya.","Ada semangat yang patut kita tiru dari kegiatan ini."]},
  cta:{informatif:["Ikuti terus kabar terbaru kami di @polkesmakassar.","Simak kabar kegiatan lainnya di @polkesmakassar."],
    edukatif:["Bagikan informasi ini agar makin banyak keluarga yang peduli.","Simpan dan bagikan postingan ini ke orang terdekatmu.","Yuk, mulai terapkan dari rumah sendiri."],
    promotif:["Jangan sampai terlewat. Info lengkap di @polkesmakassar.","Tandai temanmu yang perlu tahu informasi ini.","Segera catat dan bagikan ke yang membutuhkan."],
    inspiratif:["Semoga menginspirasi dan menjadi semangat untuk terus berkarya.","Mari terus dukung karya sivitas Poltekkes Kemenkes Makassar.","Semoga langkah ini menular ke lebih banyak orang."]},
  toneEmoji:{informatif:"📢",edukatif:"💡",promotif:"✨",inspiratif:"💚"},
  topics:[[/stunting/i,"#CegahStunting","📏"],[/balita|anak/i,"#GiziBalita","👶"],[/gizi|makan|asupan/i,"#GiziSeimbang","🥗"],[/kunjungan rumah/i,"#KunjunganRumah","🏡"],[/posyandu|kader/i,"#KaderPosyandu",""],[/ibu hamil|kehamilan|bumil/i,"#KesehatanIbu","🤰"],[/imunisasi|vaksin/i,"#Imunisasi","💉"],[/pengabdian|masyarakat/i,"#PengabdianMasyarakat","🤝"],[/mahasiswa/i,"#MahasiswaPoltekkes","🎓"],[/beasiswa/i,"#Beasiswa","🎓"],[/prestasi|juara|medali|penghargaan/i,"#Prestasi","🏆"],[/penelitian|riset/i,"#Penelitian","🔬"],[/pendaftaran|pmb|mahasiswa baru/i,"#PMBPoltekkes","📝"],[/wisuda/i,"#Wisuda","🎓"],[/kerja ?sama|mou|kemitraan/i,"#Kerjasama","🤝"]]
};
function setTone(t){post.tone=t;document.querySelectorAll("#toneSeg button").forEach(x=>x.setAttribute("aria-pressed",x.dataset.tone===t));}
document.querySelectorAll("#toneSeg button").forEach(b=>b.onclick=()=>{setTone(b.dataset.tone);markDirty();});
function slideBody(s){const t=s.text[s.kind];let b=(t.body||"").trim();
  if(s.kind==="pengumuman") b=b.split(/\n+/).map(x=>x.trim()).filter(Boolean).map(x=>/[.!?]$/.test(x)?x:x+".").join(" ");
  if(s.kind==="angka"&&t.angka.trim()) b=(`${t.angka} ${t.satuan}`.trim()+". "+b).trim();
  return b;}
function capData(){
  const s0=post.slides[0], t0=s0.text[s0.kind];
  let label=t0.label.trim(), judul=post.judul.trim()||(t0.j1+" "+t0.j2).trim();
  if(s0.kind==="ucapan"){judul=post.judul.trim()||(t0.label+" "+t0.j1+" "+t0.j2).trim();label="";}
  const body=post.slides.map(slideBody).filter(Boolean).join(" ").slice(0,900);
  return {label,judul,body,info:post.info.trim(),tags:(post.tags||settings.tags).trim(),kind:KIND[s0.kind].name,slides:post.slides.length};
}
function capPrompt(d){
  return `Anda adalah Pranata Humas Poltekkes Kemenkes Makassar. Tulis caption Instagram berbahasa Indonesia untuk unggahan akun resmi @polkesmakassar.

Data konten:
- Jenis konten: ${d.kind}, ${d.slides} slide
- Kategori: ${d.label||"-"}
- Judul: ${d.judul||"-"}
- Teks pada gambar: ${d.body||"-"}
- Info tambahan dari admin: ${d.info||"-"}
- Nilai yang ditonjolkan: ${post.tone}

Aturan (SE Sesditjen SDM Kesehatan No. HK.02.03/F.I/9394/2026):
1. Akurat dan faktual. Jangan menambahkan angka, nama orang, tanggal, tempat, atau klaim yang tidak ada di data.
2. Utamakan substansi dan manfaat bagi masyarakat, bukan dokumentasi seremonial.
3. Bahasa Indonesia yang baik, hangat, dan mudah dipahami. Tidak mengandung unsur SARA, diskriminasi, atau ujaran kebencian.
4. Struktur: satu kalimat pembuka yang menarik, satu atau dua paragraf isi singkat, lalu ajakan (call to action) di akhir.
5. Panjang 80 sampai 150 kata. Boleh memakai paling banyak 3 emoji yang relevan.
6. Baris terakhir berisi 5 sampai 8 tagar relevan dalam satu baris, wajib memuat: ${d.tags||"#PoltekkesMakassar"}.

Tulis hanya teks caption, tanpa judul, tanda kutip, atau penjelasan.`;
}
function pickOne(a){return a[Math.floor(Math.random()*a.length)];}
function sentenceCase(t){t=t.trim();if(!t)return t;t=t.charAt(0).toUpperCase()+t.slice(1);return /[.!?]$/.test(t)?t:t+".";}
function words(t){return new Set(t.toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(w=>w.length>3));}
function overlap(a,b){const A=words(a),B=words(b);if(!A.size||!B.size)return 0;let n=0;A.forEach(w=>{if(B.has(w))n++;});return n/Math.min(A.size,B.size);}
function camelTag(t){const s=t.replace(/[^A-Za-z0-9 ]/g," ").split(/\s+/).filter(Boolean).map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join("");return s&&s.length<=24?"#"+s:"";}
function templateCaption(d){
  const tone=post.tone, all=[d.label,d.judul,d.body,d.info].join(" ");
  const hits=CAP.topics.filter(([re])=>re.test(all)), emo=hits.map(t=>t[2]).filter(Boolean);
  const out=[pickOne(CAP.hook[tone])+" "+(emo[0]||CAP.toneEmoji[tone])];
  if(d.judul) out.push(d.judul.toUpperCase());
  const paras=[]; if(d.body) paras.push(sentenceCase(d.body));
  if(d.info){const extra=d.info.split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean).filter(s=>!paras.some(p=>overlap(s,p)>0.6));if(extra.length)paras.push(extra.map(sentenceCase).join(" "));}
  out.push(...paras, pickOne(CAP.cta[tone])+" "+CAP.toneEmoji[tone]);
  const tags=[],seen=new Set(),add=t=>{if(t&&!seen.has(t.toLowerCase())){seen.add(t.toLowerCase());tags.push(t);}};
  (d.tags||DEFAULT_TAGS).split(/\s+/).filter(t=>t.startsWith("#")).forEach(add);
  if(d.label) add(camelTag(d.label));
  const loc=all.match(/\b(?:Kab\.|Kabupaten|Kota)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/);
  if(loc) add("#"+(/^Kota/.test(loc[0])?"Kota":"Kabupaten")+loc[1].replace(/\s/g,""));
  hits.forEach(t=>add(t[1]));
  out.push(tags.slice(0,10).join(" "));
  return out.join("\n\n");
}
function setCap(t){post.caption=t;$("cOut").value=t;$("capCount").textContent=t.length+"/2200 karakter";markDirty();}
$("btnCap").onclick=async()=>{
  const d=capData(); if(!d.judul&&!d.body){$("capNote").textContent="Isi judul atau teks slide dulu supaya caption punya bahan.";return;}
  const b=$("btnCap");b.disabled=true;b.textContent="Menyusun caption…";
  try{
    let text=null;
    if(settings.url){try{const r=await api("caption",{prompt:capPrompt(d)});text=r&&r.text;}catch{}}
    if(text){setCap(text.trim());$("capNote").textContent="Caption dibuat dengan AI. Periksa kembali fakta sebelum dikirim.";}
    else{setCap(templateCaption(d));$("capNote").textContent="Caption disusun dari pola otomatis (tanpa AI). Tekan lagi untuk variasi lain, lalu sunting bila perlu.";}
  }finally{b.disabled=false;b.textContent="Buat caption";}
};
$("btnCopy").onclick=()=>{const t=$("cOut").value;if(!t){$("capNote").textContent="Belum ada caption untuk disalin.";return;}
  navigator.clipboard.writeText(t).then(()=>$("capNote").textContent="Caption tersalin.",()=>{$("cOut").focus();$("cOut").select();$("capNote").textContent="Teks sudah dipilih, salin secara manual.";});};

/* ---------- mulai ---------- */
let installEvt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvt=e;$("btnInstall").hidden=false;});
$("btnInstall").onclick=async()=>{if(!installEvt)return;installEvt.prompt();await installEvt.userChoice;installEvt=null;$("btnInstall").hidden=true;};
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});

(async function init(){
  cv=$("cv"); ctx=cv.getContext("2d");
  post=newPost();
  cv.addEventListener("pointerdown",e=>{const pt=toCanvas(e),i=hit(pt);if(i<0)return;if(S().sel!==i){S().sel=i;syncUI();}
    const p=S().photos[i];if(!p){pick(i);return;}drag={pt,i};cv.setPointerCapture(e.pointerId);cv.classList.add("drag");});
  cv.addEventListener("pointermove",e=>{if(!drag)return;const pt=toCanvas(e),p=S().photos[drag.i],c=lastCells[drag.i];if(!p||!c)return;const q=placement(p,c);
    p.cx-=(pt.x-drag.pt.x)/q.dw;p.cy-=(pt.y-drag.pt.y)/q.dh;drag.pt=pt;markDirty();render(false);});
  const end=()=>{if(drag){drag=null;cv.classList.remove("drag");draw();}};
  cv.addEventListener("pointerup",end);cv.addEventListener("pointercancel",end);
  cv.addEventListener("wheel",e=>{const i=hit(toCanvas(e)),p=S().photos[i];if(!p)return;e.preventDefault();p.zoom=Math.min(3,Math.max(1,p.zoom-e.deltaY*.0015));S().sel=i;markDirty();syncUI();},{passive:false});
  fillPostFields();
  try{await Promise.all([document.fonts.load(font(700,58)),document.fonts.load(font(400,31)),document.fonts.load(font(500,24))]);}catch{}
  try{await loadTemplates();}catch{toast("Template gagal dimuat.");}
  if(settings.url&&settings.pin){api("ping").catch(()=>{});} else setConn(false,"Alamat server dan PIN belum diisi di menu Pengaturan.");
  go(location.hash.slice(1)||"dashboard");
})();
