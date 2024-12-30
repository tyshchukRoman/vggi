function get(name) {
    return parseFloat(document.getElementById(name).value);
}

function normalizeUV(value, min, max) {
    return (value - min) / (max - min);
}

function calculateFacetNormal(v1, v2, v3) {
    const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
    const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];

    const normal = [
        edge1[1] * edge2[2] - edge1[2] * edge2[1],
        edge1[2] * edge2[0] - edge1[0] * edge2[2],
        edge1[0] * edge2[1] - edge1[1] * edge2[0]
    ];

    return m4.normalize(normal, [0, 1, 0]);
}

function calculateTangent(v1, v2, v3, uv1, uv2, uv3) {
    const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
    const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];

    const deltaUV1 = [uv2[0] - uv1[0], uv2[1] - uv1[1]];
    const deltaUV2 = [uv3[0] - uv1[0], uv3[1] - uv1[1]];

    const r = 1.0 / (deltaUV1[0] * deltaUV2[1] - deltaUV1[1] * deltaUV2[0]);

    const tangent = [
        r * (deltaUV2[1] * edge1[0] - deltaUV1[1] * edge2[0]),
        r * (deltaUV2[1] * edge1[1] - deltaUV1[1] * edge2[1]),
        r * (deltaUV2[1] * edge1[2] - deltaUV1[1] * edge2[2])
    ];

    return m4.normalize(tangent, [1, 0, 0]);
}

function calculateNormalsAndTangents(vertices, uvs, indices) {
    const normals = new Float32Array(vertices.length).fill(0);
    const tangents = new Float32Array(vertices.length).fill(0);

    const facetNormals = [];
    const facetTangents = [];

    for (let i = 0; i < indices.length; i += 3) {
        const idx1 = indices[i];
        const idx2 = indices[i + 1];
        const idx3 = indices[i + 2];

        const v1 = vertices.slice(idx1 * 3, idx1 * 3 + 3);
        const v2 = vertices.slice(idx2 * 3, idx2 * 3 + 3);
        const v3 = vertices.slice(idx3 * 3, idx3 * 3 + 3);
        
        const facetNormal = calculateFacetNormal(v1, v2, v3);
        facetNormals.push({ normal: facetNormal, indices: [indices[i], indices[i + 1], indices[i + 2]] });

        const uv1 = uvs.slice(idx1 * 2, idx1 * 2 + 2);
        const uv2 = uvs.slice(idx2 * 2, idx2 * 2 + 2);
        const uv3 = uvs.slice(idx3 * 2, idx3 * 2 + 2);

        const facetTangent = calculateTangent(v1, v2, v3, uv1, uv2, uv3);
        facetTangents.push({ tangent: facetTangent, indices: [indices[i], indices[i + 1], indices[i + 2]] });
    }

    facetNormals.forEach(facet => {
        const { normal, indices } = facet;

        indices.forEach(idx => {
            const baseIndex = idx * 3;
            
            normals[baseIndex] += normal[0];
            normals[baseIndex + 1] += normal[1];
            normals[baseIndex + 2] += normal[2];
        });
    });

    facetTangents.forEach(facet => {
        const { tangent, indices } = facet;
        indices.forEach(idx => {
            const baseIndex = idx * 3;
            
            tangents[baseIndex] += tangent[0];
            tangents[baseIndex + 1] += tangent[1];
            tangents[baseIndex + 2] += tangent[2];
        });
    });

    for (let i = 0; i < normals.length; i += 3) {
        const length = Math.sqrt(
            normals[i] * normals[i] +
            normals[i + 1] * normals[i + 1] +
            normals[i + 2] * normals[i + 2]
        );
        normals[i] /= length;
        normals[i + 1] /= length;
        normals[i + 2] /= length;
    }

    for (let i = 0; i < tangents.length; i += 3) {
        const tangentLength = Math.sqrt(
            tangents[i] * tangents[i] +
            tangents[i + 1] * tangents[i + 1] +
            tangents[i + 2] * tangents[i + 2]
        );
        tangents[i] /= tangentLength;
        tangents[i + 1] /= tangentLength;
        tangents[i + 2] /= tangentLength;
    }

    return {normals, tangents};
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
        const uvs = [];
        const indices = [];

        for (let i = 0; i <= uSteps; i++) {
            const u = uMin + i * du;
            for (let j = 0; j <= vSteps; j++) {
                const v = vMin + j * dv;
         
                const x = this.fx(u, v);
                const y = this.fy(u, v);
                const z = this.fz(u, v);
    
                vertices.push(x, y, z);
                uvs.push(normalizeUV(u, uMin, uMax), normalizeUV(v, vMin, vMax));
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

        const {normals, tangents} = calculateNormalsAndTangents(vertices, uvs, indices);
        return { vertices, normals, tangents, uvs, indices };
    }
}

function Model(gl, shProgram) {
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iTangentBuffer = gl.createBuffer();
    this.iUVBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();

    this.idTextureDiffuse = LoadTexture(gl, "./textures/diffuse.jpg");
    this.idTextureNormal = LoadTexture(gl, "./textures/normal.jpg");
    this.idTextureSpecular = LoadTexture(gl, "./textures/specular.jpg");

    this.point = [0.5, 0.5];
    this.uvBuffer = [];
    this.indexBuffer = [];

    this.count = 0;

    this.BufferData = function(vertices, normals, tangents, uvs, indices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tangents), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iUVBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

        this.uvBuffer = uvs;
        this.indexBuffer = indices;

        this.count = indices.length;
    };

    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTangent, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTangent);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iUVBuffer);
        gl.vertexAttribPointer(shProgram.iAttribUV, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribUV);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.idTextureDiffuse);
        
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.idTextureNormal);
        
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.idTextureSpecular);

        gl.uniform2fv(shProgram.iPoint, this.point);
        gl.uniform1f(shProgram.iAngle, parseFloat(document.getElementById('Angle').value) * (Math.PI / 180.0));

        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_INT, 0);
    }

    this.CreateSurfaceData = function() {
        let builder = new ModelBuilder();
        const { vertices, normals, tangents, uvs, indices } = builder.build();
        this.BufferData(vertices, normals, tangents, uvs, indices);
    }
}
