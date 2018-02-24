precision highp float;

attribute vec2 coords;

uniform sampler2D posTex;
uniform sampler2D velTex;
uniform sampler2D accTex;
uniform sampler2D imageTex;
uniform vec2 invDims;
uniform mat4 perspective;
uniform mat4 rotation;
uniform vec3 center;

varying vec3 color;
varying vec3 normal;
varying vec2 texCoords;

vec3 getNormal(vec3 pos){
  vec3 n0 = texture2D(posTex,(coords + vec2(0,1))*invDims).xyz;
  vec3 n1 = texture2D(posTex,(coords + vec2(1,0))*invDims).xyz;
  vec3 n2 = texture2D(posTex,(coords + vec2(0,-1))*invDims).xyz;
  vec3 n3 = texture2D(posTex,(coords + vec2(-1,0))*invDims).xyz;
  vec3 c0 = normalize(cross(n0 - pos, n1 - pos));
  vec3 c1 = normalize(cross(n2 - pos, n3 - pos));
  vec3 c2 = normalize(cross(n1 - pos, n2 - pos));
  vec3 c3 = normalize(cross(n3 - pos, n0 - pos));
  return normalize((c0 + c1 + c2 + c3) * 0.25);
}

void main(void) {
  vec4 pos = texture2D(posTex,coords*invDims);
  texCoords = -4.0 * coords*invDims + vec2(1) ;
  //color = texture2D(imageTex,coords*invDims).rgb;//vec3(0.3,1,1);//abs(vec3(cos(distance(center, pos.xyz)*1.0)));
  normal = getNormal(pos.xyz);
  vec4 posTrans = vec4((rotation*pos).xyz,1);
  gl_Position = perspective*posTrans;
}
