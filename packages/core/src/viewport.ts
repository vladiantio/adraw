import { clamp } from "./coordinates"
import type { Point, ViewportState } from "./types"

export interface ViewportConfig {
  minZoom: number
  maxZoom: number
  zoomSensitivity: number
}

const DEFAULT_VIEWPORT_CONFIG: ViewportConfig = {
  minZoom: 0.1,
  maxZoom: 10,
  zoomSensitivity: 0.001,
}

export function createViewport(
  initialViewport: ViewportState = { x: 0, y: 0, zoom: 1 },
  config: Partial<ViewportConfig> = {},
): ViewportState {
  const finalConfig = { ...DEFAULT_VIEWPORT_CONFIG, ...config }

  return {
    ...initialViewport,
    zoom: clamp(initialViewport.zoom, finalConfig.minZoom, finalConfig.maxZoom),
  }
}

export function panViewport(
  viewport: ViewportState,
  delta: Point,
  _config: ViewportConfig = DEFAULT_VIEWPORT_CONFIG,
): ViewportState {
  return {
    ...viewport,
    x: viewport.x + delta.x,
    y: viewport.y + delta.y,
  }
}

export function zoomViewport(
  viewport: ViewportState,
  delta: number,
  centerPoint: Point,
  config: ViewportConfig = DEFAULT_VIEWPORT_CONFIG,
): ViewportState {
  const newZoom = clamp(
    viewport.zoom * (1 - delta * config.zoomSensitivity),
    config.minZoom,
    config.maxZoom,
  )

  if (newZoom === viewport.zoom) {
    return viewport
  }

  const zoomRatio = newZoom / viewport.zoom

  return {
    x: centerPoint.x - (centerPoint.x - viewport.x) * zoomRatio,
    y: centerPoint.y - (centerPoint.y - viewport.y) * zoomRatio,
    zoom: newZoom,
  }
}

export function zoomToFit(
  viewport: ViewportState,
  bounds: { left: number; right: number; top: number; bottom: number },
  canvasSize: { width: number; height: number },
  padding: number = 50,
): ViewportState {
  const contentWidth = bounds.right - bounds.left
  const contentHeight = bounds.bottom - bounds.top

  if (contentWidth === 0 || contentHeight === 0) {
    return viewport
  }

  const availableWidth = canvasSize.width - padding * 2
  const availableHeight = canvasSize.height - padding * 2

  const scaleX = availableWidth / contentWidth
  const scaleY = availableHeight / contentHeight
  const newZoom = Math.min(scaleX, scaleY, DEFAULT_VIEWPORT_CONFIG.maxZoom)

  const centerX = (bounds.left + bounds.right) / 2
  const centerY = (bounds.top + bounds.bottom) / 2

  return {
    x: centerX,
    y: centerY,
    zoom: clamp(
      newZoom,
      DEFAULT_VIEWPORT_CONFIG.minZoom,
      DEFAULT_VIEWPORT_CONFIG.maxZoom,
    ),
  }
}

export function resetViewport(): ViewportState {
  return { x: 0, y: 0, zoom: 1 }
}
