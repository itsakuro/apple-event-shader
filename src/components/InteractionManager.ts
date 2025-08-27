/**
 * InteractionManager - Handles mouse/pointer interactions for the thermal effect
 */

import * as THREE from 'three'
import type { Disposable, InteractionState, MouseState } from '../types'
import { screenToNDC, calculateMovementDelta } from '../utils/math'
import { addEventListenerWithCleanup } from '../utils/dom'

interface InteractionManagerConfig {
  container: HTMLElement
  hitContainer?: HTMLElement
  onPositionUpdate: (position: THREE.Vector3, direction: { x: number; y: number }) => void
  onInteractionChange: (isInteracting: boolean) => void
}

export class InteractionManager implements Disposable {
  private container: HTMLElement
  private hitContainer: HTMLElement
  private onPositionUpdate: InteractionManagerConfig['onPositionUpdate']
  private onInteractionChange: InteractionManagerConfig['onInteractionChange']
  
  private mouseState: MouseState
  private interactionState: InteractionState
  private cleanupFunctions: Array<() => void> = []

  constructor(config: InteractionManagerConfig) {
    this.container = config.container
    this.hitContainer = config.hitContainer || config.container
    this.onPositionUpdate = config.onPositionUpdate
    this.onInteractionChange = config.onInteractionChange
    
    // Initialize state
    this.mouseState = {
      position: new THREE.Vector3(0, 0, 0),
      target: new THREE.Vector3(0, 0, 0)
    }
    
    this.interactionState = {
      hold: false,
      heatUp: 0,
      lastNX: 0.5,
      lastNY: 0.5
    }
    
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Local interaction events
    this.setupLocalEvents()
    
    // Global events for consistent tracking
    this.setupGlobalEvents()
  }

  private setupLocalEvents(): void {
    const elements = [this.hitContainer]
    if (this.container !== this.hitContainer) {
      elements.push(this.container)
    }

    elements.forEach(element => {
      this.cleanupFunctions.push(
        addEventListenerWithCleanup(element, 'pointermove', this.handlePointerMove),
        addEventListenerWithCleanup(element, 'pointerdown', this.handlePointerDown),
        addEventListenerWithCleanup(element, 'pointerenter', this.handlePointerEnter),
        addEventListenerWithCleanup(element, 'pointerup', this.handlePointerUp),
        addEventListenerWithCleanup(element, 'pointerleave', this.handlePointerLeave)
      )
    })
  }

  private setupGlobalEvents(): void {
    // Global pointer tracking for cases where local events might be blocked
    this.cleanupFunctions.push(
      addEventListenerWithCleanup(
        window, 
        'pointermove', 
        this.handleGlobalPointerMove,
        { passive: true }
      ),
      addEventListenerWithCleanup(
        window,
        'scroll',
        this.handleScroll,
        { passive: true }
      )
    )
  }

  private handlePointerMove = (event: Event) => {
    const pointerEvent = event as PointerEvent
    this.updatePosition(pointerEvent.clientX, pointerEvent.clientY)
    this.setInteracting(true)
  }

  private handlePointerDown = (event: Event) => {
    const pointerEvent = event as PointerEvent
    this.updatePosition(pointerEvent.clientX, pointerEvent.clientY)
    this.setInteracting(true)
  }

  private handlePointerEnter = (event: Event) => {
    const pointerEvent = event as PointerEvent
    this.updatePosition(pointerEvent.clientX, pointerEvent.clientY)
  }

  private handlePointerUp = () => {
    this.setInteracting(false)
  }

  private handlePointerLeave = () => {
    this.setInteracting(false)
  }

  private handleGlobalPointerMove = (event: Event) => {
    const pointerEvent = event as PointerEvent
    this.updateGlobalPosition(pointerEvent.clientX, pointerEvent.clientY)
    this.setInteracting(true)
  }

  private handleScroll = () => {
    // Handle scroll-based effects if needed
    // This can be extended for scroll-based animations
  }

  private updatePosition(clientX: number, clientY: number): void {
    const bounds = this.hitContainer.getBoundingClientRect()
    const { x, y } = screenToNDC(clientX, clientY, bounds)
    const { x: deltaX, y: deltaY } = calculateMovementDelta(
      clientX,
      clientY,
      this.interactionState.lastNX,
      this.interactionState.lastNY,
      bounds
    )

    this.mouseState.target.set(x, y, 0)
    this.onPositionUpdate(this.mouseState.target, { x: deltaX, y: deltaY })

    // Update last position for delta calculation
    this.interactionState.lastNX = bounds.width > 0 ? (clientX - bounds.left) / bounds.width : 0.5
    this.interactionState.lastNY = bounds.height > 0 ? (clientY - bounds.top) / bounds.height : 0.5
  }

  private updateGlobalPosition(clientX: number, clientY: number): void {
    const bounds = this.container.getBoundingClientRect()
    const { x, y } = screenToNDC(clientX, clientY, bounds)
    const { x: deltaX, y: deltaY } = calculateMovementDelta(
      clientX,
      clientY,
      this.interactionState.lastNX,
      this.interactionState.lastNY,
      bounds
    )

    this.mouseState.target.set(x, y, 0)
    this.onPositionUpdate(this.mouseState.target, { x: deltaX, y: deltaY })

    // Update last position for delta calculation
    this.interactionState.lastNX = bounds.width > 0 ? (clientX - bounds.left) / bounds.width : 0.5
    this.interactionState.lastNY = bounds.height > 0 ? (clientY - bounds.top) / bounds.height : 0.5
  }

  private setInteracting(isInteracting: boolean): void {
    if (this.interactionState.hold !== isInteracting) {
      this.interactionState.hold = isInteracting
      this.onInteractionChange(isInteracting)
    }
  }

  /**
   * Get current mouse state
   */
  getMouseState(): Readonly<MouseState> {
    return this.mouseState
  }

  /**
   * Get current interaction state
   */
  getInteractionState(): Readonly<InteractionState> {
    return this.interactionState
  }

  /**
   * Update mouse position with smooth interpolation
   */
  updateMousePosition(lerpFactor: number): void {
    this.mouseState.position.lerp(this.mouseState.target, lerpFactor)
  }

  /**
   * Dispose of all resources and event listeners
   */
  dispose(): void {
    this.cleanupFunctions.forEach(cleanup => cleanup())
    this.cleanupFunctions = []
  }
}