// Đọc Monster.txt & MonsterSetBase.txt (sections 0/1/3/4)
import { state } from './state.js';
import { fetchJSON, fetchText, readImageMetaFromURL } from './utils.js';
import { CONFIG } from './config.js';

export async function loadAll(){
  // 1) maps.json + ảnh
  state.images = [];
  state.maps = []; // giữ danh sách map với name

  const manifest = await fetchJSON(CONFIG.PATHS.MAPS_JSON);
  for (const entry of manifest){
    const file  = entry.file;
    const mapId = entry.mapId != null ? Number(entry.mapId) : null;
    const url   = 'map/' + file;
    const meta  = await readImageMetaFromURL(url);

    const name = entry.name ?? file.replace(/^\d+_/, "").replace(/\.png$/i, "");

    // giữ thông tin cho render
    state.images.push({ name: file, url: meta.url, mapId, w: meta.w, h: meta.h });

    // giữ thông tin map (dùng khi Save)
    state.maps.push({ id: mapId, name, file });
  }

  // 2) Monster.txt + MonsterSetBase.txt
  const [monTxt, msbTxt] = await Promise.all([
    fetchText(CONFIG.PATHS.MONSTER),
    fetchText(CONFIG.PATHS.MSB),
  ]);

  parseMonsterTxt(monTxt);
  parseMSB(msbTxt);
}

/** Đọc Monster.txt: ID (cột 1), Tên (cột 3 trong dấu ") */
export function parseMonsterTxt(txt){
  const classes = {};
  const lines = txt.split(/\r?\n/);
  const strip = s => s.replace(/(;.*$)|((?<!:)\/\/.*$)/, '').trim();

  for (const raw of lines){
    const line = strip(raw);
    if (!line) continue;
    const m = line.match(/^\s*(\d+)[^"]*"([^"]+)"/);
    if (!m) continue;
    const id   = Number(m[1]);
    const name = m[2];
    if (Number.isFinite(id)) classes[id] = { name };
  }
  state.classes = classes;
}

/** Đọc MonsterSetBase: 0 (NPC), 1 (Spot), 3 (Invasion), 4 (Event) */
export function parseMSB(txt){
  state.monstersByMap = {};
  const lines = txt.split(/\r?\n/);

  let section = null;   // 0 | 1 | 3 | 4 | null
  let ln = 0;           // 1-based line number
  const clean  = s => s.replace(/(;.*$)|((?<!:)\/\/.*$)/,'').trim();
  const ensure = mapId => (state.monstersByMap[mapId] ||= { points: [], spots: [] });

  for (const raw of lines){
    ln++;
    const line = clean(raw);
    if (!line) continue;

    if (/^\d+$/.test(line)){ // header 0/1/3/4
      const sec = Number(line);
      section = (sec===0 || sec===1 || sec===3 || sec===4) ? sec : null;
      continue;
    }
    if (line.toLowerCase() === 'end'){ section = null; continue; }
    if (section == null) continue;

    const t = line.split(/\s+/);

    if (section === 0){
      // 0: <ClassId> <MapId> <Dis> <X> <Y> <Dir> <Count?>
      if (t.length < 6) continue;
      const mob = Number(t[0]);
      const map = Number(t[1]);
      const x   = Number(t[3]);
      const y   = Number(t[4]);
      if (![mob,map,x,y].every(Number.isFinite)) continue;
      const b = ensure(map);
      b.points.push({ classId: mob, x, y, isNPC: true, type: 'npc', sourceLine: ln });
    }
    else if (section === 1){
      // 1: <ClassId> <MapId> <Dis> <X1> <Y1> <X2> <Y2> <Dir> <Count>
      if (t.length < 9) continue;
      const mob = Number(t[0]);
      const map = Number(t[1]);
      const x1  = Number(t[3]);
      const y1  = Number(t[4]);
      const x2  = Number(t[5]);
      const y2  = Number(t[6]);
      const count = Number(t[8]);
      if (![mob,map,x1,y1,x2,y2].every(Number.isFinite)) continue;
      const b = ensure(map);
      b.spots.push({ classId: mob, x1, y1, x2, y2, count, isNPC: false, type: 'spot', sourceLine: ln });
    }
    else if (section === 3){
      // 3: <ClassId> <MapId> <Dis> <X1> <Y1> <X2> <Y2> <Dir> <Count> <Value>
      if (t.length < 10) continue;
      const mob = Number(t[0]);
      const map = Number(t[1]);
      const x1  = Number(t[3]);
      const y1  = Number(t[4]);
      const x2  = Number(t[5]);
      const y2  = Number(t[6]);
      const count = Number(t[8]);
      const value = Number(t[9]);
      if (![mob,map,x1,y1,x2,y2].every(Number.isFinite)) continue;
      const b = ensure(map);
      b.spots.push({ classId: mob, x1, y1, x2, y2, count, value, isNPC: false, type: 'invasion', sourceLine: ln });
    }
    else if (section === 4){
      // 4: <ClassId> <MapId> <Dis> <X> <Y> <Dir>
      if (t.length < 6) continue;
      const mob = Number(t[0]);
      const map = Number(t[1]);
      const x   = Number(t[3]);
      const y   = Number(t[4]);
      const dir = Number(t[5]);
      if (![mob,map,x,y].every(Number.isFinite)) continue;
      const b = ensure(map);
      b.points.push({ classId: mob, x, y, dir, isNPC: false, type: 'battle', sourceLine: ln });
    }
  }
}