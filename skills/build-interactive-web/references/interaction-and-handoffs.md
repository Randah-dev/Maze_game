# Interaction and integration

Read when a page embeds a game, graphic or motion module, or when transitions between them misbehave. Ownership, the manifest schema and the token schema are in [shared-conventions.md](shared-conventions.md). These are adaptable patterns, not a required architecture.

## Lifecycle

- Mount a module into a container the page owns. The module returns a cleanup function, or uses the framework's unmount hook.
- On cleanup, remove listeners, observers, timers, `requestAnimationFrame` handles, render loops and GPU resources. Re-entering a view must not create a second loop or duplicate listeners.
- One completion event can drive several reactions (open a summary, play an outro), but the win condition is stored only once, in the game.
- In React or another framework, use its effects/lifecycle instead of a hand-rolled mount API.

## Asset paths and sizes

- A filesystem path is not a browser URL. Check the served path (e.g. Vite's `public/` vs imported assets) and update references when an export is renamed.
- CSS display size, exported pixel size and a 3D mesh's world size are separate. Preserve aspect ratio at all three.

## Acceptance checks

- Touch and keyboard trigger the same meaningful action as a mouse.
- A loading failure shows a readable message and a retry.
- Leaving and returning to a module doesn't duplicate loops, listeners or audio.
- Long Arabic text stays readable; mixed Latin and numbers are isolated with `<bdi>` or `dir`.
- Reduced motion removes nonessential travel and parallax but keeps state feedback.
- A local build passing is reported separately from deployment and live verification.

## Primary references

Reviewed 2026-11-16. Check the installed package version before applying API details.

- [Vite guide](https://vite.dev/guide/)
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
