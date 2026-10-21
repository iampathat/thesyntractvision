// Project Glasswing: direct Lab entry; one OPTIONAL cinematic replay, never a gate.
// Theory and creation by Patrik Sundblom.
// with OpenAI / ChatGPT as research & development support.
(() => {
  const original = document.getElementById("security-intro");
  if (!original) return;
  const template = original.cloneNode(true);
  original.remove(); // Main Security Lab is immediately available on every navigation.
  let current = null;
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
  function replay() {
    finish();
    const node = template.cloneNode(true);
    node.dataset.open = "true";
    node.querySelector(".q-intro-skip")?.addEventListener("click", finish, {once:true});
    document.body.prepend(node);
    current = node;
    document.addEventListener("keydown", onEscape);
    timer = setTimeout(finish, reducedMotion() ? 2900 : 6750);
  }
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-replay-intro]");
    if (!button) return;
    event.preventDefault();
    replay();
  });
})();