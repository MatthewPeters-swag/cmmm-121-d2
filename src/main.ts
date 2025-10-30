import "./style.css";

interface Command {
  draw(ctx: CanvasRenderingContext2D): void;
}

class MarkerCommand implements Command {
  private readonly points: { x: number; y: number }[] = [];
  private readonly color: string;
  private readonly thickness: number;

  constructor(
    startX: number,
    startY: number,
    thickness: number,
    color = "black",
  ) {
    this.points.push({ x: startX, y: startY });
    this.thickness = thickness;
    this.color = color;
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 2) return;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.thickness;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (const p of this.points) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
}

class StickerCommand implements Command {
  private x: number;
  private y: number;
  private readonly sticker: string;

  constructor(x: number, y: number, sticker: string) {
    this.x = x;
    this.y = y;
    this.sticker = sticker;
  }

  drag(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.font = "24px serif";
    ctx.fillText(this.sticker, this.x, this.y);
  }
}

class ToolPreview implements Command {
  private readonly x: number;
  private readonly y: number;
  private readonly size: number;
  private readonly sticker?: string | undefined;
  private readonly isSticker: boolean;

  constructor(
    x: number,
    y: number,
    size: number,
    sticker?: string | undefined,
  ) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.isSticker = sticker !== undefined;
    this.sticker = sticker;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.isSticker && this.sticker) {
      ctx.globalAlpha = 0.5;
      ctx.font = "24px serif";
      ctx.fillText(this.sticker, this.x, this.y);
      ctx.globalAlpha = 1.0;
    } else {
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  }
}

// --------------------------------------------------
// DOM Setup
// --------------------------------------------------
const h1 = document.createElement("h1");
h1.textContent = "Drawing App";
document.body.appendChild(h1);

const buttonRow = document.createElement("div");
buttonRow.style.marginBottom = "8px";
document.body.appendChild(buttonRow);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d")!;

// --------------------------------------------------
// Buttons
// --------------------------------------------------
const makeButton = (label: string, parent = buttonRow) => {
  const b = document.createElement("button");
  b.textContent = label;
  parent.appendChild(b);
  return b;
};

const clearBtn = makeButton("Clear");
const undoBtn = makeButton("Undo");
const redoBtn = makeButton("Redo");
const thinBtn = makeButton("Thin");
const thickBtn = makeButton("Thick");
const exportBtn = makeButton("Export");

const stickerRow = document.createElement("div");
stickerRow.style.marginTop = "8px";
document.body.appendChild(stickerRow);

const addStickerBtn = makeButton("Add Custom Sticker", stickerRow);

// --------------------------------------------------
// Sticker Setup (data-driven)
// --------------------------------------------------
interface StickerDef {
  emoji: string;
}

const stickers: StickerDef[] = [
  { emoji: "⭐" },
  { emoji: "🔥" },
  { emoji: "🐸" },
];

const stickerButtons: HTMLButtonElement[] = [];

function refreshStickerButtons() {
  stickerRow.querySelectorAll("button.sticker").forEach((b) => b.remove());
  stickers.forEach((s) => {
    const b = makeButton(s.emoji, stickerRow);
    b.classList.add("sticker");
    b.addEventListener("click", () => {
      currentTool = "sticker";
      currentSticker = s.emoji;
      toolPreview = null;
      canvas.dispatchEvent(new Event("tool-moved"));
      updateSelectedTool(b);
    });
    stickerButtons.push(b);
  });
}

refreshStickerButtons();

addStickerBtn.addEventListener("click", () => {
  const newEmoji = prompt("Enter a custom sticker (emoji or text):", "🙂");
  if (newEmoji) {
    stickers.push({ emoji: newEmoji });
    refreshStickerButtons();
  }
});

// --------------------------------------------------
// State
// --------------------------------------------------
let displayList: Command[] = [];
let redoStack: Command[] = [];
let drawing = false;
let currentCommand: Command | null = null;
let toolPreview: ToolPreview | null = null;
let currentTool: "thin" | "thick" | "sticker" = "thin";
let currentSticker: string | null = null;

const updateSelectedTool = (selectedBtn: HTMLButtonElement) => {
  document.querySelectorAll("button").forEach((btn) =>
    btn.classList.remove("selectedTool")
  );
  selectedBtn.classList.add("selectedTool");
};

// --------------------------------------------------
// Drawing logic
// --------------------------------------------------
canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  const { offsetX: x, offsetY: y } = e;

  if (currentTool === "sticker" && currentSticker !== null) {
    currentCommand = new StickerCommand(x, y, currentSticker);
  } else {
    const thickness = currentTool === "thick" ? 8 : 2;
    currentCommand = new MarkerCommand(x, y, thickness);
  }

  displayList.push(currentCommand);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mousemove", (e) => {
  const { offsetX: x, offsetY: y } = e;

  if (drawing && currentCommand) {
    if (
      currentCommand instanceof MarkerCommand ||
      currentCommand instanceof StickerCommand
    ) {
      currentCommand.drag(x, y);
      canvas.dispatchEvent(new Event("drawing-changed"));
    }
  } else {
    if (currentTool === "sticker" && currentSticker !== null) {
      toolPreview = new ToolPreview(x, y, 24, currentSticker);
    } else {
      const thickness = currentTool === "thick" ? 8 : 2;
      toolPreview = new ToolPreview(x, y, thickness);
    }
    canvas.dispatchEvent(new Event("tool-moved"));
  }
});

globalThis.addEventListener("mouseup", () => {
  drawing = false;
});

// --------------------------------------------------
// Events
// --------------------------------------------------
canvas.addEventListener("drawing-changed", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cmd of displayList) cmd.draw(ctx);
});

canvas.addEventListener("tool-moved", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cmd of displayList) cmd.draw(ctx);
  if (toolPreview) toolPreview.draw(ctx);
});

// --------------------------------------------------
// Buttons logic
// --------------------------------------------------
clearBtn.addEventListener("click", () => {
  displayList = [];
  redoStack = [];
  canvas.dispatchEvent(new Event("drawing-changed"));
});

undoBtn.addEventListener("click", () => {
  if (displayList.length > 0) {
    const cmd = displayList.pop()!;
    redoStack.push(cmd);
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

redoBtn.addEventListener("click", () => {
  if (redoStack.length > 0) {
    const cmd = redoStack.pop()!;
    displayList.push(cmd);
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

thinBtn.addEventListener("click", () => {
  currentTool = "thin";
  updateSelectedTool(thinBtn);
});

thickBtn.addEventListener("click", () => {
  currentTool = "thick";
  updateSelectedTool(thickBtn);
});

// --------------------------------------------------
// Export logic
// --------------------------------------------------
exportBtn.addEventListener("click", () => {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1024;
  exportCanvas.height = 1024;
  const exportCtx = exportCanvas.getContext("2d")!;
  exportCtx.scale(4, 4);
  exportCtx.fillStyle = "white";
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

  for (const cmd of displayList) cmd.draw(exportCtx);

  const link = document.createElement("a");
  link.download = "drawing.png";
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
});
