import { expect, test } from "@playwright/test"

import { clickAction, drag, openCanvas, pickTool, snapshot } from "./helpers"

test.describe("viewport", () => {
  test("starts at zoom 1", async ({ page }) => {
    await openCanvas(page)
    const state = await snapshot(page)
    expect(state.zoom).toBeCloseTo(1)
  })

  test("zoom in increases zoom, zoom out decreases it", async ({ page }) => {
    await openCanvas(page)

    await clickAction(page, "zoom-in")
    const zoomedIn = await snapshot(page)
    expect(zoomedIn.zoom).toBeGreaterThan(1)

    await clickAction(page, "zoom-out")
    await clickAction(page, "zoom-out")
    const zoomedOut = await snapshot(page)
    expect(zoomedOut.zoom).toBeLessThan(1)
  })

  test("reset returns zoom to 1", async ({ page }) => {
    await openCanvas(page)

    await clickAction(page, "zoom-in")
    await clickAction(page, "zoom-in")
    const zoomed = await snapshot(page)
    expect(zoomed.zoom).not.toBeCloseTo(1)

    await clickAction(page, "reset")
    const reset = await snapshot(page)
    expect(reset.zoom).toBeCloseTo(1)
  })

  test("zoom to fit adjusts the viewport around drawn content", async ({
    page,
  }) => {
    const svg = await openCanvas(page)
    await pickTool(page, "rectangle")
    await drag(page, svg, { x: 120, y: 120 }, { x: 260, y: 240 })

    await clickAction(page, "reset")
    await clickAction(page, "zoom-fit")

    // Fitting centers the viewport on the shape, so the origin shifts away
    // from (0, 0) and the zoom changes to frame the content.
    const viewport = await page.evaluate(() => {
      const canvas = (window as any).adraw
      return canvas.getViewport()
    })
    expect(viewport.x !== 0 || viewport.y !== 0).toBe(true)
    expect(viewport.zoom).toBeGreaterThan(0)
  })
})
