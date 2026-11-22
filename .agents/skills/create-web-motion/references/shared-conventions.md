# Shared conventions

<!-- This file is identical in build-interactive-web, build-web-games, create-web-motion and design-posters. Edit all four copies together. -->

Read this when work spans more than one specialty, or when you create or update shared asset or token files. If the project already has its own manifest, token or asset layout, follow that instead and do not migrate it.

## Ownership

| Skill | Owns | Hands off |
|---|---|---|
| `build-interactive-web` | Page shell, navigation, layout, DOM controls, accessibility of the page | Mount point, user actions |
| `build-web-games` | Game rules, game state, the update/render loop, win/lose | `ready` / `error` / `complete` events |
| `create-web-motion` | Motion choreography, live animation, export timeline | Animation functions, clips, rendered files |
| `design-posters` | Editable still compositions and their exports | Source file plus raster/vector derivatives |

- Each behavior has exactly one owner and one source of truth. Other parts subscribe to it or receive it; they never keep a second copy of, for example, the win condition.
- Exactly one render/animation loop per scene. Motion and page code plug into the loop owner instead of starting their own.
- Sibling skills are optional. Load only the ones the task needs; if one isn't installed, do that part of the work yourself.

## Language

Skill instructions are in English. Produce content in whatever language the user asks for, including Arabic and mixed Arabic/Latin text. For Arabic, always set `lang="ar"` and `dir="rtl"`, use real text shaping, isolate Latin/number runs (`<bdi>` or `dir`), and never reverse strings or split letters to imitate tracking or animation.

## `art/asset-manifest.json`

Create this only when assets pass between specialties and no existing schema governs the project. Paths are relative to the project root. Add or update your own entries; never rewrite or drop entries you didn't produce.

```json
{
  "assets": [
    {
      "id": "clue-poster",
      "source": "art/posters/clue-poster.html",
      "output": "public/assets/clue-poster.png",
      "dimensions": { "width": 1024, "height": 1536, "depth": null, "unit": "px" },
      "colorSpace": "sRGB",
      "alpha": "opaque",
      "intendedUse": "in-world poster with a readable close-up",
      "durationSeconds": null,
      "fps": null,
      "notes": null
    }
  ]
}
```

| Field | Required | Values |
|---|---|---|
| `id` | yes | Stable kebab-case identifier |
| `source` | yes | Editable master (`.svg`, `.html`, `.blend`, …). Must exist. |
| `output` | yes | Runtime file, distinct from `source` |
| `dimensions` | yes | `width`, `height`, optional `depth`; `unit` is `"px"` for images/video or `"m"` for 3D bounds |
| `colorSpace` | yes | `"sRGB"`, `"linear"`, `"per-texture-glTF"` (GLB whose textures each carry their own space), or `null` |
| `alpha` | yes | `"opaque"`, `"cutout"`, `"blended"` |
| `intendedUse` | yes | Short phrase: where and how it is displayed |
| `durationSeconds`, `fps` | motion only | Numbers, else `null` |
| `animations`, `license`, `notes` | optional | Clip names, provenance/licence, anything a consumer must know |

`null` means "not measured". Record measured values only. Never infer dimensions or color profile from a filename, and never list a source file that doesn't exist.

## `art/design-tokens.json`

Create this only when two or more parts (page, game UI, poster, motion) must share a visual identity and the project has no token system. Whichever skill first needs shared tokens creates the file; later skills read it and add missing keys without changing existing values unless the user asks for a redesign.

```json
{
  "color": { "bg": "#0f1115", "surface": "#1a1d24", "text": "#f2f2f2", "accent": "#e8b04a" },
  "font": { "display": "Cairo, sans-serif", "body": "Inter, sans-serif" },
  "space": { "xs": 4, "sm": 8, "md": 16, "lg": 32, "xl": 64 },
  "radius": { "sm": 4, "md": 12 },
  "motion": { "fast": 0.15, "base": 0.3, "slow": 0.6, "easing": "cubic-bezier(0.2, 0, 0, 1)" }
}
```

Values are examples. Space and radius are in CSS px and motion durations in seconds. Tokens hold design decisions only; never put game state or content in them.

## Module boundary

Agree on a small interface before combining modules. Match the project's framework lifecycle where one exists. For plain JS, this is enough:

```js
const cleanup = mountGame(container, { onReady, onError, onComplete });
// later: cleanup() removes listeners, timers, loops and GPU resources
```

Do not add a global event bus just to fit this pattern.

## Verification vocabulary

Report each check as one of: **built** (build/check command passed), **previewed** (seen in a real browser with browser automation, a browser agent or DevTools), **exported** (the output file was opened and inspected), or **not verified** (with the exact remaining step). Never describe a check you didn't perform. Publishing, deploying or contacting external services requires the user's explicit authorization.
