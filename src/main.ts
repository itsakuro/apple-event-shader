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
import { getRequiredElement } from './utils/dom'

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

// Global scene reference for cleanup
let currentScene: AppScene | null = null

/**
 * Initialize the application
 */
async function initializeApp(): Promise<void> {
  try {
    // Get WebGL container
    const container = getRequiredElement('#webgl')

    // Create renderer and scene
    const renderer = new AppRenderer(container)
    const scene = new AppScene(renderer)
    currentScene = scene

    // Connect renderer to scene
    renderer.setScene(scene)
    renderer.setCamera(scene.camera)
    renderer.onUpdate = (deltaTime) => scene.update(deltaTime)

    // Initialize the scene (load assets, create materials, set up interactions)
    await scene.init()

    console.log('✅ Apple Event Logo Demo initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize app:', error)
    showErrorMessage('Failed to initialize the application. Please refresh the page.')
  }
}

/**
 * Show error message to user
 */
function showErrorMessage(message: string): void {
  const errorDiv = document.createElement('div')
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #ff4444;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `
  errorDiv.textContent = message
  document.body.appendChild(errorDiv)

  // Auto-remove after 5 seconds
  setTimeout(() => {
    document.body.removeChild(errorDiv)
  }, 5000)
}

/**
 * Handle page visibility changes for performance
 */
function setupVisibilityHandling(): void {
  document.addEventListener('visibilitychange', () => {
    if (currentScene) {
      // Could pause/resume animations based on visibility
      // For now, just log the state change
      console.log('Page visibility:', document.hidden ? 'hidden' : 'visible')
    }
  })
}

/**
 * Handle page unload cleanup
 */
function setupCleanup(): void {
  window.addEventListener('beforeunload', () => {
    if (currentScene) {
      currentScene.dispose()
      currentScene = null
      console.log('🧹 Scene cleaned up before page unload')
    }
  })

  // Handle hot module replacement in development
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      if (currentScene) {
        currentScene.dispose()
        currentScene = null
        console.log('🔥 Scene cleaned up for HMR')
      }
    })
  }
}

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  // Set up error handling and cleanup
  setupVisibilityHandling()
  setupCleanup()

  // Initialize the app
  await initializeApp()
}

// Start the application
main().catch(error => {
  console.error('💥 Fatal error during startup:', error)
  showErrorMessage('A fatal error occurred during startup.')
})

// Export for potential external use
export { currentScene as scene }