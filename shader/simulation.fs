#extension GL_EXT_draw_buffers : require

precision highp float;

uniform int tick;
uniform vec2 invDims;
uniform vec3 center;
uniform float dims;
uniform float deltaT;
uniform float springK;
uniform sampler2D accTex;
uniform sampler2D velTex;
uniform sampler2D posTex;

const vec3 GRAVITY = vec3(0,-0.0002,0);
float eqLength = invDims.x * 5.0;

vec4 texelFetch(sampler2D tex, vec2 coords){
  return texture2D(tex, (gl_FragCoord.xy + coords)*invDims);
}

vec3 neighborForce(vec3 neighbor, vec3 origin){
  vec3 diff = origin - neighbor;
  float r = length(diff);
  vec3 dir = diff / r;
  return dir * (eqLength - r) * (springK * dims*dims);
}

vec3 nextNeighborForce(vec3 neighbor, vec3 nextNeighbor, vec3 origin){
  vec3 eqPoint = normalize(neighbor - nextNeighbor) * eqLength + neighbor;
  return origin == nextNeighbor || origin == neighbor ? vec3(0) : springK * clamp((eqPoint - origin), vec3(-0.01), vec3(0.01));
}

vec3 directionalForce(vec2 coords, vec3 origin){
  vec4 neighbor = texelFetch(posTex, coords);
  vec3 nextNeighbor = texelFetch(posTex, coords * 2.0).xyz;
  vec3 force = neighborForce(neighbor.xyz, origin) + nextNeighborForce(neighbor.xyz, nextNeighbor, origin);
  return origin == neighbor.xyz ? vec3(0) : force * neighbor.w;
}

vec3 acceleration(vec3 pos) {
  vec3 acc = directionalForce(vec2(1.0, 0.0), pos);
  acc += directionalForce(vec2(-1.0, 0.0), pos);
  acc += directionalForce(vec2(0.0, 1.0), pos);
  return acc + directionalForce(vec2(0.0, -1.0), pos) + GRAVITY;// + (-dir * (0.0002 / (r*r)));
}

void main(void) {
  vec4 pos_t0 = texelFetch(posTex, vec2(0));
  vec3 vel_t0 = texelFetch(velTex, vec2(0)).xyz;
  vec3 acc_t0 = texelFetch(accTex, vec2(0)).xyz;
  float cut = pos_t0.a * distance(pos_t0.xy, center.xy) < invDims.x * 3.0 ? center.z * pos_t0.a : 1.0;
  // velocity verlet
  vec3 acc_t1 = acceleration(pos_t0.xyz);
  vec3 vel_t1 = vel_t0 + 0.5 * (acc_t0 + acc_t1) * deltaT;
  vec3 pos_t1 = floor(gl_FragCoord.xy) == vec2(0,dims-1.0) || floor(gl_FragCoord.xy) == vec2(dims-1.0,dims-1.0) ? pos_t0.xyz : pos_t0.xyz + vel_t1 * deltaT + 0.5 * acc_t1 * deltaT * deltaT;
  gl_FragData[0] = vec4(pos_t1 * cut, cut); // position
  gl_FragData[1] = vec4(vel_t1 * 0.9999, 1); // velocity
  gl_FragData[2] = vec4(acc_t1, 1); // acceleration
}
