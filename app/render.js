import { state } from './state.js';
import { CONFIG } from './config.js';
import { hexWithAlpha } from './utils.js';

const HANDLE = 7; // px kích thước tay cầm
const imgCache = new Map(); // cache ảnh theo URL

export function draw(canvas){
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(state.currentMapId==null) return;

  const imgEntry = state.images.find(i=>i.mapId===state.currentMapId);
  const data = state.monstersByMap[state.currentMapId];
  const scale = state.viewScale ?? 0.8;

  if(!imgEntry){
    const baseW = 1024, baseH = 1024;
    canvas.width  = Math.max(1, Math.round(baseW * scale));
    canvas.height = Math.max(1, Math.round(baseH * scale));
    if(data){
      drawOverlay(ctx, data, canvas.width, canvas.height);
      drawLabels(ctx, data, canvas.width, canvas.height);
      drawHover(ctx, data, canvas.width, canvas.height);
      drawSelection(ctx, data, canvas.width, canvas.height);
      drawPreview(ctx, canvas.width, canvas.height);
    }
    return;
  }

  canvas.width  = Math.max(1, Math.round(imgEntry.w * scale));
  canvas.height = Math.max(1, Math.round(imgEntry.h * scale));

  let img = imgCache.get(imgEntry.url);
  if(!img){
    img = new Image();
    img.decoding = 'async';
    img.src = imgEntry.url;
    img.onload = ()=> {
      imgCache.set(imgEntry.url, img);
      draw(canvas);
    };
  }
  if (img.complete && img.naturalWidth){
    ctx.imageSmoothingEnabled = false;
    if(CONFIG.ROTATE_DEG){
      ctx.save();
      ctx.translate(canvas.width/2, canvas.height/2);
      ctx.rotate(CONFIG.ROTATE_DEG * Math.PI/180);
      ctx.drawImage(img, -canvas.width/2, -canvas.height/2, canvas.width, canvas.height);
      ctx.restore();
    } else {
      ctx.drawImage(img, 0,0, canvas.width, canvas.height);
    }
  }
  drawOverlay(ctx, data, canvas.width, canvas.height);
  drawLabels(ctx, data, canvas.width, canvas.height);
  drawHover(ctx, data, canvas.width, canvas.height);
  drawSelection(ctx, data, canvas.width, canvas.height);
  drawPreview(ctx, canvas.width, canvas.height);
}

