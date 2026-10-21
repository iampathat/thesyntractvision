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
  const forceLanding = new URLSearchParams(location.search).has("welcome");
  const showLanding = !!landing && isLandingPage &&
      (forceLanding || (!sessionEntered() && (!location.hash || location.hash === "#home")));
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
    if (openLanding) {
      event.preventDefault();
      if (!landing) {
        location.assign("./?welcome=1");
      } else {
        if (film) film.hidden = true;
        landing.hidden = false;
        setEntryMode(true);
        landing.querySelector("[data-enter-lab]")?.focus?.({preventScroll:true});
      }
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && film && !film.hidden) finishFilm();
  });
  // Landing is absent from direct-entry pages; the same replay still works.
})();


// Project Glasswing · vector flight v1.19.
// Keep the approved original eagle's visible surface; move separately clipped
// SVG wing geometry, illuminated logic networks and defense effects beneath it.
// Only the film is replaced. The user-approved landing artwork and Lab remain intact.
(() => {
  const film = document.getElementById("gw-film");
  if (!film || typeof document.createElementNS !== "function") return;
  const flight = film.querySelector(".gw-film-flight");
  if (!flight) return;
  // SVG paths (rather than rocking an entire WebP) define the moving anatomy.
  // The original WebP is only the photo-quality texture clipped by those paths.
  flight.innerHTML = String.raw`
    <svg class="gw-vector-eagle" xmlns="http://www.w3.org/2000/svg"
         viewBox="0 0 880 459" role="img" aria-label="The approved crystalline eagle flying with moving vector wings and illuminated protection nodes">
      <defs>
        <clipPath id="gw-v-left"><path d="M0 0H494L506 192 468 264 414 329 330 365 0 390Z"/></clipPath>
        <clipPath id="gw-v-right"><path d="M389 0H880V400L550 366 493 307 449 235 390 183Z"/></clipPath>
        <clipPath id="gw-v-center"><path d="M355 122 524 122 565 223 535 318 577 459H306L346 327 315 230Z"/></clipPath>
        <radialGradient id="gw-v-electric"><stop stop-color="#fff"/><stop offset=".3" stop-color="#aeffff"/><stop offset="1" stop-color="#25bdff" stop-opacity=".02"/></radialGradient>
        <filter id="gw-v-nodes-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g class="gw-vector-wing gw-vector-wing-left">
        <image href="./glasswing-flight.webp?v=1.18.0" width="880" height="459" clip-path="url(#gw-v-left)"/>
        <g class="gw-vector-circuit" clip-path="url(#gw-v-left)">
          <path d="M427 220 350 176 274 117 143 59 M410 251 320 233 200 185 72 123 M389 282 270 290 130 330"
                fill="none" stroke="#75eaff" stroke-width="2" stroke-opacity=".64"/>
          <path d="M427 220 350 176 274 117 143 59" class="gw-vector-current"/>
          <path d="M410 251 320 233 200 185 72 123" class="gw-vector-current gw-vector-current-delay"/>
          <g class="gw-vector-nodes" filter="url(#gw-v-nodes-glow)">
            <circle cx="350" cy="176" r="5"/><circle cx="274" cy="117" r="4"/><circle cx="143" cy="59" r="5"/>
            <circle cx="320" cy="233" r="4"/><circle cx="200" cy="185" r="4"/><circle cx="130" cy="330" r="4"/>
          </g>
          <g class="gw-vector-travelers">
            <circle r="5" fill="#e9ffff"><animateMotion dur="1.05s" repeatCount="indefinite" path="M427 220 350 176 274 117 143 59"/></circle>
            <circle r="4" fill="#8dffe8"><animateMotion dur="1.5s" begin=".3s" repeatCount="indefinite" path="M410 251 320 233 200 185 72 123"/></circle>
          </g>
        </g>
      </g>
      <g class="gw-vector-wing gw-vector-wing-right">
        <image href="./glasswing-flight.webp?v=1.18.0" width="880" height="459" clip-path="url(#gw-v-right)"/>
        <g class="gw-vector-circuit" clip-path="url(#gw-v-right)">
          <path d="M453 220 540 174 623 111 756 59 M470 251 570 231 693 185 818 122 M498 282 610 291 738 335"
                fill="none" stroke="#75eaff" stroke-width="2" stroke-opacity=".64"/>
          <path d="M453 220 540 174 623 111 756 59" class="gw-vector-current"/>
          <path d="M470 251 570 231 693 185 818 122" class="gw-vector-current gw-vector-current-delay"/>
          <g class="gw-vector-nodes" filter="url(#gw-v-nodes-glow)">
            <circle cx="540" cy="174" r="5"/><circle cx="623" cy="111" r="4"/><circle cx="756" cy="59" r="5"/>
            <circle cx="570" cy="231" r="4"/><circle cx="693" cy="185" r="4"/><circle cx="738" cy="335" r="4"/>
          </g>
          <g class="gw-vector-travelers">
            <circle r="5" fill="#e9ffff"><animateMotion dur="1.05s" begin=".2s" repeatCount="indefinite" path="M453 220 540 174 623 111 756 59"/></circle>
            <circle r="4" fill="#8dffe8"><animateMotion dur="1.5s" begin=".6s" repeatCount="indefinite" path="M470 251 570 231 693 185 818 122"/></circle>
          </g>
        </g>
      </g>
      <g class="gw-vector-body">
        <image href="./glasswing-flight.webp?v=1.18.0" width="880" height="459" clip-path="url(#gw-v-center)"/>
        <g class="gw-vector-heart">
          <path d="M440 220 413 271 438 318 465 269Z" fill="#40d7ff" fill-opacity=".09" stroke="#9cfbff" stroke-opacity=".55" stroke-width="1.6"/>
          <circle cx="440" cy="274" r="19" fill="url(#gw-v-electric)" class="gw-vector-heart-core"/>
          <circle cx="440" cy="274" r="6" fill="#e7ffff" filter="url(#gw-v-nodes-glow)"/>
        </g>
      </g>
    </svg>`;
  flight.classList.add("gw-vector-flight");
  // The approved background is kept, but the ground is illuminated separately.
  if (typeof film.insertAdjacentHTML === "function") {
    film.insertAdjacentHTML("afterbegin", String.raw`
      <div class="gw-film-ground-art" aria-hidden="true"></div>
      <svg class="gw-film-defense" viewBox="0 0 1200 760" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="gw-v-beam" x1="0" y1="0" x2="0" y2="1">
            <stop stop-color="#f3ffff"/><stop offset=".3" stop-color="#51e9ff" stop-opacity=".85"/>
            <stop offset="1" stop-color="#39dfff" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <g class="gw-film-attack-beams">
          <path d="M600 310 Q492 500 295 632" stroke="url(#gw-v-beam)" stroke-width="3"/>
          <path d="M600 310 Q713 498 914 628" stroke="url(#gw-v-beam)" stroke-width="3"/>
          <path d="M600 310 615 653" stroke="url(#gw-v-beam)" stroke-width="4"/>
          <circle r="7" fill="#eaffff"><animateMotion dur=".85s" repeatCount="indefinite" path="M600 310 Q492 500 295 632"/></circle>
          <circle r="7" fill="#eaffff"><animateMotion dur=".85s" begin=".25s" repeatCount="indefinite" path="M600 310 Q713 498 914 628"/></circle>
          <circle r="7" fill="#d5ffad"><animateMotion dur=".92s" begin=".4s" repeatCount="indefinite" path="M600 310 615 653"/></circle>
        </g>
        <g class="gw-film-ground-grid">
          <path d="M0 680 Q600 530 1200 680 M0 730 Q600 550 1200 730 M180 760 580 560 M1020 760 620 560 M0 600H1200" />
        </g>
        <g class="gw-film-ground-targets">
          <g transform="translate(295 632)"><circle r="18"/><circle r="40"/><path d="M-18 0H18M0-18V18"/></g>
          <g transform="translate(914 628)"><circle r="18"/><circle r="40"/><path d="M-18 0H18M0-18V18"/></g>
          <g transform="translate(615 653)"><circle r="28"/><circle r="52"/><path d="M-26 0H26M0-26V26"/></g>
        </g>
        <path class="gw-film-protection" d="M187 658Q600 360 1016 655" />
      </svg>`);
  }
})();
