precision highp float;

varying vec3 color;
varying vec2 quadCoord;

void main(void) {
  float diff = abs(dot(color, normalize(vec3(1,1,-1))));
  gl_FragColor = vec4(diff*vec3(1,1,0), 1);
}
