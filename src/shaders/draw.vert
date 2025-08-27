/**
 * Draw Renderer Vertex Shader
 * Simple pass-through for mouse interaction texture rendering
 */

precision highp float;
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}