function logicalToPixel(x,y,w,h){
  const sx = w/CONFIG.GRID_SIZE;
  const sy = h/CONFIG.GRID_SIZE;
  return { px: y*sx, py: x*sy };
}
function getCSS(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function drawOverlay(ctx, data, w, h){
  if(!data) return;
  const mapId = state.currentMapId;
  const off = (mapId!=null ? state.calibrationByMap[mapId] : null) || {dx:0,dy:0};

  const f = state.filters || {
    npc:false, decoration:false, monster:true, invasion:false, battle:true
  };

  ctx.lineWidth = 1;

  // 🟢 1. Spot block 3 (invasion) dưới cùng
  for (const s of data.spots) {
    if (s.type !== 'invasion' || s.lockResize) continue;
    if (!f.invasion) continue;

    const strokeColor = getCSS('--invasion');
    const fillColor   = hexWithAlpha(getCSS('--invasion'), 0.3);

    const a = logicalToPixel(s.x1 + off.dx, s.y1 + off.dy, w, h);
    const b = logicalToPixel(s.x2 + off.dx, s.y2 + off.dy, w, h);
    const x = Math.min(a.px, b.px), y = Math.min(a.py, b.py);
    const ww = Math.abs(a.px - b.px), hh = Math.abs(a.py - b.py);

    if (ww === 0 && hh === 0) {
      ctx.fillStyle = strokeColor;
      ctx.fillRect(x - 3, y - 3, 6, 6);
    } else {
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle   = fillColor;
      ctx.strokeRect(x, y, ww, hh);
      ctx.fillRect(x, y, ww, hh);
    }
  }

  // 🟢 2. Spot block 1 (monster area)
  for (const s of data.spots) {
    if (s.type !== 'spot' || s.lockResize) continue;
    if (!f.monster) continue;

    const strokeColor = getCSS('--danger');
    const fillColor   = hexWithAlpha(getCSS('--danger'), 0.3);

    const a = logicalToPixel(s.x1 + off.dx, s.y1 + off.dy, w, h);
    const b = logicalToPixel(s.x2 + off.dx, s.y2 + off.dy, w, h);
    const x = Math.min(a.px, b.px), y = Math.min(a.py, b.py);
    const ww = Math.abs(a.px - b.px), hh = Math.abs(a.py - b.py);

    if (ww === 0 && hh === 0) {
      ctx.fillStyle = strokeColor;
      ctx.fillRect(x - 3, y - 3, 6, 6);
    } else {
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle   = fillColor;
      ctx.strokeRect(x, y, ww, hh);
      ctx.fillRect(x, y, ww, hh);
    }
  }

  // 🟢 3. Points (block 0, 4)
  for(const p of data.points){
    if ((p.type==='npc'        && !f.npc) ||
        (p.type==='decoration' && !f.decoration) ||
        (p.type==='battle'     && !f.battle)) continue;

    const {px,py}=logicalToPixel(p.x + off.dx, p.y + off.dy, w, h);
    ctx.beginPath();

    if (p.type === 'npc') {
      ctx.fillStyle = getCSS('--npc');
    } else if (p.type === 'decoration') {
      ctx.fillStyle = getCSS('--deco');
    } else if (p.type === 'battle') {
      ctx.fillStyle = getCSS('--danger');
    } else {
      ctx.fillStyle = getCSS('--danger'); // fallback
    }

    ctx.arc(px,py,3,0,Math.PI*2);
    ctx.fill();
  }

  // 🟢 4. Spot single (lockResize=true) trên cùng
  for (const s of data.spots) {
    if (!s.lockResize) continue;
    if ((s.type==='spot' && !f.monster) ||
        (s.type==='invasion' && !f.invasion)) continue;

    const strokeColor = (s.type === 'invasion') ? getCSS('--invasion') : getCSS('--danger');
    const p = logicalToPixel(s.x1 + off.dx, s.y1 + off.dy, w, h);
    ctx.beginPath();
    ctx.fillStyle = strokeColor;
    ctx.arc(p.px, p.py, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHover(ctx, data, w, h){
  if(!state.hover) return;
  const mapId = state.currentMapId;
  const off = (mapId!=null ? state.calibrationByMap[mapId] : null) || {dx:0,dy:0};
  ctx.save();
  ctx.lineWidth = 2;
  ctx.setLineDash([3,3]);
  ctx.strokeStyle = '#88e0ff';
  ctx.fillStyle = hexWithAlpha('#88e0ff', 0.15);

  if(state.hover.kind==='point'){
    const p = data.points[state.hover.idx];
    if(p){
      const {px,py}=logicalToPixel(p.x + off.dx, p.y + off.dy, w, h);
      ctx.beginPath();
      ctx.arc(px,py,7,0,Math.PI*2);
      ctx.stroke();
    }
  }else if(state.hover.kind==='spot'){
    const s = data.spots[state.hover.idx];
    if(s){
      if (s.lockResize || (s.x1===s.x2 && s.y1===s.y2)) {
        const p = logicalToPixel(s.x1 + off.dx, s.y1 + off.dy, w, h);
        ctx.beginPath();
        ctx.arc(p.px, p.py, 7, 0, Math.PI*2);
        ctx.stroke();
      } else {
        const a=logicalToPixel(s.x1 + off.dx, s.y1 + off.dy, w, h);
        const b=logicalToPixel(s.x2 + off.dx, s.y2 + off.dy, w, h);
        const x=Math.min(a.px,b.px), y=Math.min(a.py,b.py);
        const ww=Math.abs(a.px-b.px), hh=Math.abs(a.py-b.py);
        ctx.strokeRect(x,y,ww,hh);
        ctx.fillRect(x,y,ww,hh);
      }
    }
  }
  ctx.restore();
}

function drawSelection(ctx, data, w, h){
  if(!state.selection) return;
  const mapId = state.currentMapId;
  const off = (mapId!=null ? state.calibrationByMap[mapId] : null) || {dx:0,dy:0};
  ctx.save();
  ctx.lineWidth = 2;
  ctx.setLineDash([4,3]);
  ctx.strokeStyle = '#66d9ff';
  ctx.fillStyle = '#66d9ff';

  if(state.selection.kind==='point'){
    const p = data.points[state.selection.idx];
    if(!p) { ctx.restore(); return; }
    const {px,py}=logicalToPixel(p.x + off.dx, p.y + off.dy, w, h);
    ctx.beginPath();
    ctx.arc(px,py,6,0,Math.PI*2);
    ctx.stroke();
  } else if (state.selection.kind==='spot'){
    const s = data.spots[state.selection.idx];
    if(!s) { ctx.restore(); return; }

    if(s.lockResize){
      const p = logicalToPixel(s.x1 + off.dx, s.y1 + off.dy, w, h);
      ctx.beginPath();
      ctx.arc(p.px, p.py, 6, 0, Math.PI*2);
      ctx.stroke();
    } else {
      const a=logicalToPixel(s.x1 + off.dx, s.y1 + off.dy, w, h);
      const b=logicalToPixel(s.x2 + off.dx, s.y2 + off.dy, w, h);
      const x=Math.min(a.px,b.px), y=Math.min(a.py,b.py);
      const ww=Math.abs(a.px-b.px), hh=Math.abs(a.py-b.py);
      ctx.strokeRect(x,y,ww,hh);
      drawHandle(ctx, x, y);
      drawHandle(ctx, x+ww, y);
      drawHandle(ctx, x, y+hh);
      drawHandle(ctx, x+ww, y+hh);
    }
  }
  ctx.restore();
}

function drawHandle(ctx, cx, cy){
  ctx.fillRect(cx - HANDLE, cy - HANDLE, HANDLE*2, HANDLE*2);
}

function drawPreview(ctx, w, h){
  if(!state.dragData || state.dragData.currentX == null) return;
  const { startX, startY, currentX, currentY } = state.dragData;

  const sx = (startY / CONFIG.GRID_SIZE) * w;
  const sy = (startX / CONFIG.GRID_SIZE) * h;
  const ex = (currentY / CONFIG.GRID_SIZE) * w;
  const ey = (currentX / CONFIG.GRID_SIZE) * h;

  const x = Math.min(sx, ex), y = Math.min(sy, ey);
  const ww = Math.abs(ex - sx), hh = Math.abs(ey - sy);

  ctx.save();
  ctx.strokeStyle = 'rgba(255,180,84,0.9)';
  ctx.fillStyle   = 'rgba(255,180,84,0.25)';
  ctx.setLineDash([4,2]);
  ctx.lineWidth = 2;
  ctx.strokeRect(x,y,ww,hh);
  ctx.fillRect(x,y,ww,hh);
  ctx.restore();
}
function drawLabels(ctx, data, w, h) {
  if (!state.showLabels) return;
  const mapId = state.currentMapId;
  const off = (mapId != null ? state.calibrationByMap[mapId] : {dx:0,dy:0});

  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";

  // Points
  for (const p of data.points) {
    const monsterName = state.classes[p.classId]?.name || p.classId;
    const text = `${monsterName} (1)`;
    const { px, py } = logicalToPixel(p.x + off.dx, p.y + off.dy, w, h);
    ctx.fillText(text, px, py - 8);
  }

  // Spots
  for (const s of data.spots) {
    const monsterName = state.classes[s.classId]?.name || s.classId;
    const count = s.count || 1;
    const text = `${monsterName.slice(0,3)}(${count})`;

    if (s.lockResize) {
      // Single dạng spot
      const { px, py } = logicalToPixel(s.x1 + off.dx, s.y1 + off.dy, w, h);
      ctx.fillText(text, px, py - 8);
    } else {
      // Spot vùng
      const a = logicalToPixel(s.x1 + off.dx, s.y1 + off.dy, w, h);
      const b = logicalToPixel(s.x2 + off.dx, s.y2 + off.dy, w, h);
      const cx = (a.px + b.px) / 2;
      const cy = (a.py + b.py) / 2;
      ctx.fillText(text, cx, cy - 8);
    }
  }

  ctx.restore();
}

// === Tooltip hiển thị tọa độ theo chuột ===
const tooltipEl = document.createElement("div");
tooltipEl.id = "coordTooltip";
tooltipEl.className = "coord-tooltip";
tooltipEl.style.display = "none";
document.body.appendChild(tooltipEl);

export function updateTooltip(x, y, ev) {
  tooltipEl.textContent = `(${x}, ${y})`;
  tooltipEl.style.left = ev.clientX + "px";
  tooltipEl.style.top  = ev.clientY + "px";
  tooltipEl.style.display = "block";
}

export function hideTooltip() {
  tooltipEl.style.display = "none";
}