# Web composition to rendered video

Read this when the deliverable is a video or an exact image sequence. These export constraints don't ban normal CSS animation on live websites.

## Define an export contract

Set the composition's dimensions, duration, frame rate, background/alpha behavior and delivery format. Re-lay out for each aspect ratio instead of stretching one frame. Keep an editable composition source, and use the same design tokens as the website or poster when they share an identity.

Add an explicit capture mode (e.g. `?capture=1`) that stops real-time playback and exposes:

- `window.captureReady` — a Promise that resolves after the real fonts, images, textures and other required assets load, and rejects on failure.
- `window.renderAt(t)` — `t` in seconds; may be async, and capture must await it.
- A documented duration, background and dimensions.

For fixed inputs, the same `t` must produce the same image regardless of call order. Set all visible state on every call, including hiding elements outside their scene. Never accumulate motion by adding deltas per call. Seed any randomness. Wall-clock time, unseeded randomness and free-running loops must never decide a captured frame.

CSS/Web Animations are allowed only if paused and explicitly seeked by the export clock (`animation.currentTime = t * 1000`). Playwright's `animations: "disabled"` screenshot option is not timeline control: it jumps finite animations to their end and resets infinite ones. [Playwright screenshot options](https://playwright.dev/docs/api/class-page#page-screenshot).

For 3D, seek the visual timeline and explicitly call `renderer.render(scene, camera)` before capture. Simulation-driven scenes need a reproducible reset-and-step strategy or a prepared visual timeline. If the task is recording real gameplay, use a screen-recording workflow and call it that, not deterministic export.

## Story and capture preparation

Write compact beats: time window, message, movement, transition. Fit reading time to the actual copy and audience. Review frame zero, each scene's stable moment, transition boundaries and the final encoded frame. A blank or abrupt ending must be intentional.

Use available, permitted font and image files. Await `document.fonts.ready`, check the expected faces with `document.fonts.check()`, and await image decoding. A resolved font promise doesn't prove the intended face loaded; inspect rendered glyphs, especially Arabic. Include CSS backgrounds, GPU textures and custom loaders in `captureReady`. [MDN FontFaceSet.ready](https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/ready), [MDN image decode](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode).

Set viewport and device scale factor deliberately so captured pixels equal the requested dimensions. Serve files through the project's local server when modules or assets need HTTP. Don't depend on a remote font or CDN during capture.

## Capture frames

Use [scripts/capture-frames.mjs](../scripts/capture-frames.mjs) when Playwright is available (run from the project directory so it resolves the project's Playwright). Otherwise implement the same loop with the available browser automation. Capture and inspect a few key frames (`--start N --count 1`) before a full run.

```text
node <skill>/scripts/capture-frames.mjs --url "http://localhost:5173/?capture=1" \
  --out frames --fps 30 --duration 6 --width 1920 --height 1080
```

The script awaits readiness, calls `renderAt(n / fps)` for `n = 0 … N-1`, writes `frame-000000.png …`, refuses to overwrite a non-empty output directory without `--force`, reports page errors, and prints the matching ffmpeg command, padding odd dimensions. If a duration doesn't land on a frame boundary, it reports the rounding. If Playwright's bundled browser isn't downloaded, `--channel msedge` or `--channel chrome` uses an installed browser.

## Encode

```text
ffmpeg -n -framerate 30 -start_number 0 -i frames/frame-%06d.png -c:v libx264 -pix_fmt yuv420p -movflags +faststart output.mp4
```

Codec, frame rate and names are example choices. `-framerate` sets the input sequence rate; `yuv420p` needs even dimensions; `-n` refuses to overwrite. [FFmpeg image2](https://ffmpeg.org/ffmpeg-formats.html#image2-1).

H.264 drops transparency. For an alpha deliverable, keep alpha through the PNG sequence (`--alpha` plus a transparent page background) and choose an alpha-capable format the recipient supports (e.g. ProRes 4444 `-c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le`, or VP9 WebM `-c:v libvpx-vp9 -pix_fmt yuva420p`). For opaque MP4, composite onto the agreed background. Requested audio needs its own licensed source and sync; never silently omit it.

## Verify the deliverable

Check the encoder exit code, then probe the file:

```text
ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=width,height,r_frame_rate,nb_read_frames,pix_fmt -show_entries format=duration -of default=nw=1 output.mp4
```

Confirm dimensions, frame count vs. `fps × duration`, pixel format, and audio when requested. Decode sample frames from the video itself (`ffmpeg -ss 2.5 -i output.mp4 -frames:v 1 check.png`), not just the pre-encode PNGs. Watch it for timing, flashes, overlaps, stale layers, missing glyphs or wrong colors.

A still can be exported from the same composition. Pick a time that communicates on its own; the last frame isn't automatically the best still. Keep source and derivatives separate, and record outputs in the manifest if the project uses one.

If tools are missing, deliver the source plus the exact dependency or command still needed. Never call an HTML preview a finished MP4; report partial capture or failed export precisely.

Primary documentation reviewed 2026-11-16. Adapt commands to the installed browser and encoder versions.
