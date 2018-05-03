/**
 * @particle system.
 * @author Zheng Liu
 * Modified from lab code
 */
var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;

// Create a place to store sphere geometry
var sphereVertexPositionBuffer;

//Create a place to store normals for shading
var sphereVertexNormalBuffer;

// View parameters
var eyePt = vec3.fromValues(0.0, 0.0, 8.0);
var viewDir = vec3.fromValues(0.0, 0.0, -1.0);
var up = vec3.fromValues(0.0, 1.0, 0.0);
var viewPt = vec3.fromValues(0.0, 0.0, 0.0);

// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];

//-----------------------------------------------------------------
//Color conversion  helper functions
function hexToR(h) {
    return parseInt((cutHex(h)).substring(0, 2), 16)
}

function hexToG(h) {
    return parseInt((cutHex(h)).substring(2, 4), 16)
}

function hexToB(h) {
    return parseInt((cutHex(h)).substring(4, 6), 16)
}

function cutHex(h) {
    return (h.charAt(0) == "#") ? h.substring(1, 7) : h
}


// Aarray of particles
var particles=[];


/**
    add three particles
 */
function addparticle() {
    particles.push({
                    position:
                        [Math.random() * 0.9, 
                         Math.random() * 0.9, 
                         Math.random() * 0.9
                        ],
                    
                    velocity:
                        [Math.random(),
                         Math.random(),
                         Math.random()]
                   }
                  );
    
    particles.push({
                    position:
                        [Math.random() * 0.9, 
                         Math.random() * 0.9, 
                         Math.random() * 0.9],
                    
                    velocity:
                        [Math.random(),
                         Math.random(),
                         Math.random()]
                   }
                  );
    
    particles.push({
                    position:
                        [Math.random() * 0.9, 
                         Math.random() * 0.9, 
                         Math.random() * 0.9],
                    
                    velocity:
                        [Math.random(),
                         Math.random(),
                         Math.random()]
                   }
                  );
}

/**
    clear all of the particles
 */
function removeparticle() {
    particles=[];
}

//-------------------------------------------------------------------------
/**
 * Populates buffers with data for spheres
 */
function setupSphereBuffers() {

    var sphereSoup = [];
    var sphereNormals = [];
    var numT = sphereFromSubdivision(6, sphereSoup, sphereNormals);
    console.log("Generated ", numT, " triangles");
    sphereVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereSoup), gl.STATIC_DRAW);
    sphereVertexPositionBuffer.itemSize = 3;
    sphereVertexPositionBuffer.numItems = numT * 3;
    console.log(sphereSoup.length / 9);

    // Specify normals to be able to do lighting calculations
    sphereVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals),
        gl.STATIC_DRAW);
    sphereVertexNormalBuffer.itemSize = 3;
    sphereVertexNormalBuffer.numItems = numT * 3;

    console.log("Normals ", sphereNormals.length / 3);
}

//-------------------------------------------------------------------------
/**
 * Draws a sphere from the sphere buffer
 */
function drawSphere() {
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize,
        gl.FLOAT, false, 0, 0);

    // Bind normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
        sphereVertexNormalBuffer.itemSize,
        gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, sphereVertexPositionBuffer.numItems);
}

//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform,
        false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
    mat3.fromMat4(nMatrix, mvMatrix);
    mat3.transpose(nMatrix, nMatrix);
    mat3.invert(nMatrix, nMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
    var names = ["webgl", "experimental-webgl"];
    var context = null;
    for (var i = 0; i < names.length; i++) {
        try {
            context = canvas.getContext(names[i]);
        } catch (e) {}
        if (context) {
            break;
        }
    }
    if (context) {
        context.viewportWidth = canvas.width;
        context.viewportHeight = canvas.height;
    } else {
        alert("Failed to create WebGL context!");
    }
    return context;
}

//----------------------------------------------------------------------------------
/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
    var shaderScript = document.getElementById(id);

    // If we don't find an element with the specified id
    // we do an early exit 
    if (!shaderScript) {
        return null;
    }

    // Loop through the children for the found DOM element and
    // build up the shader source code as a string
    var shaderSource = "";
    var currentChild = shaderScript.firstChild;
    while (currentChild) {
        if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
            shaderSource += currentChild.textContent;
        }
        currentChild = currentChild.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
    vertexShader = loadShaderFromDOM("shader-phong-phong-vs");
    fragmentShader = loadShaderFromDOM("shader-phong-phong-fs");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Failed to setup shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
    shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");
    shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
    shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
    shaderProgram.uniformDiffuseMaterialColor = gl.getUniformLocation(shaderProgram, "uDiffuseMaterialColor");
    shaderProgram.uniformAmbientMaterialColor = gl.getUniformLocation(shaderProgram, "uAmbientMaterialColor");
    shaderProgram.uniformSpecularMaterialColor = gl.getUniformLocation(shaderProgram, "uSpecularMaterialColor");

    shaderProgram.uniformShininess = gl.getUniformLocation(shaderProgram, "uShininess");
}


//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32Array} a diffuse material color
 * @param {Float32Array} a ambient material color
 * @param {Float32Array} a specular material color 
 * @param {Float32} the shininess exponent for Phong illumination
 */
