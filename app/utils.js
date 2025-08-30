export function base(p){ return new URL(p, new URL('.', window.location.href)).toString(); }
export async function fetchJSON(url){ const r = await fetch(base(url), {cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status+' '+url); return r.json(); }
export async function fetchText(url){ const r = await fetch(base(url), {cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status+' '+url); return r.text(); }
export function readImageMetaFromURL(url){
  return new Promise((res,rej)=>{
    const img=new Image();
    img.onload=()=>res({url:base(url),w:img.naturalWidth,h:img.naturalHeight});
    img.onerror=rej;
    img.src=base(url);
  });
}
export function parseLineSmart(line){
  let t=line.replace(/(;.*$)|((?<!:)\/\/.*$)/,'').trim();
  if(!t) return null;
  let p=t.split(',');
  if(p.length<2) p=t.split(/\s+/);
  return p.map(s=>s.trim()).filter(Boolean);
}
export function hexWithAlpha(hex,a){
  const c=hex.replace('#','');
  const bigint=c.length===3?parseInt(c.split('').map(ch=>ch+ch).join(''),16):parseInt(c,16);
  const r=(bigint>>16)&255,g=(bigint>>8)&255,b=bigint&255;
  return `rgba(${r},${g},${b},${a})`;
}