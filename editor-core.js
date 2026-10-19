/* Studio Konten Humas — mesin gambar (canvas 1080x1350) */
let cv=null, ctx=null;
const W=1080,H=1350;
const C={navy:"#01354A",teal:"#008C96",tealBright:"#00AAB4",lime:"#CCDC2A",limeText:"#D7E94A",empty:"#E3F1F4",emptyInk:"#4B7C88",soft:"#3E6673"};
const TPL={
  t1:{open:true,F:{x:80,y:170,w:920,h:760},r:30},
  t2:{F:{x:44,y:182,w:992,h:942},r:26},
  t3:{F:{x:80,y:158,w:928,h:930},r:36},
  t4:{F:{x:51,y:149,w:955,h:911},r:30}
};
const KIND={
  info:{name:"informasi",photos:"multi",bodyMax:160,labels:["Label kategori","Judul baris 1","Judul baris 2","Keterangan"]},
  foto:{name:"foto kegiatan",photos:"multi",bodyMax:160,labels:["Label kategori","Judul baris 1","Judul baris 2","Keterangan"]},
  angka:{name:"angka capaian",photos:0,bodyMax:160,labels:["Label kategori","Judul baris 1","Judul baris 2 (opsional)","Keterangan singkat"]},
  pengumuman:{name:"pengumuman",photos:0,bodyMax:400,labels:["Label","Judul baris 1","Judul baris 2 (opsional)","Isi pengumuman (satu poin per baris)"]},
  ucapan:{name:"ucapan hari besar",photos:"one",bodyMax:200,labels:["Kalimat pembuka","Nama hari, baris 1","Nama hari, baris 2","Pesan ucapan"]}
};
const DEF={
  info:{label:"Pengabdian Masyarakat",j1:"Pemantauan Gizi",j2:"Balita",angka:"",satuan:"",body:"Deteksi dini masalah gizi lewat pengukuran lingkar lengan atas (LiLA) langsung di rumah warga."},
  foto:{label:"Pengabdian Masyarakat",j1:"Pemantauan Gizi",j2:"Balita",angka:"",satuan:"",body:"Deteksi dini masalah gizi lewat pengukuran lingkar lengan atas (LiLA) langsung di rumah warga."},
  angka:{label:"Capaian Kegiatan",j1:"Pendampingan Gizi",j2:"Kabupaten Bone",angka:"85",satuan:"balita didampingi",body:"Melalui 4 kunjungan rumah dan konseling KAP bersama kader posyandu."},
  pengumuman:{label:"Pengumuman",j1:"Judul Pengumuman",j2:"",angka:"",satuan:"",body:"Tulis poin pertama di baris ini.\nSetiap baris baru menjadi satu poin.\nCukup 3 sampai 6 poin agar mudah dibaca."},
  ucapan:{label:"Selamat Memperingati",j1:"Hari Kesehatan",j2:"Nasional",angka:"",satuan:"",body:"Bersama tenaga kesehatan yang tangguh, kita wujudkan masyarakat sehat dan berdaya."}
};
const TONE_FOR={angka:"informatif",pengumuman:"informatif",ucapan:"inspiratif"};
const SIGNATURE="Keluarga Besar Poltekkes Kemenkes Makassar";

const bg={}, overlay={};
let warnings=[];

function loadImg(src){return new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src;});}
async function loadTemplates(){
  for(const k of Object.keys(TPL)){
    bg[k]=await loadImg(`assets/${k}.jpg`);
    if(k!=="t1"){
      const m=await loadImg(`assets/mask-${k}.png`); const oc=document.createElement("canvas"); oc.width=W; oc.height=H;
      const o=oc.getContext("2d"); o.drawImage(bg[k],0,0,W,H); o.globalCompositeOperation="destination-in"; o.drawImage(m,0,0,W,H);
      overlay[k]=oc;
    }
  }
}

