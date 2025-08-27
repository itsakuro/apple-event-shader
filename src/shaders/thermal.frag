/**
 * Thermal Effect Fragment Shader
 * 
 * This shader creates the Apple Event logo thermal effect by combining:
 * - Video texture for base thermal patterns
 * - Apple logo mask for shaping
 * - Mouse interaction data for heat generation
 * - Multi-color gradient mapping for thermal visualization
 */

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
vec3 linearRgbToLuminance(vec3 c) {
    float f = dot(c, vec3(0.2126729, 0.7151522, 0.0721750));
    return vec3(f);
}

// Adjust color saturation
vec3 saturation(vec3 c, float s) {
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
vec3 gradient(float t) {
    // Apply gradient shift and color cycling
    t = clamp(t + gradientShift, 0.0, 1.0);

    float p1 = blend.x, p2 = blend.y, p3 = blend.z, p4 = blend.w;
    float p5 = maxBlend.x, p6 = maxBlend.y;
    float f1 = fade.x, f2 = fade.y, f3 = fade.z, f4 = fade.w;
    float f5 = maxBlend.z, f6 = maxBlend.w;

    // Smooth transitions between color stops
    float b1 = smoothstep(p1 - f1 * 0.5, p1 + f1 * 0.5, t);
    float b2 = smoothstep(p2 - f2 * 0.5, p2 + f2 * 0.5, t);
    float b3 = smoothstep(p3 - f3 * 0.5, p3 + f3 * 0.5, t);
    float b4 = smoothstep(p4 - f4 * 0.5, p4 + f4 * 0.5, t);
    float b5 = smoothstep(p5 - f5 * 0.5, p5 + f5 * 0.5, t);
    float b6 = smoothstep(p6 - f6 * 0.5, p6 + f6 * 0.5, t);

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

void main() {
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