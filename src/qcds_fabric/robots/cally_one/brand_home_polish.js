/* Cally.One brand/home chrome — presentation only, never inference. */
(() => {
  if (window.__callyBrandHomePolish) return;
  window.__callyBrandHomePolish = true;

  const qs = (s, root=document) => root.querySelector(s);

  function closeTransientUI() {
    const quick = qs('#callyQuickAdd');
    if (quick) { quick.hidden = true; quick.innerHTML = ''; }
    qs('#callyStateOverlay')?.classList.remove('open');
    qs('.manageOverlay')?.classList.remove('open');
    const modal = qs('#modalBack');
    if (modal) modal.style.display = 'none';
    const menu = qs('#callyMobileMenu');
    if (menu) menu.hidden = true;
    qs('#callyMenuButton')?.setAttribute('aria-expanded', 'false');
  }

  function goHome() {
    closeTransientUI();
    const week = qs('#viewbar .view[data-view="week"]') || [...document.querySelectorAll('#viewbar .view')].find(button => button.textContent.trim().toLowerCase() === 'week');
    if (week && !week.classList.contains('active')) week.click();
    setTimeout(() => {
      qs('#todayBtn')?.click();
      qs('#stage')?.scrollTo?.({top:0, left:0, behavior:'smooth'});
    }, 0);
  }

  function ensureHomeTile(actions) {
    let home = qs('#callyHomeTile');
    if (!home) {
      home = document.createElement('button');
      home.id = 'callyHomeTile';
      home.type = 'button';
      home.className = 'btn callyHomeTile';
      home.textContent = 'C';
      home.title = 'Cally.One · Start';
      home.setAttribute('aria-label', 'Cally.One · Start');
      home.addEventListener('click', goHome);
    }
    const perspective = qs('#perspectiveBtn');
    if (home.parentElement !== actions) actions.insertBefore(home, perspective || actions.firstChild);
    else if (perspective && home.nextElementSibling !== perspective) actions.insertBefore(home, perspective);
    return home;
  }

  function ensureWordmark() {
    const brand = qs('.brand');
    const wordmark = qs('.brandText h1') || qs('.brand h1');
    if (!brand || !wordmark) return;

    const legacyMark = qs('.mark', brand);
    if (legacyMark) {
      legacyMark.classList.add('callyLegacyMark');
      legacyMark.setAttribute('aria-hidden', 'true');
    }

    if (wordmark.dataset.callyHomeWordmark !== '1') {
      wordmark.dataset.callyHomeWordmark = '1';
      wordmark.classList.add('callyWordmarkHome');
      wordmark.setAttribute('role', 'button');
      wordmark.setAttribute('tabindex', '0');
      wordmark.setAttribute('aria-label', 'Cally.One · Start');
      wordmark.title = 'Till Cally.One start';
      wordmark.addEventListener('click', goHome);
      wordmark.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          goHome();
        }
      });
    }

    qs('.brand small')?.setAttribute('hidden', '');
  }

  function ensureMenuAbout() {
    const menu = qs('#callyMobileMenu');
    if (!menu || qs('.callyMenuAbout', menu)) return;
    const about = document.createElement('section');
    about.className = 'callyMenuAbout';
    about.setAttribute('aria-label', 'Om Cally.One och licens');
    about.innerHTML = `
      <div class="callyMenuAboutEyebrow">OM CALLY.ONE</div>
      <div class="callyMenuAboutName">Cally.One</div>
      <div class="callyMenuAboutCredit">by Patrik Sundblom · Tribute License 1.0</div>
      <div class="callyMenuAboutLicense">Personal/family free · commercial/professional use €99/mo or €990/yr</div>`;
    menu.appendChild(about);
  }

  function refreshBrandHome() {
    ensureWordmark();
    const actions = qs('.topActions');
    if (actions) {
      ensureHomeTile(actions);
      ['callyHomeTile','perspectiveBtn','personBtn','eventBtn','callyMenuButton'].forEach(id => {
        const control = qs(`#${id}`);
        if (control && control.parentElement === actions) actions.appendChild(control);
      });
    }
    ensureMenuAbout();
  }

  window.addEventListener('cally-one-ui-refresh', refreshBrandHome);
  window.addEventListener('cally-demo-space-changed', refreshBrandHome);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refreshBrandHome, {once:true});
  else refreshBrandHome();
})();
