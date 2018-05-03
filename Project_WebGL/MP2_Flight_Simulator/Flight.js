/**
 * @file A simple WebGL example drawing central Illinois style terrain
 * @Author          Zheng Liu    <zliu93@illinois.edu>
 * @Modifiedfrom    Eric Shaffer <shaffer1@illinois.edu>  
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;
/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The Normal matrix */
var nMatrix = mat3.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global The angle of rotation around the y axis */
var viewRot = 10;

/** @global A glmatrix vector to use for transformations */
var transformVec = vec3.create();

// Initialize the vector....
vec3.set(transformVec, 0.0, 0.0, -2.0);

/** @global An object holding the geometry for a 3D terrain */
var myTerrain;


// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0.0, 1.8, 4.8);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.fromValues(0.0, -0.2, -1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0, 1.0, 0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = vec3.fromValues(0.0, 1.6, 3.5);

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [0, 10, 10];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0, 0, 0];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1, 1, 1];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular = [1, 1, 1];

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0, 1.0, 1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kTerrainDiffuse = [1, 1, 1];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [0.0, 0.0, 0.0];
/** @global Shininess exponent for Phong reflection */
var shininess = 30;
/** @global Edge color fpr wireframeish rendering */
var kEdgeBlack = [0.0, 0.0, 0.0];
/** @global Edge color for wireframe rendering */
var kEdgeWhite = [1.0, 1.0, 1.0];

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
    vertexShader = loadShaderFromDOM("shader-blinnphong-phong-vs");
    fragmentShader = loadShaderFromDOM("shader-blinnphong-phong-fs");

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
    shaderProgram.uniformShininessLoc = gl.getUniformLocation(shaderProgram, "uShininess");
    shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientMaterialColor");
    shaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseMaterialColor");
    shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularMaterialColor");
    
    shaderProgram.uniformToggleLoc = gl.getUniformLocation(shaderProgram, "Toggle_value");
}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 */
function setMaterialUniforms(alpha, a, d, s) {
    gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
    gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
    gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
    gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function setLightUniforms(loc, a, d, s) {
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
    myTerrain = new Terrain(128, -2, 2, -2, 2, 3);
    myTerrain.loadBuffers();
}


//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() {
    //console.log("function draw()")
    var transformVec = vec3.create();

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix, degToRad(45),
        gl.viewportWidth / gl.viewportHeight,
        0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix, eyePt, viewPt, up);

    //Draw Terrain
    mvPushMatrix();
    //vec3.set(transformVec, 0.0, -0.25, -2.0);
    mat4.translate(mvMatrix, mvMatrix, transformVec);
    //mat4.multiply(mvMatrix, quatrotate, mvMatrix);
    mat4.rotateY(mvMatrix, mvMatrix, degToRad(viewRot));
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-75));

    setMatrixUniforms();
    setLightUniforms(lightPosition, lAmbient, lDiffuse, lSpecular);

    if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked)) {
        setMaterialUniforms(shininess, kAmbient, kTerrainDiffuse, kSpecular);
        myTerrain.drawTriangles();
    }

    if (document.getElementById("wirepoly").checked) {
        setMaterialUniforms(shininess, kAmbient, kEdgeBlack, kSpecular);
        myTerrain.drawEdges();
    }

    if (document.getElementById("wireframe").checked) {
        setMaterialUniforms(shininess, kAmbient, kEdgeWhite, kSpecular);
        myTerrain.drawEdges();
    }
    mvPopMatrix();


}

/*
To handle keyboard inputs.
If a key is pressed, then set it to be true. If released, set it to false.
*/
var currentlyPressedKeys = {};

function handleKeyDown(event) {
    event.preventDefault();
    currentlyPressedKeys[event.key] = true;
}

function handleKeyUp(event) {
    event.preventDefault();
    currentlyPressedKeys[event.key] = false;
}

current_quat = quat.create();
var speedfactor = 0.005;
var toggle = 0;
var pressing = 0;