/* ---------- helpers ---------- */
function font(w,s,it){return `${it?"italic ":""}${w} ${s}px Poppins, sans-serif`;}
function fitSize(texts,max,min,maxW,w){let s=max;ctx.font=font(w,s);while(s>min&&texts.some(t=>ctx.measureText(t).width>maxW)){s--;ctx.font=font(w,s);}return s;}
function overW(texts,maxW){return texts.some(t=>ctx.measureText(t).width>maxW);}
function wrap(text,maxW,maxLines){
  const words=text.trim().split(/\s+/).filter(Boolean); const lines=[]; let cur="";
  for(const w of words){const t=cur?cur+" "+w:w; if(ctx.measureText(t).width<=maxW||!cur)cur=t; else{lines.push(cur);cur=w;}}
  if(cur)lines.push(cur);
  let over=false;
  if(lines.length>maxLines){over=true;lines.length=maxLines;let l=lines[maxLines-1];while(l&&ctx.measureText(l+"…").width>maxW)l=l.replace(/\s*\S+$/,"");lines[maxLines-1]=l+"…";}
  return {lines,over};
}
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function pill(x,y,text,fill,ink,size){
  ctx.font=font(500,size); const tw=ctx.measureText(text).width, h=size*1.9;
  ctx.fillStyle=fill; rr(x,y,tw+size*1.7,h,h/2); ctx.fill();
  ctx.fillStyle=ink; ctx.textBaseline="middle"; ctx.fillText(text,x+size*.85,y+h/2+1); ctx.textBaseline="alphabetic";
  return h;
}
function split(box,n,gap){
  const L={1:[[0,0,1,1]],2:[[0,0,.5,1],[.5,0,.5,1]],3:[[0,0,.6,1],[.6,0,.4,.5],[.6,.5,.4,.5]],4:[[0,0,.5,.5],[.5,0,.5,.5],[0,.5,.5,.5],[.5,.5,.5,.5]]}[n];
  return L.map(([fx,fy,fw,fh])=>{const gl=fx>0?gap/2:0,gr=fx+fw<.999?gap/2:0,gt=fy>0?gap/2:0,gb=fy+fh<.999?gap/2:0;
    return {x:box.x+fx*box.w+gl,y:box.y+fy*box.h+gt,w:fw*box.w-gl-gr,h:fh*box.h-gt-gb};});
}
function area(tall){
  const T=TPL[S().tpl];
  if(T.open) return {x:80,y:170,w:920,h:tall?1000:760};
  const p=44,F=T.F; return {x:F.x+p,y:F.y+p,w:F.w-2*p,h:F.h-2*p};
}
function safeX(y,A){return TPL[S().tpl].open&&y>935?262:A.x;}
function txt(){return S().text[S().kind];}
function photoCount(){const p=KIND[S().kind].photos;return p==="multi"?S().layout:p==="one"?1:0;}

/* ---------- layouts ---------- */
function layoutInfo(){
  const T=TPL[S().tpl], t=txt();
  if(T.open){
    const cells=split({x:80,y:395,w:920,h:560},S().layout,16).map(c=>({...c,r:S().layout===1?30:20,stroke:true}));
    return {cells,draw:()=>{
      const label=t.label.trim().toUpperCase(), titles=[t.j1.trim(),t.j2.trim()].filter(Boolean), body=t.body.trim();
      if(label) pill(80,172,label,C.navy,C.lime,24);
      if(titles.length){const s=fitSize(titles,58,42,760,700); if(overW(titles,760)) warnings.push("Judul terlalu panjang; singkatkan agar tidak menabrak ornamen.");
        ctx.font=font(700,s); let y=286;
        titles.forEach((tt,i)=>{ctx.fillStyle=i===1?C.teal:C.navy;ctx.fillText(tt,80,y);
          if(i===titles.length-1){const tw=ctx.measureText(tt).width;if(80+tw+130<860){ctx.fillStyle=C.lime;rr(80+tw+22,y-24,100,12,6);ctx.fill();}}y+=s*1.17;});}
      if(body){ctx.font=font(400,31);const {lines,over}=wrap(body,740,4);if(over)warnings.push("Keterangan terlalu panjang dan terpotong; pindahkan detailnya ke caption.");
        ctx.fillStyle=C.navy;lines.forEach((l,i)=>ctx.fillText(l,262,1022+i*44));ctx.fillStyle=C.lime;rr(240,992,8,lines.length*44-4,4);ctx.fill();}
    }};
  }
  const A=area(), label=t.label.trim().toUpperCase(), titles=[t.j1.trim(),t.j2.trim()].filter(Boolean), body=t.body.trim();
  const labelH=label?62:0; let s=0; if(titles.length) s=fitSize(titles,54,38,A.w,700);
  ctx.font=font(400,29); const bw=body?wrap(body,A.w,3):{lines:[],over:false};
  const titleH=titles.length*s*1.15, photoY=A.y+labelH+titleH+(titles.length?18:0), bodyH=bw.lines.length?bw.lines.length*40+22:0;
  const box={x:A.x,y:photoY,w:A.w,h:Math.max(260,A.y+A.h-bodyH-photoY)};
  const cells=split(box,S().layout,14).map(c=>({...c,r:22}));
  return {cells,draw:()=>{
    if(label) pill(A.x,A.y,label,C.navy,C.lime,22);
    if(titles.length){ if(overW(titles,A.w)) warnings.push("Judul terlalu panjang."); ctx.font=font(700,s); let y=A.y+labelH+s*.95;
      titles.forEach((tt,i)=>{ctx.fillStyle=i===1?C.teal:C.navy;ctx.fillText(tt,A.x,y);y+=s*1.15;});}
    if(bw.over) warnings.push("Keterangan terpotong; pindahkan detailnya ke caption.");
    if(bw.lines.length){ctx.font=font(400,29);ctx.fillStyle=C.navy;let y=box.y+box.h+22+29;bw.lines.forEach(l=>{ctx.fillText(l,A.x,y);y+=40;});}
  }};
}

