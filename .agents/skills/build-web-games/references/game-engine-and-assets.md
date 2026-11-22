# Browser game implementation and assets

Official sources reviewed **2026-11-16**. This is a practical decision guide, not a template that requires rebuilding the project. Read the section you need and match APIs to the dependency versions actually installed.

## State and game loop

Keep round state understandable outside rendering, e.g. `phase`, `player`, `objectives`, `score`, `activeElapsed`. Translate input events into actions, update state, then render. Use explicit transitions between `loading`, `ready`, `playing`, `paused`, `won`/`lost` and `error` as the game needs; not every game has losing or pausing.

For a simple game, `dt = Math.min(deltaSeconds, maxStep)` with per-second speeds is enough. For collision-sensitive games, use an accumulator with fixed steps and a maximum number of steps per frame. Decide how excess lag is dropped so the loop never enters endless catch-up. Rendering may interpolate between two states, but scoring and collision are resolved once, in update.

In raw Three.js, make `renderer.setAnimationLoop(callback)` the owner of the render loop. The current `Timer` API provides `update(timestamp)` then `getDelta()` in seconds; `connect(document)` handles the effect of page hiding on the delta. That doesn't define game policy: you still need to clear input and decide whether the clock keeps running. Don't replace an existing frame clock without reason, and check that `Timer` exists in the installed version. [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html), [Timer](https://threejs.org/docs/pages/Timer.html).

On `blur`, `visibilitychange` and `pointercancel`, clear the pressed-key set and joystick state. On return, reset the time baseline; never convert minutes away into player movement. Test repeated Restart: resetting state must not create a new renderer and listeners each time.

## Three.js: a playable scene

- Define world axes, unit of measure and camera before placing assets. Separate the player's visual mesh from a simpler collider, and keep ground and targets in the same frame of reference.
- 2.5D is a design choice: layered sprites or a 3D model with constrained movement. Don't call a CSS trick an interactive 3D world.
- Update aspect/projection and the drawing-buffer size when the container changes. Cap pixel ratio for the device and scene; HUD sharpness doesn't need to drop with 3D resolution.
- For inspectable objects, separate interaction range from the visual raycast, and avoid picking objects behind walls. Name targets in data rather than relying on mesh order.
- Watch draw calls, texture sizes, shadows and post effects. Try instancing for repeated objects, reuse geometry/materials, and offer a lighter quality level if the audience needs it. Don't merge all meshes if that breaks interaction or increases overdraw.
- Measure a representative path on a specific device and state resolution and quality. A smaller GLB alone doesn't prove faster rendering or less GPU memory.

## Loading GLB and materials

Import `GLTFLoader` from `three/addons/loaders/GLTFLoader.js` and use `loadAsync` with rejection handling, or the load/error callbacks. Add `gltf.scene` only after a successful load; animations are in `gltf.animations`. Make adding the scene and the loading-state transition a single operation that doesn't repeat after a retry. Configure a decoder only if the asset uses Draco, Meshopt or KTX2, and check its path in the build. [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html).

Before editing a model, check its bounding box, expected height, orientation, pivot and clip names. Put scale or offset corrections in a documented wrapper when needed; don't rotate the asset randomly until it looks right from one angle. Modeling tools and engines may disagree on the forward axis; test with an asymmetric shape or a short animation.

`GLTFLoader` reads glTF material settings; don't set `SRGBColorSpace` on every texture. Color images such as base color and emissive are sRGB; normal, roughness and metalness maps are non-color data. When attaching an external texture, set `colorSpace` by its use and check UV orientation. Keep a single output conversion to sRGB; in the official post-processing chain check where `OutputPass` sits instead of applying gamma twice. Never fix color errors by just adding light. [Color management](https://threejs.org/manual/pages/color-management.html).

Check transparency from both sides, alpha edges, reflections and shadows. For a flat card asset, choose deliberately between a lit material and an unlit one. Don't let a logo or small text become unreadable from texture compression or mipmaps without testing at the final distance.

## Blender → GLB when needed

Blender is optional. Check that it exists and its version before building a workflow around it. When using it:

1. Keep the `.blend` file or generation source and the source images. Prepare scale, origin and UVs for the model's use, and check the effect of applying transforms on a rig before applying them broadly.
2. Use exportable materials such as Principled BSDF or unlit. Don't expect every procedural node or Blender effect to reach the browser; bake results to images when needed.
3. Export GLB with the needed components. Converting to +Y up is a glTF export option; don't add a second rotation without previewing. Review skinning, clips and materials after export. [Blender glTF manual](https://docs.blender.org/manual/en/5.2/addons/scene_gltf2.html).
4. Blender can run headless with `--background` and `--python` for a local script. Argument order matters: load the source file before running the export script. Use `--python-exit-code` so Python failures appear in the exit status. [Command-line arguments](https://docs.blender.org/manual/en/5.2/advanced/command_line/arguments.html).
5. The export API is `bpy.ops.export_scene.gltf`; match `filepath`, `export_format='GLB'` and embedding options to the installed version. Check the effect of `export_apply` on shape keys before using it. [Export Scene Operators](https://docs.blender.org/api/5.2/bpy.ops.export_scene.html).

Never auto-run a script embedded in an incoming `.blend` file just because Blender can. After export, review the GLB in the browser inside the project: orientation, scale, materials, lighting, animation and collision. Don't infer a match from a Blender render alone. If Blender can't run, deliver the source and state exactly which export or preview is unverified.

## Resource ownership and cleanup

Remove listeners and stop timers and audio clips owned by a level when leaving it. Removing a mesh from the scene doesn't free its resources. Geometry, materials, textures and render targets need `dispose()`; disposing a material doesn't dispose shared textures. Free an asset when its last user is done, and don't dispose a cache another level uses. App-owned `ImageBitmap`s need `close()` to release CPU memory. [Disposing Three.js objects](https://threejs.org/manual/pages/how-to-dispose-of-objects.html).

On replay, prefer resetting state and reusing static resources. Check memory growth over several rounds; don't treat every remaining value in `renderer.info.memory` as a leak, since the engine keeps some reusable internal resources.

## Assets exchanged with other skills

Use the manifest and token schemas in [shared-conventions.md](shared-conventions.md). Game-specific notes:

- 3D assets use `dimensions.unit: "m"` with measured bounding-box `width`/`height`/`depth`, and usually `colorSpace: "per-texture-glTF"`. That value describes a per-texture policy; it doesn't mean forcing one color space on the GLB.
- Add `animations` (clip names) and alpha type when they affect the consumer.
- Tokens never duplicate game state. `build-web-games` owns logic decisions; motion scenes and posters are consumed as inputs or rendered outputs.

## Quick acceptance pass by game scope

Start from a cold load, try a missing asset, then the happy path, error, result and replay. Resize the window and hide/restore the tab during movement. On touch, test lifting a finger outside the element and `pointercancel`. In 3D, approach walls, edges and targets and view them from several directions. State browser, device and resolution in the result; a passing build or device emulation doesn't prove performance on that device.
