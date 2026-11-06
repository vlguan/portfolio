# Vince Guan — portfolio

Personal portfolio: tech work first, then film photography and ceramics. Astro 7, static output, three.js for the home page room, deployed to Cloudflare Pages.

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build (must pass before any commit)
- `npm run check` — Astro/TypeScript type check

## Where things live

- `src/content/work|photos|ceramics/*.md` — all content. Schemas in `src/content.config.ts`. Adding a project = adding a markdown file; it automatically becomes a slide in the binder, a button in the tray, a panel on the screen and a case-study page at `/work/<file-name>/`.
- `src/styles/tokens.css` — the ONLY source of colors, type sizes, spacing and facet sizes. Never hard-code a new value in a component; add a token if truly needed and explain why.
- `src/scripts/projector-scene.ts` — the 3D room (three.js). Draws the room only.
- `src/components/ProjectorRoom.astro` — the home page: canvas, the HTML panels pinned over the 3D screen, the slide tray, and the glue script.
- `src/components/LowPolyBackdrop.astro`, `Grain.astro`, `VoiceReplay.astro`.
- Images: put web-sized exports (≈2400px long edge) next to the content file and reference them with `cover:` / `image:` in frontmatter so `astro:assets` optimises them. Full-res scans stay out of git (`originals/` is ignored).

## The design system (do not drift from this)

A low-poly, PS2-era projection room.

- **The room** (home page): a dark, warm room with faceted walls, a wooden desk, an open blue ring binder holding one slide per project, a beige slide projector and a screen on the back wall. Visitors click a slide, drag it onto the projector, or use the tray buttons. The slide flies into the projector, the lamp and beam turn on, and the screen lights up in that project's pastel.
- **PS2 rendering rules** (keep all of them when changing the scene): render at 400×225 and upscale with `image-rendering: pixelated`; `antialias: false`; vertex snapping via the `psx()` material wrapper on every lit material; textures are tiny canvases (≤64px) with `NearestFilter` and no mipmaps; low segment counts (cylinders 6–8 sides, tori 4×8); faceted surfaces use `flatShading`; fog fades the edges. three.js uses physical light units, which is why light intensities are multiplied by `Math.PI` and point lights use `decay: 0`.
- **Content is HTML, never baked into the 3D render.** Each slide's panel is real HTML pinned over the 3D screen (`onScreenRect`) at a fixed 640×360 design size and scaled. Text stays sharp, selectable and accessible. On phones (≤760px) panels drop below the room instead.
- **Pastels are the light each slide throws**: `--light-mint|lilac|butter|sky|rose|warm`, chosen per project with `light:` in frontmatter. Text on a pastel is dark (`--on-light`); text on the room is warm off-white (`--on-room`).
- **Page chrome is faceted**: cut corners (`.facet`, `.facet-sm`), never rounded; two-tone flat shading (`.shaded`) like a lit polygon; a flat-shaded triangle field behind everything.
- One typeface (Schibsted Grotesk), one type scale (`--step-*`). Sentence case everywhere.
- Motion: the slide flight, lamp flicker, the screen focusing in, the one-time voice replay, hover lifts. All of it stops under `prefers-reduced-motion`.

## Banned patterns

Do not introduce any of these, even if a library or template suggests them:

- Rounded corners on page chrome (cut corners only), glassmorphism, neon glows, decorative gradient washes (two-tone facet shading is the only gradient style)
- Drop-shadowed "SaaS" cards, bento grids, identical card grids
- Icons or emoji on headings; pill badges for tech stacks; logo walls; stats counters
- All-caps eyebrow labels; meta strings joined with middle dots; monospace labels; `→` on links or buttons
- Accenting a single word in a headline with color/italic/bold
- Fade-and-slide-up on scroll; hover scale/bounce on cards
- Smooth, high-poly or antialiased 3D; post-processing bloom; realistic PBR materials — it must stay PS2-era
- Rendering text inside the WebGL canvas
- New fonts, colors or sizes outside `tokens.css`

## Accessibility (non-negotiable)

- Everything the 3D room does must also be possible from the tray buttons (keyboard, screen readers, touch).
- The screen region is `aria-live`; slide buttons use `aria-pressed`.
- If WebGL fails, `createProjectorScene` returns null and the tray + panels still work.
- Visible focus, contrast ≥ 4.5:1, alt text on every real image.

## Content rules

- No invented metrics. Bracketed `[placeholders]` stay until Vince supplies the real fact.
- The zoo client is anonymised as "a major zoo" unless Vince confirms the contract allows naming them. The voice replay conversation is illustrative.
- Copy is plain and specific: say what the thing does, not how impressive it is.
