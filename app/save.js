import { state } from "./state.js";

function mapName(mapId) {
  if (!state.maps) return "";
  const entry = state.maps.find(m => m.id === mapId);
  return entry ? entry.name : "";
}

export function exportMonsterSetBase() {
  let out = "";

  for (const [mapId, data] of Object.entries(state.monstersByMap)) {
    const id = parseInt(mapId, 10);
    const mapLabel = mapName(id);

    // --- NPC (block 0)
    const npcs = data.points.filter(p => p.isNPC);
    if (npcs.length) {
      out += `// ${mapLabel} - NPC\n`;
      out += "0\n";
      for (const p of npcs) {
        const name = state.classes[p.classId]?.name || "";
        out += `${p.classId} ${id} ${p.range ?? 0} ${p.x} ${p.y} ${p.dir ?? 0} // ${name}\n`;
      }
      out += "end\n\n";
    }

    // --- Monster (block 1)
    const monsters = data.spots.filter(s => s.type === "spot");
    if (monsters.length) {
      out += `// ${mapLabel} - Monster\n`;
      out += "1\n";
      for (const s of monsters) {
        const name = state.classes[s.classId]?.name || "";
        out += `${s.classId} ${id} ${s.range ?? 0} ${s.x1} ${s.y1} ${s.x2} ${s.y2} ${s.dir ?? 0} ${s.count ?? 1} // ${name}\n`;
      }
      out += "end\n\n";
    }

    // --- Invasion (block 3)
    const invasions = data.spots.filter(s => s.type === "invasion");
    if (invasions.length) {
      out += `// ${mapLabel} - Invasion\n`;
      out += "3\n";
      for (const s of invasions) {
        const name = state.classes[s.classId]?.name || "";
        out += `${s.classId} ${id} ${s.range ?? 0} ${s.x1} ${s.y1} ${s.x2} ${s.y2} ${s.dir ?? 0} ${s.count ?? 1} ${s.value ?? 0} // ${name}\n`;
      }
      out += "end\n\n";
    }

    // --- Battle (block 4)
    const battles = data.points.filter(p => p.type === "battle");
    if (battles.length) {
      out += `// ${mapLabel} - Battle\n`;
      out += "4\n";
      for (const p of battles) {
        const name = state.classes[p.classId]?.name || "";
        out += `${p.classId} ${id} ${p.range ?? 0} ${p.x} ${p.y} ${p.dir ?? 0} // ${name}\n`;
      }
      out += "end\n\n";
    }
  }

  return out;
}

export function downloadFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}