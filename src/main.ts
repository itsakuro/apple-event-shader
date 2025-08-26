/**
 * Apple Event Logo Demo - Interactive WebGL Heat Map Animation
 * 
 * This demo recreates Apple's September 2025 Event logo animation using Three.js.
 * The animation features an interactive heat map effect that responds to mouse movement,
 * creating colorful thermal patterns over a video texture with an Apple logo mask.
 * 
 * Key Components:
 * - WebGL renderer for smooth 60fps animation
 * - Video texture showing abstract thermal patterns
 * - Apple logo mask to shape the effect
 * - Interactive mouse/pointer tracking for heat generation
 * - Real-time shader effects with gradient color mapping
 */

import './demo.css'
import { AppRenderer } from './renderer/AppRenderer'
import { AppScene } from './scenes/AppScene'

// Create the simplified HTML structure for the demo
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="demo-container">
    <div class="logo-demo">
      <div class="canvas-wrapper">
        <!-- WebGL container - this is where the Three.js magic happens -->
        <div id="webgl" class="webgl-canvas">
          <!-- Hitbox for capturing mouse/pointer interactions -->
          <div class="interaction-area"></div>
        </div>
        <!-- Hidden video element used as texture source -->
        <video id="demo-video" class="demo-video" muted loop preload="none"></video>
        <!-- Simple play/pause button for video control -->
        <div class="controls">
          <button class="control-button" id="play-pause-btn">Play/Pause</button>
        </div>
      </div>
    </div>
    
    <!-- Parameter Control HUD -->
    <div class="hud" id="parameter-hud">
      <div class="hud-header">
        <h3>Effect Parameters</h3>
        <button class="hud-toggle" id="hud-toggle">−</button>
      </div>
      <div class="hud-content" id="hud-content">
        <div class="control-group">
          <label for="effect-intensity">Effect Intensity</label>
          <input type="range" id="effect-intensity" min="0" max="2" step="0.1" value="1">
          <span class="value-display" id="intensity-value">1.0</span>
        </div>
        
        <div class="control-group">
          <label for="contrast-power">Contrast Power</label>
          <input type="range" id="contrast-power" min="0.1" max="2" step="0.1" value="0.8">
          <span class="value-display" id="power-value">0.8</span>
        </div>
        
        <div class="control-group">
          <label for="saturation">Color Saturation</label>
          <input type="range" id="saturation" min="0.5" max="3" step="0.1" value="1.3">
          <span class="value-display" id="saturation-value">1.3</span>
        </div>
        
        <div class="control-group">
          <label for="heat-sensitivity">Heat Sensitivity</label>
          <input type="range" id="heat-sensitivity" min="0.1" max="2" step="0.1" value="0.5">
          <span class="value-display" id="heat-value">0.5</span>
        </div>
        
        <div class="control-group">
          <label for="video-blend">Video Blend</label>
          <input type="range" id="video-blend" min="0" max="1" step="0.1" value="1">
          <span class="value-display" id="blend-value">1.0</span>
        </div>
        
        <div class="control-group">
          <label for="gradient-shift">Gradient Shift</label>
          <input type="range" id="gradient-shift" min="-0.5" max="0.5" step="0.05" value="0">
          <span class="value-display" id="gradient-value">0.0</span>
        </div>
        
        <hr class="hud-separator">
        <h4 class="section-title">Behavioral Effects</h4>
        
        <div class="control-group">
          <label for="heat-decay">Heat Decay</label>
          <input type="range" id="heat-decay" min="0.8" max="0.99" step="0.01" value="0.95">
          <span class="value-display" id="decay-value">0.95</span>
        </div>
        

        
        <div class="control-group">
          <label for="interaction-radius">Interaction Radius</label>
          <input type="range" id="interaction-radius" min="0.1" max="3" step="0.1" value="1">
          <span class="value-display" id="radius-value">1.0</span>
        </div>
        
        <div class="control-group">
          <label for="reactivity">Reactivity</label>
          <input type="range" id="reactivity" min="0.1" max="3" step="0.1" value="1">
          <span class="value-display" id="reactivity-value">1.0</span>
        </div>
        
        <div class="control-group">
          <button class="reset-button" id="reset-params">Reset to Defaults</button>
        </div>
      </div>
    </div>
  </main>
