function deg2rad(angle) {
    return angle * Math.PI / 180;
}


function Vertex(p)
{
    this.p = p;
    this.normal = [];
    this.triangles = [];
}

function Triangle(v0, v1, v2)
{
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    this.normal = [];
    this.tangent = [];
}

// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices, indices) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STREAM_DRAW);

        this.count = indices.length;
    }

    this.Draw = function() {

        //gl.drawArrays(gl.LINE_STRIP, 0, this.count);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    }
}


function CreateSurfaceData(data) {
    let vertices = [];
    let triangles = [];

    let scale = 0.1;

    let a = 1.5; // Example value for a
    let b = 3.0; // Example value for b
    let c = 2.0; // Example value for c
    let d = 4.0; // Example value for d
    
    // Define the function f(v)
    function f(v) {
        return (a * b) / Math.sqrt(a * a * Math.sin(v) * Math.sin(v) + b * b * Math.cos(v) * Math.cos(v));
    }

    // Generate vertices for the surface
    let tSteps = 72;  // Number of t steps
    let vSteps = 36;  // Number of v steps
    for (let t = 0; t < tSteps; t++) {
        let tAngle = 2 * Math.PI * t / tSteps;
        for (let v = 0; v < vSteps; v++) {
            let vAngle = 2 * Math.PI * v / vSteps;

            let fVal = f(vAngle);
            
            // Parametric equations for x, y, and z
            let x = scale * (fVal * (1 + Math.cos(tAngle)) + (d * d - c * c) * (1 - Math.cos(tAngle)) / fVal) * Math.cos(vAngle);
            let y = scale * (fVal * (1 + Math.cos(tAngle)) + (d * d - c * c) * (1 - Math.cos(tAngle)) / fVal) * Math.sin(vAngle);
            let z = scale * (fVal - (d * d - c * c) / fVal) * Math.sin(tAngle);

            // Create a new vertex
            vertices.push(new Vertex([x, y, z]));
        }
    }

    // Create triangles to form the surface (using two adjacent vertices to form each quad)
    for (let t = 0; t < tSteps - 1; t++) {
        for (let v = 0; v < vSteps - 1; v++) {
            let v0 = t * vSteps + v;
            let v1 = v0 + 1;
            let v2 = (t + 1) * vSteps + v;
            let v3 = v2 + 1;

            // Triangle 1: (v0, v1, v2)
            let tri1 = new Triangle(v0, v1, v2);
            triangles.push(tri1);
            vertices[v0].triangles.push(triangles.length - 1);
            vertices[v1].triangles.push(triangles.length - 1);
            vertices[v2].triangles.push(triangles.length - 1);

            // Triangle 2: (v1, v3, v2)
            let tri2 = new Triangle(v1, v3, v2);
            triangles.push(tri2);
            vertices[v1].triangles.push(triangles.length - 1);
            vertices[v3].triangles.push(triangles.length - 1);
            vertices[v2].triangles.push(triangles.length - 1);
        }
    }

    // Flatten vertices into a Float32Array for WebGL
    data.verticesF32 = new Float32Array(vertices.length * 3);
    for (let i = 0, len = vertices.length; i < len; i++) {
        data.verticesF32[i * 3 + 0] = vertices[i].p[0];
        data.verticesF32[i * 3 + 1] = vertices[i].p[1];
        data.verticesF32[i * 3 + 2] = vertices[i].p[2];
    }

    // Flatten triangles into a Uint16Array for WebGL
    data.indicesU16 = new Uint16Array(triangles.length * 3);
    for (let i = 0, len = triangles.length; i < len; i++) {
        data.indicesU16[i * 3 + 0] = triangles[i].v0;
        data.indicesU16[i * 3 + 1] = triangles[i].v1;
        data.indicesU16[i * 3 + 2] = triangles[i].v2;
    }
}
