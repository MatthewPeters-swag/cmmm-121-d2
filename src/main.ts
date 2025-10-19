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

// --- Drawing Command Class ---
class MarkerLine {
  private points: { x: number; y: number }[] = [];

  constructor(startX: number, startY: number) {
    this.points.push({ x: startX, y: startY });
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      const p = this.points[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
}

// --- Data structures ---
// Display list (list of MarkerLine objects)
let strokes: MarkerLine[] = [];
// Redo stack
let redoStack: MarkerLine[] = [];
// Currently drawn stroke
let currentStroke: MarkerLine | null = null;

let drawing = false;

// --- Event: start drawing ---
canvas.addEventListener("mousedown", (event) => {
  drawing = true;
  currentStroke = new MarkerLine(event.offsetX, event.offsetY);
  strokes.push(currentStroke);
  redoStack = []; // clear redo stack when new drawing starts
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// --- Event: drag to add points ---
canvas.addEventListener("mousemove", (event) => {
  if (!drawing || !currentStroke) return;
  currentStroke.drag(event.offsetX, event.offsetY);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// --- Event: stop drawing ---
canvas.addEventListener("mouseup", () => {
  drawing = false;
  currentStroke = null;
});

canvas.addEventListener("mouseleave", () => {
  drawing = false;
  currentStroke = null;
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
  const undone = strokes.pop()!;
  redoStack.push(undone);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// --- Button: redo ---
redoButton.addEventListener("click", () => {
  if (redoStack.length === 0) return;
  const redone = redoStack.pop()!;
  strokes.push(redone);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// --- Redraw observer ---
canvas.addEventListener("drawing-changed", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const stroke of strokes) {
    stroke.display(ctx);
  }
});
