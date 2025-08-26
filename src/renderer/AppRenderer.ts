import * as THREE from 'three'

export class AppRenderer {
	container: HTMLElement
	rect: DOMRect
	renderer: THREE.WebGLRenderer
	scene: THREE.Scene | null = null
	camera: THREE.Camera | null = null
	onUpdate: ((dt: number) => void) | null = null

	constructor(container: HTMLElement) {
		this.container = container
		this.rect = container.getBoundingClientRect()
		this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false, logarithmicDepthBuffer: false })
		this.renderer.outputColorSpace = THREE.SRGBColorSpace
		this.renderer.setSize(this.rect.width, this.rect.height)
		this.renderer.setPixelRatio(window.devicePixelRatio || 1)
		this.container.appendChild(this.renderer.domElement)
		this.renderer.domElement.style.pointerEvents = 'none'
		this.container.style.pointerEvents = 'auto'

		window.addEventListener('resize', () => this.handleResize())
		this.renderer.setAnimationLoop(() => this.loop())
	}

	setScene(scene: THREE.Scene) { this.scene = scene }
	setCamera(camera: THREE.Camera) { this.camera = camera }

	handleResize() {
		this.rect = this.container.getBoundingClientRect()
		this.renderer.setSize(this.rect.width, this.rect.height)
		const anyScene = this.scene as any
		if (anyScene?.onResize) anyScene.onResize(this.rect.width, this.rect.height)
	}

	loop() {
		this.onUpdate?.(1 / 60)
		if (!this.scene || !this.camera) return
		const anyScene = this.scene as any
		if (anyScene.drawRenderer) {
			anyScene.drawRenderer.resize(this.rect.width, this.rect.height)
			anyScene.drawRenderer.render(this.renderer)
		}
		this.renderer.autoClear = true
		this.renderer.render(this.scene, this.camera)
	}
}