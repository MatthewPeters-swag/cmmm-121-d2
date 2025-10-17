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

// --- Clear button ---
const clearButton = document.createElement("button");
clearButton.textContent = "Clear Canvas";
document.body.appendChild(clearButton);

// --- Data structure ---
let strokes: { x: number; y: number }[][] = [];
let currentStroke: { x: number; y: number }[] = [];

// --- Drawing state ---
let drawing = false;

// --- Event: start drawing ---
canvas.addEventListener("mousedown", (event) => {
  drawing = true;
  currentStroke = [{ x: event.offsetX, y: event.offsetY }];
  strokes.push(currentStroke);
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

// --- Clear button ---
clearButton.addEventListener("click", () => {
  strokes = [];
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
