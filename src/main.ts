import "./style.css";

interface Command {
  draw(ctx: CanvasRenderingContext2D): void;
}

class MarkerCommand implements Command {
  private readonly points: { x: number; y: number }[] = [];
  private readonly color: string;
  private readonly thickness: number;
  private readonly rotation: number;

  constructor(
    startX: number,
    startY: number,
    thickness: number,
    color = "black",
    rotation = 0,
  ) {
    this.points.push({ x: startX, y: startY });
    this.thickness = thickness;
    this.color = color;
    this.rotation = rotation;
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.thickness;
    ctx.lineCap = "round";
    ctx.translate(0, 0);
    ctx.rotate(this.rotation);
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (const p of this.points) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.restore();
  }
}

class StickerCommand implements Command {
  private x: number;
  private y: number;
  private readonly sticker: string;
  private readonly color: string;
  private readonly rotation: number;

  constructor(
    x: number,
    y: number,
    sticker: string,
    color: string,
    rotation: number,
  ) {
    this.x = x;
    this.y = y;
    this.sticker = sticker;
    this.color = color;
    this.rotation = rotation;
  }

  drag(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    ctx.font = "32px serif";
    ctx.fillText(this.sticker, 0, 0);
    ctx.restore();
  }
}

class ToolPreview implements Command {
  private readonly x: number;
  private readonly y: number;
  private readonly size: number;
  private readonly sticker?: string | undefined;
  private readonly isSticker: boolean;
  private readonly color: string;
  private readonly rotation: number;

  constructor(
    x: number,
    y: number,
    size: number,
    color: string,
    rotation: number,
    sticker?: string | undefined,
  ) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.sticker = sticker;
    this.isSticker = sticker !== undefined;
    this.color = color;
    this.rotation = rotation;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    if (this.isSticker && this.sticker) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = this.color;
      ctx.font = "32px serif";
      ctx.fillText(this.sticker, 0, 0);
      ctx.globalAlpha = 1.0;
    } else {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
    ctx.restore();
  }
}

// --------------------------------------------------
// DOM Setup
// --------------------------------------------------
const h1 = document.createElement("h1");
h1.textContent = "Drawing App";
document.body.appendChild(h1);

const buttonRow = document.createElement("div");
document.body.appendChild(buttonRow);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d")!;

const makeButton = (label: string, parent = buttonRow) => {
  const b = document.createElement("button");
  b.textContent = label;
  parent.appendChild(b);
  return b;
};

// --------------------------------------------------
// Buttons
// --------------------------------------------------
const clearBtn = makeButton("Clear");
const undoBtn = makeButton("Undo");
const redoBtn = makeButton("Redo");
const thinBtn = makeButton("Thin");
const thickBtn = makeButton("Thick");
const exportBtn = makeButton("Export");

const stickerRow = document.createElement("div");
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
  { emoji: "🌈" },
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
      randomizeTool();
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
let nextColor: string = "black";
let nextRotation: number = 0;

const updateSelectedTool = (selectedBtn: HTMLButtonElement) => {
  document.querySelectorAll("button").forEach((btn) =>
    btn.classList.remove("selectedTool")
  );
  selectedBtn.classList.add("selectedTool");
};

function randomizeTool() {
  nextColor = `hsl(${Math.random() * 360}, 80%, 50%)`;
  nextRotation = (Math.random() - 0.5) * 0.6; // ±30 degrees
}

// --------------------------------------------------
// Drawing logic
// --------------------------------------------------
canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  const { offsetX: x, offsetY: y } = e;

  if (currentTool === "sticker" && currentSticker) {
    currentCommand = new StickerCommand(
      x,
      y,
      currentSticker,
      nextColor,
      nextRotation,
    );
  } else {
    const thickness = currentTool === "thick" ? 12 : 4;
    currentCommand = new MarkerCommand(
      x,
      y,
      thickness,
      nextColor,
      nextRotation,
    );
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
    if (currentTool === "sticker" && currentSticker) {
      toolPreview = new ToolPreview(
        x,
        y,
        32,
        nextColor,
        nextRotation,
        currentSticker,
      );
    } else {
      const thickness = currentTool === "thick" ? 12 : 4;
      toolPreview = new ToolPreview(x, y, thickness, nextColor, nextRotation);
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
  displayList.forEach((cmd) => cmd.draw(ctx));
});

canvas.addEventListener("tool-moved", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  displayList.forEach((cmd) => cmd.draw(ctx));
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
    redoStack.push(displayList.pop()!);
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

redoBtn.addEventListener("click", () => {
  if (redoStack.length > 0) {
    displayList.push(redoStack.pop()!);
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

thinBtn.addEventListener("click", () => {
  currentTool = "thin";
  randomizeTool();
  updateSelectedTool(thinBtn);
});
thickBtn.addEventListener("click", () => {
  currentTool = "thick";
  randomizeTool();
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

  displayList.forEach((cmd) => cmd.draw(exportCtx));

  const link = document.createElement("a");
  link.download = "drawing.png";
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
});
