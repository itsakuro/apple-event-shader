/**
 * RefactoredAppScene - Clean, component-based thermal effect scene
 * 
 * This refactored version separates concerns into focused components:
 * - InteractionManager: Handles mouse/pointer events
 * - ParameterController: Manages HUD controls and parameters
 * - ThermalMaterial: Manages the complex shader material
 * - DrawRenderer: Handles mouse trail rendering
 */

import * as THREE from 'three'
import type { EffectParameters, AnimationValues, Disposable } from '../types'
import { AppRenderer } from '../renderer/AppRenderer'
import { DrawRenderer } from '../renderer/DrawRenderer'
import { InteractionManager } from '../components/InteractionManager'
import { ParameterController } from '../components/ParameterController'
import { ThermalMaterial } from '../components/ThermalMaterial'
import { ASSETS, VIDEO_CONFIG, ANIMATION, INTERACTION, CAMERA_CONFIG } from '../config/constants'
import { loadTexture, createVideoElement, createVideoTexture, setupVideoReady } from '../utils/assets'
import { lerp, lerpSpeed, clamp } from '../utils/math'
import { isTouchDevice, getRequiredElement } from '../utils/dom'

export class AppScene extends THREE.Scene implements Disposable {
  // Core components
  private rendererWrapper: AppRenderer
  public camera: THREE.OrthographicCamera
  private drawRenderer!: DrawRenderer
  private interactionManager!: InteractionManager
  private parameterController!: ParameterController
  private thermalMaterial!: ThermalMaterial

  // 3D objects
  private heatMesh!: THREE.Mesh

  // Media assets
  private video!: HTMLVideoElement
  private videoTexture!: THREE.VideoTexture
  private maskTexture!: THREE.Texture

  // DOM elements
  private animationWrapper!: HTMLElement
  private playButton!: HTMLButtonElement

  // State
  private videoReady = false
  private textureReady = false
  private heatUp = 0

  // Animation values
  private animationValues: AnimationValues = {
    blendVideo: { value: 0, target: 0 },
    amount: { value: 0, target: 0 },
    mouse: { 
      position: new THREE.Vector3(0, 0, 0),
      target: new THREE.Vector3(0, 0, 0) 
    },
    move: { value: 1, target: 1 },
    scrollAnimation: {
      opacity: { value: 1, target: 1 },
      scale: { value: 1, target: 1 },
      power: { value: 0.8, target: 0.8 }
    }
  }

  constructor(rendererWrapper: AppRenderer) {
    super()
    this.rendererWrapper = rendererWrapper

    // Set up orthographic camera
    this.camera = new THREE.OrthographicCamera(
      CAMERA_CONFIG.LEFT,
      CAMERA_CONFIG.RIGHT,
      CAMERA_CONFIG.TOP,
      CAMERA_CONFIG.BOTTOM,
      CAMERA_CONFIG.NEAR,
      CAMERA_CONFIG.FAR
    )
    this.camera.position.z = CAMERA_CONFIG.POSITION_Z

    this.setupDOMReferences()
    this.setupPlayPauseButton()
  }

  private setupDOMReferences(): void {
    this.animationWrapper = getRequiredElement('.canvas-wrapper')
    this.playButton = getRequiredElement<HTMLButtonElement>('#play-pause-btn')
  }

  private setupPlayPauseButton(): void {
    this.playButton.addEventListener('click', this.handleToggleVideo.bind(this))
  }

  /**
   * Initialize the scene - Load assets, create components, set up interactions
   */
  async init(): Promise<void> {
    // Set renderer clear color
    this.rendererWrapper.renderer.setClearColor(0x000000)

    // Initialize draw renderer for mouse trail effects
    const isMobile = isTouchDevice()
    this.drawRenderer = new DrawRenderer(256, { radiusRatio: 1000, isMobile })

    // Load assets in parallel
    await this.loadAssets()

    // Create thermal material and mesh
    this.createThermalEffect()

    // Initialize interaction management
    this.setupInteractionManager()

    // Initialize parameter controller
    this.setupParameterController()

    // Set up camera projection
    this.onResize(this.rendererWrapper.rect.width, this.rendererWrapper.rect.height)

    // Show animation controls
    this.animationWrapper.classList.add('loaded')
  }

  private async loadAssets(): Promise<void> {
    const { width, height } = this.rendererWrapper.rect

    // Load mask texture and create video element in parallel
    const [maskTexture] = await Promise.all([
      loadTexture(ASSETS.MASK_URL),
      this.createVideoElement(width, height)
    ])

    this.maskTexture = maskTexture
  }

