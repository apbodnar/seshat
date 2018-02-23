precision highp float;

varying vec3 color;
varying vec2 quadCoord;

void main(void) {
  float diff = clamp(dot(color, normalize(vec3(1,-1,-1))),0.1, 1.0);
  gl_FragColor = vec4(diff*vec3(1,0.3,0.3), 1);
}