function layoutFoto(){
  const T=TPL[S().tpl], F=T.F, t=txt();
  const r=T.open?30:(S().layout===1?T.r:18);
  const cells=split(F,S().layout,12).map(c=>({...c,r,stroke:T.open}));
  return {cells,draw:()=>{
    const label=t.label.trim().toUpperCase(), titles=[t.j1.trim(),t.j2.trim()].filter(Boolean), body=t.body.trim();
    if(!label&&!titles.length&&!body) return;
    const pad=T.open?40:48, maxW=F.w-pad*2;
    let ts=0; if(titles.length){ts=fitSize(titles,56,38,maxW,700); if(overW(titles,maxW)) warnings.push("Judul terlalu panjang.");}
    ctx.font=font(400,29); const bw=body?wrap(body,maxW,2):{lines:[],over:false};
    if(bw.over) warnings.push("Keterangan dipotong menjadi 2 baris; detailnya taruh di caption.");
    const blockH=(label?60:0)+titles.length*ts*1.17+(bw.lines.length?bw.lines.length*41+10:0);
    const g0=Math.max(F.y,F.y+F.h-blockH-pad*2-140);
    ctx.save(); rr(F.x,F.y,F.w,F.h,T.open?30:T.r); ctx.clip();
    const gr=ctx.createLinearGradient(0,g0,0,F.y+F.h); gr.addColorStop(0,"rgba(1,40,56,0)"); gr.addColorStop(.45,"rgba(1,40,56,.72)"); gr.addColorStop(1,"rgba(1,40,56,.92)");
    ctx.fillStyle=gr; ctx.fillRect(F.x,g0,F.w,F.y+F.h-g0); ctx.restore();
    let y=F.y+F.h-pad-blockH;
    if(label){pill(F.x+pad,y,label,C.lime,C.navy,22);y+=60;}
    ctx.font=font(700,ts);
    titles.forEach((tt,i)=>{y+=ts;ctx.fillStyle=i===1?C.limeText:"#FFFFFF";ctx.fillText(tt,F.x+pad,y);y+=ts*.17;});
    if(bw.lines.length){y+=10;ctx.font=font(400,29);ctx.fillStyle="#EAF6F7";bw.lines.forEach(l=>{y+=41;ctx.fillText(l,F.x+pad,y-8);});}
  }};
}

