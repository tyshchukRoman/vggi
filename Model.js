function get(name) {
    return parseFloat(document.getElementById(name).value);
}

function calculateFacetNormal(v1, v2, v3) {
    const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
    const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];

    const normal = [
        edge1[1] * edge2[2] - edge1[2] * edge2[1],
        edge1[2] * edge2[0] - edge1[0] * edge2[2],
        edge1[0] * edge2[1] - edge1[1] * edge2[0]
    ];

    return m4.normalize(normal, []);
}

function calculateNormals(vertices, indices) {
    const vertexNormals = new Float32Array(vertices.length).fill(0);
    const facetNormals = [];

    for (let i = 0; i < indices.length; i += 3) {
        const idx1 = indices[i] * 3;
        const idx2 = indices[i + 1] * 3;
        const idx3 = indices[i + 2] * 3;

        const v1 = vertices.slice(idx1, idx1 + 3);
        const v2 = vertices.slice(idx2, idx2 + 3);
        const v3 = vertices.slice(idx3, idx3 + 3);

        const facetNormal = calculateFacetNormal(v1, v2, v3);
        facetNormals.push({ normal: facetNormal, indices: [indices[i], indices[i + 1], indices[i + 2]] });
    }

    facetNormals.forEach(facet => {
        const { normal, indices } = facet;

        indices.forEach(idx => {
            const baseIndex = idx * 3;
            
            vertexNormals[baseIndex] += normal[0];
            vertexNormals[baseIndex + 1] += normal[1];
            vertexNormals[baseIndex + 2] += normal[2];
        });
    });

    for (let i = 0; i < vertexNormals.length; i += 3) {
        const length = Math.sqrt(
            vertexNormals[i] * vertexNormals[i] +
            vertexNormals[i + 1] * vertexNormals[i + 1] +
            vertexNormals[i + 2] * vertexNormals[i + 2]
        );
        vertexNormals[i] /= length;
        vertexNormals[i + 1] /= length;
        vertexNormals[i + 2] /= length;
    }

    return vertexNormals;
}

function ModelBuilder() {
    const a = get('A');
    const b = get('B');
    const c = get('C');
    const d = get('D');

    const uSteps = get('USteps');
    const vSteps = get('VSteps');

    const uMin = 0.0;
    const uMax = Math.PI * 2;
    
    const vMin = 0.0;
    const vMax = Math.PI * 2;

    const du = (uMax - uMin) / uSteps;
    const dv = (vMax - vMin) / vSteps;


    this.f = function(v) {
        return (a * b) / Math.sqrt(a ** 2 * Math.sin(v) ** 2 + b ** 2 * Math.cos(v) ** 2);
    }
      
    this.fx = function(t, v) {
        const fv = this.f(v, a, b);
        return 0.5 * (fv * (1 + Math.cos(t)) + (d ** 2 - c ** 2) * (1 - Math.cos(t)) / fv) * Math.cos(v);
    }
      
    this.fy = function(t, v) {
        const fv = this.f(v, a, b);
        return 0.5 * (fv * (1 + Math.cos(t)) + (d ** 2 - c ** 2) * (1 - Math.cos(t)) / fv) * Math.sin(v);
    }
      
    this.fz = function(t, v) {
        const fv = this.f(v, a, b);
        return 0.5 * (fv - (d ** 2 - c ** 2) / fv) * Math.sin(t);
    }

    this.build = function() {
        const vertices = [];
        const indices = [];

        for (let i = 0; i <= uSteps; i++) {
            const u = uMin + i * du;
            for (let j = 0; j <= vSteps; j++) {
                const v = vMin + j * dv;
         
                const x = this.fx(u, v);
                const y = this.fy(u, v);
                const z = this.fz(u, v);
    
                vertices.push(x, y, z);
            }
        }
    
        for (let i = 0; i < uSteps; i++) {
            for (let j = 0; j < vSteps; j++) {
                const topLeft = i * (vSteps + 1) + j;
                const topRight = i * (vSteps + 1) + (j + 1);
                const bottomLeft = (i + 1) * (vSteps + 1) + j;
                const bottomRight = (i + 1) * (vSteps + 1) + (j + 1);
    
                indices.push(topLeft, bottomLeft, bottomRight);
                indices.push(topLeft, bottomRight, topRight);
            }
        }

        const normals = calculateNormals(vertices, indices);
        return { vertices, normals, indices };
    }
}


function Model(gl, shProgram) {
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices, normals, indices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        this.count = indices.length;
    };

    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);

        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    }

    this.CreateSurfaceData = function() {
        let builder = new ModelBuilder();
        const { vertices, normals, indices } = builder.build();
        this.BufferData(vertices, normals, indices);
    }
}
