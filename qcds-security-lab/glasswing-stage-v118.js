// Project Glasswing · one landing, one optional cinematic, one real lab.
// Theory and creation by Patrik Sundblom.
// with OpenAI / ChatGPT as research & development support.
(() => {
  "use strict";
  const landing = document.getElementById("gw-landing");
  const film = document.getElementById("gw-film");
  const app = document.getElementById("app");
  const isLandingPage = document.body.dataset.entry === "landing";
  let timer = null;
  let fromLanding = false;
  let returnFocus = null;

  const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const setEntryMode = visible => {
    document.body.classList.toggle("gw-entry-active", visible);
    if (app) app.inert = visible;
  };
  const sessionEntered = () => {
    try { return sessionStorage.getItem("qcds-security-lab:entered-session") === "1"; }
    catch { return false; }
  };
  const rememberEntry = () => {
    try { sessionStorage.setItem("qcds-security-lab:entered-session","1"); }
    catch { /* browser privacy settings may disallow session storage */ }
  };

  function enter() {
    clearTimeout(timer);
    timer = null;
    film.hidden = true;
    if (landing) landing.hidden = true;
    rememberEntry();
    setEntryMode(false);
    const target = document.getElementById("app");
    if (target) target.removeAttribute("aria-hidden");
    const focusable = target?.querySelector('a[href="#home"],button[data-action="new"],a[href="#cases"]');
    focusable?.focus?.({preventScroll:true});
  }

  function finishFilm() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (!film || film.hidden) return;
    film.hidden = true;
    film.classList.remove("gw-film-playing");
    if (fromLanding && landing) {
      landing.hidden = false;
      setEntryMode(true);
      (landing.querySelector("[data-enter-lab]"))?.focus?.({preventScroll:true});
    } else {
      setEntryMode(false);
      returnFocus?.focus?.({preventScroll:true});
    }
    returnFocus = null;
  }

  function playFilm(fromButton) {
    if (!film) return;
    clearTimeout(timer);
    returnFocus = fromButton || null;
    fromLanding = !!landing && !landing.hidden;
    if (landing) landing.hidden = true;
    setEntryMode(true);
    film.hidden = false;
    // A fresh animation timeline each replay: no three-piece wing sprites.
    film.classList.remove("gw-film-playing");
    void film.offsetWidth;
    film.classList.add("gw-film-playing");
    film.querySelector("[data-film-skip]")?.focus?.({preventScroll:true});
    timer = setTimeout(finishFilm,reduceMotion()?3200:6100);
  }

  // Only the landing route greets new visitors. Deep links and repeat opens
  // go directly to the genuine app; no other entrance or cache gate is added.
  const showLanding = !!landing && isLandingPage &&
      !sessionEntered() && (!location.hash || location.hash === "#home");
  if (landing) landing.hidden = !showLanding;
  if (film) film.hidden = true;
  setEntryMode(showLanding);

  document.addEventListener("click", event => {
    const go = event.target.closest("[data-enter-lab]");
    if (go) { event.preventDefault(); enter(); return; }
    const show = event.target.closest("[data-watch-intro],[data-replay-intro]");
    if (show) { event.preventDefault(); playFilm(show); return; }
    const skip = event.target.closest("[data-film-skip]");
    if (skip) { event.preventDefault(); finishFilm(); return; }
    const openLanding = event.target.closest("[data-open-landing]");
    if (openLanding && landing) {
      event.preventDefault();
      if (film) film.hidden = true;
      landing.hidden = false;
      setEntryMode(true);
      landing.querySelector("[data-enter-lab]")?.focus?.({preventScroll:true});
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && film && !film.hidden) finishFilm();
  });
  // Landing is absent from direct-entry pages; the same replay still works.
})();