/*
Based on the pressed keys to change different component
*/
function handleKeys() {
    // pitch up
    if (currentlyPressedKeys["ArrowUp"]) {
        //console.log("ok");
        var current_Xaxis = vec3.create();
        vec3.cross(current_Xaxis, up, viewDir);
        quat.setAxisAngle(current_quat, current_Xaxis, -0.005);
        quat.normalize(current_quat, current_quat);
        vec3.transformQuat(up, up, current_quat);
        vec3.transformQuat(viewDir, viewDir, current_quat);

    } 
    // pitch down
    else if (currentlyPressedKeys["ArrowDown"]) {
        var current_Xaxis = vec3.create();
        vec3.cross(current_Xaxis, up, viewDir);
        quat.setAxisAngle(current_quat, current_Xaxis, 0.005);
        quat.normalize(current_quat, current_quat);
        vec3.transformQuat(up, up, current_quat);
        vec3.transformQuat(viewDir, viewDir, current_quat);
    }
    
    // roll left
    if (currentlyPressedKeys["ArrowLeft"]) {
        quat.setAxisAngle(current_quat, viewDir, -0.005);
        quat.normalize(current_quat, current_quat);
        vec3.transformQuat(up, up, current_quat);
        vec3.normalize(up, up);
    } 
    
    // roll right
    else if (currentlyPressedKeys["ArrowRight"]) {
        quat.setAxisAngle(current_quat, viewDir, 0.005);
        quat.normalize(current_quat, current_quat);
        vec3.transformQuat(up, up, current_quat);
        vec3.normalize(up, up);
    }

    // yaw left
    if (currentlyPressedKeys["q"]) {
        quat.setAxisAngle(current_quat, up, 0.005);
        quat.normalize(current_quat, current_quat);
        vec3.transformQuat(viewDir, viewDir, current_quat);
        vec3.normalize(viewDir, viewDir);
    }
    
    // yaw right
    else if (currentlyPressedKeys["e"]) {
        quat.setAxisAngle(current_quat, up, -0.005);
        quat.normalize(current_quat, current_quat);
        vec3.transformQuat(viewDir, viewDir, current_quat);
        vec3.normalize(viewDir, viewDir);
    }

    // speed up
    if (currentlyPressedKeys["+"]) {
        // upper limit
        speedfactor = speedfactor + 0.005;
        if(speedfactor >= 0.01){
           speedfactor = 0.01;
        }
    } 
    
    // slow down
    else if (currentlyPressedKeys["-"]) {
        // lower limit
        speedfactor = speedfactor - 0.0005;
        if(speedfactor <= 0.001){
           speedfactor = 0.001;
        }
    }

    // toggle fog
    if(currentlyPressedKeys["t"]){
        // if not pressed 
        if(pressing == 0){
            pressing = 1;   // then press
            if(toggle == 0){    // if not toggled
                toggle = 1;     // then turn fog on
                gl.uniform1f(shaderProgram.uniformToggleLoc, 1);
            }
            else if(toggle == 1){   // if toggled
                toggle = 0;         // then turn off
                gl.uniform1f(shaderProgram.uniformToggleLoc, 0);
            }
        }
    }
    else if(currentlyPressedKeys["t"] == false){
        pressing = 0; // release the key
    }
}

/*
get the normalized viewing direction and scale up in that direction by speedfactor
and move the eye position in that direction to move forward.
*/
current_viewDir = vec3.create();
function moveforward() {
    vec3.normalize(current_viewDir, viewDir);
    vec3.scale(current_viewDir, current_viewDir, speedfactor);
    vec3.add(eyePt, eyePt, current_viewDir);
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
    gl.clearColor(0.6, 0.8, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    //Event.preventDefault();

    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    tick();
}

//----------------------------------------------------------------------------------
/**
 * Keeping drawing frames....
 */
function tick() {
    requestAnimFrame(tick);
    handleKeys();
    moveforward();
    draw();
}
