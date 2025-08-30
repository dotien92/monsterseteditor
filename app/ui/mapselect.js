// Map Select dropdown (phục hồi từ bản cũ)

import { state } from '../state.js';

export function refreshMapSelect(mapSelect){
  mapSelect.innerHTML = '';

  // Tập hợp các mapId có dữ liệu (từ MonsterSetBase) hoặc có ảnh map
  const maps = new Set([
    ...Object.keys(state.monstersByMap).map(Number),
    ...state.images.filter(i => i.mapId != null).map(i => i.mapId),
  ]);

  const list = [...maps].sort((a,b)=> a - b);

  for(const id of list){
    const opt = document.createElement('option');
    opt.value = String(id);
    const imgName = state.images.find(i => i.mapId === id)?.name || '—';
    opt.textContent = `Map ${id} (${imgName})`;
    mapSelect.appendChild(opt);
  }

  mapSelect.disabled = list.length === 0;

  if(list.length > 0){
    // Nếu currentMapId chưa có hoặc không nằm trong danh sách, chọn map đầu tiên
    if(state.currentMapId == null || !maps.has(state.currentMapId)){
      state.currentMapId = list[0];
    }
    mapSelect.value = String(state.currentMapId);
  }
}