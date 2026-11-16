# DESIGN.md

The design system of the app, as built. This is the source of truth for anyone, person or AI agent, who changes how the app looks. The reasons behind it are in [docs/02-design/ui-ux-brief.md](docs/02-design/ui-ux-brief.md).

**Status:** Draft. The owner chose the "tropical print" look in a session on 16 November 2026 and has not yet said which of the four looks is final.

## Rules that never bend

1. **No generated or drawn images.** Mascot art and icons come from the owner's artist. Until then, a labelled empty space stands in. Small line icons in the interface are fine.
2. **Body text is at least 18 px.** Key numbers are much larger.
3. **Meaning is never colour alone.** A verdict always has words, and a shape: a leaf for good, a triangle for "needs attention".
4. **The triangle means "look here".** It is used for three things only: a warning tag, the marker for today on a progress bar, and the direction of travel on the map.
5. **Every colour comes from a token.** No colour value is written inside a component.
6. **Everything works at 390 px wide** with no sideways scrolling.
7. **Movement has a purpose** and stops when the device asks for reduced motion.
8. **Text contrast is at least 4.5 to 1.**

## Tokens

All tokens are CSS variables in [web/css/styles.css](web/css/styles.css). A look changes tokens, not components.

### Colour (the default look, light mode)

| Token | Value | Used for |
|---|---|---|
| `--bg` | `#E1F0EA` | The page |
| `--surface` | `#F8FCFA` | Cards, the menu |
| `--ink` | `#14312A` | Text |
| `--muted` | `#4A6058` | Secondary text |
| `--line` | `#BFD8CE` | Borders, dividers |
| `--track` | `#CFE3DB` | The empty part of a bar |
| `--action` | `#C2203D` | The main button |
| `--accent` | `#17694C` | Links |
| `--jungle` | `#17694C` | The chosen menu item, finished stops on the map |
| `--mango` | `#F2A31B` | Focus ring, selection, highlights |
| `--mark` | `#0090A0` | Chart marks: normal |
| `--mark-warn` | `#C8243F` | Chart marks: needs attention |
| `--good-bg` / `--good-fg` | `#B5E3DC` / `#0B4F4A` | "Good" tags and banners |
| `--warn-bg` / `--warn-fg` | `#FAD3D3` / `#8E1730` | "Needs attention" tags and banners |
| `--tint-grades`, `-budget`, `-food`, `-health`, `-map` | soft turquoise, pink, green, mango, lilac | The background of each area's cards |
| `--sunset`, `--lagoon` | multi-colour gradients | The hero shapes, the "you are here" ring, the goal flower |

Dark mode sets the same tokens to darker values under `[data-theme="dark"]`. The two chart colours were checked with a colour-blindness validator in both modes.

### Type

| Token | Value | Used for |
|---|---|---|
| `--display` | Gloock | Headings and large numbers. It has one weight, so it is never faked bold. |
| `--body` | Figtree, 400 / 600 / 700 | Everything else |

| Role | Size |
|---|---|
| Page base | 18 px (`html { font-size: 112.5% }`) |
| Hero headline | 2.3 to 3.9 rem, by screen width |
| Page title | 2.3 to 3.2 rem |
| Large number (`.big`) | 2.1 to 2.9 rem |
| Section heading | 1.4 rem |
| Small labels | never below 0.78 rem (14 px) |

### Space, shape and time

| Token | Value |
|---|---|
| `--s1` to `--s7` | 4, 8, 12, 16, 24, 32, 48 px |
| `--leaf`, `--leaf-flip` | `40px 10px 40px 10px` and its mirror: the corner shape of cards |
| `--tap` | 48 px: the smallest height of anything pressable |
| `--fast`, `--slow` | 140 ms, 320 ms |
| `--ease` | `cubic-bezier(0.16, 1, 0.3, 1)` |

## Shapes and what they are for

