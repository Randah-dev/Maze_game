---
name: create-web-motion
description: Design and implement motion where the movement itself is the deliverable — UI transitions, microinteractions, scroll-driven narratives, animated illustrations, scene animation, and HTML/Canvas/WebGL compositions exported to video or image sequences. Not for gameplay logic (build-web-games), page structure (build-interactive-web), or editing existing camera footage.
---

# Create web motion

Turn the visual idea into motion with a clear purpose, deliberate timing and an editable source. Work with the project's language, art direction, framework and assets; no particular library, duration or aesthetic is required.

## Choose the output first

- **Live web motion** — interaction, scroll, microinteraction, looping illustration, or a scene inside an app. Read [live-web.md](references/live-web.md).
- **Rendered media** — a timeline exported as video or frames. Read [video-export.md](references/video-export.md).
- **Both** — share composition and assets, but give export its own controllable clock. A web preview never proves the encoded video is correct.

Inspect existing code and dependencies first and keep a working animation system that fits. CSS transitions/animations, the Web Animations API and JS timeline libraries are all valid. Use a 3D renderer only when the idea needs real geometry, lighting or a camera; layered 2D depth doesn't.

## Shape the motion

1. Extract audience, message or interaction, output size, trigger and intended feeling. Ask only about gaps that block a first version; state other assumptions.
2. For a sequence, list beats with time windows, visible text and movement. For an interaction, define trigger, start state, response, interruption and end state.
3. Reuse the project's colors, fonts, spacing and assets. Keep content and motion parameters separate so copy can change without rebuilding the animation.
4. Build the simplest complete version. Check readability and feedback before adding decoration. Hierarchy: primary event, supporting motion, then time to read or act.
5. Preview real transitions at the target size and revise from what you see, not from the code.

## Ownership

- `build-interactive-web` owns page structure, app state, layout and navigation. Add motion without hiding content or breaking focus and input.
- `build-web-games` owns gameplay state and the update/render loop. Supply animation functions, clips or assets for that loop. Never start a competing loop or reset game state to play a flourish.
- `design-posters` owns the editable still. Animate a derivative that keeps its typography and identity, and return a still when requested.

These are optional companions. Never overwrite a poster, model or unrelated config; edit only the animation or derivative you own. For exchanged assets, use the manifest schema in [shared-conventions.md](references/shared-conventions.md) and fill in `durationSeconds`, `fps` and `alpha` with measured values.

## Quality checks

- Text is readable during a stable interval, not just present for a few transition frames. Arabic stays joined: animate whole words or lines, never individual letters. Check RTL and mixed-direction strings at final size.
- Live motion keeps keyboard and touch working, survives interruption, and has a reduced-motion version. Decorative motion never carries the only copy of essential information.
- 3D animation is checked in its consuming scene with that camera and lighting. A poster animated in a game stays legible at viewing distance.
- Export mode supports repeated and backward seeks, waits for assets, and has no free-running animation. Inspect the encoded file: start, transitions, end, dimensions, duration.

Deliver the source and outputs, a short explanation of the motion, and checks performed (built / previewed / exported / not verified). If a browser, encoder or font is missing, deliver the editable source and the exact remaining step. Producing local files never implies authorization to publish.