`

// Initialize the WebGL scene
// This creates the Three.js renderer, scene, and starts the animation loop
const container = document.querySelector('#webgl') as HTMLElement
if (container) {
	// AppRenderer wraps Three.js WebGLRenderer with automatic resizing and render loop
	const renderer = new AppRenderer(container)

	// AppScene contains all the 3D objects, shaders, and animation logic
	const scene = new AppScene(renderer)

	// Connect the renderer to the scene
	renderer.setScene(scene)
	renderer.setCamera(scene.camera)

	// Set up the animation loop - this function is called every frame (~60fps)
	renderer.onUpdate = (dt) => scene.update(dt)

	  // Initialize the scene (load assets, create materials, set up event listeners)
  scene.init()
  
  // Set up HUD controls
  setupHUD(scene)
}

/**
 * Set up HUD parameter controls
 */
function setupHUD(scene: AppScene) {
  // Get HUD elements
  const hudToggle = document.getElementById('hud-toggle') as HTMLButtonElement
  const hudContent = document.getElementById('hud-content') as HTMLDivElement
  const resetButton = document.getElementById('reset-params') as HTMLButtonElement
  
  // HUD collapse/expand functionality
  let hudCollapsed = false
  hudToggle.addEventListener('click', () => {
    hudCollapsed = !hudCollapsed
    hudContent.classList.toggle('collapsed', hudCollapsed)
    hudToggle.textContent = hudCollapsed ? '+' : '−'
  })
  
  // Parameter controls
  const controls = [
    // Visual parameters
    { id: 'effect-intensity', param: 'effectIntensity' as const, valueId: 'intensity-value' },
    { id: 'contrast-power', param: 'contrastPower' as const, valueId: 'power-value' },
    { id: 'saturation', param: 'colorSaturation' as const, valueId: 'saturation-value' },
    { id: 'heat-sensitivity', param: 'heatSensitivity' as const, valueId: 'heat-value' },
    { id: 'video-blend', param: 'videoBlendAmount' as const, valueId: 'blend-value' },
    { id: 'gradient-shift', param: 'gradientShift' as const, valueId: 'gradient-value' },
    // Behavioral parameters
    { id: 'heat-decay', param: 'heatDecay' as const, valueId: 'decay-value' },
    { id: 'interaction-radius', param: 'interactionRadius' as const, valueId: 'radius-value' },
    { id: 'reactivity', param: 'reactivity' as const, valueId: 'reactivity-value' }
  ]
  
  // Set up each control
  controls.forEach(({ id, param, valueId }) => {
    const slider = document.getElementById(id) as HTMLInputElement
    const valueDisplay = document.getElementById(valueId) as HTMLSpanElement
    
    if (slider && valueDisplay) {
      // Update display and scene parameter when slider changes
      slider.addEventListener('input', () => {
        const value = parseFloat(slider.value)
        scene.setParameter(param, value)
        valueDisplay.textContent = value.toFixed(1)
      })
      
      // Set initial value
      valueDisplay.textContent = parseFloat(slider.value).toFixed(1)
    }
  })
  
  // Reset button
  resetButton.addEventListener('click', () => {
    scene.resetParameters()
    
    // Update all sliders and displays to default values
    controls.forEach(({ id, param, valueId }) => {
      const slider = document.getElementById(id) as HTMLInputElement
      const valueDisplay = document.getElementById(valueId) as HTMLSpanElement
      
      if (slider && valueDisplay) {
        const defaultValue = scene.parameters[param]
        slider.value = defaultValue.toString()
        valueDisplay.textContent = defaultValue.toFixed(1)
      }
    })
  })
}

