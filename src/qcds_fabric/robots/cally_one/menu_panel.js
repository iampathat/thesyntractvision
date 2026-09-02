/* Cally.One mobile menu panel — compact product navigation, no inference. */
(() => {
  if (window.__callyMenuPanelPolish) return;
  window.__callyMenuPanelPolish = true;

  function polishMenu() {
    const menu = document.querySelector('#callyMobileMenu');
    if (!menu || menu.dataset.callyPanel === '1') return;
    menu.dataset.callyPanel = '1';
    menu.setAttribute('aria-label', 'Cally.One meny');
    menu.innerHTML = `
      <div class="callyMenuPanelHead">
        <div><span class="callyMenuEyebrow">CALLY.ONE</span><strong>Meny</strong><small>Kalender, tillstånd och projektioner</small></div>
      </div>
      <button class="callyMenuPrimary" data-nav="add-person" type="button">
        <span class="callyMenuGlyph">+</span><span><b>Ny person</b><small>Lägg till en person i Calendar Space</small></span><span class="callyMenuArrow">›</span>
      </button>
      <section class="callyMenuSection">
        <h3>KALENDER</h3>
        <div class="callyMenuGrid">
          <button class="callyMenuTile" data-nav="space" type="button"><span class="callyMenuGlyph">C</span><span><b>Calendar Space</b><small>Alla tillstånd</small></span></button>
          <button class="callyMenuTile" data-nav="perspective" type="button"><span class="callyMenuGlyph">P</span><span><b>Perspektiv</b><small>Projicera kalendern</small></span></button>
          <button class="callyMenuTile" data-nav="dimensions" type="button"><span class="callyMenuGlyph">D</span><span><b>Dimensioner</b><small>Logiska axlar</small></span></button>
          <button class="callyMenuTile" data-cally-display-settings="1" type="button"><span class="callyMenuGlyph">T</span><span><b>Kalender & tid</b><small>Tidszon och tideräkning</small></span></button>
        </div>
      </section>
      <section class="callyMenuSection">
        <h3>TILLSTÅND</h3>
        <div class="callyMenuGrid">
          <button class="callyMenuTile" data-nav="people" type="button"><span class="callyMenuGlyph">P</span><span><b>Personer</b><small>Familj och deltagare</small></span></button>
          <button class="callyMenuTile" data-nav="organizations" type="button"><span class="callyMenuGlyph">O</span><span><b>Organisationer</b><small>Grupper och verksamheter</small></span></button>
          <button class="callyMenuTile" data-nav="resources" type="button"><span class="callyMenuGlyph">R</span><span><b>Resurser</b><small>Rum, bil och annat</small></span></button>
          <button class="callyMenuTile" data-nav="things" type="button"><span class="callyMenuGlyph">S</span><span><b>Saker / krav</b><small>Badkläder, matsäck, behov</small></span></button>
        </div>
      </section>`;
  }

  function closeAfterSettings(event) {
    if (!event.target.closest?.('[data-cally-display-settings]')) return;
    const menu = document.querySelector('#callyMobileMenu');
    const button = document.querySelector('#callyMenuButton');
    if (menu) menu.hidden = true;
    if (button) button.setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('click', closeAfterSettings);
  window.addEventListener('cally-one-ui-refresh', polishMenu);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', polishMenu, {once:true});
  else polishMenu();
})();
