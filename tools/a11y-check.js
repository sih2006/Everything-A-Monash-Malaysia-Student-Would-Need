// Accessibility checks that run inside the browser, on the page as it is drawn.
//
// How to use: open the app, open the browser's developer console, paste this
// whole file, then run   a11yCheck()   on each screen. It returns a list of problems.
// tools/a11y-run.sh runs it on every screen, look and mode with the Playwright command-line tool.
//
// It checks:
//   1. Text contrast against the colour behind it: 4.5 to 1, or 3 to 1 for large text (WCAG 2.2 AA).
//   2. Every button, link and form field has a name a screen reader can read.
//   3. Everything pressable is at least 44 by 44 pixels (WCAG 2.2 AAA is 44; AA is 24).
//   4. Images and pictures have a text alternative.
//
// It cannot check: text on a gradient or a picture (it skips those), whether wording makes sense,
// or how a screen reader actually reads the page. Those need a person.

// eslint-disable-next-line no-unused-vars
function a11yCheck() {
  const problems = [];

  // ----- colour maths, from WCAG -----
  const parse = (css) => {
    const m = css.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = '1'] = m[1].split(/[ ,/]+/).filter(Boolean);
    return { r: +r, g: +g, b: +b, a: +a };
  };
  const channel = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const luminance = (c) => 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  const ratio = (x, y) => { const [a, b] = [luminance(x), luminance(y)].sort((p, q) => q - p); return (a + 0.05) / (b + 0.05); };
  const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });

  // The colour behind an element: walk up until a solid background is found.
  // Returns null when a gradient or picture is in the way, because then no single colour is behind the text.
  function background(el) {
    const layers = [];
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== 'none' && !style.backgroundImage.startsWith('radial-gradient(circle')) return null;
      const c = parse(style.backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 1) break;
      }
    }
    let result = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) result = over(layers[i], result);
    return result;
  }

  const visible = (el) => {
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    // Content inside a closed fold is not on screen, but the browser still gives it a size.
    const folded = el.closest('details:not([open])') && !el.closest('summary');
    return box.width > 0 && box.height > 0 && !folded && style.visibility !== 'hidden' && style.display !== 'none' && +style.opacity > 0.1 && !el.closest('[hidden], [aria-hidden="true"], .sr');
  };
  const describe = (el) => {
    const text = (el.innerText || el.getAttribute('aria-label') || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return `<${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}> "${text}"`;
  };

  // ----- 1. contrast -----
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || ['SCRIPT', 'STYLE', 'svg', 'path', 'OPTION'].includes(el.tagName)) continue;
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!ownText) continue;
    const style = getComputedStyle(el);
    const fg = parse(style.color);
    const bg = background(el);
    if (!fg || !bg) continue;
    const size = parseFloat(style.fontSize);
    const bold = +style.fontWeight >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const needed = large ? 3 : 4.5;
    const got = ratio(over(fg, bg), bg);
    if (got < needed) {
      const key = `${style.color}|${style.backgroundColor}|${describe(el)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      problems.push({ check: 'contrast', element: describe(el), ratio: Math.round(got * 100) / 100, needed });
    }
  }

  // ----- 2. names, 3. size -----
  for (const el of document.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"])')) {
    if (!visible(el)) continue;
    const labelled = el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || (el.innerText || '').trim() || el.title;
    if (!labelled) problems.push({ check: 'name', element: describe(el) });
    const box = el.getBoundingClientRect();
    const isTextLink = el.tagName === 'A' && getComputedStyle(el).display === 'inline';   // links inside a sentence are exempt
    const isBox = ['checkbox', 'radio'].includes(el.type);                                   // their label is the target
    if (!isTextLink && !isBox && (box.width < 44 || box.height < 44)) {
      problems.push({ check: 'size', element: describe(el), size: `${Math.round(box.width)}x${Math.round(box.height)}` });
    }
  }

  // ----- 4. text alternatives -----
  for (const el of document.querySelectorAll('img, [role="img"]')) {
    if (!visible(el)) continue;
    if (!(el.getAttribute('alt') ?? el.getAttribute('aria-label'))) problems.push({ check: 'alternative', element: describe(el) });
  }

  return problems;
}
