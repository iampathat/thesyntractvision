/* Cally.One calendar navigation hotfix — Today keeps the active view and reveals today inside it. */
(() => {
  if (window.__callyCalendarLayoutHotfix) return;
  window.__callyCalendarLayoutHotfix = true;

  function focusTodayInCurrentProjection() {
    const stage = document.querySelector('#stage');
    if (!stage) return;

    const yearToday = stage.querySelector('.miniDay.today');
    if (yearToday) {
      const month = yearToday.closest('.miniMonth');
      if (month) {
        stage.scrollTo({
          top: Math.max(0, month.offsetTop - Math.max(8, stage.clientHeight * 0.08)),
          left: stage.scrollLeft,
          behavior: 'smooth'
        });
      }
      return;
    }

    const monthToday = stage.querySelector('.dayCell.today');
    if (monthToday) {
      stage.scrollTo({
        top: Math.max(0, monthToday.offsetTop - Math.max(8, stage.clientHeight * 0.08)),
        left: stage.scrollLeft,
        behavior: 'smooth'
      });
      return;
    }

    const nowLine = stage.querySelector('.nowline');
    if (nowLine) {
      stage.scrollTo({
        top: Math.max(0, nowLine.offsetTop - stage.clientHeight * 0.35),
        left: stage.scrollLeft,
        behavior: 'smooth'
      });
    }
  }

  function wireTodayFocus() {
    const today = document.querySelector('#todayBtn');
    if (!today || today.dataset.callyTodayFocus === '1') return;
    today.dataset.callyTodayFocus = '1';
    today.addEventListener('click', () => setTimeout(focusTodayInCurrentProjection, 0));
  }

  window.addEventListener('cally-one-ui-refresh', wireTodayFocus);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireTodayFocus, {once:true});
  } else {
    wireTodayFocus();
  }
})();
