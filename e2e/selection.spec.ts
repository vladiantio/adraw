import { expect, type Locator, type Page, test } from "@playwright/test"

import { drag, openCanvas, pickTool, selectedCount } from "./helpers"

/** Draw a rectangle and return the click point at its center. */
async function drawRect(
  page: Page,
  svg: Locator,
  from = { x: 150, y: 150 },
  to = { x: 350, y: 300 },
) {
  await pickTool(page, "rectangle")
  await drag(page, svg, from, to)
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
}

test.describe("selection", () => {
  test("clicking a shape with the select tool selects it", async ({ page }) => {
    const svg = await openCanvas(page)
    const center = await drawRect(page, svg)

    await pickTool(page, "select")
    const box = (await svg.boundingBox())!
    await page.mouse.click(box.x + center.x, box.y + center.y)

    expect(await selectedCount(page)).toBe(1)
    await expect(
      page.locator(".adraw-elements-group .adraw-selected"),
    ).toHaveCount(1)
    // The transform overlay shows resize handles for the selection.
    await expect(
      page.locator(".adraw-transform-overlay .adraw-resize-handle").first(),
    ).toBeVisible()
  })

  test("clicking empty canvas clears the selection", async ({ page }) => {
    const svg = await openCanvas(page)
    const center = await drawRect(page, svg)
    await pickTool(page, "select")
    const box = (await svg.boundingBox())!

    await page.mouse.click(box.x + center.x, box.y + center.y)
    expect(await selectedCount(page)).toBe(1)

    await page.mouse.click(box.x + 40, box.y + 40)
    expect(await selectedCount(page)).toBe(0)
    await expect(
      page.locator(".adraw-transform-overlay .adraw-resize-handle"),
    ).toHaveCount(0)
  })

  test("Delete removes the selected shape", async ({ page }) => {
    const svg = await openCanvas(page)
    const center = await drawRect(page, svg)
    await pickTool(page, "select")
    const box = (await svg.boundingBox())!
    await page.mouse.click(box.x + center.x, box.y + center.y)
    // Wait for the selection to register before pressing Delete.
    expect(await selectedCount(page)).toBe(1)

    await page.keyboard.press("Delete")

    await expect(
      page.locator(".adraw-elements-group .adraw-element"),
    ).toHaveCount(0)
    expect(await selectedCount(page)).toBe(0)
  })

  test("Ctrl+A selects all shapes", async ({ page }) => {
    const svg = await openCanvas(page)
    await pickTool(page, "rectangle")
    await drag(page, svg, { x: 100, y: 100 }, { x: 200, y: 200 })
    await drag(page, svg, { x: 260, y: 120 }, { x: 380, y: 240 })

    await pickTool(page, "select")
    await page.keyboard.press("ControlOrMeta+a")

    expect(await selectedCount(page)).toBe(2)
    await expect(
      page.locator(".adraw-elements-group .adraw-selected"),
    ).toHaveCount(2)
  })

  test("Escape clears the selection", async ({ page }) => {
    const svg = await openCanvas(page)
    const center = await drawRect(page, svg)
    await pickTool(page, "select")
    const box = (await svg.boundingBox())!
    await page.mouse.click(box.x + center.x, box.y + center.y)
    expect(await selectedCount(page)).toBe(1)

    await page.keyboard.press("Escape")
    expect(await selectedCount(page)).toBe(0)
  })
})
