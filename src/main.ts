import "./style.css";

// --- Title ---
const title = document.createElement("h1");
title.textContent = "Simple Drawing App";
document.body.appendChild(title);

// --- Canvas setup ---
const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d")!;
ctx.lineWidth = 2;
ctx.lineCap = "round";
ctx.strokeStyle = "black";

// --- Buttons ---
const controls = document.createElement("div");
controls.style.marginTop = "10px";
document.body.appendChild(controls);

const clearButton = document.createElement("button");
clearButton.textContent = "Clear";
controls.appendChild(clearButton);

const undoButton = document.createElement("button");
undoButton.textContent = "Undo";
controls.appendChild(undoButton);

const redoButton = document.createElement("button");
redoButton.textContent = "Redo";
controls.appendChild(redoButton);

// --- Data structures ---
// Array of strokes (the display list)
let strokes: { x: number; y: number }[][] = [];
// Redo stack
let redoStack: { x: number; y: number }[][] = [];
// Current stroke while drawing
let currentStroke: { x: number; y: number }[] = [];

let drawing = false;

// --- Event: start drawing ---
canvas.addEventListener("mousedown", (event) => {
  drawing = true;
  currentStroke = [{ x: event.offsetX, y: event.offsetY }];
  strokes.push(currentStroke);
  redoStack = []; // Clear redo stack when new stroke starts
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// --- Event: add points while moving ---
canvas.addEventListener("mousemove", (event) => {
  if (!drawing) return;
  const point = { x: event.offsetX, y: event.offsetY };
  currentStroke.push(point);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// --- Event: stop drawing ---
canvas.addEventListener("mouseup", () => {
  drawing = false;
});

canvas.addEventListener("mouseleave", () => {
  drawing = false;
});

// --- Button: clear ---
clearButton.addEventListener("click", () => {
  strokes = [];
  redoStack = [];
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// --- Button: undo ---
undoButton.addEventListener("click", () => {
  if (strokes.length === 0) return;
  const undoneStroke = strokes.pop()!;
  redoStack.push(undoneStroke);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// --- Button: redo ---
redoButton.addEventListener("click", () => {
  if (redoStack.length === 0) return;
  const redoneStroke = redoStack.pop()!;
  strokes.push(redoneStroke);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// --- Redraw observer ---
canvas.addEventListener("drawing-changed", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const stroke of strokes) {
    if (stroke.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      const p = stroke[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
});
