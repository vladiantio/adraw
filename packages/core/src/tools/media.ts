import { createMedia } from "../elements"
import type { Point, ToolType } from "../types"
import type { Tool, ToolContext, ToolState } from "./base"
import { createBaseToolState } from "./base"

export interface MediaToolOptions {
  maxWidth?: number
  maxHeight?: number
}

export function createMediaTool(options: MediaToolOptions = {}): Tool {
  const state: ToolState = createBaseToolState()
  const maxWidth = options.maxWidth ?? 800
  const maxHeight = options.maxHeight ?? 600
  let pendingMedia: { src: string; mimeType: string } | null = null
  let insertPosition: Point | null = null

  async function loadImage(
    src: string,
  ): Promise<{ naturalWidth: number; naturalHeight: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        resolve({
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        })
      }
      img.onerror = reject
      img.src = src
    })
  }

  async function insertMedia(
    context: ToolContext,
    src: string,
    mimeType: string,
    position: Point,
  ) {
    try {
      const { naturalWidth, naturalHeight } = await loadImage(src)

      let width = naturalWidth
      let height = naturalHeight

      if (width > maxWidth) {
        const ratio = maxWidth / width
        width = maxWidth
        height = height * ratio
      }

      if (height > maxHeight) {
        const ratio = maxHeight / height
        height = maxHeight
        width = width * ratio
      }

      const element = createMedia({
        x: position.x - width / 2,
        y: position.y - height / 2,
        width,
        height,
        rotation: 0,
        zIndex: context.getElements().size,
        locked: false,
        visible: true,
        src,
        mimeType,
        naturalWidth,
        naturalHeight,
      })

      const elements = context.getElements()
      elements.set(element.id, element)
      context.setElements(elements)
      context.setSelectedIds(new Set([element.id]))
      context.pushHistory()
    } catch (error) {
      console.error("Failed to load media:", error)
    }
  }

  return {
    type: "media" as ToolType,
    cursor: "copy",

    onActivate() {
      state.isActive = true
    },

    onDeactivate() {
      state.isActive = false
      state.startPoint = null
      state.currentPoint = null
      pendingMedia = null
      insertPosition = null
    },

    onPointerDown(_context: ToolContext, point: Point, _event: PointerEvent) {
      state.startPoint = point
      state.currentPoint = point
      insertPosition = point
    },

    onPointerMove(_context: ToolContext, point: Point, _event: PointerEvent) {
      state.currentPoint = point
    },

    async onPointerUp(
      context: ToolContext,
      _point: Point,
      _event: PointerEvent,
    ) {
      if (pendingMedia && insertPosition) {
        await insertMedia(
          context,
          pendingMedia.src,
          pendingMedia.mimeType,
          insertPosition,
        )
        pendingMedia = null
        insertPosition = null
      }

      state.startPoint = null
      state.currentPoint = null
    },

    getTemporaryElement() {
      return null
    },
  }
}

export interface MediaTool extends Tool {
  addMedia(src: string, mimeType: string): void
}