function layoutAngka(){
  const t=txt(), A=area(true);
  return {cells:[],draw:()=>{
    const label=t.label.trim().toUpperCase(), titles=[t.j1.trim(),t.j2.trim()].filter(Boolean), num=t.angka.trim(), sat=t.satuan.trim(), body=t.body.trim();
    const ts=titles.length?fitSize(titles,46,32,A.w,700):0;
    const ns=num?fitSize([num],300,120,A.w,700):0;
    const ss=sat?fitSize([sat],58,34,A.w,700):0;
    ctx.font=font(400,31); const bwTmp=body?wrap(body,A.w,4):{lines:[]};
    const total=(label?64:0)+titles.length*ts*1.15+(titles.length?30:0)+(num?ns*.82:0)+(sat?ss*1.25+10:0)+44+bwTmp.lines.length*44;
    let y=A.y+Math.max(0,(Math.min(A.h,760)-total)/2);
    if(label){pill(A.x,y,label,C.navy,C.lime,22);y+=64;}
    ctx.font=font(700,ts); titles.forEach((tt,i)=>{y+=ts;ctx.fillStyle=i===1?C.teal:C.navy;ctx.fillText(tt,A.x,y);y+=ts*.15;});
    if(titles.length) y+=30;
    if(num){ctx.font=font(700,ns);ctx.fillStyle=C.tealBright;y+=ns*.78;ctx.fillText(num,A.x-ns*.03,y);y+=ns*.04;}
    if(sat){ctx.font=font(700,ss);ctx.fillStyle=C.navy;y+=ss*1.05;ctx.fillText(sat,A.x,y);y+=ss*.2+10;}
    if(!num) warnings.push("Isi kolom Angka untuk layout ini.");
    ctx.fillStyle=C.lime; rr(A.x,y+6,120,12,6); ctx.fill(); y+=44;
    if(body){const x=safeX(y+40,A);ctx.font=font(400,31);const {lines,over}=wrap(body,A.x+A.w-x,4);if(over)warnings.push("Keterangan terpotong.");
      ctx.fillStyle=C.navy;lines.forEach(l=>{y+=44;ctx.fillText(l,safeX(y,A),y);});}
  }};
}

function layoutPengumuman(){
  const t=txt(), A=area(true);
  return {cells:[],draw:()=>{
    const label=t.label.trim().toUpperCase(), titles=[t.j1.trim(),t.j2.trim()].filter(Boolean);
    const items=t.body.split(/\n+/).map(s=>s.trim()).filter(Boolean);
    let y=A.y;
    if(label){pill(A.x,y,label,C.navy,C.lime,24);y+=70;}
    if(titles.length){const s=fitSize(titles,62,40,A.w,700); if(overW(titles,A.w)) warnings.push("Judul terlalu panjang."); ctx.font=font(700,s);
      titles.forEach((tt,i)=>{y+=s;ctx.fillStyle=i===1?C.teal:C.navy;ctx.fillText(tt,A.x,y);y+=s*.15;});}
    y+=22; ctx.fillStyle=C.lime; rr(A.x,y,120,12,6); ctx.fill(); y+=40;
    const bottom=A.y+A.h; let cut=false;
    ctx.font=font(400,31);
    for(const it of items){
      const x=safeX(y+30,A), {lines}=wrap(it,A.x+A.w-x-44,4);
      if(y+lines.length*44>bottom){cut=true;break;}
      ctx.fillStyle=C.tealBright; ctx.beginPath(); ctx.arc(x+10,y+20,9,0,7); ctx.fill();
      ctx.fillStyle=C.navy; ctx.font=font(400,31); lines.forEach(l=>{y+=44;ctx.fillText(l,x+44,y-12);});
      y+=16;
    }
    if(cut) warnings.push("Poin pengumuman terlalu banyak; sebagian tidak muat. Ringkas atau pindahkan ke caption.");
    if(!items.length) warnings.push("Isi pengumuman masih kosong.");
  }};
}

