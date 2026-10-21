// Project Glasswing intro: 3.7 seconds, skip, replay, and a visible reduced-motion still.
(() => {
  let current = document.querySelector("#security-intro");
  if (!current) return;
  const template = current.cloneNode(true);
  let timer = null;
  const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  function finish() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    current?.remove();
    current = null;
    document.removeEventListener("keydown", onEscape);
  }
  function onEscape(event) {
    if (event.key === "Escape") finish();
  }
  function start(node) {
    if (timer !== null) clearTimeout(timer);
    current = node;
    current.querySelector(".q-intro-skip")?.addEventListener("click", finish, {once:true});
    document.addEventListener("keydown", onEscape);
    timer = setTimeout(finish, reducedMotion() ? 3200 : 3730);
  }
  start(current);

  // Replay on demand, without reloading the active case or resetting the lab.
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-replay-intro]");
    if (!button) return;
    event.preventDefault();
    if (current) finish();
    const next = template.cloneNode(true);
    document.body.prepend(next);
    start(next);
  });
})();
