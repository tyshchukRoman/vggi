'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.buffers = [];
    this.counts = [];

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
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let projection = m4.perspective(Math.PI / 8, 1, 8, 12);
    let modelView = spaceball.getViewMatrix();
    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);

    surface.Draw();
}

function CreateVirichCyclicSurfaceData(a = 1.5, b = 3, c = 2, d = 4, stepsT = 30, stepsV = 30) {
    let verticesT = []; // Polyline along t
    let verticesV = []; // Polyline along v

    let stepT = (2 * Math.PI) / stepsT;
    let stepV = (2 * Math.PI) / stepsV;

    // Helper function to calculate f(v)
    function f(v) {
        return (a * b) / Math.sqrt(a * a * Math.sin(v) ** 2 + b * b * Math.cos(v) ** 2);
    }

    const scale = 0.2;

    // Generate vertices along t (fix v for each t)
    for (let t = 0; t <= 2 * Math.PI; t += stepT) {
        for (let v = 0; v <= 2 * Math.PI; v += stepV) {
            let cos_t = Math.cos(t);
            let sin_t = Math.sin(t);
            let cos_v = Math.cos(v);
            let sin_v = Math.sin(v);

            let f_v = f(v);

            let x = 0.5 * ((f_v * (1 + cos_t) + (d * d - c * c) * (1 - cos_t) / f_v) * cos_v);
            let y = 0.5 * ((f_v * (1 + cos_t) + (d * d - c * c) * (1 - cos_t) / f_v) * sin_v);
            let z = 0.5 * ((f_v - (d * d - c * c) / f_v) * sin_t);

            x = x * scale;
            y = y * scale;
            z = z * scale;

            verticesT.push(x, y, z); // Store vertices along t
        }
    }

    // Generate vertices along v (fix t for each v)
    for (let v = 0; v <= 2 * Math.PI; v += stepV) {
        for (let t = 0; t <= 2 * Math.PI; t += stepT) {
            let cos_t = Math.cos(t);
            let sin_t = Math.sin(t);
            let cos_v = Math.cos(v);
            let sin_v = Math.sin(v);

            let f_v = f(v);

            let x = 0.5 * ((f_v * (1 + cos_t) + (d * d - c * c) * (1 - cos_t) / f_v) * cos_v);
            let y = 0.5 * ((f_v * (1 + cos_t) + (d * d - c * c) * (1 - cos_t) / f_v) * sin_v);
            let z = 0.5 * ((f_v - (d * d - c * c) / f_v) * sin_t);

            x = x * scale;
            y = y * scale;
            z = z * scale;

            verticesV.push(x, y, z); // Store vertices along v
        }
    }

    return { verticesT, verticesV };
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");

    surface = new Model('VirichCyclicSurface');
    let { verticesT, verticesV } = CreateVirichCyclicSurfaceData(); // Generate surface data
    surface.BufferData([verticesT, verticesV]);

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}