function layoutUcapan(){
  const t=txt(), A=area(false), has=!!S().photos[0];
  const ph=has?{x:A.x+A.w*.2,y:A.y,w:A.w*.6,h:Math.min(A.h*.44,400),r:32,stroke:"lime"}:null;
  return {cells:ph?[ph]:[],optional:true,draw:()=>{
    const label=t.label.trim(), titles=[t.j1.trim(),t.j2.trim()].filter(Boolean), body=t.body.trim();
    const cx=A.x+A.w/2; ctx.textAlign="center";
    const ls=label?fitSize([label],36,26,A.w,500):0;
    const ts=titles.length?fitSize(titles,78,44,A.w,700):0;
    ctx.font=font(400,30); const bw=body?wrap(body,A.w-40,has?3:4):{lines:[],over:false};
    if(bw.over) warnings.push("Pesan ucapan terpotong.");
    const top=ph?ph.y+ph.h+44:A.y;
    const total=(label?ls*1.5:0)+titles.length*ts*1.12+40+bw.lines.length*42+(bw.lines.length?20:0)+40;
    let y=top+Math.max(0,(A.y+A.h-top-total)/2);
    if(label){ctx.font=font(500,ls);ctx.fillStyle=C.teal;y+=ls;ctx.fillText(label,cx,y);y+=ls*.5;}
    ctx.font=font(700,ts); titles.forEach((tt,i)=>{y+=ts;ctx.fillStyle=i===1?C.teal:C.navy;ctx.fillText(tt,cx,y);y+=ts*.12;});
    y+=18; ctx.fillStyle=C.lime; rr(cx-80,y,160,12,6); ctx.fill(); y+=22;
    ctx.font=font(400,30); ctx.fillStyle=C.navy; bw.lines.forEach(l=>{y+=42;ctx.fillText(l,cx,y);});
    y+=bw.lines.length?50:34; ctx.font=font(500,24); ctx.fillStyle=C.soft; ctx.fillText(SIGNATURE,cx,y);
    ctx.textAlign="left";
  }};
}
function computeLayout(){return {info:layoutInfo,foto:layoutFoto,angka:layoutAngka,pengumuman:layoutPengumuman,ucapan:layoutUcapan}[S().kind]();}

/* ---------- render ---------- */
let lastCells=[];
function placement(p,c){
  const iw=p.img.width, ih=p.img.height;
  const s=Math.max(c.w/iw,c.h/ih)*p.zoom, dw=iw*s, dh=ih*s;
  let dx=c.x+c.w/2-p.cx*dw, dy=c.y+c.h/2-p.cy*dh;
  dx=Math.min(c.x,Math.max(c.x+c.w-dw,dx)); dy=Math.min(c.y,Math.max(c.y+c.h-dh,dy));
  p.cx=(c.x+c.w/2-dx)/dw; p.cy=(c.y+c.h/2-dy)/dh;
  return {dx,dy,dw,dh};
}
function render(forExport){
  warnings=[];
  ctx.clearRect(0,0,W,H); ctx.fillStyle="#fff"; ctx.fillRect(0,0,W,H);
  if(bg[S().tpl]) ctx.drawImage(bg[S().tpl],0,0,W,H);
  const L=computeLayout(); lastCells=L.cells;
  L.cells.forEach((c,i)=>{
    const p=S().photos[i];
    ctx.save(); rr(c.x,c.y,c.w,c.h,c.r); ctx.clip();
    if(p){const q=placement(p,c);ctx.drawImage(p.img,q.dx,q.dy,q.dw,q.dh);}
    else{
      ctx.fillStyle=C.empty;ctx.fillRect(c.x,c.y,c.w,c.h);
      const cx=c.x+c.w/2, cy=c.y+c.h/2-18;
      ctx.fillStyle=C.tealBright;ctx.beginPath();ctx.arc(cx,cy,34,0,7);ctx.fill();
      ctx.strokeStyle="#fff";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(cx-14,cy);ctx.lineTo(cx+14,cy);ctx.moveTo(cx,cy-14);ctx.lineTo(cx,cy+14);ctx.stroke();
      ctx.fillStyle=C.emptyInk;ctx.font=font(500,c.w<400?24:30);ctx.textAlign="center";ctx.fillText("Foto "+(i+1),cx,cy+76);ctx.textAlign="left";
    }
    ctx.restore();
  });
  if(L.cells.length && overlay[S().tpl]) ctx.drawImage(overlay[S().tpl],0,0);
  L.cells.forEach((c,i)=>{
    if(c.stroke){ctx.strokeStyle=c.stroke==="lime"?C.lime:C.tealBright;ctx.lineWidth=6;rr(c.x-3,c.y-3,c.w+6,c.h+6,c.r+3);ctx.stroke();}
    if(!forExport&&i===S().sel){ctx.save();ctx.strokeStyle=C.lime;ctx.lineWidth=8;ctx.setLineDash([24,14]);rr(c.x+6,c.y+6,c.w-12,c.h-12,Math.max(4,c.r-6));ctx.stroke();ctx.restore();}
  });
  L.draw();
  const w=$("warn"); w.hidden=!warnings.length; w.textContent=warnings.join(" ");
}

