import { glob } from "astro/loaders"
import { defineCollection, z } from "astro:content"

const docs = defineCollection({
  loader: glob({ base: "./src/data/docs", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    description: z.string(),
    title: z.string(),
  }),
})

export const collections = { docs }
