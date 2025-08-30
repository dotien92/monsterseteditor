// Chuyển đổi toạ độ & hit-test (canvas)

import { state } from '../state.js';
import { CONFIG } from '../config.js';

export function pxFromGrid(gx, gy, canvasW, canvasH){
  const off = (state.calibrationByMap[state.currentMapId] || {dx:0,dy:0});
  const x = gx + off.dx, y = gy + off.dy;
  const sx = canvasW/CONFIG.GRID_SIZE, sy = canvasH/CONFIG.GRID_SIZE;
  // swap trục để khớp render
  return { px: y*sx, py: x*sy };
}

export function gridFromMouse(ev, canvas){
  const rect = canvas.getBoundingClientRect();
  const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
  const max = CONFIG.GRID_SIZE - 1;
  const fracX = x / rect.width, fracY = y / rect.height;
  const Xgrid = Math.max(0, Math.min(max, Math.round(fracY * CONFIG.GRID_SIZE))); // down → X
  const Ygrid = Math.max(0, Math.min(max, Math.round(fracX * CONFIG.GRID_SIZE))); // right → Y
  const off = (state.calibrationByMap[state.currentMapId] || {dx:0,dy:0});
  let Xc = Math.max(0, Math.min(max, Math.round(Xgrid + off.dx)));
  let Yc = Math.max(0, Math.min(max, Math.round(Ygrid + off.dy)));
  return { Xc, Yc };
}

export function rawFromCalibrated(Xc, Yc){
  const max = CONFIG.GRID_SIZE - 1;
  const off = (state.calibrationByMap[state.currentMapId] || {dx:0,dy:0});
  let xr = Math.max(0, Math.min(max, Math.round(Xc - off.dx)));
  let yr = Math.max(0, Math.min(max, Math.round(Yc - off.dy)));
  return { xr, yr };
}

export function hitTest(ev, canvas){
  const mapId = state.currentMapId;
  if(mapId==null) return null;
  const data = state.monstersByMap[mapId];
  if(!data) return null;

  const rect = canvas.getBoundingClientRect();
  const mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
  const W = canvas.width, H = canvas.height;

  // 1) điểm single
  const PICK_RADIUS = 10;
  for(let i=0;i<data.points.length;i++){
    const p = data.points[i];
    const {px,py} = pxFromGrid(p.x, p.y, W, H);
    const d2 = (mx - px)**2 + (my - py)**2;
    if(d2 <= (PICK_RADIUS**2)) return { kind:'point', idx:i };
  }

  // 2) vùng spot (ưu tiên tay cầm)
  const HANDLE = 7;
  for(let i=0;i<data.spots.length;i++){
    const s = data.spots[i];
    const a = pxFromGrid(s.x1, s.y1, W, H);
    const b = pxFromGrid(s.x2, s.y2, W, H);
    const x = Math.min(a.px,b.px), y = Math.min(a.py,b.py);
    const w = Math.abs(a.px-b.px), h = Math.abs(a.py-b.py);
    const corners = {
      tl: {x:x,     y:y},
      tr: {x:x+w,   y:y},
      bl: {x:x,     y:y+h},
      br: {x:x+w,   y:y+h},
    };
    for(const [corner,pt] of Object.entries(corners)){
      if(Math.abs(mx-pt.x)<=HANDLE && Math.abs(my-pt.y)<=HANDLE){
        return { kind:'spot', idx:i, resize:corner };
      }
    }
    if(mx>=x && mx<=x+w && my>=y && my<=y+h){
      return { kind:'spot', idx:i };
    }
  }
  return null;
}