/**
 * AppScene - Main WebGL Scene for Apple Event Logo Animation
 * 
 * This scene creates an interactive heat map effect using Three.js shaders.
 * The animation combines:
 * - A video texture showing thermal-like patterns
 * - An Apple logo mask to shape the effect
 * - Real-time mouse tracking for heat generation
 * - Custom fragment shader for color gradient mapping
 * - Smooth interpolation and animation timing
 */

import * as THREE from 'three'
import { DrawRenderer } from '../renderer/DrawRenderer'
import { AppRenderer } from '../renderer/AppRenderer'

// Asset URLs - served from the public directory
const MASK_URL = '/logo__dcojfwkzna2q.png'  // Apple logo mask texture
const VIDEO_URL = '/largetall_2x.mp4'       // Background thermal video

export class AppScene extends THREE.Scene {
	// Core Three.js components
	rendererWrapper: AppRenderer              // Wrapper for WebGL renderer
	camera: THREE.OrthographicCamera          // 2D orthographic camera for UI-style rendering
	drawRenderer!: DrawRenderer               // Custom renderer for mouse trail effects
	heat!: THREE.Mesh                        // Main mesh with heat map shader material

	// Media assets
	video!: HTMLVideoElement                 // HTML5 video element for background texture
	videoTexture!: THREE.VideoTexture        // Three.js video texture wrapper
	maskTexture!: THREE.Texture              // Apple logo mask texture

	// DOM elements
	animationWrapper!: HTMLElement           // Container for animation controls
	button!: HTMLButtonElement               // Play/pause button
	hitContainer!: HTMLElement               // Mouse interaction area
	scrollElement!: HTMLElement              // Element for scroll-based effects

	// State flags
	videoReady = false                       // True when video is loaded and ready
	textureReady = false                     // True when all textures are loaded
	isUserPaused = false                     // True when user manually paused

	// Animation values with smooth interpolation
	blendVideo = { value: 0, target: 0 }     // Video opacity blend factor
	amount = { value: 0, target: 0 }         // Overall effect intensity
	mouse = { position: new THREE.Vector3(0, 0, 0), target: new THREE.Vector3(0, 0, 0) } // Mouse position tracking
	move = { value: 1, target: 1 }           // Movement-based opacity modifier
	scrollAnimation = {                       // Scroll-based animation parameters
		opacity: { value: 1, target: 1 },     // Opacity based on scroll position
		scale: { value: 1, target: 1 },       // Scale based on scroll position  
		power: { value: 0.8, target: 0.8 }    // Shader power parameter
	}

	// Interaction state
	hold = false                             // True when mouse is pressed/hovering
	heatUp = 0                              // Heat accumulation from mouse interaction

	// Color palette - Apple's thermal gradient colors (black to red/orange spectrum)
	private readonly paletteHex = ['000000', '073dff', '53d5fd', 'fefcdd', 'ffec6a', 'f9d400', 'a61904']
	
	// HUD controllable parameters
	parameters = {
		// Visual parameters
		effectIntensity: 1.0,      // Overall effect intensity multiplier
		contrastPower: 0.8,        // Shader power/contrast adjustment
		colorSaturation: 1.3,      // Color saturation boost
		heatSensitivity: 0.5,      // Mouse interaction heat sensitivity
		videoBlendAmount: 1.0,     // Video texture blend factor
		gradientShift: 0.0,        // Gradient color shift
		
		// Behavioral parameters
		heatDecay: 0.95,           // How quickly heat cools down (0.8-0.99)
		interactionRadius: 1.0,    // Size of interaction area (0.1-3.0)
		reactivity: 1.0            // How reactive the effect is to movement (0.1-3.0)
	}
	
