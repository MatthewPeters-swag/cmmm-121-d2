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
ctx.lineCap = "round";
ctx.strokeStyle = "black";

// --- Controls container ---
const controls = document.createElement("div");
controls.style.marginTop = "10px";
document.body.appendChild(controls);

// --- Buttons ---
const clearButton = document.createElement("button");
clearButton.textContent = "Clear";
controls.appendChild(clearButton);

const undoButton = document.createElement("button");
undoButton.textContent = "Undo";
controls.appendChild(undoButton);

const redoButton = document.createElement("button");
redoButton.textContent = "Redo";
controls.appendChild(redoButton);

// --- Marker buttons ---
const thinButton = document.createElement("button");
thinButton.textContent = "Thin Marker";
controls.appendChild(thinButton);

const thickButton = document.createElement("button");
thickButton.textContent = "Thick Marker";
controls.appendChild(thickButton);

// --- Sticker setup (data-driven) ---
interface Sticker {
  emoji: string;
}

let stickerData: Sticker[] = [
  { emoji: "🐱" },
  { emoji: "🌸" },
  { emoji: "🚀" },
];

const stickerContainer = document.createElement("div");
stickerContainer.style.marginTop = "10px";
document.body.appendChild(stickerContainer);

const customStickerButton = document.createElement("button");
customStickerButton.textContent = "➕ Custom Sticker";
stickerContainer.appendChild(customStickerButton);

const stickerButtons: HTMLButtonElement[] = [];

// Function to rebuild sticker buttons whenever a new one is added
function buildStickerButtons() {
  // Remove old buttons (except the custom sticker button)
  for (const btn of stickerButtons) btn.remove();
  stickerButtons.length = 0;

  for (const { emoji } of stickerData) {
    const btn = document.createElement("button");
    btn.textContent = emoji;
    stickerContainer.appendChild(btn);
    stickerButtons.push(btn);

    btn.addEventListener("click", () => {
      currentTool = "sticker";
      currentSticker = emoji;
      deselectAllTools();
      btn.classList.add("selectedTool");
      canvas.dispatchEvent(
        new CustomEvent("tool-moved", {
          detail: { x: -100, y: -100 },
        }),
      );
    });
  }
}

// Build the initial stickers
buildStickerButtons();

// --- Add custom sticker button behavior ---
customStickerButton.addEventListener("click", () => {
  const input = prompt("Enter your custom sticker (emoji or text):", "⭐");
  if (input && input.trim() !== "") {
    stickerData.push({ emoji: input.trim() });
    buildStickerButtons(); // Rebuild UI with new sticker
  }
});

// --- Tool State ---
let currentTool: "marker" | "sticker" = "marker";
let currentThickness = 2;
let currentSticker: string | null = null;
thinButton.classList.add("selectedTool");

function deselectAllTools() {
  for (
    const btn of [
      thinButton,
      thickButton,
      ...stickerButtons,
      customStickerButton,
    ]
  ) {
    btn.classList.remove("selectedTool");
  }
}

function selectMarker(thickness: number, button: HTMLButtonElement) {
  currentTool = "marker";
  currentSticker = null;
  currentThickness = thickness;
  deselectAllTools();
  button.classList.add("selectedTool");
}

thinButton.addEventListener("click", () => selectMarker(2, thinButton));
thickButton.addEventListener("click", () => selectMarker(6, thickButton));

// --- MarkerLine class ---
class MarkerLine {
  private points: { x: number; y: number }[] = [];
  private thickness: number;

  constructor(startX: number, startY: number, thickness: number) {
    this.points.push({ x: startX, y: startY });
    this.thickness = thickness;
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length < 2) return;
    ctx.beginPath();
    ctx.lineWidth = this.thickness;
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      const p = this.points[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
}

// --- StickerCommand class ---
class StickerCommand {
  private emoji: string;
  private x: number;
  private y: number;

  constructor(emoji: string, x: number, y: number) {
    this.emoji = emoji;
    this.x = x;
    this.y = y;
  }

  drag(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  display(ctx: CanvasRenderingContext2D) {
    ctx.font = "32px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.x, this.y);
  }
}

// --- ToolPreview class ---
class ToolPreview {
  x: number;
  y: number;
  thickness: number;
  emoji: string | null;

  constructor(x: number, y: number, thickness: number, emoji: string | null) {
    this.x = x;
    this.y = y;
    this.thickness = thickness;
    this.emoji = emoji;
  }

  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    if (this.emoji) {
      ctx.globalAlpha = 0.6;
      ctx.font = "32px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.emoji, this.x, this.y);
    } else {
      ctx.beginPath();
      ctx.strokeStyle = "gray";
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;
      ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// --- Data structures ---
let strokes: (MarkerLine | StickerCommand)[] = [];
let redoStack: (MarkerLine | StickerCommand)[] = [];
let currentStroke: MarkerLine | StickerCommand | null = null;
let toolPreview: ToolPreview | null = null;
let drawing = false;

// --- Drawing Events ---
canvas.addEventListener("mousedown", (event) => {
  drawing = true;
  toolPreview = null;

  if (currentTool === "marker") {
    currentStroke = new MarkerLine(
      event.offsetX,
      event.offsetY,
      currentThickness,
    );
  } else if (currentTool === "sticker" && currentSticker) {
    currentStroke = new StickerCommand(
      currentSticker,
      event.offsetX,
      event.offsetY,
    );
  }

  if (currentStroke) {
    strokes.push(currentStroke);
    redoStack = [];
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

canvas.addEventListener("mousemove", (event) => {
  if (drawing && currentStroke) {
    currentStroke.drag(event.offsetX, event.offsetY);
    canvas.dispatchEvent(new Event("drawing-changed"));
  } else {
    canvas.dispatchEvent(
      new CustomEvent("tool-moved", {
        detail: { x: event.offsetX, y: event.offsetY },
      }),
    );
  }
});

canvas.addEventListener("mouseup", () => {
  drawing = false;
  currentStroke = null;
});

canvas.addEventListener("mouseleave", () => {
  drawing = false;
  currentStroke = null;
  toolPreview = null;
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// --- Clear ---
clearButton.addEventListener("click", () => {
  strokes = [];
  redoStack = [];
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// --- Undo / Redo ---
undoButton.addEventListener("click", () => {
  if (strokes.length === 0) return;
  const undone = strokes.pop()!;
  redoStack.push(undone);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

redoButton.addEventListener("click", () => {
  if (redoStack.length === 0) return;
  const redone = redoStack.pop()!;
  strokes.push(redone);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// --- Tool preview handler ---
canvas.addEventListener("tool-moved", (event: Event) => {
  const { x, y } = (event as CustomEvent).detail;
  if (!drawing) {
    toolPreview = new ToolPreview(x, y, currentThickness, currentSticker);
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

// --- Redraw observer ---
canvas.addEventListener("drawing-changed", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const stroke of strokes) {
    stroke.display(ctx);
  }
  if (toolPreview) {
    toolPreview.display(ctx);
  }
});
