precision highp float;
attribute vec3 quad;

void main(void) {
  gl_Position = vec4(quad, 1.0);
}