function uploadMaterialToShader(dcolor, acolor, scolor, shiny) {
    gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColor, dcolor);
    gl.uniform3fv(shaderProgram.uniformAmbientMaterialColor, acolor);
    gl.uniform3fv(shaderProgram.uniformSpecularMaterialColor, scolor);

    gl.uniform1f(shaderProgram.uniformShininess, shiny);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function uploadLightsToShader(loc, a, d, s) {
    gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
    gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
    gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
    gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupBuffers() {
    setupSphereBuffers();
}

//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() {
    var transformVec = vec3.create();

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix, degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix, eyePt, viewPt, up);

    R = 1.0;
    G = 1.0;
    B = 0.0;
    
    //Get shiny
    shiny = 32.0;
    
    for(var i = 0; i < particles.length; i++){
        mvPushMatrix();
    
        // translate
        vec3.set(transformVec, particles[i].position[0], particles[i].position[1], particles[i].position[2]);
        mat4.translate(mvMatrix, mvMatrix,transformVec);
    
        // scale
        vec3.set(transformVec, 0.1, 0.1, 0.1);
        mat4.scale(mvMatrix, mvMatrix, transformVec);

    
        uploadLightsToShader([1, 1, 1], [0.0, 0.0, 0.0], [1.0, 1.0, 1.0], [1.0, 1.0, 1.0]);
        uploadMaterialToShader([R, G, B], [R, G, B], [1.0, 1.0, 1.0], shiny);
    
        setMatrixUniforms();
        drawSphere();
        mvPopMatrix();
    }

}

//----------------------------------------------------------------------------------
/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */

function animate() {
    var each_frame = 1/60;
    for(var i=0; i < particles.length; i++) {
        var current_frame_left = 1/60;
        
        // drag force and gravity on y direction
        particles[i].velocity[0] = particles[i].velocity[0] * Math.pow(0.8, each_frame);
        particles[i].velocity[1] = particles[i].velocity[1] * Math.pow(0.8, each_frame) - 10 * each_frame;
        particles[i].velocity[2] = particles[i].velocity[2] * Math.pow(0.8, each_frame);

        // in this frame
        while(current_frame_left > 0) {
            var wall_in_way;
            var min_time = Infinity;
            // find which is the cloest wall and the time to it
            // y
            time_y = ((1-0.1) - particles[i].position[1]) / particles[i].velocity[1];
            // if it is moving toward y and is cloest to y
            if (time_y > 0 && time_y < min_time) {
                min_time = time_y;
                if (time_y < current_frame_left) {
                    wall_in_way = "y";
                }
            }
            
            //-y ground
            time_ny = ((-1+0.1) - particles[i].position[1]) / particles[i].velocity[1];
            if (time_ny > 0 && time_ny < min_time) {
                min_time = time_ny;
                if (time_ny < current_frame_left) {
                    wall_in_way = "-y";
                }
            }
            
            
            // x
            time_x = ((1-0.1) - particles[i].position[0]) / particles[i].velocity[0];
            // if it is moving toward y and is cloest to x
            if (time_x > 0 && time_x < min_time) {
                min_time = time_x;
                if (time_x < current_frame_left) {
                    wall_in_way = "x";
                }
            }
            
            //-x
            time_nx = ((-1+0.1) - particles[i].position[0]) / particles[i].velocity[0];
            if (time_nx > 0 && time_nx < min_time) {
                min_time = time_nx;
                if (time_nx < current_frame_left) {
                    wall_in_way = "-x";
                }
            }
            
            // z
            time_z = ((1-0.1) - particles[i].position[2]) / particles[i].velocity[2];
            // if it is moving toward y and is cloest to z
            if (time_z > 0 && time_z < min_time) {
                min_time = time_z;
                if (time_z < current_frame_left) {
                    wall_in_way = "z";
                }
            }
            
            //-z
            time_nz = ((-1+0.1) - particles[i].position[2]) / particles[i].velocity[2];
            if (time_nz > 0 && time_nz < min_time) {
                min_time = time_nz;
                if (time_nz < current_frame_left) {
                    wall_in_way = "-z";
                }
            }
            
            // update position
            // no collision
            if (min_time >= current_frame_left) {
                particles[i].position[0] = particles[i].position[0] + particles[i].velocity[0] * current_frame_left;
                particles[i].position[1] = particles[i].position[1] + particles[i].velocity[1] * current_frame_left;
                particles[i].position[2] = particles[i].position[2] + particles[i].velocity[2] * current_frame_left;
                current_frame_left = 0;

            } 
            // collision
            else {
                particles[i].position[0] = particles[i].position[0] + particles[i].velocity[0] * min_time;
                particles[i].position[1] = particles[i].position[1] + particles[i].velocity[1] * min_time;
                particles[i].position[2] = particles[i].position[2] + particles[i].velocity[2] * min_time;
                // change direction
                if(wall_in_way == "y" || wall_in_way == "-y"){
                    particles[i].velocity[1] = -particles[i].velocity[1];
                }
                
                if(wall_in_way == "x" || wall_in_way == "-x"){
                    particles[i].velocity[0] = -particles[i].velocity[0];
                }
                
                if(wall_in_way == "z" || wall_in_way == "-z"){
                    particles[i].velocity[2] = -particles[i].velocity[2];
                }

                current_frame_left = current_frame_left - min_time;
            }
        }
    }
}

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
function startup() {
    canvas = document.getElementById("myGLCanvas");
    gl = createGLContext(canvas);
    setupShaders();
    setupBuffers();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    
    tick();
}

//----------------------------------------------------------------------------------
/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}
