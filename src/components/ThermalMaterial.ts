/**
 * ThermalMaterial - Creates and manages the thermal effect shader material
 */

import * as THREE from 'three'
import type { ThermalShaderUniforms, EffectParameters, Disposable } from '../types'
import { THERMAL_PALETTE, GRADIENT_CONFIG } from '../config/constants'
import { hexToRGB } from '../utils/math'
import { shaders } from '../shaders'

interface ThermalMaterialConfig {
  drawTexture: THREE.Texture
  videoTexture: THREE.VideoTexture
  maskTexture: THREE.Texture
}

export class ThermalMaterial implements Disposable {
  private material: THREE.ShaderMaterial
  private uniforms: ThermalShaderUniforms

  constructor(config: ThermalMaterialConfig) {
    this.uniforms = this.createUniforms(config)
    this.material = this.createMaterial()
  }

  private createUniforms(config: ThermalMaterialConfig): ThermalShaderUniforms {
    // Convert hex colors to RGB values for shader uniforms
    const colors = THERMAL_PALETTE.map(hex => hexToRGB(hex)) as [
      [number, number, number],
      [number, number, number],
      [number, number, number],
      [number, number, number],
      [number, number, number],
      [number, number, number],
      [number, number, number]
    ]

    return {
      // Texture uniforms
      blendVideo: { value: 0 },
      drawMap: { value: config.drawTexture },
      textureMap: { value: config.videoTexture },
      maskMap: { value: config.maskTexture },
      
      // Transform uniforms
      scale: { value: [1, 1] },
      offset: { value: [0, 0] },
      opacity: { value: 1 },
      amount: { value: 0 },
      
      // Thermal gradient colors
      color1: { value: colors[0] },
      color2: { value: colors[1] },
      color3: { value: colors[2] },
      color4: { value: colors[3] },
      color5: { value: colors[4] },
      color6: { value: colors[5] },
      color7: { value: colors[6] },
      
      // Gradient blend parameters
      blend: { value: [...GRADIENT_CONFIG.BLEND_POINTS] as [number, number, number, number] },
      fade: { value: [...GRADIENT_CONFIG.FADE_RANGES] as [number, number, number, number] },
      maxBlend: { value: [...GRADIENT_CONFIG.MAX_BLEND] as [number, number, number, number] },
      
      // Effect parameters
      power: { value: 0.8 },
      rnd: { value: 0 },
      heat: { value: [0, 0, 0, 1.02] },
      stretch: { value: [1, 1, 0, 0] },
      
      // HUD controllable parameters
      effectIntensity: { value: 1.0 },
      colorSaturation: { value: 1.3 },
      gradientShift: { value: 0.0 },
      interactionSize: { value: 1.0 }
    }
  }

  private createMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: shaders.thermal.vertex,
      fragmentShader: shaders.thermal.fragment,
      depthTest: false,
      transparent: true
    })
  }

  /**
   * Update shader uniforms with current parameters
   */
  updateUniforms(updates: {
    opacity?: number
    amount?: number
    power?: number
    blendVideo?: number
    effectIntensity?: number
    colorSaturation?: number
    gradientShift?: number
    interactionSize?: number
    randomValue?: number
  }): void {
    if (updates.opacity !== undefined) {
      this.uniforms.opacity.value = updates.opacity
    }
    if (updates.amount !== undefined) {
      this.uniforms.amount.value = updates.amount
    }
    if (updates.power !== undefined) {
      this.uniforms.power.value = updates.power
    }
    if (updates.blendVideo !== undefined) {
      this.uniforms.blendVideo.value = updates.blendVideo
    }
    if (updates.effectIntensity !== undefined) {
      this.uniforms.effectIntensity.value = updates.effectIntensity
    }
    if (updates.colorSaturation !== undefined) {
      this.uniforms.colorSaturation.value = updates.colorSaturation
    }
    if (updates.gradientShift !== undefined) {
      this.uniforms.gradientShift.value = updates.gradientShift
    }
    if (updates.interactionSize !== undefined) {
      this.uniforms.interactionSize.value = updates.interactionSize
    }
    if (updates.randomValue !== undefined) {
      this.uniforms.rnd.value = updates.randomValue
    }
  }

  /**
   * Update texture uniforms
   */
  updateTextures(textures: {
    videoTexture?: THREE.VideoTexture
    drawTexture?: THREE.Texture
    maskTexture?: THREE.Texture
  }): void {
    if (textures.videoTexture) {
      this.uniforms.textureMap.value = textures.videoTexture
    }
    if (textures.drawTexture) {
      this.uniforms.drawMap.value = textures.drawTexture
    }
    if (textures.maskTexture) {
      this.uniforms.maskMap.value = textures.maskTexture
    }
  }

  /**
   * Update transform uniforms
   */
  updateTransform(transform: {
    scale?: [number, number]
    offset?: [number, number]
  }): void {
    if (transform.scale) {
      this.uniforms.scale.value = transform.scale
    }
    if (transform.offset) {
      this.uniforms.offset.value = transform.offset
    }
  }

  /**
   * Batch update parameters from EffectParameters
   */
  updateFromParameters(parameters: EffectParameters): void {
    this.updateUniforms({
      effectIntensity: parameters.effectIntensity,
      colorSaturation: parameters.colorSaturation,
      gradientShift: parameters.gradientShift,
      interactionSize: parameters.interactionRadius,
      power: parameters.contrastPower,
      blendVideo: parameters.videoBlendAmount
    })
  }

  /**
   * Get the Three.js material
   */
  getMaterial(): THREE.ShaderMaterial {
    return this.material
  }

  /**
   * Get direct access to uniforms (for advanced usage)
   */
  getUniforms(): ThermalShaderUniforms {
    return this.uniforms
  }

  /**
   * Dispose of the material
   */
  dispose(): void {
    this.material.dispose()
  }
}