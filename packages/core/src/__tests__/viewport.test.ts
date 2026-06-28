import { describe, expect, it } from "vitest"

import {
  createViewport,
  panViewport,
  resetViewport,
  zoomToFit,
  zoomViewport,
} from "../viewport"

describe("viewport", () => {
  describe("createViewport", () => {
    it("uses identity defaults", () => {
      expect(createViewport()).toEqual({ x: 0, y: 0, zoom: 1 })
    })

    it("clamps the initial zoom to the configured range", () => {
      expect(createViewport({ x: 0, y: 0, zoom: 100 }).zoom).toBe(10)
      expect(createViewport({ x: 0, y: 0, zoom: 0.001 }).zoom).toBe(0.1)
    })

    it("honors a custom zoom range", () => {
      const vp = createViewport({ x: 0, y: 0, zoom: 5 }, { maxZoom: 3 })

      expect(vp.zoom).toBe(3)
    })
  })

  describe("panViewport", () => {
    it("offsets the viewport position", () => {
      const vp = panViewport({ x: 10, y: 20, zoom: 1 }, { x: 5, y: -5 })

      expect(vp.x).toBe(15)
      expect(vp.y).toBe(15)
      expect(vp.zoom).toBe(1)
    })
  })

  describe("zoomViewport", () => {
    it("returns the same viewport when zoom does not change", () => {
      const vp = { x: 0, y: 0, zoom: 1 }

      expect(zoomViewport(vp, 0, { x: 0, y: 0 })).toBe(vp)
    })

    it("zooms in on a negative delta", () => {
      const vp = { x: 0, y: 0, zoom: 1 }
      const zoomed = zoomViewport(vp, -1000, { x: 0, y: 0 })

      expect(zoomed.zoom).toBeGreaterThan(1)
    })

    it("keeps the center point stable under zoom", () => {
      const vp = { x: 0, y: 0, zoom: 1 }
      const center = { x: 0, y: 0 }
      const zoomed = zoomViewport(vp, -1000, center)

      expect(zoomed.x).toBe(0)
      expect(zoomed.y).toBe(0)
    })

    it("clamps zoom to the maximum", () => {
      const vp = { x: 0, y: 0, zoom: 10 }
      const zoomed = zoomViewport(vp, -100_000, { x: 0, y: 0 })

      expect(zoomed.zoom).toBe(10)
    })
  })

  describe("zoomToFit", () => {
    it("returns the viewport unchanged for empty content", () => {
      const vp = { x: 5, y: 5, zoom: 2 }
      const bounds = { bottom: 0, left: 0, right: 0, top: 0 }

      expect(zoomToFit(vp, bounds, { height: 600, width: 800 })).toBe(vp)
    })

    it("centers the viewport on the content", () => {
      const vp = { x: 0, y: 0, zoom: 1 }
      const bounds = { bottom: 100, left: 0, right: 200, top: 0 }

      const fitted = zoomToFit(vp, bounds, { height: 600, width: 800 })

      expect(fitted.x).toBe(100)
      expect(fitted.y).toBe(50)
    })

    it("chooses a zoom that fits the content within the padding", () => {
      const vp = { x: 0, y: 0, zoom: 1 }
      const bounds = { bottom: 100, left: 0, right: 100, top: 0 }

      const fitted = zoomToFit(vp, bounds, { height: 300, width: 300 }, 50)

      // available space = 300 - 2*50 = 200, content = 100 -> scale 2
      expect(fitted.zoom).toBe(2)
    })
  })

  describe("resetViewport", () => {
    it("returns the identity viewport", () => {
      expect(resetViewport()).toEqual({ x: 0, y: 0, zoom: 1 })
    })
  })
})
