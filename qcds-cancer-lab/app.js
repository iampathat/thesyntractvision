(() => {
  const maskInput = document.getElementById("maskInput");
  const unknownCount = document.getElementById("unknownCount");
  const stateCount = document.getElementById("stateCount");
  const modeText = document.getElementById("modeText");
  const maskViz = document.getElementById("maskViz");

  let mask = Array(8).fill("?");

  function cycle(v){
    if(v === "?") return "0";
    if(v === "0") return "1";
    return "?";
  }

  function renderMask(){
    maskInput.innerHTML = "";
    mask.forEach((v, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = v;
      b.className = v === "?" ? "" : "bound";
      b.setAttribute("aria-label", `dimension ${idx + 1}: ${v === "?" ? "unknown" : v}`);
      b.addEventListener("click", () => {
        mask[idx] = cycle(mask[idx]);
        renderMask();
      });
      maskInput.appendChild(b);
    });

    const u = mask.filter(x => x === "?").length;
    unknownCount.textContent = String(u);
    stateCount.textContent = (2 ** u).toLocaleString("en-US");
    modeText.textContent = u === 0 ? "COMPLETE" : "OPEN";

    maskViz.innerHTML = "";
    const bars = Math.min(16, Math.max(4, 2 ** Math.min(u, 4)));
    for(let i=0;i<bars;i++){
      const s = document.createElement("span");
      const wave = 24 + ((i * 31 + u * 17) % 58);
      s.style.setProperty("--h", wave + "%");
      maskViz.appendChild(s);
    }
  }

  renderMask();
})();