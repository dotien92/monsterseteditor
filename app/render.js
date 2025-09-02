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
  const scale = state.viewScale ?? 1.0;

  if(!imgEntry){
    const baseW = 1024, baseH = 1024;
    canvas.width  = Math.max(1, Math.round(baseW * scale));
    canvas.height = Math.max(1, Math.round(baseH * scale));
    if(data){
      drawOverlay(ctx, data, canvas.width, canvas.height);
      drawHover(ctx, data, canvas.width, canvas.height);
      drawSelection(ctx, data, canvas.width, canvas.height);
      drawPreview(ctx, canvas.width, canvas.height); // 👈 preview
    }
    return;
  }

  // Kích thước canvas dựa trên natural size của ảnh * scale
  canvas.width  = Math.max(1, Math.round(imgEntry.w * scale));
  canvas.height = Math.max(1, Math.round(imgEntry.h * scale));

  let img = imgCache.get(imgEntry.url);
  if(!img){
    img = new Image();
    img.decoding = 'async';
    img.src = imgEntry.url;
    img.onload = ()=> {
      imgCache.set(imgEntry.url, img);
      draw(canvas); // vẽ lại lần đầu khi ảnh cache xong
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
  // Vẽ overlay/hover/selection (nếu ảnh chưa xong, frame sau sẽ đè)
  drawOverlay(ctx, data, canvas.width, canvas.height);
  drawHover(ctx, data, canvas.width, canvas.height);
  drawSelection(ctx, data, canvas.width, canvas.height);
  drawPreview(ctx, canvas.width, canvas.height); // 👈 preview
}

// SWAP X↔Y để overlay khớp toạ độ file
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

  // points
  for(const p of data.points){
    const {px,py}=logicalToPixel(p.x + off.dx, p.y + off.dy, w, h);
    ctx.beginPath();
    ctx.fillStyle=p.isNPC? getCSS('--npc') : getCSS('--danger');
    ctx.arc(px,py,3,0,Math.PI*2);
    ctx.fill();
  }
  // spots
  ctx.lineWidth=1;
  for (const s of data.spots) {
    if (s.lockResize) {
      // 🔒 Single từ block 1/3 → vẽ chấm đỏ tại x1,y1
      const p = logicalToPixel(s.x1 + off.dx, s.y1 + off.dy, w, h);
      ctx.beginPath();
      ctx.fillStyle = getCSS('--danger');
      ctx.arc(p.px, p.py, 3, 0, Math.PI * 2);
      ctx.fill();
      continue; // bỏ qua xử lý spot thường
    }

    const a = logicalToPixel(s.x1 + off.dx, s.y1 + off.dy, w, h);
    const b = logicalToPixel(s.x2 + off.dx, s.y2 + off.dy, w, h);
    const x = Math.min(a.px, b.px), y = Math.min(a.py, b.py);
    const ww = Math.abs(a.px - b.px), hh = Math.abs(a.py - b.py);

    if (ww === 0 && hh === 0) {
      // fallback: single cũ
      ctx.beginPath();
      ctx.fillStyle = getCSS('--danger');
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = getCSS('--spot');
      ctx.fillStyle = hexWithAlpha(getCSS('--spot'), 0.3);
      ctx.strokeRect(x, y, ww, hh);
      ctx.fillRect(x, y, ww, hh);
    }
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
      const a=logicalToPixel(s.x1 + off.dx, s.y1 + off.dy, w, h);
      const b=logicalToPixel(s.x2 + off.dx, s.y2 + off.dy, w, h);
      const x=Math.min(a.px,b.px), y=Math.min(a.py,b.py);
      const ww=Math.abs(a.px-b.px), hh=Math.abs(a.py-b.py);
      ctx.strokeRect(x,y,ww,hh);
      ctx.fillRect(x,y,ww,hh);
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
      // 🔒 single spot → vẽ giống point
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

      // 4 tay cầm
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

/* === Preview khi kéo thêm spot === */
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