import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// The pastel "light" shining through each frame. Keep this list in sync with tokens.css.
const light = z.enum(['mint', 'lilac', 'butter', 'sky', 'rose', 'warm']);

const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      short: z.string(), // label on the slide mount and slide buttons, e.g. "Zoo voice guide"
      cta: z.string().default('Read the case study'),
      summary: z.string(), // one or two plain sentences, shown on the projection screen
      meta: z.string(), // e.g. "Client work. OpenAI Realtime API, Python."
      order: z.number(),
      light,
      media: z.enum(['voice-replay', 'image', 'placeholder']).default('placeholder'),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      placeholder: z.string().optional(), // label shown until a real cover exists
      draft: z.boolean().default(false),
    }),
});

const photos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/photos' }),
  schema: ({ image }) =>
    z.object({
      frame: z.string(), // frame number on the roll, e.g. "12"
      place: z.string(),
      year: z.number(),
      film: z.string(),
      camera: z.string().default('Pentax KM'),
      series: z.string(),
      image: image().optional(),
      alt: z.string().optional(),
      order: z.number(),
    }),
});

const ceramics = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/ceramics' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      clay: z.string(),
      glaze: z.string(),
      firing: z.string(),
      image: image().optional(),
      alt: z.string().optional(),
      order: z.number(),
    }),
});

export const collections = { work, photos, ceramics };
