/**
 * Asset loading utilities
 */

import * as THREE from 'three'

/**
 * Load a texture with proper configuration
 */
export function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping
        resolve(texture)
      },
      undefined,
      (error) => reject(error)
    )
  })
}

/**
 * Create and configure a video element
 */
export function createVideoElement(
  url: string,
  width: number,
  height: number,
  options: {
    muted?: boolean
    playsInline?: boolean
    autoplay?: boolean
    controls?: boolean
    loop?: boolean
  } = {}
): HTMLVideoElement {
  const video = document.createElement('video')
  
  video.muted = options.muted ?? true
  video.playsInline = options.playsInline ?? true
  video.autoplay = options.autoplay ?? false
  video.controls = options.controls ?? false
  video.loop = options.loop ?? true
  video.width = width
  video.height = height
  video.src = url
  
  return video
}

/**
 * Create a video texture from HTML video element
 */
export function createVideoTexture(video: HTMLVideoElement): THREE.VideoTexture {
  return new THREE.VideoTexture(video)
}

/**
 * Set up video ready callback
 */
export function setupVideoReady(
  video: HTMLVideoElement, 
  callback: () => void
): void {
  video.addEventListener('loadeddata', callback, { once: true })
}