	/**
	 * Convert hex color string to RGB values normalized to 0-1 range
	 * Used for shader uniform color values
	 */
	private hexToRGB(hex: string) {
		hex = hex.replace(/^#/, '')
		if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
		const r = parseInt(hex.slice(0, 2), 16) / 255
		const g = parseInt(hex.slice(2, 4), 16) / 255
		const b = parseInt(hex.slice(4, 6), 16) / 255
		return [r, g, b]
	}

	/**
	 * Constructor - Set up the scene, camera, and DOM references
	 * @param rendererWrapper - The WebGL renderer wrapper
	 */
	constructor(rendererWrapper: AppRenderer) {
		super()
		this.rendererWrapper = rendererWrapper

		// Set up orthographic camera for 2D-style rendering
		// This creates a flat viewing area from -0.5 to 0.5 in both X and Y
		this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -1, 1)
		this.camera.position.z = 1

		// Get DOM element references for interaction and control
		this.animationWrapper = document.querySelector('.canvas-wrapper') as HTMLElement
		this.button = document.querySelector('#play-pause-btn') as HTMLButtonElement
		this.hitContainer = document.querySelector('.interaction-area') as HTMLElement
		this.scrollElement = document.querySelector('.demo-container') as HTMLElement

		// Set up play/pause button event handler
		this.button.addEventListener('click', this.onToggle.bind(this))
	}

	// Utility functions for smooth animation interpolation

	/** Linear interpolation between two values */
	lerp(a: number, b: number, t: number) { return a + (b - a) * t }

	/** Convert frame-rate independent lerp speed to delta-time based factor */
	lerpSpeed(base: number, dt: number) { let n = base * dt * 60; return n > 1 ? 1 : n < 0 ? 0 : n }

	/**
	 * Initialize the scene - Load assets, create materials, set up interactions
	 * This is the main setup method called after the scene is created
	 */
	async init() {
		// Set black background for the WebGL canvas
		this.rendererWrapper.renderer.setClearColor(0x000000)

		// Detect mobile devices for touch-optimized interaction
		const isMobile = document.documentElement.classList.contains('touch')

		// Initialize the draw renderer for mouse trail effects
		// This creates a 256x256 texture that tracks mouse movement and heat
		this.drawRenderer = new DrawRenderer(256, { radiusRatio: 1000, isMobile })

		// Load video and mask textures asynchronously
		await this.loadAssets(this.rendererWrapper.rect.width, this.rendererWrapper.rect.height)

		// Create the main heat map mesh with shader material
		this.addHeat()

		// Set up camera projection for current viewport size
		this.onResize(this.rendererWrapper.rect.width, this.rendererWrapper.rect.height)

		// Attach mouse/pointer event listeners to the hitbox
		this.attachPointerEvents()

		// Global pointer tracking for cases where local events might be blocked
		const updateWin = (clientX: number, clientY: number) => {
			const rectRef = this.rendererWrapper.container.getBoundingClientRect()
			// Convert screen coordinates to normalized device coordinates (-1 to 1)
			const nx = rectRef.width > 0 ? (clientX - rectRef.left) / rectRef.width : 0.5
			const ny = rectRef.height > 0 ? (clientY - rectRef.top) / rectRef.height : 0.5
			const x = 2 * (nx - 0.5)
			const y = 2 * -(ny - 0.5)  // Flip Y axis for WebGL coordinates

			// Calculate movement delta for direction tracking
			const ndx = nx - ((this as any)._winLastNX ?? 0.5)
			const ndy = ny - ((this as any)._winLastNY ?? 0.5)
				; (this as any)._winLastNX = nx; (this as any)._winLastNY = ny

			// Update mouse position and heat generation
			this.mouse.target.set(x, y, 0)
			this.drawRenderer.updateDirection({ x: ndx, y: ndy })
			this.hold = true
		}

		// Global event listeners for consistent interaction
		window.addEventListener('pointermove', (e: any) => updateWin(e.clientX, e.clientY), { passive: true })
		window.addEventListener('scroll', this.onScroll.bind(this), { passive: true })

		// Show the animation controls now that everything is loaded
		this.animationWrapper.classList.add('loaded')
	}

	/**
	 * Load video and mask texture assets
	 * @param width - Video element width
	 * @param height - Video element height
	 */
	async loadAssets(width: number, height: number) {
		// Load the Apple logo mask texture
		this.maskTexture = await new Promise((resolve, reject) => {
			new THREE.TextureLoader().load(MASK_URL, tex => {
				tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
				resolve(tex)
			}, undefined, err => reject(err))
		})

		// Create and configure the background video element
		this.video = document.createElement('video')
		this.video.muted = true
		this.video.playsInline = true
		this.video.autoplay = false
		this.video.controls = false
		this.video.loop = true
		this.video.width = width
		this.video.height = height
		this.video.src = VIDEO_URL

		// Set up video ready callback
		this.video.addEventListener('loadeddata', () => this.onVideoReady())
	}

