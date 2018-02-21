precision highp float;

uniform vec2 dims;

varying vec3 color;
varying vec2 quadCoord;

void main(void) {
  float round = 1.0 - (quadCoord.x*quadCoord.x + quadCoord.y*quadCoord.y);
  gl_FragColor = vec4(color*round,1);
}