  private async createVideoElement(width: number, height: number): Promise<void> {
    this.video = createVideoElement(ASSETS.VIDEO_URL, width, height, {
      muted: VIDEO_CONFIG.MUTED,
      autoplay: VIDEO_CONFIG.AUTOPLAY,
      controls: VIDEO_CONFIG.CONTROLS,
      loop: true
    })

    setupVideoReady(this.video, this.handleVideoReady.bind(this))
  }

  private handleVideoReady(): void {
    if (this.videoReady) return

    this.videoTexture = createVideoTexture(this.video)
    
    // Update thermal material with video texture
    if (this.thermalMaterial) {
      this.thermalMaterial.updateTextures({ videoTexture: this.videoTexture })
    }

    // Start animation
    this.animationValues.amount.target = 1
    this.animationValues.blendVideo.value = 1
    this.videoReady = true
    this.textureReady = true

    // Start video playback and update UI
    this.video.play().catch(() => {})
    this.updatePlayButtonState()
  }

  private createThermalEffect(): void {
    // Create thermal material
    this.thermalMaterial = new ThermalMaterial({
      drawTexture: this.drawRenderer.getTexture(),
      videoTexture: this.videoTexture,
      maskTexture: this.maskTexture
    })

    // Create mesh and add to scene
    this.heatMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1), 
      this.thermalMaterial.getMaterial()
    )
    this.add(this.heatMesh)
  }

  private setupInteractionManager(): void {
    const hitContainer = document.querySelector('.interaction-area') as HTMLElement
    
    this.interactionManager = new InteractionManager({
      container: this.rendererWrapper.container,
      hitContainer,
      onPositionUpdate: (position, direction) => {
        this.animationValues.mouse.target.copy(position)
        this.drawRenderer.updateDirection(direction)
      },
      onInteractionChange: (isInteracting) => {
        this.animationValues.move.target = isInteracting ? INTERACTION.HOLD_MOVE_TARGET : INTERACTION.RELEASE_MOVE_TARGET
        this.animationValues.scrollAnimation.power.target = isInteracting ? INTERACTION.HOLD_POWER_TARGET : INTERACTION.RELEASE_POWER_TARGET
      }
    })
  }

  private setupParameterController(): void {
    this.parameterController = new ParameterController({
      onParameterChange: (_name, _value) => {
        // Update thermal material with new parameter values
        const parameters = this.parameterController.getAllParameters()
        this.thermalMaterial.updateFromParameters(parameters)
      },
      onReset: () => {
        // Reset parameters and update material
        const parameters = this.parameterController.getAllParameters()
        this.thermalMaterial.updateFromParameters(parameters)
        this.heatUp = 0
      }
    })
  }

  /**
   * Handle video play/pause toggle
   */
  private handleToggleVideo(): void {
    if (!this.video) return

    if (this.video.paused) {
      this.video.play().catch(() => {})
    } else {
      this.video.pause()
    }

    this.updatePlayButtonState()
  }

  private updatePlayButtonState(): void {
    if (!this.playButton || !this.video) return
    this.playButton.textContent = this.video.paused ? 'Play' : 'Pause'
  }

  /**
   * Handle window resize
   */
  onResize(width: number, height: number): void {
    const aspectRatio = width / height
    let cameraWidth: number, cameraHeight: number

    if (aspectRatio >= 1) {
      cameraHeight = 1
      cameraWidth = aspectRatio
    } else {
      cameraWidth = 1
      cameraHeight = 1 / aspectRatio
    }

    this.camera.left = -cameraWidth / 2
    this.camera.right = cameraWidth / 2
    this.camera.top = cameraHeight / 2
    this.camera.bottom = -cameraHeight / 2
    this.camera.updateProjectionMatrix()
  }

  /**
   * Main animation loop
   */
  update(deltaTime: number): void {
    if (!this.textureReady) return

    this.updateAnimationValues(deltaTime)
    this.updateVideoLoop()
    this.updateHeatInteraction(deltaTime)
    this.updateThermalMaterial()
    this.updateMeshTransform()
    this.updateDrawRenderer()
  }

  private updateAnimationValues(deltaTime: number): void {
    // Smooth mouse position interpolation
    this.animationValues.mouse.position.lerp(
      this.animationValues.mouse.target, 
      lerpSpeed(ANIMATION.MOUSE_INTERPOLATION_SPEED, deltaTime)
    )

    // Update movement and power interpolation
    this.animationValues.move.value = lerp(
      this.animationValues.move.value, 
      this.animationValues.move.target, 
      lerpSpeed(ANIMATION.MOVEMENT_INTERPOLATION_SPEED, deltaTime)
    )

    this.animationValues.scrollAnimation.power.value = clamp(
      lerp(
        this.animationValues.scrollAnimation.power.value,
        this.animationValues.scrollAnimation.power.target,
        lerpSpeed(ANIMATION.POWER_INTERPOLATION_SPEED, deltaTime)
      ),
      ANIMATION.POWER_MIN,
      ANIMATION.POWER_MAX
    )

    // Update scroll-based opacity and scale
    this.animationValues.scrollAnimation.opacity.value = lerp(
      this.animationValues.scrollAnimation.opacity.value,
      this.animationValues.scrollAnimation.opacity.target * this.animationValues.move.value,
      lerpSpeed(ANIMATION.SCROLL_INTERPOLATION_SPEED, deltaTime)
    )

    this.animationValues.scrollAnimation.scale.value = lerp(
      this.animationValues.scrollAnimation.scale.value,
      this.animationValues.scrollAnimation.scale.target,
      lerpSpeed(ANIMATION.SCROLL_INTERPOLATION_SPEED, deltaTime)
    )

    // Fade in effect intensity on startup
    if (this.animationValues.amount.value < 0.99999) {
      this.animationValues.amount.value = lerp(
        this.animationValues.amount.value,
        this.animationValues.amount.target,
        ANIMATION.FADE_IN_SPEED * deltaTime * ANIMATION.TARGET_FPS
      )
    }

    // Video blend interpolation
    if (this.videoReady) {
      this.animationValues.blendVideo.value = lerp(
        this.animationValues.blendVideo.value,
        this.animationValues.blendVideo.target,
        lerpSpeed(ANIMATION.VIDEO_BLEND_SPEED, deltaTime)
      )
    }
  }

  private updateVideoLoop(): void {
    if (!this.videoReady) return

    // Loop video between specific time points for seamless playback
    if (this.video.currentTime >= VIDEO_CONFIG.LOOP_END_TIME) {
      this.video.currentTime = VIDEO_CONFIG.LOOP_START_TIME
    }
  }

  private updateHeatInteraction(deltaTime: number): void {
    if (!this.videoReady) return

    const interactionState = this.interactionManager.getInteractionState()
    const mouseState = this.interactionManager.getMouseState()
    const parameters = this.parameterController.getAllParameters()

    // Update draw renderer position
    this.drawRenderer.updatePosition(mouseState.position, true)

    // Accumulate heat when interacting
    if (interactionState.hold) {
      this.heatUp += parameters.heatSensitivity * deltaTime * ANIMATION.TARGET_FPS
      this.heatUp = Math.min(this.heatUp, ANIMATION.HEAT_MAX_VALUE)
    }

    // Update draw renderer with current heat level
    this.drawRenderer.updateDraw(this.heatUp)

    // Cool down heat over time
    this.heatUp *= parameters.heatDecay
    if (this.heatUp < INTERACTION.HEAT_CLEANUP_THRESHOLD) {
      this.heatUp = 0
    }

    // Update interaction manager mouse position
    this.interactionManager.updateMousePosition(
      lerpSpeed(ANIMATION.MOUSE_INTERPOLATION_SPEED, deltaTime)
    )
  }

  private updateThermalMaterial(): void {
    if (!this.thermalMaterial) return

    const parameters = this.parameterController.getAllParameters()

    this.thermalMaterial.updateUniforms({
      opacity: this.animationValues.scrollAnimation.opacity.value,
      amount: this.animationValues.amount.value,
      power: parameters.contrastPower,
      blendVideo: parameters.videoBlendAmount,
      randomValue: Math.random()
    })
  }

  private updateMeshTransform(): void {
    if (!this.heatMesh) return

    const scale = this.animationValues.scrollAnimation.scale.value
    this.heatMesh.scale.set(scale, scale, scale)
  }

  private updateDrawRenderer(): void {
    // Reset interaction state for next frame
    this.drawRenderer.updateDirection({ x: 0, y: 0 })
  }

  /**
   * Get current parameters (for external access)
   */
  getParameters(): Readonly<EffectParameters> {
    return this.parameterController?.getAllParameters() ?? {} as EffectParameters
  }

  /**
   * Set a parameter value (for external access)
   */
  setParameter(name: keyof EffectParameters, value: number): void {
    this.parameterController?.setParameter(name, value)
  }

  /**
   * Reset parameters to defaults (for external access)
   */
  resetParameters(): void {
    this.parameterController?.resetToDefaults()
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    // Dispose of components
    this.drawRenderer?.dispose()
    this.interactionManager?.dispose()
    this.parameterController?.dispose()
    this.thermalMaterial?.dispose()

    // Dispose of 3D objects
    if (this.heatMesh) {
      this.heatMesh.geometry.dispose()
      this.remove(this.heatMesh)
    }

    // Dispose of textures
    this.maskTexture?.dispose()
    this.videoTexture?.dispose()

    // Clean up video
    if (this.video) {
      this.video.pause()
      this.video.src = ''
      this.video.load()
    }
  }
}