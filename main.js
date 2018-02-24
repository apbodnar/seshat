"use strict";
function Particles(){
  let gl;
  let programs = {};
  let buffers = {};
  let textures = {position: [], velocity: [], acceleration: []};
  let simulationFrameBuffers = [];
  let pingpong = 0;
  let scale = 1;
  let texDims = 256;
  let invTexDims = 1/texDims;
  let numPoints = texDims*texDims;
  let perspective = mat4.perspective(mat4.create(), 1.6, window.innerWidth/window.innerHeight, 0.1, 10);
  let rotation = mat4.translate(mat4.create(), mat4.create(), [0,0,-3]);
  let center = new Float32Array([0,3,0.05]);
  let isFramed = !!window.frameElement;
  let active = !isFramed;
  let draw_buffer_ext;

  let paths = [
    "shader/simulation.vs",
    "shader/simulation.fs",
    "shader/draw.vs",
    "shader/draw.fs",
    "texture/depth.png",
    "texture/depth.jpg"
  ];

  let assets = {};

  function initGL(canvas) {
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0.5, 0.5, 0.5, 1.0);
  }

  function getShader(gl, str, id) {
    let shader = gl.createShader(gl[id]);
    gl.shaderSource(shader, str);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log(id, gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  function createFloatTexture(array) {
    let t = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, t ) ;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, texDims, texDims, 0, gl.RGB, gl.FLOAT, array);
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture( gl.TEXTURE_2D, null );
    return t;
  }
  
  function createImageTexture(image){
    let t = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, t ) ;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.bindTexture( gl.TEXTURE_2D, null );
    return t;
  }

  function createFramebuffer(posTex, velTex, accTex){
    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, draw_buffer_ext.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, posTex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, draw_buffer_ext.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, velTex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, draw_buffer_ext.COLOR_ATTACHMENT2_WEBGL, gl.TEXTURE_2D, accTex, 0);
    draw_buffer_ext.drawBuffersWEBGL([
      draw_buffer_ext.COLOR_ATTACHMENT0_WEBGL,
      draw_buffer_ext.COLOR_ATTACHMENT1_WEBGL,
      draw_buffer_ext.COLOR_ATTACHMENT2_WEBGL
    ]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fbo;
  }

  function initProgram(path, uniforms, attributes) {
    let fs = getShader(gl, assets[path+".fs"],"FRAGMENT_SHADER");
    let vs = getShader(gl, assets[path+".vs"],"VERTEX_SHADER");
    let program = gl.createProgram();
    program.uniforms = {};
    program.attributes = {};
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);
    uniforms.forEach(function(name){
      program.uniforms[name] = gl.getUniformLocation(program, name);
    });
    attributes.forEach(function(name){
      program.attributes[name] = gl.getAttribLocation(program, name);
    });

    return program;
  }

  function createQuadBuffer(){
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    let vertices = [];
    let quad = [
      1.0,  1.0,  0.0,
     -1.0,  1.0,  0.0,
      1.0, -1.0,  0.0,
     -1.0,  1.0,  0.0,
      1.0, -1.0,  0.0,
     -1.0, -1.0,  0.0
    ];
    for(let i=0;i<numPoints;i++){
      Array.prototype.push.apply(vertices,quad);
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return buffer;
  }

  function createCoordBuffer(){
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    let vertices = [];
    for(let i=0;i<texDims;i++){
      for(let j=0;j<texDims;j++){
        vertices.push(j,i);
      }
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return buffer;
  }
  
  function createIndexBuffer(){
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    var plane_indices = [];
    var push = function(e){
      plane_indices.push(e);
    };
    for(var j=0; j< texDims-1; j++){
      for(var i=0; i<texDims-1; i++){
        [i+(j*texDims),i+((j+1)*texDims),i+((j+1)*texDims)+1].forEach(push);
        [i+((j+1)*texDims)+1,i+(j*texDims)+1,i+(j*texDims)].forEach(push);
      }
    }

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(plane_indices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    buffer.size = plane_indices.length;
    return buffer;
  }

  function initSimBuffer(){
    let program = programs.sim;
    let v0 = new Float32Array(numPoints*3);
    let tv1 = [];
    let v2 = new Float32Array(numPoints*3);
    for ( let i=0; i<texDims; i++ ){
      for ( let j=0; j<texDims; j++ ){
        
        tv1.push((j - texDims / 2)*invTexDims * 5);
        tv1.push(3)
        tv1.push(2.5 - (i - texDims / 2)*invTexDims * 5);
      }
    }
    let v1 = new Float32Array(tv1);
    // for ( let i=0; i<numPoints*3; i+=3 ){
    //   v1[i] = ((i % texDims) - (texDims / 2)) * invTexDims * 3;
    //   v1[i+1] = (Math.floor((i / 3) / texDims) - (texDims / 2)) * invTexDims * 3;
    //   v1[i+2] = 1;
    // }

    //v0[2] = 0.1;
    // for ( let i=0; i<numPoints*3; i+=3 ){
    //   v0[i] = 0.0;
    //   v0[i+1] = 0.0;
    //   v0[i+2] = 0.0;
    // }

    buffers.quad = createQuadBuffer();
    buffers.coords = createCoordBuffer();
    buffers.indices = createIndexBuffer();
    textures.velocity.push(createFloatTexture(v0));
    textures.velocity.push(createFloatTexture(v0));
    textures.position.push(createFloatTexture(v1));
    textures.position.push(createFloatTexture(v1));
    textures.image = createImageTexture(assets["texture/depth.jpg"])
    textures.acceleration.push(createFloatTexture(v2));
    textures.acceleration.push(createFloatTexture(v2));
    simulationFrameBuffers.push(createFramebuffer(textures.position[0], textures.velocity[0], textures.acceleration[0]));
    simulationFrameBuffers.push(createFramebuffer(textures.position[1], textures.velocity[1], textures.acceleration[1]));
  }

  function initBuffers(){
    initSimBuffer();
  }

  function initPrograms(){
    gl.getExtension('OES_element_index_uint');
    gl.getExtension('OES_texture_float');
    draw_buffer_ext = gl.getExtension('WEBGL_draw_buffers');
    programs.simulation = initProgram("shader/simulation",["velTex","posTex","accTex","imageTex","dims","invDims","tick","center"],["quad"]);
    programs.draw = initProgram("shader/draw",["velTex", "posTex","accTex","imageTex","invDims","perspective","rotation", "center"],["coords"]);
  }

  function callSimulation(i){
    let program = programs.simulation;
    gl.disable(gl.BLEND);
    gl.useProgram(program);
    gl.uniform1f(program.uniforms.scale, scale);
    gl.uniform1i(program.uniforms.posTex, 0);
    gl.uniform1i(program.uniforms.velTex, 1);
    gl.uniform1i(program.uniforms.accTex, 2);
    gl.uniform1i(program.uniforms.imageTex, 3);
    gl.uniform1f(program.uniforms.dims, texDims);
    gl.uniform1i(program.uniforms.tick, i);
    gl.uniform2f(program.uniforms.invDims, invTexDims, invTexDims);
    gl.uniform3fv(program.uniforms.center, center);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.position[i%2]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity[i%2]);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, textures.acceleration[i%2]);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, textures.image);

    gl.bindFramebuffer(gl.FRAMEBUFFER, simulationFrameBuffers[(i+1)%2]);
    gl.viewport(0,0,texDims,texDims);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.quad);
    gl.vertexAttribPointer(program.attributes.quad, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.attributes.quad);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 6);
  }

  function callSim(i){
    for(let i = 0; i < 60; i++){
      callSimulation(i);
    }
  }

  function callDraw(i){
    let program = programs.draw;
    // gl.enable(gl.BLEND);
    // gl.blendFunc(gl.SRC_COLOR, gl.ONE);
    
    gl.useProgram(program);
    gl.uniform1i(program.uniforms.posTex, 0);
    gl.uniform1i(program.uniforms.velTex, 1);
    gl.uniform1i(program.uniforms.accTex, 2);
    gl.uniform1i(program.uniforms.imageTex, 3);
    gl.uniform2f(program.uniforms.invDims, invTexDims, invTexDims);
    gl.uniform3fv(program.uniforms.center, center);
    gl.uniformMatrix4fv(program.uniforms.perspective, false, perspective);
    gl.uniformMatrix4fv(program.uniforms.rotation, false, rotation);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.viewport(0,0,window.innerWidth,window.innerHeight);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.position[(i+1)%2]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity[(i+1)%2]);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, textures.acceleration[(i+1)%2]);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, textures.image);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.coords);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    
    gl.vertexAttribPointer(program.attributes.coords, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.attributes.coords);
    gl.drawElements(gl.TRIANGLES,buffers.indices.size, gl.UNSIGNED_INT, 0);
  }

  function initListeners(){
    let canvas = document.getElementById("trace");
    let xi, yi;
    let moving = false;
    let down = false;
    canvas.addEventListener("mousedown", function(e){
      xi = e.layerX;
      yi = e.layerY;
      moving = false;
      down = true;
    }, false);
    canvas.addEventListener("mousemove", function(e){
      if(down){
        moving = true;
        // mat4.rotateY(rotation, rotation,(e.layerX - xi)*0.01);
        // mat4.rotateX(rotation, rotation,(e.layerY - yi)*0.01);
        xi = e.layerX;
        yi = e.layerY;
        center[0] = 3*(2*xi/canvas.width - 1);
        center[1] = 3*(-2*yi/canvas.height + 1);
      }
    }, false);
    
    canvas.addEventListener("wheel", function(e){
      mat4.rotateY(rotation, rotation,e.deltaY*0.001);
    });
    // canvas.addEventListener("mouseup", function(){
      // down = false;
      // if(!moving){
        // center[0] = 3*(2*xi/canvas.width - 1);
        // center[1] = 3*(-2*yi/canvas.height + 1);
      // }
    // }, false);
  }

  function tick() {
    requestAnimationFrame(tick);
    if(active){
      pingpong++;
      callSim(pingpong);
      callDraw(pingpong);
    }
  }

  function start(res) {
    window.addEventListener("mouseover",function(){ active = true; });
    window.addEventListener("mouseout",function(){ active = !isFramed; });
    assets = res;
    let canvas = document.getElementById("trace");
    initGL(canvas);
    initListeners();
    initPrograms();
    initBuffers();
    tick();
  }

  loadAll(paths,start);
};

new Particles();

