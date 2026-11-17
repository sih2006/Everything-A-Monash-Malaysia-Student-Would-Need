// Runs before anything is drawn. It reads the saved look and dark-mode choice
// and puts them on the page, so the first paint already has the right colours.
// It is a plain script (not a module) so the browser runs it straight away.
(function () {
  var theme = null, look = null;
  try {
    theme = localStorage.getItem('theme');
    look = localStorage.getItem('look');
  } catch (e) { /* storage is blocked: use the defaults */ }
  if (!theme) theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  if (['tropical', 'sticker', 'market', 'classic'].indexOf(look) < 0) look = 'tropical';
  if (look === 'market') theme = 'dark';      // the night market look is always dark
  document.documentElement.dataset.look = look;
  document.documentElement.dataset.theme = theme;
})();
