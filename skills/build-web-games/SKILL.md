---
name: build-web-games
description: Build or improve playable browser games in 2D, 2.5D or 3D — game state, rules, controls, game loop, Three.js scenes and optional Blender-to-GLB assets. Use when the result has gameplay (a goal, rules, or win/lose/score). Not for ordinary websites (build-interactive-web), standalone animation or video (create-web-motion), or static art (design-posters).
---

# Build web games

Turn the idea into a game that can be played, understood and replayed. Keep the genre the user asked for, and start with the smallest version that proves the fun before expanding the world or polish.

## Understand the project and pick a path

1. Inspect files, local instructions and dependencies before scaffolding. Keep existing paths and build tools.
2. Extract: the player's core action, the goal, win/lose conditions, perspective, target devices, and identity/branding if supplied.
3. If a detail is missing but doesn't block work, state a practical assumption and proceed. Ask only about ambiguity that changes the core of the game.
4. Choose the simplest technology that delivers the experience. Don't add an engine or Blender just because it's available.

| Path | Fits | Practical start |
|---|---|---|
| 2D | Puzzles, cards, arcade, flat tracks | DOM/CSS, Canvas, or a 2D engine already in the project |
| 2.5D | Isometric view or visual depth with constrained movement | Layered sprites, or a 3D scene with a fixed camera — name the choice explicitly |
| 3D | Free movement, depth, occlusion, real spatial interaction | Three.js or the existing 3D stack; React Three Fiber if the project uses it |

Read [game-engine-and-assets.md](references/game-engine-and-assets.md) when working on timing, Three.js, GLB or Blender. Don't impose its techniques on a simple DOM game.

## A fully playable first version

- Build a clear cycle: load → short instructions → play → result → replay. Add pause when the experience needs it.
- Build one satisfying core action with clear feedback before adding levels or many tasks.
- Separate rules and data from rendering: input produces player intent, update changes state, render displays it.
- Keep a single source of truth for round state. A DOM element disappearing or an animation ending must never be the only evidence that a goal was achieved.
- Define exactly what Restart resets: time, score, objectives, enemies, timers, input. Keep preferences (mute, settings) only if intended.
- Handle loading and failure with a message and an action. Never show a fake progress percentage when the total isn't known.
- Don't add login, a server, leaderboards or public deployment unless the task requires them.

## Timing, motion and input

- Express speeds in units per second. Use a clamped delta time, or a fixed timestep with a catch-up limit when collisions must be stable.
- Use the existing frame loop. In raw Three.js use `renderer.setAnimationLoop`; never add a second loop inside a framework that already drives rendering.
- On page hide or blur: clear stuck inputs, apply the declared pause policy, and prevent a time jump on return.
- Separate active play time from wall-clock time; choose explicitly for timed puzzles.
- Support the keyboard without hijacking text fields. If using WASD positions, use `KeyboardEvent.code` so it works on Arabic and other layouts.
- On touch devices: large buttons, correct coordinates inside the Canvas, and handle `pointerup`, `pointercancel` and lost pointer capture.
- Test lifting a finger outside the button, multi-touch and orientation change. Touch emulation is not proof of performance on a real device.
- Make instructions, results and menus keyboard-accessible where possible. Add mute and reduced motion when the game uses sound or heavy motion.
- Start audio only after a user gesture, and keep the mute setting across restarts.

## Assets and look

- Use only the identity the user supplied; don't assume a brand or story.
- Start with simple placeholder shapes when assets are missing. Never claim a missing model or image was included.
- Keep the editable source separate from exports. Use GLB for 3D assets where it fits, but never replace the source with it.
- Check model scale, axes, pivot, materials, transparency and lighting in the browser itself.
- A successful Blender export does not prove the asset looks right in the game. Review rendering and interaction after integrating the GLB.
- If Blender is needed, detect its installation and version first. Use headless mode for generation or export only if it's available and the commands match its version.
- If Blender isn't available, finish with Three.js primitives or available assets when that satisfies the request, and state what still depends on it.

## Working with other skills

This skill owns game state, the game loop and win/lose rules. Other skills are optional; use them only if installed and needed, otherwise do the work directly:

- `design-posters`: backgrounds, cards, posters, static UI images.
- `create-web-motion`: intros, transitions, end sequences. It receives game state and never runs a competing loop.
- `build-interactive-web`: site shell, menus, explanation pages, responsive layout.

When assets are exchanged, follow the project's existing conventions or the manifest and token schemas in [shared-conventions.md](references/shared-conventions.md). Don't move existing files to fit them.

## Verify and deliver

1. Run the game the usual local way and check browser console errors and missing asset requests.
2. Play the full cycle: start, core action, result, replay; then the failure or lose path if any.
3. Test tab hide/return, resize, and rapid or simultaneous input. Confirm Restart doesn't duplicate listeners or loops.
4. Test the sizes and devices actually requested; state what was emulated and what wasn't tested.
5. Review text, contrast, hit targets, occlusion, camera and collision from the player's point of view.
6. In 3D, measure performance in a representative scene before optimizing; reduce draw or asset cost based on measurements. Never promise 60 FPS without measuring.
7. Run the project's build and tests if it has them. A passing build is not a substitute for playing.

Deliver the run command, editable files, controls, what was tested (built / previewed / not verified) and verification limits. Attach a screenshot or recording when available and useful.
