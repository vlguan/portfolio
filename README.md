# vg-portfolio

Portfolio site set in a low-poly, PS2-style projection room: drag a slide from the binder onto the projector to open a project.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build
```

## Working on it with Claude Code

```bash
cd vg-portfolio
claude
```

Claude Code reads `CLAUDE.md` automatically, which holds the design system, the PS2 rendering rules and the banned-pattern list.

Good first prompts:

- "Fill in the zoo case study from these notes: …"
- "Add these six scans to the photographs slide" (drop the JPGs into `src/content/photos/` first)
- "Load the zoo slide into the projector when the page opens"
- "Set up Cloudflare Pages deployment for this repo"

## Deploy

Cloudflare Pages: build command `npm run build`, output directory `dist`. Set `site` in `astro.config.mjs` to your domain first.