| Shape | Where | Why |
|---|---|---|
| Leaf (two round and two sharp corners) | Cards, the chosen menu item, mascot spaces | The base shape of the look |
| Arch | Number tiles | A window onto one number |
| Four petals meeting in the middle | The four area cards on the home screen | Four areas, one student |
| Scalloped bottom edge | The hero and banners | Marks a statement, as opposed to a container |
| Egg | The hero's art space | It is the penguin egg's place |
| Flower | The goal on a map | The end of a path |
| Circle | Stops on a map | Filled = finished, dashed = still ahead |
| Triangle | Warning tags, the today marker, map direction | "Look here" |

## Components

Each is a small function in [web/js/views/parts.js](web/js/views/parts.js) or a class in the CSS.

| Component | Class or function | Notes |
|---|---|---|
| Tag | `chip({ text, tone })` | `tone` is `good`, `warn` or empty. Always carries words. |
| Progress bar | `bar(percent, tone, todayAt)` | 14 px high. `todayAt` adds the triangle. |
| Card | `.card` | Leaf corners. Alternating direction in a grid. |
| Number tile | `.grid.stats > .card` | An arch with a label, a large number and a note. |
| Banner | `.banner.good`, `.banner.warn` | A verdict in a sentence. Scalloped. |
| Button | `.btn.primary`, `.btn.quiet`, `.btn.danger` | Pill shape, at least 48 px high. One primary button per form. |
| Text button | `.link`, `.link.danger` | For small actions such as "Remove". |
| Field | `field(label, name, attrs, hint)` | The label wraps the input. Hints say what an empty box means. |
| Folded section | `fold(key, summary, body, open)` | Hides a form until wanted. Stays open across a redraw. |
| Empty state | `emptyCard(title, text, extra)` | Says what the screen is for and what to do first. |
| Art space | `artSpace(name, large)` | A dashed, labelled space for mascot art. |
| Message bar | `#status` | One place for "it worked" and "this went wrong". |
| Column chart | `columns(rows, max, target, format, tip)` | One column per day, a dashed target line. |
| Line chart | `trendChart(points, goal, format)` | Values labelled on the points, a dashed goal line. |
| Map stop | `.pin`, `.pin.done`, `.pin.now`, `.pin.goal` | See the map in `web/js/views/mapView.js`. |

## Words

- Write for someone reading quickly on a phone: short sentences, common words.
- Say what happened and what to do: "The mark must be between 0 and the marks available."
- Buttons name the action: "Save mark", "Add unit". Never "OK" or "Submit".
- Verdicts are plain and never scold: "On course." "HD is out of reach. The highest grade you can still get is D."
- Numbers: money as `RM 1,084.50`; percentages with one decimal; GPA and CGPA with two; WAM with one.
- Always name the scale: "CGPA, Malaysia scale" and "GPA, standard scale".

## The four looks

The app can switch between four looks. Each one sets the tokens and a few shapes in [web/css/looks.css](web/css/looks.css). The layout and components are shared.

| Look | Colours | Fonts | Shapes | Modes |
|---|---|---|---|---|
| **Tropical print** (default) | Hibiscus red, jungle green, turquoise, mango, pale sea-green ground | Gloock, Figtree | Leaves, arches, petals, scallops | Light and dark |
| **Sticker book** | Plum, violet, peach, mint, yellow, lilac ground | Bricolage Grotesque, Figtree | Blobs and tilted ovals | Light and dark |
| **Night market** | Deep teal, neon pink, mango, lime | Big Shoulders Display, Barlow | Tickets with notches, arches, sign-style tags, capitals | Dark only |
| **Classic** | Navy and blue | Atkinson Hyperlegible | Plain rounded corners | Light and dark |

**Open decision:** which one is final. Once chosen, the others should be removed, with their fonts.

## Adding or changing something

1. Use an existing token. If none fits, add a token; do not write a raw value in a component.
2. Use an existing component. If none fits, add it to `parts.js` and list it here.
3. Check it in light and dark, at 390 px and at laptop width.
4. If it shows a verdict, give it words and a shape, not only a colour.
5. If it moves, check it with reduced motion turned on.
