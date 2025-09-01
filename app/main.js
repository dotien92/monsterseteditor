import { loadAll } from './loader.js';
import {
  bindUI,
  refreshMapSelect,
  renderMonsterList,
  bindListInteractions,
  renderInfoPanel,
  renderMapStats,
} from './ui.js';
import { draw } from './render.js';
import { state } from './state.js';
import { initAddMonsterUI, bindCanvasForAddMonster } from "./ui/addmonster.js";
import { exportMonsterSetBase, downloadFile } from "./save.js";

window.addEventListener('DOMContentLoaded', async ()=>{
  bindCanvasForAddMonster(document.getElementById("view"));
  document.getElementById("saveMonsterBtn").addEventListener("click", () => {
    const txt = exportMonsterSetBase();
    downloadFile("MonsterSetBase.txt", txt);
  });
  const { mapSelect, canvas, mobList } = bindUI();
  bindListInteractions(mobList);

  try{
    await loadAll();
    initAddMonsterUI();
    refreshMapSelect(mapSelect);
    renderMonsterList(mobList);
    renderInfoPanel(document.getElementById('infoPanel'));
    renderMapStats(document.getElementById('mapStats'));
    state.history.push(JSON.stringify(state.monstersByMap));

    if(state.currentMapId==null){
      const first = state.images.find(i=>i.mapId!=null)?.mapId;
      if(first!=null) state.currentMapId = first;
    }
    draw(canvas);

    document.getElementById('reloadAll').onclick = async ()=>{
      await loadAll();
      refreshMapSelect(mapSelect);
      renderMonsterList(mobList);
      renderInfoPanel(document.getElementById('infoPanel'));
      renderMapStats(document.getElementById('mapStats'));
      bindListInteractions(mobList);
      draw(canvas);
    };
  }catch(e){
    alert('Lỗi tải: '+(e?.message||e));
    console.error(e);
  }
});