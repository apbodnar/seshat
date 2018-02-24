precision highp float;

uniform sampler2D accTex;
uniform sampler2D imageTex;
uniform vec3 center;

varying vec3 normal;
varying vec3 color;
varying vec2 texCoords;

void main(void) {
  
  float diff = max(dot(normal, normalize(vec3(1,-1,-1))),0.0) * 0.8 + 0.2;
  gl_FragColor = vec4(diff*texture2D(imageTex,texCoords).rgb, 1);
}
