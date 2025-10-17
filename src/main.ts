//import exampleIconUrl from "./noun-paperclip-7598668-00449F.png";
import "./style.css";

//document.body.innerHTML = `
//  <p>Example image asset: <img src="${exampleIconUrl}" class="icon" /></p>
//`;

// Create and add a title (h1) to the webpage
const title = document.createElement("h1");
title.textContent = "Simple Drawing App";
document.body.appendChild(title);

// Create and add a 256x256 canvas
const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d")!;
ctx.lineWidth = 2;
ctx.lineCap = "round";
ctx.strokeStyle = "black";

// Clear button
const clearButton = document.createElement("button");
clearButton.textContent = "Clear Canvas";
document.body.appendChild(clearButton);

// Clear logic
clearButton.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Drawing logic
let drawing = false;

canvas.addEventListener("mousedown", (event) => {
  drawing = true;
  ctx.beginPath();
  ctx.moveTo(event.offsetX, event.offsetY);
});

canvas.addEventListener("mousemove", (event) => {
  if (!drawing) return;
  ctx.lineTo(event.offsetX, event.offsetY);
  ctx.stroke();
});

canvas.addEventListener("mouseup", () => {
  drawing = false;
});

canvas.addEventListener("mouseleave", () => {
  drawing = false;
});
