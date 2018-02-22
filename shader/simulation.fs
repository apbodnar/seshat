#extension GL_EXT_draw_buffers : require

precision highp float;

uniform int tick;
uniform vec2 invDims;
uniform vec3 center;
uniform float dims;
uniform sampler2D accTex;
uniform sampler2D velTex;
uniform sampler2D posTex;

vec4 texelFetch(sampler2D tex, vec2 coords){
  return texture2D(tex, (gl_FragCoord.xy + coords)*invDims);
}

vec3 neighborForce(vec2 coords, vec3 origin){
  vec3 pos = texelFetch(posTex, coords).xyz;
  float eqLength = invDims.x * 5.0;
  vec3 diff = origin - pos;
  float r = length(diff);
  vec3 dir = normalize(diff);
  return origin == pos ? vec3(0) : dir * (eqLength - r) * 20.0;
}

vec3 acceleration(vec3 pos) {
  vec3 acc = neighborForce(vec2(1.0, 0.0), pos);
  acc += neighborForce(vec2(-1.0, 0.0), pos);
  acc += neighborForce(vec2(0.0, 1.0), pos);
  return acc + neighborForce(vec2(0.0, -1.0), pos) + vec3(0,-0.05,0);
}

void main(void) {
  float dt = 0.04;
  vec3 pos_t0 = texelFetch(posTex, vec2(0)).xyz;
  vec3 vel_t0 = texelFetch(velTex, vec2(0)).xyz;
  vec3 acc_t0 = texelFetch(accTex, vec2(0)).xyz;
  vec3 pos_t1 = floor(gl_FragCoord.xy) == vec2(0,dims-1.0) || floor(gl_FragCoord.xy) == vec2(dims-1.0,dims-1.0) ? pos_t0 : pos_t0 + vel_t0 * dt + 0.5 * acc_t0 * dt * dt;
  vec3 acc_t1 = acceleration(pos_t1);
  vec3 vel_t1 = vel_t0 + 0.5 * (acc_t0 + acc_t1) * dt;

  gl_FragData[0] = vec4(pos_t1, 1); // position
  gl_FragData[1] = vec4(vel_t1 * 0.9, 1); // velocity
  gl_FragData[2] = vec4(acc_t1, 1); // acceleration
}
