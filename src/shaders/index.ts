/**
 * Shader module exports
 * Import shader source code as strings for Three.js ShaderMaterial
 */

// Import shader files as text
import thermalVertexShader from './thermal.vert?raw'
import thermalFragmentShader from './thermal.frag?raw'
import drawVertexShader from './draw.vert?raw'
import drawFragmentShader from './draw.frag?raw'

export const shaders = {
  thermal: {
    vertex: thermalVertexShader,
    fragment: thermalFragmentShader
  },
  draw: {
    vertex: drawVertexShader,
    fragment: drawFragmentShader
  }
} as const

export default shaders