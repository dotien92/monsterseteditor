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
import { renderMonsterFilters } from './ui/list.js';
import { initAddMonsterUI, bindCanvasForAddMonster } from "./ui/addmonster.js";
import { saveToServer, exportMonsterSetBase, downloadFile } from "./save.js";

const copyBtn = document.getElementById("copyMonsterBtn");
copyBtn.addEventListener("click", async () => {
  if (!confirm("Bạn có chắc muốn copy MonsterSetBase.txt sang C:\\Muserver\\data\\monster\\ ?\nFile cũ sẽ bị ghi đè.")) {
    return;
  }

  copyBtn.disabled = true;
  copyBtn.textContent = "⏳ Đang copy...";

  try {
    const res = await fetch("app/copy_monster.php", { method: "POST" });
    const data = await res.json();

    if (data.success) {
      alert("✅ " + data.message);
    } else {
      alert("❌ " + data.error);
    }
  } catch (err) {
    alert("⚠️ Lỗi kết nối tới PHP server: " + err.message);
  } finally {
    copyBtn.disabled = false;
    copyBtn.textContent = "📂 Copy sang MU Server";
  }
});

window.addEventListener('DOMContentLoaded', async ()=>{
  bindCanvasForAddMonster(document.getElementById("view"));
  
  // 📂 Nút tải file MonsterSetBase.txt gốc từ server
  document.getElementById("downloadMonsterBtn").addEventListener("click", () => {
    const txt = exportMonsterSetBase();
    downloadFile("MonsterSetBase.txt", txt);
  });

  // 💾 Nút lưu file MonsterSetBase.txt (xuất thay đổi hiện tại)
  document.getElementById("saveMonsterBtn").addEventListener("click", async () => {
    try {
      const result = await saveToServer();
      alert("Đã lưu thành công: " + result);
    } catch (e) {
      alert("Lưu thất bại: " + e.message);
    }
  });

  const { mapSelect, canvas, mobList } = bindUI();
  bindListInteractions(mobList);
  const filterBox = document.getElementById("mobFilters");
  if (filterBox) renderMonsterFilters(filterBox);
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
      if (filterBox) renderMonsterFilters(filterBox);
      draw(canvas);
    };
  }catch(e){
    alert('Lỗi tải: '+(e?.message||e));
    console.error(e);
  }
});