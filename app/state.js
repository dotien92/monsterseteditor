export const state = {
  images: /** @type {Array<{name:string,url:string,mapId:number|null,w:number,h:number}>} */([]),
  monstersByMap: /** @type {Record<number,{points:Array,spots:Array}>} */({}),
  classes: /** @type {Record<number,{name:string}>} */({}),
  currentMapId: null,
  viewScale: 0.8, // 25–100%
  calibrationByMap: /** @type {Record<number,{dx:number,dy:number}>} */({}), // offset (grid) theo map
  calibrating: false,

  // Chọn/kéo & hover
  selection: /** @type {null | { kind:'point', idx:number } | { kind:'spot', idx:number } } */(null),
  dragging: /** @type {null | { mode:'move' | 'resize', corner?: 'tl'|'tr'|'bl'|'br', grab?:{ox:number,oy:number,w:number,h:number}, anchor?:{ax:number,ay:number} } } */(null),
  hover: /** @type {null | { kind:'point'|'spot', idx:number }} */(null),
  trapIdSet: /** @type {Set<number>} */(new Set()),
  selection: null,
  hover: null,
  dragging: null,

  // Copy/Paste
  clipboard: null,

  // Undo/Redo
  history: [],
  future: [],

  // mouse position tracking for paste
  lastMouse: null,
  filters: {
    npc: false,
    decoration: false,
    monster: true,
    invasion: false,
    battle: true
  },
};