/**
 * Configuration constants for the Apple Event Logo Demo
 * All magic numbers and default values are centralized here for easy maintenance
 */

import type { ThermalEffectConfig, EffectParameters } from '../types'

// Asset URLs - served from the public directory
export const ASSETS = {
  MASK_URL: '/logo__dcojfwkzna2q.png',
  VIDEO_URL: '/largetall_2x.mp4'
} as const

// Default effect parameters
export const DEFAULT_PARAMETERS: EffectParameters = {
  // Visual parameters
  effectIntensity: 1.0,
  contrastPower: 0.8,
  colorSaturation: 1.3,
  heatSensitivity: 0.5,
  videoBlendAmount: 1.0,
  gradientShift: 0.0,
  
  // Behavioral parameters
  heatDecay: 0.95,
  interactionRadius: 1.0,
  reactivity: 1.0
} as const

// Apple's thermal gradient colors (black to red/orange spectrum)
export const THERMAL_PALETTE = [
  '000000', // Black
  '073dff', // Deep blue
  '53d5fd', // Cyan
  'fefcdd', // Light yellow
  'ffec6a', // Yellow
  'f9d400', // Orange
  'a61904'  // Red
] as const

// Video playback configuration
export const VIDEO_CONFIG = {
  LOOP_START_TIME: 2.95,
  LOOP_END_TIME: 11.95,
  AUTOPLAY: false,
  MUTED: true,
  CONTROLS: false
} as const

// Animation timing constants
export const ANIMATION = {
  FADE_IN_SPEED: 0.1,
  MOUSE_INTERPOLATION_SPEED: 0.8,
  SCROLL_INTERPOLATION_SPEED: 0.2,
  MOVEMENT_INTERPOLATION_SPEED: 0.01,
  POWER_INTERPOLATION_SPEED: 0.01,
  VIDEO_BLEND_SPEED: 0.1,
  
  HEAT_MAX_VALUE: 1.3,
  TARGET_FPS: 60,
  
  // Power value constraints
  POWER_MIN: 0.8,
  POWER_MAX: 1.0
} as const

// Draw renderer configuration
export const DRAW_RENDERER = {
  TEXTURE_SIZE: 256,
  RADIUS_RATIO: 1000,
  MOBILE_RADIUS: 350,
  DESKTOP_RADIUS: 220,
  
  // Shader uniform defaults
  UNIFORMS: {
    RADIUS_VECTOR: [-8, 0.9, 150] as const,
    SIZE_DAMPING: 0.8,
    FADE_DAMPING: 0.98,
    DIRECTION_MULTIPLIER: 100
  }
} as const

// Shader gradient blend parameters
export const GRADIENT_CONFIG = {
  // Blend points for color transitions
  BLEND_POINTS: [0.4, 0.7, 0.81, 0.91] as const,
  
  // Fade ranges for smooth blending
  FADE_RANGES: [1, 1, 0.72, 0.52] as const,
  
  // Maximum blend values
  MAX_BLEND: [0.8, 0.87, 0.5, 0.27] as const,
  
  // Effect modifiers
  VERTICAL_GRADIENT_START: 0.2,
  VERTICAL_GRADIENT_END: 0.5,
  VERTICAL_GRADIENT_MIX: 0.91,
  
  CIRCULAR_FADE_CENTER: [0.5, 0.52] as const,
  CIRCULAR_FADE_INNER: 0.5,
  CIRCULAR_FADE_OUTER: 0.62
} as const

// Camera configuration
export const CAMERA_CONFIG = {
  // Orthographic camera bounds
  LEFT: -0.5,
  RIGHT: 0.5,
  TOP: 0.5,
  BOTTOM: -0.5,
  NEAR: -1,
  FAR: 1,
  POSITION_Z: 1
} as const

// Interaction thresholds and limits
export const INTERACTION = {
  HEAT_DECAY_MIN: 0.8,
  HEAT_DECAY_MAX: 0.99,
  HEAT_SENSITIVITY_MIN: 0.1,
  HEAT_SENSITIVITY_MAX: 2.0,
  INTERACTION_RADIUS_MIN: 0.1,
  INTERACTION_RADIUS_MAX: 3.0,
  REACTIVITY_MIN: 0.1,
  REACTIVITY_MAX: 3.0,
  
  // Movement-based opacity modifiers
  HOLD_MOVE_TARGET: 0.95,
  RELEASE_MOVE_TARGET: 1.0,
  HOLD_POWER_TARGET: 1.0,
  RELEASE_POWER_TARGET: 0.8,
  
  // Heat cleanup threshold
  HEAT_CLEANUP_THRESHOLD: 0.001
} as const

// HUD parameter ranges
export const PARAMETER_RANGES = {
  effectIntensity: { min: 0, max: 2, step: 0.1 },
  contrastPower: { min: 0.1, max: 2, step: 0.1 },
  colorSaturation: { min: 0.5, max: 3, step: 0.1 },
  heatSensitivity: { min: 0.1, max: 2, step: 0.1 },
  videoBlendAmount: { min: 0, max: 1, step: 0.1 },
  gradientShift: { min: -0.5, max: 0.5, step: 0.05 },
  heatDecay: { min: 0.8, max: 0.99, step: 0.01 },
  interactionRadius: { min: 0.1, max: 3, step: 0.1 },
  reactivity: { min: 0.1, max: 3, step: 0.1 }
} as const

// WebGL renderer settings
export const RENDERER_CONFIG = {
  ALPHA: false,
  ANTIALIAS: false,
  LOGARITHMIC_DEPTH_BUFFER: false,
  CLEAR_COLOR: 0x000000
} as const

// Render target options
export const RENDER_TARGET_OPTIONS = {
  TYPE: 'HalfFloatType',
  FORMAT: 'RGBAFormat',
  COLOR_SPACE: 'LinearSRGBColorSpace',
  DEPTH_BUFFER: false,
  STENCIL_BUFFER: false,
  MAG_FILTER: 'LinearFilter',
  MIN_FILTER: 'LinearMipmapLinearFilter',
  GENERATE_MIPMAPS: true
} as const

// Complete configuration object
export const THERMAL_EFFECT_CONFIG: ThermalEffectConfig = {
  maskUrl: ASSETS.MASK_URL,
  videoUrl: ASSETS.VIDEO_URL,
  defaultParameters: DEFAULT_PARAMETERS,
  paletteHex: [...THERMAL_PALETTE],
  videoLoop: {
    startTime: VIDEO_CONFIG.LOOP_START_TIME,
    endTime: VIDEO_CONFIG.LOOP_END_TIME
  },
  animation: {
    fadeInSpeed: ANIMATION.FADE_IN_SPEED,
    mouseInterpolationSpeed: ANIMATION.MOUSE_INTERPOLATION_SPEED,
    scrollInterpolationSpeed: ANIMATION.SCROLL_INTERPOLATION_SPEED,
    heatMaxValue: ANIMATION.HEAT_MAX_VALUE
  },
  drawRenderer: {
    textureSize: DRAW_RENDERER.TEXTURE_SIZE,
    radiusRatio: DRAW_RENDERER.RADIUS_RATIO,
    mobileRadius: DRAW_RENDERER.MOBILE_RADIUS,
    desktopRadius: DRAW_RENDERER.DESKTOP_RADIUS
  }
} as const