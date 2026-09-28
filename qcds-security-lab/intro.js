// A two-second introduction, independent of the application boot path.
(() => {
  const intro = document.querySelector("#security-intro");
  if (!intro) return;
  const finish = () => {
    intro.remove();
    document.removeEventListener("keydown", escape);
  };
  const escape = (event) => {
    if (event.key === "Escape") finish();
  };
  intro.querySelector("button").addEventListener("click", finish);
  document.addEventListener("keydown", escape);
  setTimeout(
    finish,
    matchMedia("(prefers-reduced-motion: reduce)").matches ? 200 : 2000,
  );
})();
