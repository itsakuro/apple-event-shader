/**
 * Type definitions for the Apple Event Logo Demo
 */

import * as THREE from 'three'

// Shader uniform types
export interface ThermalShaderUniforms extends Record<string, { value: any }> {
  // Texture uniforms
  blendVideo: { value: number }
  drawMap: { value: THREE.Texture }
  textureMap: { value: THREE.VideoTexture }
  maskMap: { value: THREE.Texture }
  
  // Transform uniforms
  scale: { value: [number, number] }
  offset: { value: [number, number] }
  opacity: { value: number }
  amount: { value: number }
  
  // Color uniforms (7-color thermal gradient)
  color1: { value: [number, number, number] }
  color2: { value: [number, number, number] }
  color3: { value: [number, number, number] }
  color4: { value: [number, number, number] }
  color5: { value: [number, number, number] }
  color6: { value: [number, number, number] }
  color7: { value: [number, number, number] }
  
  // Gradient blend parameters
  blend: { value: [number, number, number, number] }
  fade: { value: [number, number, number, number] }
  maxBlend: { value: [number, number, number, number] }
  
  // Effect parameters
  power: { value: number }
  rnd: { value: number }
  heat: { value: [number, number, number, number] }
  stretch: { value: [number, number, number, number] }
  
  // HUD controllable parameters
  effectIntensity: { value: number }
  colorSaturation: { value: number }
  gradientShift: { value: number }
  interactionSize: { value: number }
}

export interface DrawRendererUniforms extends Record<string, { value: any }> {
  uRadius: { value: THREE.Vector3 }
  uPosition: { value: THREE.Vector2 }
  uDirection: { value: THREE.Vector4 }
  uResolution: { value: THREE.Vector3 }
  uTexture: { value: THREE.Texture | null }
  uSizeDamping: { value: number }
  uFadeDamping: { value: number }
  uDraw: { value: number }
}

// Configuration types
export interface EffectParameters {
  // Visual parameters
  effectIntensity: number
  contrastPower: number
  colorSaturation: number
  heatSensitivity: number
  videoBlendAmount: number
  gradientShift: number
  
  // Behavioral parameters
  heatDecay: number
  interactionRadius: number
  reactivity: number
}

export interface AnimationValues {
  blendVideo: { value: number; target: number }
  amount: { value: number; target: number }
  mouse: { 
    position: THREE.Vector3
    target: THREE.Vector3 
  }
  move: { value: number; target: number }
  scrollAnimation: {
    opacity: { value: number; target: number }
    scale: { value: number; target: number }
    power: { value: number; target: number }
  }
}

// Interaction types
export interface MouseState {
  position: THREE.Vector3
  target: THREE.Vector3
}

export interface InteractionState {
  hold: boolean
  heatUp: number
  lastNX: number
  lastNY: number
}

// Component interfaces
export interface DrawRendererOptions {
  radiusRatio?: number
  isMobile?: boolean
}

export interface ThermalEffectConfig {
  // Asset URLs
  maskUrl: string
  videoUrl: string
  
  // Default parameters
  defaultParameters: EffectParameters
  
  // Color palette (hex colors for thermal gradient)
  paletteHex: string[]
  
  // Video loop points
  videoLoop: {
    startTime: number
    endTime: number
  }
  
  // Animation constants
  animation: {
    fadeInSpeed: number
    mouseInterpolationSpeed: number
    scrollInterpolationSpeed: number
    heatMaxValue: number
  }
  
  // Draw renderer settings
  drawRenderer: {
    textureSize: number
    radiusRatio: number
    mobileRadius: number
    desktopRadius: number
  }
}

// Event handler types
export type PointerEventHandler = (event: PointerEvent) => void
export type ResizeEventHandler = (width: number, height: number) => void
export type UpdateFunction = (deltaTime: number) => void

// Component cleanup interface
export interface Disposable {
  dispose(): void
}

// Parameter control types
export interface ParameterControl {
  id: string
  param: keyof EffectParameters
  valueId: string
}