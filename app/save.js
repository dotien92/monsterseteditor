import state from "./state.js";

export function exportMonsterSetBase() {
  let blocks = {0: [], 1: [], 3: [], 4: []};

  const spawns = state.spawns[state.currentMap.mapId] || [];
  for (let spawn of spawns) {
    const monster = state.monsters[spawn.monsterId];
    if (!monster) continue;

    let line = "";
    switch (spawn.type) {
      case 0:
      case 4:
        line = `${spawn.monsterId}\t${spawn.mapId}\t${spawn.moveRange}\t${spawn.x1}\t${spawn.y1}\t${spawn.dir}\t// ${monster.name}`;
        break;
      case 1:
        line = `${spawn.monsterId}\t${spawn.mapId}\t${spawn.moveRange}\t${spawn.x1}\t${spawn.y1}\t${spawn.x2}\t${spawn.y2}\t${spawn.dir}\t${spawn.count}\t// ${monster.name}`;
        break;
      case 3:
        line = `${spawn.monsterId}\t${spawn.mapId}\t${spawn.moveRange}\t${spawn.x1}\t${spawn.y1}\t${spawn.x2}\t${spawn.y2}\t${spawn.dir}\t${spawn.count}\t${spawn.value}\t// ${monster.name}`;
        break;
    }
    blocks[spawn.type].push(line);
  }

  let output = "";
  for (let t of [0,1,3,4]) {
    output += `${t}\n`;
    output += blocks[t].join("\n") + "\n";
    output += "end\n";
  }
  return output;
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