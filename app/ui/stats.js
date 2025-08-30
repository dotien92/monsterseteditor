import { state } from '../state.js';

function sumCount(arr){
  let total = 0;
  for(const s of arr){
    const c = Number.isFinite(s?.count) ? s.count : 1;
    total += c;
  }
  return total;
}

export function renderMapStats(container){
  if(!container) return;

  const mapId = state.currentMapId;
  const data = mapId!=null ? state.monstersByMap[mapId] : null;

  if(!data){
    container.innerHTML = '<div class="muted">Chọn map để xem thống kê.</div>';
    return;
  }

  const block1_all = data.spots.filter(s => s.type === 'spot');
  const block3_all = data.spots.filter(s => s.type === 'invasion');
  const block4_all = data.spots.filter(s => s.type === 'event');

  const isRegion = (s)=> (s.x1 !== s.x2) || (s.y1 !== s.y2);
  const block1_region = block1_all.filter(isRegion);

  const totalMonsters   = sumCount(block1_all) + sumCount(block4_all);
  const monstersInSpots = sumCount(block1_region);
  const totalSpotsB1    = block1_region.length;
  const totalBoss       = sumCount(block3_all);

  container.innerHTML = `
    <div class="stats-list">
      <div class="stats-item"><span class="label">Tổng số lượng quái</span>: <span class="value">${totalMonsters}</span></div>
      <div class="stats-item"><span class="label">Số lượng quái spot</span>: <span class="value">${monstersInSpots}</span></div>
      <div class="stats-item"><span class="label">Số lượng spot</span>: <span class="value">${totalSpotsB1}</span></div>
      <div class="stats-item"><span class="label">Tổng số lượng Boss</span>: <span class="value">${totalBoss}</span></div>
    </div>
  `;
}