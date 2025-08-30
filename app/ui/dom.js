// DOM & cursor helpers

export function byId(id){
  const el = document.getElementById(id);
  if(!el) throw new Error('UI missing element #' + id);
  return el;
}

export function setCursor(canvas, name){
  canvas.style.cursor = name;
}

export function resizeCursorFor(corner){
  if (corner==='tl' || corner==='br') return 'nwse-resize';
  if (corner==='tr' || corner==='bl') return 'nesw-resize';
  return 'nwse-resize';
}