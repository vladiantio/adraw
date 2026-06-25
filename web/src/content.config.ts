import { glob } from "astro/loaders"
import { z } from "astro/zod"
import { defineCollection } from "astro:content"

const docs = defineCollection({
  loader: glob({ base: "./src/data/docs", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    description: z.string(),
    title: z.string(),
  }),
})

export const collections = { docs }
