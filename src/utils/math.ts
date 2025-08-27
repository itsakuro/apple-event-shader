/**
 * Math utilities for animation and interpolation
 */

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Convert frame-rate independent lerp speed to delta-time based factor
 */
export function lerpSpeed(base: number, deltaTime: number): number {
  const n = base * deltaTime * 60
  return n > 1 ? 1 : n < 0 ? 0 : n
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Convert hex color string to RGB values normalized to 0-1 range
 */
export function hexToRGB(hex: string): [number, number, number] {
  hex = hex.replace(/^#/, '')
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('')
  }
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255
  return [r, g, b]
}

/**
 * Convert screen coordinates to normalized device coordinates (-1 to 1)
 */
export function screenToNDC(
  screenX: number, 
  screenY: number, 
  bounds: DOMRect
): { x: number; y: number } {
  let nx = 0.5
  let ny = 0.5

  if (bounds.width > 0) {
    nx = (screenX - bounds.left) / bounds.width
  }
  if (bounds.height > 0) {
    ny = (screenY - bounds.top) / bounds.height
  }

  const x = 2 * (nx - 0.5)
  const y = 2 * -(ny - 0.5) // Flip Y axis for WebGL coordinates

  return { x, y }
}

/**
 * Calculate movement delta for direction tracking
 */
export function calculateMovementDelta(
  currentX: number,
  currentY: number,
  lastX: number,
  lastY: number,
  bounds: DOMRect
): { x: number; y: number } {
  const nx = bounds.width > 0 ? (currentX - bounds.left) / bounds.width : 0.5
  const ny = bounds.height > 0 ? (currentY - bounds.top) / bounds.height : 0.5
  
  const ndx = nx - lastX
  const ndy = ny - lastY
  
  return { x: ndx, y: ndy }
}