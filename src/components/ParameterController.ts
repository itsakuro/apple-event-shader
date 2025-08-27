/**
 * ParameterController - Manages HUD parameter controls and their interactions
 */

import type { EffectParameters, ParameterControl, Disposable } from '../types'
import { DEFAULT_PARAMETERS, PARAMETER_RANGES } from '../config/constants'
import { getRequiredElement, setupParameterControl } from '../utils/dom'

interface ParameterControllerConfig {
  onParameterChange: (name: keyof EffectParameters, value: number) => void
  onReset: () => void
}

export class ParameterController implements Disposable {
  private parameters: EffectParameters
  private onParameterChange: ParameterControllerConfig['onParameterChange']
  private onReset: ParameterControllerConfig['onReset']
  private controlCleanups: Array<() => void> = []
  private parameterControls: Map<keyof EffectParameters, { setValue: (value: number) => void }> = new Map()

  constructor(config: ParameterControllerConfig) {
    this.parameters = { ...DEFAULT_PARAMETERS }
    this.onParameterChange = config.onParameterChange
    this.onReset = config.onReset
    
    this.setupControls()
    this.setupHUD()
  }

  private setupControls(): void {
    // Parameter control definitions
    const controls: ParameterControl[] = [
      // Visual parameters
      { id: 'effect-intensity', param: 'effectIntensity', valueId: 'intensity-value' },
      { id: 'contrast-power', param: 'contrastPower', valueId: 'power-value' },
      { id: 'saturation', param: 'colorSaturation', valueId: 'saturation-value' },
      { id: 'heat-sensitivity', param: 'heatSensitivity', valueId: 'heat-value' },
      { id: 'video-blend', param: 'videoBlendAmount', valueId: 'blend-value' },
      { id: 'gradient-shift', param: 'gradientShift', valueId: 'gradient-value' },
      // Behavioral parameters
      { id: 'heat-decay', param: 'heatDecay', valueId: 'decay-value' },
      { id: 'interaction-radius', param: 'interactionRadius', valueId: 'radius-value' },
      { id: 'reactivity', param: 'reactivity', valueId: 'reactivity-value' }
    ]

    // Set up each control
    controls.forEach(({ id, param, valueId }) => {
      const control = setupParameterControl(
        `#${id}`,
        `#${valueId}`,
        (value: number) => this.setParameter(param, value),
        this.parameters[param]
      )
      
      this.parameterControls.set(param, control)
      this.controlCleanups.push(control.cleanup)
    })
  }

  private setupHUD(): void {
    // HUD toggle functionality
    const hudToggle = getRequiredElement<HTMLButtonElement>('#hud-toggle')
    const hudContent = getRequiredElement<HTMLDivElement>('#hud-content')
    const resetButton = getRequiredElement<HTMLButtonElement>('#reset-params')
    
    let hudCollapsed = false
    
    const toggleHUD = () => {
      hudCollapsed = !hudCollapsed
      hudContent.classList.toggle('collapsed', hudCollapsed)
      hudToggle.textContent = hudCollapsed ? '+' : '−'
    }
    
    const resetParameters = () => {
      this.resetToDefaults()
      this.onReset()
    }
    
    hudToggle.addEventListener('click', toggleHUD)
    resetButton.addEventListener('click', resetParameters)
    
    // Store cleanup functions
    this.controlCleanups.push(
      () => hudToggle.removeEventListener('click', toggleHUD),
      () => resetButton.removeEventListener('click', resetParameters)
    )
  }

  /**
   * Set a parameter value
   */
  setParameter(name: keyof EffectParameters, value: number): void {
    // Validate parameter range if defined
    const range = PARAMETER_RANGES[name]
    if (range) {
      value = Math.max(range.min, Math.min(range.max, value))
    }
    
    this.parameters[name] = value
    this.onParameterChange(name, value)
  }

  /**
   * Get current parameter value
   */
  getParameter(name: keyof EffectParameters): number {
    return this.parameters[name]
  }

  /**
   * Get all current parameters
   */
  getAllParameters(): Readonly<EffectParameters> {
    return { ...this.parameters }
  }

  /**
   * Reset all parameters to default values
   */
  resetToDefaults(): void {
    this.parameters = { ...DEFAULT_PARAMETERS }
    
    // Update all UI controls
    this.parameterControls.forEach((control, param) => {
      const defaultValue = DEFAULT_PARAMETERS[param]
      control.setValue(defaultValue)
      this.onParameterChange(param, defaultValue)
    })
  }

  /**
   * Set multiple parameters at once
   */
  setParameters(newParameters: Partial<EffectParameters>): void {
    Object.entries(newParameters).forEach(([name, value]) => {
      if (value !== undefined) {
        this.setParameter(name as keyof EffectParameters, value)
        
        // Update UI control if it exists
        const control = this.parameterControls.get(name as keyof EffectParameters)
        if (control) {
          control.setValue(value)
        }
      }
    })
  }

  /**
   * Dispose of all resources and event listeners
   */
  dispose(): void {
    this.controlCleanups.forEach(cleanup => cleanup())
    this.controlCleanups = []
    this.parameterControls.clear()
  }
}