#extension GL_EXT_draw_buffers : require

precision highp float;

uniform int tick;
uniform vec2 dims;
uniform vec3 center;
uniform sampler2D accTex;
uniform sampler2D velTex;
uniform sampler2D posTex;

vec3 acceleration(vec3 p){
//  vec3 diff = center - pos;
//  float r = length(diff);
//  return (diff / (r * r));
	float sigma = 10.0;//*sin(tick/100.0);
	float beta = (8.0/3.0);//*sin(tick/50.0);
	float rho = 28.0;//*sin(tick/150.0);
	float x = sigma * (p.y - p.x);
	float y = p.x*(rho-p.z)-p.y;
	float z = p.x*p.y-beta*p.z;
	return vec3(x,y,z);  //lorenz
}

void main(void) {
  float dt = 0.002;
  vec3 pos_t0 = texture2D(posTex,gl_FragCoord.xy*dims).xyz;
  vec3 vel_t0 = texture2D(velTex,gl_FragCoord.xy*dims).xyz;
  vec3 acc_t0 = texture2D(accTex,gl_FragCoord.xy*dims).xyz;
  vec3 pos_t1 = pos_t0 + vel_t0 * dt + 0.5 * acc_t0 * dt * dt;
  vec3 acc_t1 = acceleration(pos_t1);
  vec3 vel_t1 = vel_t0 + 0.5 * (acc_t0 + acc_t1) * dt;

  gl_FragData[0] = vec4(pos_t1, 1); // position
  gl_FragData[1] = vec4(vel_t1, 1); // velocity
  gl_FragData[2] = vec4(acc_t1, 1); // acceleration
}
