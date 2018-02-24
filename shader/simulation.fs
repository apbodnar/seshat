#extension GL_EXT_draw_buffers : require

precision highp float;

uniform int tick;
uniform vec2 invDims;
uniform vec3 center;
uniform float dims;
uniform sampler2D accTex;
uniform sampler2D velTex;
uniform sampler2D posTex;
uniform sampler2D imageTex;

const vec3 GRAVITY = vec3(0,-0.0002,0);
const float DELTA_T = 0.02;

vec4 texelFetch(sampler2D tex, vec2 coords){
  return texture2D(tex, (gl_FragCoord.xy + coords)*invDims);
}

vec3 neighborForce(vec2 coords, vec3 origin){
  vec3 pos = texelFetch(posTex, coords).xyz;
  float eqLength = invDims.x * 5.0;
  vec3 diff = origin - pos;
  float r = length(diff);
  vec3 dir = normalize(diff);
  return origin == pos ? vec3(0) : dir * (eqLength - r) * (0.005 * dims*dims);
}

// vec3 crossForce(vec2 nc0, vec2 nc1, vec3 origin){
  // vec3 p0 = texelFetch(posTex, nc0).xyz;
  // vec3 p1 = texelFetch(posTex, nc1).xyz;
  // vec3 d0 = normalize(p0 - origin);
  // vec3 d1 = normalize(p1 - origin);
  // vec3 axis = cross(d1, d0);
  // vec3 fDir0 = normalize(cross(axis, d0));
  // vec3 fDir1 = normalize(cross(d1, axis));
  // return origin == p0 || origin == p1 ? vec3(0) : (1.0 + dot(d1, d0)) * (fDir0 + fDir1) * 0.2;
// }

vec3 acceleration(vec3 pos) {
  vec3 diff = center - pos;
  float r = length(diff);
  vec3 dir = normalize(diff);
  vec3 acc = neighborForce(vec2(1.0, 0.0), pos);
  acc += neighborForce(vec2(-1.0, 0.0), pos);
  acc += neighborForce(vec2(0.0, 1.0), pos);
  // acc += crossForce(vec2(0.0, 1.0), vec2(0.0, -1.0), pos);
  // acc += crossForce(vec2(1.0, 0.0), vec2(-1.0, 0.0), pos);
  //acc.z += texture2D(imageTex,pos.xy * 0.25 + vec2(0.5)).r * 0.0001;
  return acc + neighborForce(vec2(0.0, -1.0), pos) + GRAVITY + (-dir * (0.0002 / (r*r)));
}

void main(void) {
  float DELTA_T = 0.02;
  vec3 pos_t0 = texelFetch(posTex, vec2(0)).xyz;
  vec3 vel_t0 = texelFetch(velTex, vec2(0)).xyz;
  vec3 acc_t0 = texelFetch(accTex, vec2(0)).xyz;
  // euler
  vec3 acc_t1 = acceleration(pos_t0);
  vec3 vel_t1 = vel_t0 + acc_t1 * DELTA_T;
  vec3 pos_t1 = floor(gl_FragCoord.xy) == vec2(0,dims-1.0) || floor(gl_FragCoord.xy) == vec2(dims-1.0,dims-1.0) ? pos_t0 : pos_t0 + vel_t1 * DELTA_T;
  // velocity verlet (broken)
  // vec3 pos_t1 = pos_t0 + vel_t0 * DELTA_T + 0.5 * acc_t0 * DELTA_T * DELTA_T;
  // vec3 acc_t1 = acceleration(pos_t1);
  // vec3 vel_t1 = vel_t0 + 0.5 * (acc_t0 + acc_t1) * DELTA_T;
  gl_FragData[0] = vec4(pos_t1, 1); // position
  gl_FragData[1] = vec4(vel_t1 * 0.9998, 1); // velocity
  gl_FragData[2] = vec4(acc_t1, 1); // acceleration
}
