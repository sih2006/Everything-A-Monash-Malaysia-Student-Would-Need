# UI and UX brief

**Status:** Draft, 16 November 2026, updated 18 November. It records what the owner asked for across the design sessions and what was built from it. The exact values are in [DESIGN.md](../../DESIGN.md).

This document answers: how should the app look, feel and sound, and why?

## What the owner asked for

In the owner's words, gathered from the sessions of 15 and 16 November 2026:

| The owner said | What it became |
|---|---|
| "I want the font big and easily readable" | 18 px body text; key numbers at 38 to 52 px |
| "the grades to be able to be hidden" | One "Hide grades" button that masks every mark, grade and target, and removes the forms that would show them |
| "A hero section required" | The home screen opens with a headline verdict in a large shaped block |
| "make it less AI slop looking" | A named look with its own fonts, colours and shapes, in place of navy and blue rounded rectangles |
| "use a font that looks a bit more interesting" | Gloock for headings (tall, with contrast), Figtree for body text |
| "use more than just single colour gradients, and maybe different from just black and blue" | Hibiscus red, jungle green, turquoise and mango; two multi-colour gradients |
| "I don't want just squares and rectangles, use interesting shapes" | Leaves, arches, petals, scalloped edges, an egg, a flower |
| "integrate a triangle in a more meaningful place" | The triangle means "look here": warnings, today, direction of travel |
| "I don't want AI generated images" | No pictures at all. Labelled empty spaces wait for the artist. |
| "a total map that shows how all the tasks I do lead to my final goal" | The Map screen: four paths, each ending in a goal |
| "make it interactable ... zoomable ... I want it to go to the right" | The map runs left to right, drags, zooms, and each stop can be picked |
| "add some animations to the movement" | Screens fade and rise in, bars and charts grow, the path draws itself |
| "I want the app to decide what good is ... that's what the penguin is for" | The app gives the verdict; the mascot's mood shows it |
| Chose "Tropical print" from three options, then asked to see the others | Four looks can be switched; none is final yet |
| "I liked it when it was vertical years and expanding on the right" (17 November) | The life tree: years down the left, each area branching right |
| "make hide money an option too" (18 November) | A Hide money switch next to Hide grades |
| "I want the other accounts to be hidden or in a tab form whenever I'm looking at one" (18 November) | Budget tabs: Overview, Banking, Investing, Expenses; one account at a time |
| "graph out my expenses in a sort of map ... without the rent and utilities" (18 November) | The spending map on the Expenses tab, with essential categories left out |

## The feel

- **Honest, not harsh.** The app tells the truth about a target that is out of reach, and in the same sentence says what is still reachable.
- **Calm.** One message area. No pop-ups. No badges with numbers. No streaks.
- **Yours.** The app never sets a goal for you. Where it suggests one, it says it is a default and where it came from.
- **Quick.** The most common task (a new mark) is three presses and two numbers.

## The mascots

| Area | Mascot | Mood shows |
|---|---|---|
| Grades | Penguin egg | How many units with a target are on course: happy, worried, distressed, or waiting when no target is set |
| Budget | Crab | Relaxed (on pace), stressed (ahead of pace), panicking (over), waiting (no limit) |
| Food | Joel the gym-bro | Pleased, wants more protein, proud (protein target reached), concerned (over), waiting |
| Health | None yet | The owner has not named one |

The mood is always written in words next to the art space, so it never depends on the picture.

**For the artist:** one picture per mood listed above, per mascot, on a transparent background, at least 512 px on the longer side. Also an app icon at 192 px and 512 px. The art spaces are a leaf shape about 96 px across beside each screen title, and an egg shape about 280 px across in the home screen's hero.

## Layout

- **Phone first.** Every screen is one column on a phone. Cards sit side by side only when there is room for them at full size.
- **Navigation:** a bottom bar on a phone, a side list on a laptop. Six items. Six is one more than the usual limit of five for a bottom bar; it fits at 390 px but is tight.
- **Each screen reads top to bottom as:** where you stand, then the verdict, then the detail, then the forms.
- **Forms are folded away** until wanted, so a screen is mostly reading. A form that the screen needs before it is useful (the first unit, the first category, the first target) starts open.

## Accessibility

Built in:

- Real buttons, links, labels and form fields throughout. Nothing pressable is a plain box.
- Every pressable thing is at least 48 px high.
- A "Skip to content" link, visible on keyboard focus.
- A visible focus ring in the highlight colour.
- Verdicts carry words and a shape, not only colour.
- Messages are announced to screen readers: errors at once, successes politely.
- Charts have a text description, and the numbers are also written on or beside the marks.
- The map can be moved with the arrow keys and zoomed with + and −, and each stop can be reached with the Tab key.
- Reduced motion is respected.
- The app's language is set to English (Malaysia).

Checked on 17 November 2026 on 42 pages, in all four looks and both modes: contrast, names, target sizes and a keyboard-only run ([accessibility.md](../proofs/accessibility.md)). The spending map's colours were also checked for colour blindness in light and dark.

Not yet checked:

- A full run with a real screen reader.
- Text at the largest system font size.

## What was tried and changed

| First version | Problem | Now |
|---|---|---|
| Navy and blue with rounded rectangles | The owner called it "AI slop looking" | The four looks |
| Fraunces as the heading font | A design checker flagged it as one of the most overused fonts in AI-made sites | Gloock |
| A warm sand page background | The same checker flagged cream backgrounds as a common AI look | A pale sea green |
| Placeholder mascot drawings | The owner does not want generated images | Labelled empty spaces |
| A diamond on warning tags | The owner asked for a triangle with a meaning | A warning triangle, and the same shape for "today" and for direction |
| A calorie ring | It was the only ring among bars | A bar, like the rest |
| A map that ran top to bottom | The owner wanted it to go to the right and to zoom | A path that runs left to right in a frame that drags and zooms |
| A life tree with the years in one horizontal line | The owner preferred years going down with branches to the right, and wanted past years to show all four areas | Years down the left, every year with its four areas |

## Open decisions for the owner

1. **Which look is final?** Keeping all four means loading four font families and keeping four sets of colours correct.
2. **The app's name.**
3. **A mascot for health**, or none.
4. **Is six items in the phone menu fine**, or should Map move into Home?
5. **The pale sea-green background.** The option the owner chose said "warm sand". It was changed after the design check. Say if sand should come back.
