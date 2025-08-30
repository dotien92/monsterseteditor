// Calibration: lưu/khôi phục & gắn UI

import { state } from '../state.js';

const CALIB_KEY = 'msb_calibrationByMap';

export function loadCalibFromStorage(){
  try{
    const raw = localStorage.getItem(CALIB_KEY);
    if(!raw) return {};
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') return obj;
  }catch(e){ /* noop */ }
  return {};
}

export function saveCalibToStorage(map){
  try{
    localStorage.setItem(CALIB_KEY, JSON.stringify(map));
  }catch(e){ /* noop */ }
}

export function attachCalibrateUI({ canvas, calibToggle, calibReset, getGridSize, onChange }){
  const getCalib = (mapId)=> (state.calibrationByMap[mapId] ||= {dx:0,dy:0});

  const updateCalibButton = ()=>{
    calibToggle.classList.toggle('primary', state.calibrating);
    calibToggle.textContent = state.calibrating ? 'Calibrating…' : 'Calibrate';
  };

  calibToggle.addEventListener('click', ()=>{
    if(state.currentMapId==null) return;
    state.calibrating = !state.calibrating;
    updateCalibButton();
  });

  calibReset.addEventListener('click', ()=>{
    if(state.currentMapId==null) return;
    state.calibrationByMap[state.currentMapId] = {dx:0,dy:0};
    saveCalibToStorage(state.calibrationByMap);
    onChange?.();
  });

  canvas.addEventListener('click', (ev)=>{
    if(!state.calibrating || state.currentMapId==null) return;
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const N = getGridSize();
    const max = N - 1;
    const fracX = x / rect.width, fracY = y / rect.height;
    const Xgrid_at_click = Math.max(0, Math.min(max, Math.round(fracY * N)));
    const Ygrid_at_click = Math.max(0, Math.min(max, Math.round(fracX * N)));
    const xin = prompt('Nhập X thực trong game tại điểm vừa click:', String(Xgrid_at_click));
    if(xin===null) return;
    const yin = prompt('Nhập Y thực trong game tại điểm vừa click:', String(Ygrid_at_click));
    if(yin===null) return;
    const Xreal = Number(xin), Yreal = Number(yin);
    if(!Number.isFinite(Xreal) || !Number.isFinite(Yreal)) return alert('Giá trị không hợp lệ.');

    const cur = getCalib(state.currentMapId);
    const newDx = Xreal - Xgrid_at_click;
    const newDy = Yreal - Ygrid_at_click;
    state.calibrationByMap[state.currentMapId] = { dx:newDx, dy:newDy };
    saveCalibToStorage(state.calibrationByMap);

    state.calibrating = false;
    updateCalibButton();
    onChange?.();
  });

  updateCalibButton();
}