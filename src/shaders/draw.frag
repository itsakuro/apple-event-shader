/**
 * Draw Renderer Fragment Shader
 * 
 * Creates a mouse interaction heat map by tracking cursor position and movement.
 * Uses ping-pong rendering between two render targets for temporal effects.
 * 
 * Outputs:
 * - R/G channels: Movement direction vectors for distortion effects
 * - B channel: Heat intensity based on interaction
 */

precision highp float;

uniform float uDraw;
uniform vec3 uRadius;
uniform vec3 uResolution;
uniform vec2 uPosition;
uniform vec4 uDirection;
uniform float uSizeDamping;
uniform float uFadeDamping;
uniform sampler2D uTexture;

varying vec2 vUv;

void main() {
    float aspect = uResolution.x / uResolution.y;
    vec2 pos = uPosition;
    pos.y /= aspect;
    vec2 uv = vUv;
    uv.y /= aspect;
    
    float dist = distance(pos, uv) / (uRadius.z / uResolution.x);
    dist = smoothstep(uRadius.x, uRadius.y, dist);
    
    vec3 dir = uDirection.xyz * uDirection.w;
    vec2 offset = vec2((-dir.x) * (1.0 - dist), (dir.y) * (1.0 - dist));
    
    vec4 color = texture(uTexture, vUv + (offset * 0.01));
    color *= uFadeDamping;
    color.r += offset.x;
    color.g += offset.y;
    color.rg = clamp(color.rg, -1.0, 1.0);
    color.b += uDraw * (1.0 - dist);
    
    gl_FragColor = vec4(color.rgb, 1.0);
}