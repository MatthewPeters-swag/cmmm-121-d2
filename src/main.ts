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
