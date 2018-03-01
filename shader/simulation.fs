#extension GL_EXT_draw_buffers : require

precision highp float;

uniform int tick;
uniform vec2 invDims;
uniform vec3 center;
uniform float dims;
uniform sampler2D accTex;
uniform sampler2D velTex;
uniform sampler2D posTex;

const vec3 GRAVITY = vec3(0,-0.0002,0);
const float DELTA_T = 0.03;
float eqLength = invDims.x * 5.0;

vec4 texelFetch(sampler2D tex, vec2 coords){
  return texture2D(tex, (gl_FragCoord.xy + coords)*invDims);
}

vec3 neighborForce(vec3 neighbor, vec3 origin){
  vec3 diff = origin - neighbor;
  float r = length(diff);
  vec3 dir = diff / r;
  return dir * (eqLength - r) * (0.005 * dims*dims);
}

vec3 nextNeighborForce(vec3 neighbor, vec3 nextNeighbor, vec3 origin){
  vec3 eqPoint = normalize(neighbor - nextNeighbor) * eqLength + neighbor;
  return origin == nextNeighbor || origin == neighbor ? vec3(0) : 0.005 * clamp((eqPoint - origin), vec3(-0.01), vec3(0.01));
}

vec3 directionalForce(vec2 coords, vec3 origin){
  vec3 neighbor = texelFetch(posTex, coords).xyz;
  vec3 nextNeighbor = texelFetch(posTex, coords * 2.0).xyz;
  vec3 force = neighborForce(neighbor, origin) + nextNeighborForce(neighbor, nextNeighbor, origin);
  return origin == neighbor ? vec3(0) : force;
}

vec3 acceleration(vec3 pos) {
  vec3 diff = center - pos;
  float r = length(diff);
  vec3 dir = normalize(diff);
  vec3 acc = directionalForce(vec2(1.0, 0.0), pos);
  acc += directionalForce(vec2(-1.0, 0.0), pos);
  acc += directionalForce(vec2(0.0, 1.0), pos);
  return acc + directionalForce(vec2(0.0, -1.0), pos) + GRAVITY + (-dir * (0.0002 / (r*r)));
}

void main(void) {
  vec3 pos_t0 = texelFetch(posTex, vec2(0)).xyz;
  vec3 vel_t0 = texelFetch(velTex, vec2(0)).xyz;
  vec3 acc_t0 = texelFetch(accTex, vec2(0)).xyz;
  // velocity verlet
  vec3 acc_t1 = acceleration(pos_t0);
  vec3 vel_t1 = vel_t0 + 0.5 * (acc_t0 + acc_t1) * DELTA_T;
  vec3 pos_t1 = floor(gl_FragCoord.xy) == vec2(0,dims-1.0) || floor(gl_FragCoord.xy) == vec2(dims-1.0,dims-1.0) ? pos_t0 : pos_t0 + vel_t1 * DELTA_T + 0.5 * acc_t1 * DELTA_T * DELTA_T;
  gl_FragData[0] = vec4(pos_t1, 1); // position
  gl_FragData[1] = vec4(vel_t1 * 0.9999, 1); // velocity
  gl_FragData[2] = vec4(acc_t1, 1); // acceleration
}
