import * as THREE from 'three'
import type { DrawRendererUniforms, DrawRendererOptions, Disposable } from '../types'
import { DRAW_RENDERER, CAMERA_CONFIG } from '../config/constants'
import { shaders } from '../shaders'

export class DrawRenderer implements Disposable {
	private camera: THREE.OrthographicCamera
	private renderTargetA: THREE.WebGLRenderTarget
	private renderTargetB: THREE.WebGLRenderTarget
	private material: THREE.ShaderMaterial
	private scene: THREE.Scene
	private mesh: THREE.Mesh
	private uniforms: DrawRendererUniforms
	private options: DrawRendererOptions

	constructor(size = DRAW_RENDERER.TEXTURE_SIZE, options: DrawRendererOptions = {}) {
		this.options = options
		this.camera = new THREE.OrthographicCamera(
			CAMERA_CONFIG.LEFT,
			CAMERA_CONFIG.RIGHT,
			CAMERA_CONFIG.TOP,
			CAMERA_CONFIG.BOTTOM,
			CAMERA_CONFIG.NEAR,
			CAMERA_CONFIG.FAR
		)
		this.camera.position.z = CAMERA_CONFIG.POSITION_Z

		const rtOpts: THREE.RenderTargetOptions = {
			type: THREE.HalfFloatType,
			format: THREE.RGBAFormat,
			colorSpace: THREE.LinearSRGBColorSpace,
			depthBuffer: false,
			stencilBuffer: false,
			magFilter: THREE.LinearFilter,
			minFilter: THREE.LinearMipmapLinearFilter,
			generateMipmaps: true
		}

		this.renderTargetA = new THREE.WebGLRenderTarget(size, size, rtOpts)
		this.renderTargetB = new THREE.WebGLRenderTarget(size, size, rtOpts)

		this.uniforms = this.createUniforms()
		this.material = new THREE.ShaderMaterial({
			uniforms: this.uniforms,
			vertexShader: shaders.draw.vertex,
			fragmentShader: shaders.draw.fragment,
			depthTest: false,
			transparent: true
		})

		this.scene = new THREE.Scene()
		this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material)
		this.scene.add(this.mesh)
	}

	private createUniforms(): DrawRendererUniforms {
		const [radiusX, radiusY, radiusZ] = DRAW_RENDERER.UNIFORMS.RADIUS_VECTOR
		return {
			uRadius: { value: new THREE.Vector3(radiusX, radiusY, radiusZ) },
			uPosition: { value: new THREE.Vector2(0, 0) },
			uDirection: { value: new THREE.Vector4(0, 0, 0, 0) },
			uResolution: { value: new THREE.Vector3(0, 0, 0) },
			uTexture: { value: null },
			uSizeDamping: { value: DRAW_RENDERER.UNIFORMS.SIZE_DAMPING },
			uFadeDamping: { value: DRAW_RENDERER.UNIFORMS.FADE_DAMPING },
			uDraw: { value: 0 }
		}
	}

	updateRadius(px = 0): void {
		this.uniforms.uRadius.value.z = px
	}
	
	updateDraw(value = 0): void {
		this.uniforms.uDraw.value = value
	}
	
	updatePosition(position: { x: number; y: number }, normalized = false): void {
		let x = position.x
		let y = position.y
		if (normalized) {
			x = 0.5 * position.x + 0.5
			y = 0.5 * position.y + 0.5
		}
		this.uniforms.uPosition.value.set(x, y)
	}
	
	updateDirection(direction: { x: number; y: number }): void {
		this.uniforms.uDirection.value.set(
			direction.x,
			direction.y,
			0,
			DRAW_RENDERER.UNIFORMS.DIRECTION_MULTIPLIER
		)
	}
	
	resize(width: number, height: number): void {
		const ratio = height / (this.options.radiusRatio ?? DRAW_RENDERER.RADIUS_RATIO)
		const baseRadius = this.options.isMobile 
			? DRAW_RENDERER.MOBILE_RADIUS 
			: DRAW_RENDERER.DESKTOP_RADIUS
		const radius = baseRadius * ratio
		
		this.updateRadius(radius)
		this.uniforms.uResolution.value.set(width, height, 1)
	}
	
	getTexture(): THREE.Texture {
		return this.renderTargetB.texture
	}
	
	render(renderer: THREE.WebGLRenderer): void {
		this.uniforms.uTexture.value = this.renderTargetB.texture
		const previousTarget = renderer.getRenderTarget()
		renderer.setRenderTarget(this.renderTargetA)
		if (renderer.autoClear) renderer.clear()
		renderer.render(this.scene, this.camera)
		renderer.setRenderTarget(previousTarget)
		
		// Ping-pong between render targets
		const temp = this.renderTargetA
		this.renderTargetA = this.renderTargetB
		this.renderTargetB = temp
	}

	/**
	 * Dispose of all resources
	 */
	dispose(): void {
		this.material.dispose()
		this.renderTargetA.dispose()
		this.renderTargetB.dispose()
		this.mesh.geometry.dispose()
	}
}