# TapeFly: design notes

## The idea

The site is a microscope. The page is the dark bench, and the dish is the bright thing under the lens. Everything else stays quiet so the dish can be the one memorable element.

## Colour

| Token | Hex | Use |
|---|---|---|
| `--bench` | `#06191E` | page background: deep sea-glass teal, not neutral black |
| `--slide` | `#0C252B` | raised surfaces |
| `--chalk` | `#E8F0EB` | text |
| `--fog` | `#8BA9A5` | secondary text |
| `--agar` | `#F2B64B` | brand, the live signal, the "explore" behaviour, primary buttons |
| `--yeast` | `#A3E36A` | food, approach, success |
| `--eye` | `#F0454F` | danger, avoid, failure; also the colour of a real fruit fly's eyes |
| `--frost` | `#86A7D6` | freeze |

Behaviours always use the same four colours, in the dish, in the circuit, in the builder and on the board.

## Type

- **Bricolage Grotesque** (variable; self-hosted) is the only text family. Headlines are set narrow (`font-stretch: 78%`) and heavy, so they look like specimen labels. Body text is set at normal width.
- **JetBrains Mono** is used only where the content really is machine text: bits, hashes, bytes and commands. It is not used for labels.
- Labels are in sentence case. There are no all-caps eyebrows and no middle-dot meta strings.

## Motion

- The dish is the product, so it moves all the time while a day is playing. Flies fly between cells, flutter while moving, fold their wings when they freeze, and leave fading trails.
  - A meal makes a green ripple.
  - A trap death makes a red flash and the fly tips over.
  - A Giant Fibre escape is a hop with a streak.
- The circuit lights up as a wavefront, gate depth by gate depth, each time the fly decides.
- Nothing fades in on scroll. `prefers-reduced-motion` stops autoplay and the wavefront; the dish still steps when you scrub.

## Layout

- Pages are left-aligned on a 1240 px column, with a 24 px gutter (16 px on phones).
- On the home page the hero is the dish on the left and the live story on the right: the headline, the standings and the next step.
- Below the hero, one strip shows the focused fly's mind: its senses, the 12-bit word, the circuit and its decision.
