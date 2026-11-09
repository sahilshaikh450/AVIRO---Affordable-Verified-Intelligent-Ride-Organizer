(function () {
  var el = document.getElementById('splash');
  var seen = false;
  try {
    seen = sessionStorage.getItem('aviro_splash') === '1';
    sessionStorage.setItem('aviro_splash', '1');
  } catch (e) {}
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (seen || still) {
    el.parentNode.removeChild(el);
    return;
  }
  var done = false;
  function hide() {
    if (done) return;
    done = true;
    el.className = 'out';
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 400);
  }
  el.addEventListener('click', hide);
  setTimeout(hide, 2600);
})();
