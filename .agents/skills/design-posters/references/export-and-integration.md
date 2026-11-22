# Export and integration

Reference reviewed: 2026-11-16. This is implementation guidance for the relevant export mode, not a requirement to install every named tool. Match API usage to the version available in the project.

## Browser source to image

Use the project's existing browser renderer where available. If choosing HTML/CSS, give the poster a named root element with explicit layout dimensions and remove incidental page margins. Keep the composition independent of browser chrome and editor controls.

When Playwright is available, [scripts/export-element.mjs](../scripts/export-element.mjs) does steps 2–5 below and reports the actual PNG dimensions, alpha channel, missing fonts and failed images. Run it from the project directory:

```text
node <skill>/scripts/export-element.mjs --url http://localhost:5173/poster.html --selector "#poster" \
  --width 1080 --height 1350 --scale 2 --font "700 64px Cairo" --out exports/poster-2160x2700.png
```

It exits with code 2 when it detects a font, image or page problem; treat that as a failed export until you've checked it. `--font` checks web fonts declared with `@font-face`. Add `--channel msedge` or `--channel chrome` if Playwright's bundled browser isn't downloaded. Otherwise, follow the same steps with the available browser automation:

1. Open the local project using its existing preview server. Prefer local asset paths; confirm that any remote resources needed for the deliverable are available and appropriate to depend on.
2. Set the intended viewport and an explicit device scale factor. Pixel output depends on both layout size and capture settings; decide whether the requested dimensions are CSS pixels or output pixels.
3. Wait for `document.fonts.ready`, then check required font faces and the rendered result. Failed or optional fonts can leave a successful fallback layout. Check image load/decode failures too. [MDN: Document.fonts](https://developer.mozilla.org/en-US/docs/Web/API/Document/fonts).
4. Capture the poster element or a precise clip. A full-page screenshot is appropriate only when the entire page is the intended artboard. [Playwright screenshots](https://playwright.dev/docs/screenshots).
5. For PNG alpha, remove opaque source backgrounds where transparency is intended and use the available capture API's background omission option. `omitBackground` cannot remove an explicitly painted poster background. Check exported dimensions, alpha, and edges afterward. [Playwright page.screenshot](https://playwright.dev/docs/api/class-page#page-screenshot).

Use local font files with correct `@font-face` family, weight, and style declarations when the files and usage rights are available. Match each declared weight to the real resource rather than relying accidentally on synthetic bold. Record any deliberate fallback. [MDN: @font-face](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@font-face).

For Arabic HTML, use `lang="ar"` and `dir="rtl"` for the relevant content. Isolate Latin fragments when their direction differs; inspect URLs, dates, punctuation, and numerals together rather than only individual words. [MDN: dir](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/dir).

## SVG portability

- Keep a consistent `viewBox`; explicit width/height can declare the intended output size without changing geometry.
- Identify external images, CSS, filters, and fonts that may render differently in the receiving application. Test the actual consumer instead of assuming a browser preview proves portability.
- Preserve an editable text master. If the consumer needs outlined text, create a separate outlined derivative using a tool that correctly shapes the script first; record the source and conversion.
- Rasterize when the consumer requires a bitmap texture or cannot support the SVG features used. Export at the required aspect and resolution rather than changing the artwork proportions.
- If an externally supplied SVG is only needed as an image, avoid introducing its scripts or arbitrary embedded content into the host application.

## Poster as a texture or in-world sign

Agree on the asset contract before exporting:

| Field | Decision |
|---|---|
| Source | Editable poster master path |
| Output | Runtime file path, distinct from the master |
| Dimensions | Actual width and height in pixels; preserve the agreed aspect |
| Color space | Intended color treatment, normally sRGB for visible color artwork; avoid tagging non-color data maps as color |
| Alpha | Opaque, cutout, or blended, according to the design and material |
| Intended use | For example, an in-world poster, clue close-up, or UI card |

Do not force power-of-two dimensions without checking the target renderer and requirements. Choose resolution from projected size and viewing distance; a small poster does not automatically need a very large texture. A separate close-up view can improve clue readability without making every in-world asset expensive.

The integrator owns UVs, texture orientation, material choice, color-space assignment, lighting, tone mapping, and sampling. Provide a flat reference image. Test the integrated result for stretching, mirroring, cropping, blur, darkening, and readability at the normal camera position. If color fidelity is essential, decide with the integrator whether a lit material or a display-like material is appropriate; do not patch the master colors to compensate blindly for scene settings.

Record the contract using the manifest schema in [shared-conventions.md](shared-conventions.md) (`dimensions.unit: "px"`, `alpha: "opaque" | "cutout" | "blended"`). Add to an existing manifest instead of replacing it. In `notes`, say whether the color space is intended or verified through the export pipeline.

## Print handoff

Ask for printer specifications when print production is the task: final physical size, bleed, safe area, accepted PDF standard, color profile, and font policy. Raster resolution must be evaluated at the final physical size. A high pixel count does not prove suitable color or bleed.

Keep a web preview separately. Inspect the exported PDF's size, fonts and artwork; use the printer's preflight requirements before describing it as ready for production. If those requirements are unavailable, deliver a clearly identified print draft and name the unresolved production conditions.

## Practical acceptance checks

- Exact supplied text, dates, names, and destinations match the brief.
- Reading order remains clear at the final viewing size; essential text is not hidden by crop or overlays.
- Arabic joining, mixed direction, glyphs, line breaks, and font weights render correctly.
- Each output opens and has the recorded dimensions, background, and aspect.
- Alpha edges are clean on light and dark surfaces when transparency is requested.
- In-world variants have been checked in context, or that check is explicitly left with the integrator.
- The editable master and required assets can regenerate the result; any unavailable renderer or nonredistributable font is disclosed.
