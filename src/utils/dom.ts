/**
 * DOM utility functions
 */

/**
 * Check if device supports touch events
 */
export function isTouchDevice(): boolean {
  return document.documentElement.classList.contains('touch') ||
         'ontouchstart' in window ||
         navigator.maxTouchPoints > 0
}

/**
 * Get element or throw error if not found
 */
export function getRequiredElement<T extends HTMLElement = HTMLElement>(
  selector: string
): T {
  const element = document.querySelector<T>(selector)
  if (!element) {
    throw new Error(`Required element not found: ${selector}`)
  }
  return element
}

/**
 * Get element or return null if not found
 */
export function getOptionalElement<T extends HTMLElement = HTMLElement>(
  selector: string
): T | null {
  return document.querySelector<T>(selector)
}

/**
 * Add event listener with automatic cleanup
 */
export function addEventListenerWithCleanup(
  element: EventTarget,
  event: string,
  handler: EventListener,
  options?: AddEventListenerOptions
): () => void {
  element.addEventListener(event, handler, options)
  return () => element.removeEventListener(event, handler)
}

/**
 * Set up HUD parameter control
 */
export function setupParameterControl(
  sliderId: string,
  valueDisplayId: string,
  onValueChange: (value: number) => void,
  initialValue?: number
): {
  setValue: (value: number) => void
  cleanup: () => void
} {
  const slider = getRequiredElement<HTMLInputElement>(sliderId)
  const valueDisplay = getRequiredElement<HTMLSpanElement>(valueDisplayId)
  
  const updateValue = () => {
    const value = parseFloat(slider.value)
    onValueChange(value)
    valueDisplay.textContent = value.toFixed(1)
  }
  
  const cleanup = addEventListenerWithCleanup(slider, 'input', updateValue)
  
  // Set initial value if provided
  if (initialValue !== undefined) {
    slider.value = initialValue.toString()
    valueDisplay.textContent = initialValue.toFixed(1)
  }
  
  return {
    setValue: (value: number) => {
      slider.value = value.toString()
      valueDisplay.textContent = value.toFixed(1)
    },
    cleanup
  }
}