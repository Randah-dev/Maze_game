# Live web motion

Read this for interactive or continuously rendered output. These decisions are independent of the deterministic export requirements in [video-export.md](video-export.md).

## Pick the mechanism that fits

| Need | Usually suitable | Integration concern |
|---|---|---|
| Hover, focus, open/close feedback | CSS transitions or the current component animation system | Give keyboard and touch an equivalent state; interruption must not strand the component |
| Decorative repeating illustration | CSS animation, SVG, or the existing timeline library | Pause or reduce offscreen work; provide a calm reduced-motion version |
| Sequenced interaction or reversible timeline | Web Animations or an installed timeline library | Keep animation state separate from application truth; clean up on unmount |
| Scroll narrative or layered 2.5D | Existing scroll tools, CSS where supported, or measured scroll progress | Keep reading order and normal scrolling; recompute geometry when layout changes |
| Canvas or true 3D scene | The renderer's existing update/render loop | One loop owner; update visual parameters from elapsed time, not frames counted |

This table is a starting point, not a mandate to add dependencies. Verify support against the project's target browsers before using a newer feature.

## Time and lifecycle

- For `requestAnimationFrame`, use the supplied timestamp or an elapsed-time clock. Counting frames makes the same motion run at different speeds on different refresh rates. The browser commonly pauses callbacks in background tabs; decide whether the animation resumes, restarts, or seeks to elapsed time. See [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).
- In a game, pass `dt` or scene time into a visual update function owned by the game. Clamping an excessive frame delta can help decorative motion, but game simulation policy belongs to the game's existing loop.
- Cancel listeners, observers, animation handles, and timers when the component is removed. Handle resize, repeated entry, and rapid interaction rather than assuming the animation runs once.
- Do not run two systems against the same property. Separate wrappers if, for example, layout and a decorative transform need independent ownership.

## Motion and reading

Use movement to explain hierarchy, causality, or a state change. Choose consistent easing for related elements. A user action should receive immediate visual feedback even when a longer transition follows.

For Arabic, preserve joined glyphs: animate whole text elements or word wrappers unless a shaping-aware approach has been verified. Use the correct `lang` and `dir`; isolate URLs and mixed-direction fragments when needed. Preview real copy, including long words and numerals.

Check the composition at the actual small-screen size. A perspective transform or parallax effect should not reduce essential text to unreadable decoration. Keep focusable elements aligned with their visible position.

## Reduced motion

Honor `prefers-reduced-motion` for nonessential motion. Replace large zooms, parallax, camera travel, or repetitive movement with a calm state change or static composition; preserve the result and information. Apply the preference to JavaScript and canvas effects too, and react to preference changes where the app remains open. See [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion).

A user can still perform the task when motion is reduced, unavailable, or interrupted. If movement is essential to the experience, provide a suitable way to pause or control it rather than disabling the experience without explanation.

## Review in context

Run the main user path, keyboard navigation, touch behavior, repeated activation, resize, and reduced-motion mode. Inspect narrow and wide layouts. Observe a background-tab return if there is a live timeline. For a game scene, also test pause/restart and inspect motion while gameplay is active.

Primary documentation reviewed on 2026-11-16. Installed versions and target browsers remain the implementation reference.
