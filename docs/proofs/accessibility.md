# Accessibility check

**Date:** 17 November 2026. **Browser:** Chromium, at 1360 × 900, through the Playwright command-line tool. **Data:** the example data, in demo mode.

## What was checked, and how

| Check | Standard | How |
|---|---|---|
| Text contrast | WCAG 2.2 AA: 4.5 to 1, or 3 to 1 for large text | [tools/a11y-check.js](../../tools/a11y-check.js) measures every visible piece of text against the solid colour behind it |
| Every control has a name | WCAG 2.2 A (4.1.2) | The same script: every button, link, field and fold needs a label or text |
| Size of pressable things | 44 × 44 px (stricter than the AA minimum of 24) | The same script |
| Pictures have a text alternative | WCAG 2.2 A (1.1.1) | The same script |
| Keyboard only | WCAG 2.2 A (2.1.1, 2.4.3, 2.4.7) | Pressing Tab, Enter and the arrow keys, and reading where focus lands and whether a ring shows |

**The checker was tested first.** Three problems were planted on the Grades screen: pale grey text, a 20 px button with no name, and a picture with no alternative. It reported the first two. The picture had no size, so it was correctly ignored as not on screen.

## Results: the automatic checks

Six screens × seven look-and-mode pairs = 42 pages.

| Look | Light | Dark |
|---|---|---|
| Tropical print | 6 screens, 0 problems | 6 screens, 0 problems |
| Sticker book | 6 screens, 0 problems | 6 screens, 0 problems |
| Night market | (always dark) | 6 screens, 0 problems |
| Classic | 6 screens, 0 problems | 6 screens, 0 problems |

The first run reported one problem, the "Delete everything" button. It was inside a closed fold, so not really on screen. The checker was changed to skip closed folds.

## Results: keyboard only

| Found | Fixed |
|---|---|
| On first load, focus jumped into the main content, so Tab skipped "Skip to content" and the menu | Focus now moves only when the user changes screens. On first load, the first Tab reaches "Skip to content", then the menu. |
| A home card was read as "Needs attention Grades 2 of 4 ...", with the tag first | Each card has a spoken name: "Grades: 2 of 4, units on course for their targets. Needs attention." |
| A map stop was read as "3.46 S1 2026", with the number first | Each stop has a spoken name: "S1 2026, finished", "S1 2027, you are here", "Graduation, your goal". |

Working as intended:

- Every focusable control shows a visible focus ring.
- The map moves with the arrow keys (two presses moved it 180 px), and Tab then Enter opens a stop's details.
- Folds open with Enter or Space, because they are real `<details>` elements.

## Not checked

These need a person or a tool that is not installed:

- **A real screen reader** (NVDA on Windows, TalkBack on Android). The names above were read from the page, not heard.
- **Text on gradients.** The hero headline and the "you are here" and goal pins sit on colour gradients. The checker skips them because no single colour is behind the text. By eye, the hero text is white or cream on a dark green or deep colour and reads clearly; the pins use a cream centre behind their text for this reason.
- **The largest system text size** and 200% browser zoom.
- **Reduced motion** was set up in the CSS but not switched on in the browser for this check.
- **Touch** on a real phone.
