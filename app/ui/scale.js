// Scale UI: range + nút +/- (0.25 → 1.0)

import { state } from '../state.js';

const MIN = 0.25, MAX = 1.0, STEP = 0.05;
const clamp = (v)=>Math.max(MIN, Math.min(MAX, v));
const roundStep = (v)=> Math.round(v/STEP)*STEP;

export function attachScaleUI({ input, minus, plus, label, onChange }){
  const updateScaleUI = ()=>{
    if (input) input.value = String(state.viewScale);
    if (label) label.textContent = Math.round(state.viewScale*100)+'%';
    if (minus) minus.disabled = state.viewScale <= MIN + 1e-9;
    if (plus)  plus.disabled  = state.viewScale >= MAX - 1e-9;
  };

  // init
  state.viewScale = clamp(state.viewScale ?? 1.0);
  updateScaleUI();

  input.addEventListener('input', ()=>{
    const v = Number(input.value);
    state.viewScale = clamp(isFinite(v) ? v : 1.0);
    updateScaleUI(); onChange?.();
  });
  minus.addEventListener('click', ()=>{
    state.viewScale = clamp(roundStep(state.viewScale - STEP));
    updateScaleUI(); onChange?.();
  });
  plus.addEventListener('click', ()=>{
    state.viewScale = clamp(roundStep(state.viewScale + STEP));
    updateScaleUI(); onChange?.();
  });
}