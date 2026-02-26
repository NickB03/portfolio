import { useState, useEffect, useCallback } from "react"

const DEFAULT_RECT: DOMRect = {
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  toJSON: () => "{}",
}

export function useContainerSize(ref: React.RefObject<HTMLElement | null>): DOMRect {
  const [size, setSize] = useState<DOMRect>(DEFAULT_RECT)

  const handleResize = useCallback(() => {
    if (!ref.current) return

    const newRect = ref.current.getBoundingClientRect()

    setSize((prevRect) => {
      if (
        Math.round(prevRect.width) === Math.round(newRect.width) &&
        Math.round(prevRect.height) === Math.round(newRect.height) &&
        Math.round(prevRect.x) === Math.round(newRect.x) &&
        Math.round(prevRect.y) === Math.round(newRect.y)
      ) {
        return prevRect
      }
      return newRect
    })
  }, [ref])

  useEffect(() => {
    if (!ref.current) return

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(ref.current)

    window.addEventListener("click", handleResize)
    window.addEventListener("resize", handleResize)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("click", handleResize)
      window.removeEventListener("resize", handleResize)
    }
  }, [ref, handleResize])

  return size
}
