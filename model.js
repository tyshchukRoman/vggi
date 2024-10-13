'use strict';

// Constructor
function Model(name) {
  this.name = name;
  this.buffers = [];
  this.counts = [];

  // scale factor
  this.scale = 0.2;

  // constants
  this.a = 1.5;
  this.b = 3;
  this.c = 2;
  this.d = 4;

  this.BufferData = function(verticesArray) {
    verticesArray.forEach(vertices => {
      let buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
      this.buffers.push(buffer);
      this.counts.push(vertices.length / 3);
    });
  };

  this.Draw = function() {
    this.buffers.forEach((buffer, index) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(shProgram.iAttribVertex);
      gl.drawArrays(gl.LINE_STRIP, 0, this.counts[index]);
    });
  };

  this.CreateSurfaceData = function(stepsT = 30, stepsV = 30) {
    let stepT = (2 * Math.PI) / stepsT;
    let stepV = (2 * Math.PI) / stepsV;

    let verticesT = this.generatePolylineT(stepT, stepV);
    let verticesV = this.generatePolylineV(stepT, stepV);

    return { verticesT, verticesV };
  }

  this.generatePolylineT = function(stepT, stepV) {
    const a = this.a; 
    const b = this.b; 
    const c = this.c; 
    const d = this.d; 

    const vertices = [];

    for (let t = 0; t <= 2 * Math.PI; t += stepT) {
      for (let v = 0; v <= 2 * Math.PI; v += stepV) {
        let cos_t = Math.cos(t);
        let sin_t = Math.sin(t);
        let cos_v = Math.cos(v);
        let sin_v = Math.sin(v);

        let f_v = this.f(v);

        let x = 0.5 * ((f_v * (1 + cos_t) + (d * d - c * c) * (1 - cos_t) / f_v) * cos_v);
        let y = 0.5 * ((f_v * (1 + cos_t) + (d * d - c * c) * (1 - cos_t) / f_v) * sin_v);
        let z = 0.5 * ((f_v - (d * d - c * c) / f_v) * sin_t);

        x = x * this.scale;
        y = y * this.scale;
        z = z * this.scale;

        vertices.push(x, y, z);
      }
    }

    return vertices;
  }

  this.generatePolylineV = function(stepT, stepV) {
    const a = this.a; 
    const b = this.b; 
    const c = this.c; 
    const d = this.d; 

    const vertices = [];

    for (let v = 0; v <= 2 * Math.PI; v += stepV) {
      for (let t = 0; t <= 2 * Math.PI; t += stepT) {
        let cos_t = Math.cos(t);
        let sin_t = Math.sin(t);
        let cos_v = Math.cos(v);
        let sin_v = Math.sin(v);

        let f_v = this.f(v);

        let x = 0.5 * ((f_v * (1 + cos_t) + (d * d - c * c) * (1 - cos_t) / f_v) * cos_v);
        let y = 0.5 * ((f_v * (1 + cos_t) + (d * d - c * c) * (1 - cos_t) / f_v) * sin_v);
        let z = 0.5 * ((f_v - (d * d - c * c) / f_v) * sin_t);

        x = x * this.scale;
        y = y * this.scale;
        z = z * this.scale;

        vertices.push(x, y, z);
      }
    }

    return vertices;
  }

  this.f = function(v) {
    const a = this.a; 
    const b = this.b; 
    const c = this.c; 
    const d = this.d; 

    return (a * b) / Math.sqrt(a * a * Math.sin(v) ** 2 + b * b * Math.cos(v) ** 2);
  }
}

