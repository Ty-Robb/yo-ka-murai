# YO-KA-MURAI

Samurai vs yokai. A mobile-first, top-down, real-time 1v1 pixel arena brawler set in feudal Japan.

**Play:** https://ty-robb.github.io/yo-ka-murai/

On iPad or phone: open the link in Safari/Chrome, then **Share → Add to Home Screen** to play it fullscreen like an app.

## Controls
| | Touch | Keyboard |
|---|---|---|
| Move / face | Left thumb (floating joystick) | WASD or arrows |
| M1-A | Right button 1 | J |
| M1-B | Right button 2 | K |
| SPECIAL | Big right button | L or Space |
| Pause | II button | Esc |

Holding an M1 button repeats it. Attacks snap toward an enemy within 30° of where you face.

## Modes
- **Duel vs AI:** best of 3 rounds against a bot (Easy / Normal / Hard).
- **Online duel:** coming soon.

## Roster
- **Itsube** (Warrior, Human, Tier B): a wandering samurai with a katana. Jab, Slash, and Guard (a perfect-parry window).

More fighters and arenas are being added.

## Tech
Plain HTML5 canvas + JavaScript, no build step. All fighter stats live in `js/data.js`. Pixel art is drawn in code in `js/art.js`.
Local testing: `node tools/serve.js 8795`, then open http://localhost:8795/.
