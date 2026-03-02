import {
  getElementBounds,
  getTransformHandles,
  intersectBoxes,
  isPointInBox,
  snapPoint,
} from "./math"
import type { AdrawElement, AdrawEvent, AdrawState, Box, Point } from "./types"

export interface StateMachine<S, E> {
  readonly state: S
  send: (event: E) => void
  subscribe: (fn: (state: S) => void) => () => void
}

export function createStore(
  initialState: Partial<AdrawState> = {},
): StateMachine<AdrawState, AdrawEvent> {
  let state: AdrawState = {
    elements: [],
    selectedElementIds: [],
    tool: "select",
    viewBox: {
      x: -window.innerWidth / 2,
      y: -window.innerHeight / 2,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    zoom: 1,
    isPanning: false,
    isResizing: false,
    activeHandle: null,
    lastMousePos: { x: 0, y: 0 },
    ...initialState,
  }
  const subscribers = new Set<(state: AdrawState) => void>()
  const history: AdrawElement[][] = []
  let historyIndex = -1

  const saveHistory = () => {
    if (historyIndex < history.length - 1) {
      history.splice(historyIndex + 1)
    }
    history.push(JSON.parse(JSON.stringify(state.elements)))
    if (history.length > 50) history.shift()
    else historyIndex++
  }

  const setState = (newState: Partial<AdrawState>) => {
    state = { ...state, ...newState }
    for (const sub of subscribers) sub(state)
  }

  const send = (event: AdrawEvent) => {
    switch (event.type) {
      case "SET_TOOL":
        setState({ tool: event.tool, selectedElementIds: [] })
        break
      case "POINTER_DOWN":
        handlePointerDown(state, event.point, event.event, setState)
        break
      case "POINTER_MOVE":
        handlePointerMove(state, event.point, event.event, setState)
        break
      case "POINTER_UP":
        handlePointerUp(state, event.point, event.event, setState, saveHistory)
        break
      case "WHEEL":
        handleWheel(
          state,
          event.deltaX,
          event.deltaY,
          event.point,
          event.ctrlKey,
          setState,
        )
        break
      case "DELETE_SELECTED":
        setState({
          elements: state.elements.filter(
            (el) => !state.selectedElementIds.includes(el.id),
          ),
          selectedElementIds: [],
        })
        saveHistory()
        break
      case "ADD_IMAGE":
        handleAddImage(state, event.url, event.point, setState)
        saveHistory()
        break
      case "UNDO":
        if (historyIndex > 0) {
          historyIndex--
          setState({
            elements: JSON.parse(JSON.stringify(history[historyIndex])),
          })
        }
        break
      case "REDO":
        if (historyIndex < history.length - 1) {
          historyIndex++
          setState({
            elements: JSON.parse(JSON.stringify(history[historyIndex])),
          })
        }
        break
    }
  }

  const subscribe = (fn: (state: AdrawState) => void) => {
    subscribers.add(fn)
    return () => subscribers.delete(fn)
  }

  saveHistory()

  return {
    get state() {
      return state
    },
    send,
    subscribe,
  }
}

function handlePointerDown(
  state: AdrawState,
  point: Point,
  event: PointerEvent,
  setState: (s: Partial<AdrawState>) => void,
) {
  if (
    state.tool === "hand" ||
    (state.tool === "select" && event.button === 1)
  ) {
    setState({ isPanning: true, lastMousePos: point })
    return
  }

  let canvasPoint = screenToCanvas(point, state.viewBox, state.zoom)

  if (state.tool === "select" && state.selectedElementIds.length === 1) {
    const el = state.elements.find((e) => e.id === state.selectedElementIds[0])!
    const handles = getTransformHandles(el)
    const clickedHandle = handles.find((h) => isPointInBox(canvasPoint, h))
    if (clickedHandle) {
      setState({
        isResizing: true,
        activeHandle: clickedHandle.type,
        lastMousePos: canvasPoint,
      })
      return
    }
  }

  canvasPoint = snapPoint(canvasPoint, state.elements)

  if (
    ["rectangle", "ellipse", "draw", "star", "polygon"].includes(state.tool)
  ) {
    const newElement: AdrawElement = {
      id: Math.random().toString(36).substr(2, 9),
      type: state.tool as any,
      x: canvasPoint.x,
      y: canvasPoint.y,
      width: 0,
      height: 0,
      rotation: 0,
      stroke: "black",
      strokeWidth: 2,
      fill: "transparent",
      opacity: 1,
      ...(state.tool === "draw" ? { points: [{ x: 0, y: 0 }] } : {}),
      ...(state.tool === "star" ? { points: 5, innerRadius: 0.5 } : {}),
      ...(state.tool === "polygon" ? { sides: 6 } : {}),
    }
    setState({
      elements: [...state.elements, newElement],
      selectedElementIds: [newElement.id],
    })
  } else if (state.tool === "select") {
    const visibleElements = getVisibleElements(state)
    const clickedElement = [...visibleElements]
      .reverse()
      .find((el) => isPointInBox(canvasPoint, getElementBounds(el)))
    if (clickedElement) {
      setState({
        selectedElementIds: [clickedElement.id],
        lastMousePos: canvasPoint,
      })
    } else {
      setState({ selectedElementIds: [] })
    }
  } else if (state.tool === "erase") {
    const visibleElements = getVisibleElements(state)
    const clickedElement = [...visibleElements]
      .reverse()
      .find((el) => isPointInBox(canvasPoint, getElementBounds(el)))
    if (clickedElement) {
      setState({
        elements: state.elements.filter((el) => el.id !== clickedElement.id),
      })
    }
  }
}

function handlePointerMove(
  state: AdrawState,
  point: Point,
  event: PointerEvent,
  setState: (s: Partial<AdrawState>) => void,
) {
  if (state.isPanning) {
    const dx = point.x - state.lastMousePos.x
    const dy = point.y - state.lastMousePos.y
    setState({
      viewBox: {
        ...state.viewBox,
        x: state.viewBox.x - dx / state.zoom,
        y: state.viewBox.y - dy / state.zoom,
      },
      lastMousePos: point,
    })
    return
  }

  let canvasPoint = screenToCanvas(point, state.viewBox, state.zoom)

  if (
    state.isResizing &&
    state.selectedElementIds.length === 1 &&
    state.activeHandle
  ) {
    const id = state.selectedElementIds[0]
    const dx = canvasPoint.x - state.lastMousePos.x
    const dy = canvasPoint.y - state.lastMousePos.y

    setState({
      elements: state.elements.map((el) => {
        if (el.id !== id) return el
        const newEl = { ...el }
        if (state.activeHandle === "nw") {
          newEl.x += dx
          newEl.y += dy
          newEl.width -= dx
          newEl.height -= dy
        } else if (state.activeHandle === "ne") {
          newEl.y += dy
          newEl.width += dx
          newEl.height -= dy
        } else if (state.activeHandle === "sw") {
          newEl.x += dx
          newEl.width -= dx
          newEl.height += dy
        } else if (state.activeHandle === "se") {
          newEl.width += dx
          newEl.height += dy
        } else if (state.activeHandle === "rotation") {
          const cx = el.x + el.width / 2
          const cy = el.y + el.height / 2
          newEl.rotation =
            Math.atan2(canvasPoint.y - cy, canvasPoint.x - cx) + Math.PI / 2
        }
        return newEl
      }),
      lastMousePos: canvasPoint,
    })
    return
  }

  canvasPoint = snapPoint(canvasPoint, state.elements)

  if (
    ["rectangle", "ellipse", "star", "polygon"].includes(state.tool) &&
    state.selectedElementIds.length > 0 &&
    event.buttons === 1
  ) {
    const id = state.selectedElementIds[0]
    setState({
      elements: state.elements.map((el) => {
        if (el.id === id) {
          return {
            ...el,
            width: canvasPoint.x - el.x,
            height: canvasPoint.y - el.y,
          }
        }
        return el
      }),
    })
  } else if (
    state.tool === "draw" &&
    state.selectedElementIds.length > 0 &&
    event.buttons === 1
  ) {
    const id = state.selectedElementIds[0]
    setState({
      elements: state.elements.map((el) => {
        if (el.id === id && el.type === "draw") {
          return {
            ...el,
            points: [
              ...el.points,
              { x: canvasPoint.x - el.x, y: canvasPoint.y - el.y },
            ],
          }
        }
        return el
      }),
    })
  } else if (
    state.tool === "select" &&
    state.selectedElementIds.length > 0 &&
    event.buttons === 1
  ) {
    const dx = canvasPoint.x - state.lastMousePos.x
    const dy = canvasPoint.y - state.lastMousePos.y
    setState({
      elements: state.elements.map((el) => {
        if (state.selectedElementIds.includes(el.id)) {
          return {
            ...el,
            x: el.x + dx,
            y: el.y + dy,
          }
        }
        return el
      }),
      lastMousePos: canvasPoint,
    })
  }
}

function handlePointerUp(
  state: AdrawState,
  _point: Point,
  _event: PointerEvent,
  setState: (s: Partial<AdrawState>) => void,
  saveHistory: () => void,
) {
  if (state.selectedElementIds.length > 0 || state.isResizing) {
    saveHistory()
  }
  setState({ isPanning: false, isResizing: false, activeHandle: null })
}

function handleWheel(
  state: AdrawState,
  deltaX: number,
  deltaY: number,
  point: Point,
  ctrlKey: boolean,
  setState: (s: Partial<AdrawState>) => void,
) {
  if (ctrlKey) {
    const zoomSpeed = 0.001
    const factor = Math.exp(-deltaY * zoomSpeed)
    const newZoom = Math.min(Math.max(state.zoom * factor, 0.1), 10)

    const mouseCanvasX = state.viewBox.x + point.x / state.zoom
    const mouseCanvasY = state.viewBox.y + point.y / state.zoom

    setState({
      zoom: newZoom,
      viewBox: {
        ...state.viewBox,
        x: mouseCanvasX - point.x / newZoom,
        y: mouseCanvasY - point.y / newZoom,
        width: window.innerWidth / newZoom,
        height: window.innerHeight / newZoom,
      },
    })
  } else {
    setState({
      viewBox: {
        ...state.viewBox,
        x: state.viewBox.x + deltaX / state.zoom,
        y: state.viewBox.y + deltaY / state.zoom,
      },
    })
  }
}

function handleAddImage(
  state: AdrawState,
  url: string,
  point: Point,
  setState: (s: Partial<AdrawState>) => void,
) {
  const canvasPoint = screenToCanvas(point, state.viewBox, state.zoom)
  const newElement: AdrawElement = {
    id: Math.random().toString(36).substr(2, 9),
    type: "image",
    url,
    x: canvasPoint.x,
    y: canvasPoint.y,
    width: 200,
    height: 200,
    rotation: 0,
    stroke: "none",
    strokeWidth: 0,
    fill: "none",
    opacity: 1,
  }
  setState({
    elements: [...state.elements, newElement],
    selectedElementIds: [newElement.id],
  })
}

function screenToCanvas(point: Point, viewBox: Box, zoom: number): Point {
  return {
    x: viewBox.x + point.x / zoom,
    y: viewBox.y + point.y / zoom,
  }
}

export function getVisibleElements(state: AdrawState): AdrawElement[] {
  return state.elements.filter((el) =>
    intersectBoxes(state.viewBox, getElementBounds(el)),
  )
}