	/**
	 * Called when video is loaded and ready to play
	 * Creates the video texture and starts the animation
	 */
	onVideoReady() {
		if (this.videoReady) return

		// Create Three.js video texture from HTML video element
		this.videoTexture = new THREE.VideoTexture(this.video)

		// Set animation targets to start the effect
		this.amount.target = 1        // Full effect intensity
		this.blendVideo.value = 1     // Show video texture
		this.videoReady = true
		this.textureReady = true

		// Update UI state and start video playback
		this.animationWrapper.classList.add('loaded')
		this.video.play().catch(() => { })
		this.mediaButtonState()  // Set initial button text
	}

	/**
	 * Create the main heat map mesh with custom shader material
	 * This is the core of the visual effect - a complex fragment shader that combines:
	 * - Video texture for base thermal patterns
	 * - Apple logo mask for shaping
	 * - Mouse interaction data for heat generation
	 * - Multi-color gradient mapping for thermal effect
	 */
	addHeat() {
		// Convert hex colors to RGB values for shader uniforms
		const c1 = this.hexToRGB(this.paletteHex[0])  // Black
		const c2 = this.hexToRGB(this.paletteHex[1])  // Deep blue
		const c3 = this.hexToRGB(this.paletteHex[2])  // Cyan
		const c4 = this.hexToRGB(this.paletteHex[3])  // Light yellow
		const c5 = this.hexToRGB(this.paletteHex[4])  // Yellow
		const c6 = this.hexToRGB(this.paletteHex[5])  // Orange
		const c7 = this.hexToRGB(this.paletteHex[6])  // Red

		// Shader uniforms - these values are passed to the GPU shader
		const uniforms: any = {
			blendVideo: { value: 0 },                    // Video texture blend factor
			drawMap: { value: this.drawRenderer.getTexture() }, // Mouse interaction texture
			textureMap: { value: this.videoTexture },    // Background video texture
			maskMap: { value: this.maskTexture },        // Apple logo mask
			scale: { value: [1, 1] },                     // Texture scale
			offset: { value: [0, 0] },                    // Texture offset
			opacity: { value: 1 },                       // Overall opacity
			amount: { value: 0 },                        // Effect intensity
			// Thermal gradient colors (7 color stops)
			color1: { value: c1 }, color2: { value: c2 }, color3: { value: c3 }, color4: { value: c4 },
			color5: { value: c5 }, color6: { value: c6 }, color7: { value: c7 },
			// Gradient blend points and fade ranges for smooth color transitions
			blend: { value: [0.4, 0.7, 0.81, 0.91] },       // Color transition points
			fade: { value: [1, 1, 0.72, 0.52] },            // Fade ranges for smooth blending
			maxBlend: { value: [0.8, 0.87, 0.5, 0.27] },    // Maximum blend values
			power: { value: 0.8 },                       // Contrast/gamma adjustment
			rnd: { value: 0 },                           // Random value for animation variation
			heat: { value: [0, 0, 0, 1.02] },              // Heat generation parameters
			stretch: { value: [1, 1, 0, 0] },               // Texture stretching parameters
			// HUD controllable parameters
			effectIntensity: { value: 1.0 },             // Overall effect intensity multiplier
			colorSaturation: { value: 1.3 },             // Color saturation boost
			gradientShift: { value: 0.0 },               // Gradient color shift
			// Behavioral parameters
			interactionSize: { value: 1.0 }              // Interaction area size
		}

		// Vertex shader - simple pass-through that prepares UV coordinates
		const vertexShader = `
      varying vec2 vUv;
      varying vec4 vClipPosition;
      
      void main(){
        vUv = uv;
        vClipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = vClipPosition;
      }
    `

		// Fragment shader - the complex thermal effect rendering
		const fragmentShader = `
      precision highp isampler2D;
      precision highp usampler2D;
      
      // Input textures
      uniform sampler2D drawMap;      // Mouse interaction heat map
      uniform sampler2D textureMap;   // Background video texture
      uniform sampler2D maskMap;      // Apple logo mask
      
      // Animation parameters
      uniform float blendVideo;
      uniform float amount;
      uniform float opacity;
      uniform vec2 scale;
      uniform vec2 offset;
      
      			// Color palette (7 colors for thermal gradient)
			uniform vec3 color1, color2, color3, color4, color5, color6, color7;
			uniform vec4 blend, fade, maxBlend;
			uniform float power, rnd;
			uniform vec4 heat, stretch;
			
			// HUD controllable parameters
			uniform float effectIntensity;
			uniform float colorSaturation;
			uniform float gradientShift;
			// Behavioral parameters
			uniform float interactionSize;
      
      varying vec2 vUv;
      varying vec4 vClipPosition;
      
      // Convert RGB to luminance for saturation adjustment
      vec3 linearRgbToLuminance(vec3 c){
        float f = dot(c, vec3(0.2126729, 0.7151522, 0.0721750));
        return vec3(f);
      }
      
      // Adjust color saturation
      vec3 saturation(vec3 c, float s){
        return mix(linearRgbToLuminance(c), c, s);
      }
      
      // 2D rotation matrix
      mat2 rotate2D(float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat2(c, -s, s, c);
      }
      
      // Simple noise function
      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      // Smooth noise
      float smoothNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        
        float a = noise(i);
        float b = noise(i + vec2(1.0, 0.0));
        float c = noise(i + vec2(0.0, 1.0));
        float d = noise(i + vec2(1.0, 1.0));
        
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      
      			// Create thermal color gradient based on temperature value
			vec3 gradient(float t){
				// Apply gradient shift and color cycling
				t = clamp(t + gradientShift, 0.0, 1.0);
				
				float p1=blend.x, p2=blend.y, p3=blend.z, p4=blend.w;
				float p5=maxBlend.x, p6=maxBlend.y;
				float f1=fade.x, f2=fade.y, f3=fade.z, f4=fade.w;
				float f5=maxBlend.z, f6=maxBlend.w;
				
				// Smooth transitions between color stops
				float b1 = smoothstep(p1 - f1*0.5, p1 + f1*0.5, t);
				float b2 = smoothstep(p2 - f2*0.5, p2 + f2*0.5, t);
				float b3 = smoothstep(p3 - f3*0.5, p3 + f3*0.5, t);
				float b4 = smoothstep(p4 - f4*0.5, p4 + f4*0.5, t);
				float b5 = smoothstep(p5 - f5*0.5, p5 + f5*0.5, t);
				float b6 = smoothstep(p6 - f6*0.5, p6 + f6*0.5, t);
				
				// Blend colors based on temperature
				vec3 col = color1;
				col = mix(col, color2, b1);
				col = mix(col, color3, b2);
				col = mix(col, color4, b3);
				col = mix(col, color5, b4);
				col = mix(col, color6, b5);
				col = mix(col, color7, b6);
				
				return col;
			}
      
      void main(){
        // Convert clip space to UV coordinates for draw texture sampling
        vec2 duv = vClipPosition.xy / vClipPosition.w;
        duv = 0.5 + duv * 0.5;
        
        // Apply scaling to UV coordinates
        vec2 uv = vUv;
        uv -= 0.5;
        uv /= scale;
        uv += 0.5;
        uv += offset;
        
        // Calculate opacity and amount factors
        float o = clamp(opacity, 0.0, 1.0);
        float a = clamp(amount, 0.0, 1.0);
        float v = o * a;
        
        // Sample the Apple logo mask (green channel)
        vec4 tex = texture(maskMap, uv + offset);
        float mask = tex.g;
        
        // Sample mouse interaction data (heat map from DrawRenderer)
        vec3 draw = texture(drawMap, duv).rgb;
        float heatDraw = draw.b;
        heatDraw *= mix(0.1, 1.0, mask);  // Apply mask to heat
        
        // Apply interaction size scaling
        heatDraw *= interactionSize;
        
        // Sample background video with slight distortion from heat
        vec2 off = draw.rg * 0.01;
        vec3 video = textureLod(textureMap, uv + off, 0.0).rgb;
        
        // Enhance heat effect based on video content
        float h = mix(pow(1.0 - video.r, 1.5), 1.0, 0.2) * 1.25;
        heatDraw *= h;
        
        // Create base temperature map from video
        float map = video.r;
        map = pow(map, power);
        
        // Apply vertical gradient mask
        float msk = smoothstep(0.2, 0.5, uv.y);
        map = mix(map * 0.91, map, msk);
        map = mix(0.0, map, v);
        
        // Apply circular fade from center
        float fade = distance(vUv, vec2(0.5, 0.52));
        fade = smoothstep(0.5, 0.62, 1.0 - fade);
        
        				// Generate final color using gradient function
				vec3 final = gradient(map + heatDraw);
				final = saturation(final, colorSaturation);  // Apply controllable saturation
				final *= fade;                    // Apply circular fade
				final = mix(vec3(0.0), final, a * effectIntensity); // Apply overall amount with intensity multiplier
				
				gl_FragColor = vec4(final, 1.0);
      }
    `

		// Create shader material with uniforms and shaders
		const heatMaterial = new THREE.ShaderMaterial({
			uniforms,
			vertexShader,
			fragmentShader,
			depthTest: false,
			transparent: true
		})

		// Create mesh with plane geometry and add to scene
		this.heat = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), heatMaterial)
		this.add(this.heat)
	}

	onScroll() { const rect = this.scrollElement.getBoundingClientRect(); const top = rect.top; const half = rect ? 0.5 * rect.height : 0.5 * window.innerHeight; let r = top / half; r = r > 0 ? 0 : Math.abs(r); let a = this.lerp(1, 0.5, r); a = a < 0.5 ? 0.5 : a; let s = this.lerp(1, 1.1, r); s = s > 1.1 ? 1.1 : s; this.scrollAnimation.opacity.target = a; this.scrollAnimation.scale.target = s }

	attachPointerEvents() { const primary = this.hitContainer || this.rendererWrapper.container; const secondary = this.rendererWrapper.container; let lastNX = 0.5, lastNY = 0.5; const update = (cx: number, cy: number) => { const rectRef = (this.hitContainer?.getBoundingClientRect()) || secondary.getBoundingClientRect(); const nx = rectRef.width > 0 ? (cx - rectRef.left) / rectRef.width : 0.5; const ny = rectRef.height > 0 ? (cy - rectRef.top) / rectRef.height : 0.5; const x = 2 * (nx - 0.5); const y = 2 * -(ny - 0.5); const ndx = nx - lastNX; const ndy = ny - lastNY; lastNX = nx; lastNY = ny; this.mouse.target.set(x, y, 0); this.drawRenderer.updateDirection({ x: ndx, y: ndy }); this.hold = true }; const bind = (el: Element) => { el.addEventListener('pointermove', (e: any) => update(e.clientX, e.clientY)); el.addEventListener('pointerdown', (e: any) => { update(e.clientX, e.clientY); this.hold = true }); el.addEventListener('pointerenter', (e: any) => update(e.clientX, e.clientY)); el.addEventListener('pointerup', () => { this.hold = false }); el.addEventListener('pointerleave', () => { this.hold = false }); }; bind(primary); if (secondary && secondary !== primary) bind(secondary) }

	onResize(width: number, height: number) { const r = width / height; let a, s; if (r >= 1) { s = 1; a = 1 * r } else { a = 1; s = 1 / r } this.camera.left = -a / 2; this.camera.right = a / 2; this.camera.top = s / 2; this.camera.bottom = -s / 2; this.camera.near = -1; this.camera.far = 1; this.camera.updateProjectionMatrix() }

	/**
	 * Main animation loop - called every frame (~60fps)
	 * Updates all animation values and shader uniforms
	 * @param dt - Delta time since last frame (in seconds)
	 */
	update(dt: number) {
		if (!this.textureReady) return

		// Smooth mouse position interpolation
		this.mouse.position.lerp(this.mouse.target, this.lerpSpeed(0.8, dt))

		// Update movement-based animation targets
		this.move.target = this.hold ? 0.95 : 1.0  // Slightly dim when interacting
		this.scrollAnimation.power.target = this.hold ? 1.0 : 0.8  // Boost contrast when interacting

		// Smooth interpolation of animation values
		this.move.value = this.lerp(this.move.value, this.move.target, this.lerpSpeed(0.01, dt))
		this.scrollAnimation.power.value = this.lerp(this.scrollAnimation.power.value, this.scrollAnimation.power.target, this.lerpSpeed(0.01, dt))

		// Clamp power value to valid range
		if (this.scrollAnimation.power.value < 0.8) this.scrollAnimation.power.value = 0.8
		if (this.scrollAnimation.power.value > 1.0) this.scrollAnimation.power.value = 1.0

		// Update scroll-based opacity and scale
		this.scrollAnimation.opacity.value = this.lerp(this.scrollAnimation.opacity.value, this.scrollAnimation.opacity.target * this.move.value, this.lerpSpeed(0.2, dt))
		this.scrollAnimation.scale.value = this.lerp(this.scrollAnimation.scale.value, this.scrollAnimation.scale.target, this.lerpSpeed(0.2, dt))

		// Fade in effect intensity on startup
		if (this.amount.value < 0.99999) {
			this.amount.value = this.lerp(this.amount.value, this.amount.target, 0.1 * dt * 60)
		}

		// Video and interaction updates
		if (this.videoReady) {
			// Loop video between specific time points for seamless playback
			if (this.video.currentTime >= 11.95) this.video.currentTime = 2.95

			// Update draw renderer with current mouse position
			this.drawRenderer.updatePosition(this.mouse.position, true)

			// Accumulate heat when mouse is active
			if (this.hold) {
				this.heatUp += this.parameters.heatSensitivity * dt * 60
				if (this.heatUp > 1.3) this.heatUp = 1.3  // Cap maximum heat
			}

			// Update draw renderer with current heat level
			this.drawRenderer.updateDraw(this.heatUp)

			// Smooth video blend interpolation
			this.blendVideo.value = this.lerp(this.blendVideo.value, this.blendVideo.target, this.lerpSpeed(0.1, dt))
		}

		// Update shader uniforms
		if (this.heat) {
			const u = (this.heat.material as THREE.ShaderMaterial).uniforms as any
			u.rnd.value = Math.random()  // Random value for shader variation
			u.opacity.value = this.scrollAnimation.opacity.value
			u.power.value = this.parameters.contrastPower
			u.amount.value = this.amount.value
			u.blendVideo.value = this.parameters.videoBlendAmount
			if (this.videoTexture) u.textureMap.value = this.videoTexture
			
			// Update HUD controllable parameters
			u.effectIntensity.value = this.parameters.effectIntensity
			u.colorSaturation.value = this.parameters.colorSaturation
			u.gradientShift.value = this.parameters.gradientShift
			
			// Update behavioral parameters
			u.interactionSize.value = this.parameters.interactionRadius

			// Apply scale transformation to the mesh
			this.heat.scale.set(
				this.scrollAnimation.scale.value,
				this.scrollAnimation.scale.value,
				this.scrollAnimation.scale.value
			)
		}

		// Cool down heat over time using configurable decay rate
		this.heatUp *= this.parameters.heatDecay
		if (this.heatUp < 0.001) this.heatUp = 0
		


		// Reset interaction state for next frame
		this.drawRenderer.updateDirection({ x: 0, y: 0 })
		this.hold = false
	}

	/**
	 * Update button text based on video state
	 */
	private mediaButtonState() {
		if (!this.button || !this.video) return
		this.button.textContent = this.video.paused ? 'Play' : 'Pause'
	}

	/**
	 * Toggle video play/pause state
	 */
	onToggle() {
		if (!this.video) return

		if (this.video.paused) {
			this.video.play().catch(() => { })
			this.isUserPaused = false
		} else {
			this.video.pause()
			this.isUserPaused = true
		}

		this.mediaButtonState()
	}
	
	/**
	 * Update a parameter value
	 */
	setParameter(name: keyof typeof this.parameters, value: number) {
		this.parameters[name] = value
	}
	
	/**
	 * Reset all parameters to their default values
	 */
	resetParameters() {
		this.parameters = {
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
		}
	}
}