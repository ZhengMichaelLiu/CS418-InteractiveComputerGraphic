/**
 * @fileoverview Terrain - A simple 3D terrain using WebGL
 * @author Zheng Liu
 */

/** Class implementing 3D terrain. */
class Terrain {
    /**
     * Initialize members of a Terrain object
     * @param {number} div Number of triangles along x axis and y axis
     * @param {number} minX Minimum X coordinate value
     * @param {number} maxX Maximum X coordinate value
     * @param {number} minY Minimum Y coordinate value
     * @param {number} maxY Maximum Y coordinate value
     */
    constructor(div, minX, maxX, minY, maxY, roughness) {
        this.div = div;
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;

        // roughtness value
        this.roughness = roughness;

        // Allocate vertex array
        this.vBuffer = [];
        // Allocate triangle array
        this.fBuffer = [];
        // Allocate normal array
        this.nBuffer = [];
        this.eBuffer = [];

        this.generateTriangles();

        this.generateLines();

        this.diamond_square_algorithm();

        this.setnewNormal();

        // Get extension for 4 byte integer indices for drwElements
        var ext = gl.getExtension('OES_element_index_uint');
        if (ext == null) {
            alert("OES_element_index_uint is unsupported by your browser and terrain generation cannot proceed.");
        }
    }
    /**
     * Function : cross
     * Purpose  : to calculate cross product between two vectors
     * @param {vec3} a 3d vector as first operand
     * @param {vec3} a 3d vector as second operand
     * @param {vec3} a 3d vector to contain cross product of two operands
     */
    cross(v1, v2, vR) {
        vR[0] = ((v1[1] * v2[2]) - (v1[2] * v2[1]));
        vR[1] = -((v1[0] * v2[2]) - (v1[2] * v2[0]));
        vR[2] = ((v1[0] * v2[1]) - (v1[1] * v2[0]));
    }

    /**
     * Function : subarray
     * Purpose  : to calculate subtract between two vectors
     * @param {vec3} a 3d vector as first operand
     * @param {vec3} a 3d vector as second operand
     * @param {vec3} a 3d vector to contain elementwise subtract of two operands
     */
    subarray(v1, v2, vR) {
        vR[0] = v2[0] - v1[0];
        vR[1] = v2[1] - v1[1];
        vR[2] = v2[2] - v1[2];
    }

    /**
     * Function : normarray
     * Purpose  : to calculate normalization of a vector
     * @param {vec3} a 3d vector
     * @param {vec3} a 3d vector to contain result  of nomalized vector
     */
    normarray(v1, vR) {
        var length = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]);
        vR[0] = v1[0] / length;
        vR[1] = v1[1] / length;
        vR[2] = v1[2] / length;
    }

    /**
     * Function : addarray
     * Purpose  : to calculate add of two vectors
     * @param {vec3} a 3d vector as first operand
     * @param {vec3} a 3d vector as second operand 
     * @param {vec3} a 3d vector to contain sum of two vectors
     */
    addarray(v1, v2, vR) {
        vR[0] = v1[0] + v2[0];
        vR[1] = v1[1] + v2[1];
        vR[2] = v1[2] + v2[2];
    }


    /**
     * Function : setnewNormal
     * Purpose  : to calculate normal vector of each vertex
     */
    setnewNormal() {
        // loop through all vertices
        for (var i = 0; i <= this.div; i++) {
            for (var j = 0; j <= this.div; j++) {
                // first set corner vertices
                // left bottom
                if (i == 0 && j == 0) {
                    var v0 = vec3.create();
                    var v1 = vec3.create();
                    var v2 = vec3.create();
                    
                    // n = (v1 - v0) x (v2 - v0)
                    this.getVertex(v0, i, j);
                    this.getVertex(v1, i, j + 1);
                    this.getVertex(v2, i + 1, j);

                    var crossvector1 = vec3.create();
                    var crossvector2 = vec3.create();

                    this.subarray(v0, v1, crossvector1);
                    this.subarray(v0, v2, crossvector2);

                    var norm = vec3.create();
                    this.cross(crossvector1, crossvector2, norm);
                    // for left bottom coner, only one face
                    var avg_norm = vec3.create();
                    this.normarray(norm, avg_norm);

                    this.nBuffer[3 * (i * (this.div + 1) + j)] = avg_norm[0];
                    this.nBuffer[3 * (i * (this.div + 1) + j) + 1] = avg_norm[1];
                    this.nBuffer[3 * (i * (this.div + 1) + j) + 2] = avg_norm[2];
                    // right bottom
                } else if (i == 0 && j == this.div) {
                    var v0 = vec3.create();
                    var v1 = vec3.create();
                    var v2 = vec3.create();
                    var v3 = vec3.create();

                    this.getVertex(v0, i, j);
                    this.getVertex(v1, i, j - 1);
                    this.getVertex(v2, i + 1, j - 1);
                    this.getVertex(v3, i + 1, j);
                    // two faces for this corner
                    // sum these two normals and then take the average
                    var crossvector1 = vec3.create();
                    var crossvector2 = vec3.create();
                    var crossvector3 = vec3.create();

                    this.subarray(v0, v1, crossvector1);
                    this.subarray(v0, v2, crossvector2);
                    this.subarray(v0, v3, crossvector3);

                    var norm1 = vec3.create();
                    this.cross(crossvector2, crossvector1, norm1);
                    var norm2 = vec3.create();
                    this.cross(crossvector3, crossvector2, norm2);

                    var totalnorm = vec3.create();
                    this.addarray(norm1, norm2, totalnorm);

                    var avg_norm = vec3.create();
                    this.normarray([totalnorm[0] / 2, totalnorm[1] / 2, totalnorm[2] / 2], avg_norm);

                    this.nBuffer[3 * (i * (this.div + 1) + j)] = avg_norm[0];
                    this.nBuffer[3 * (i * (this.div + 1) + j) + 1] = avg_norm[1];
                    this.nBuffer[3 * (i * (this.div + 1) + j) + 2] = avg_norm[2];
                    // left top
                } else if (i == this.div && j == 0) {
                    var v0 = vec3.create();
                    var v1 = vec3.create();
                    var v2 = vec3.create();
                    var v3 = vec3.create();

                    this.getVertex(v0, i, j);
                    this.getVertex(v1, i - 1, j);
                    this.getVertex(v2, i - 1, j + 1);
                    this.getVertex(v3, i, j + 1);

                    var crossvector1 = vec3.create();
                    var crossvector2 = vec3.create();
                    var crossvector3 = vec3.create();
                    // two faces
                    // sum and take average
                    this.subarray(v0, v1, crossvector1);
                    this.subarray(v0, v2, crossvector2);
                    this.subarray(v0, v3, crossvector3);

                    var norm1 = vec3.create();
                    this.cross(crossvector1, crossvector2, norm1);
                    var norm2 = vec3.create();
                    this.cross(crossvector2, crossvector3, norm2);

                    var totalnorm = vec3.create();
                    this.addarray(norm1, norm2, totalnorm);

                    var avg_norm = vec3.create();
                    this.normarray([totalnorm[0] / 2, totalnorm[1] / 2, totalnorm[2] / 2], avg_norm);

                    this.nBuffer[3 * (i * (this.div + 1) + j)] = avg_norm[0];
                    this.nBuffer[3 * (i * (this.div + 1) + j) + 1] = avg_norm[1];
                    this.nBuffer[3 * (i * (this.div + 1) + j) + 2] = avg_norm[2];
                    // right top
                } else if (i == this.div && j == this.div) {
                    var v0 = vec3.create();
                    var v1 = vec3.create();
                    var v2 = vec3.create();

                    this.getVertex(v0, i, j);
                    this.getVertex(v1, i, j - 1);
                    this.getVertex(v2, i - 1, j);

                    var crossvector1 = vec3.create();
                    var crossvector2 = vec3.create();

                    this.subarray(v0, v1, crossvector1);
                    this.subarray(v0, v2, crossvector2);
                    // one face
                    var norm = vec3.create();
                    this.cross(crossvector1, crossvector2, norm);

                    var avg_norm = vec3.create();
                    this.normarray(norm, avg_norm);

                    this.nBuffer[3 * (i * (this.div + 1) + j)] = avg_norm[0];
                    this.nBuffer[3 * (i * (this.div + 1) + j) + 1] = avg_norm[1];
                    this.nBuffer[3 * (i * (this.div + 1) + j) + 2] = avg_norm[2];
                    // left edge of the terrain without corner
                } else if (i == 0 && j != 0 && j != this.div) {
                    var v0 = vec3.create();
                    var v1 = vec3.create();
                    var v2 = vec3.create();
                    var v3 = vec3.create();
                    var v4 = vec3.create();
                    // each of these vertices have four faces around it
                    this.getVertex(v0, i, j);
                    this.getVertex(v1, i, j - 1);
                    this.getVertex(v2, i + 1, j - 1);
                    this.getVertex(v3, i + 1, j);
                    this.getVertex(v4, i, j + 1);

                    var crossvector1 = vec3.create();
                    var crossvector2 = vec3.create();
                    var crossvector3 = vec3.create();
                    var crossvector4 = vec3.create();

                    this.subarray(v0, v1, crossvector1);
                    this.subarray(v0, v2, crossvector2);
                    this.subarray(v0, v3, crossvector3);
                    this.subarray(v0, v4, crossvector4);
                    // take sum of 4 faces and them take average
                    var norm1 = vec3.create();
                    this.cross(crossvector2, crossvector1, norm1);
                    var norm2 = vec3.create();
                    this.cross(crossvector3, crossvector2, norm2);
                    var norm3 = vec3.create();
                    this.cross(crossvector4, crossvector3, norm3);

                    var totalnorm = vec3.create();
                    this.addarray(norm1, norm2, totalnorm);
                    this.addarray(norm3, totalnorm, totalnorm);

                    var avg_norm = vec3.create();
                    this.normarray([totalnorm[0] / 3, totalnorm[1] / 3, totalnorm[2] / 3], avg_norm);

                    this.nBuffer[3 * (i * (this.div + 1) + j)] = avg_norm[0];
                    this.nBuffer[3 * (i * (this.div + 1) + j) + 1] = avg_norm[1];
                    this.nBuffer[3 * (i * (this.div + 1) + j) + 2] = avg_norm[2];
                    // left edge
                } else if (j == 0 && i != 0 && i != this.div) {
                    var v0 = vec3.create();
                    var v1 = vec3.create();
                    var v2 = vec3.create();
                    var v3 = vec3.create();
                    var v4 = vec3.create();

                    this.getVertex(v0, i, j);
                    this.getVertex(v1, i - 1, j);
                    this.getVertex(v2, i - 1, j + 1);
                    this.getVertex(v3, i, j + 1);
                    this.getVertex(v4, i + 1, j);

                    var crossvector1 = vec3.create();
                    var crossvector2 = vec3.create();
                    var crossvector3 = vec3.create();
                    var crossvector4 = vec3.create();

                    this.subarray(v0, v1, crossvector1);
                    this.subarray(v0, v2, crossvector2);
                    this.subarray(v0, v3, crossvector3);
                    this.subarray(v0, v4, crossvector4);

                    var norm1 = vec3.create();
                    this.cross(crossvector1, crossvector2, norm1);
                    var norm2 = vec3.create();
                    this.cross(crossvector2, crossvector3, norm2);
                    var norm3 = vec3.create();
                    this.cross(crossvector3, crossvector4, norm3);

                    var totalnorm = vec3.create();
                    this.addarray(norm1, norm2, totalnorm);
                    this.addarray(norm3, totalnorm, totalnorm);

                    var avg_norm = vec3.create();
                    this.normarray([totalnorm[0] / 3, totalnorm[1] / 3, totalnorm[2] / 3], avg_norm);

                    this.nBuffer[3 * (i * (this.div + 1) + j)] = avg_norm[0];
                    this.nBuffer[3 * (i * (this.div + 1) + j) + 1] = avg_norm[1];
                    this.nBuffer[3 * (i * (this.div + 1) + j) + 2] = avg_norm[2];
                    // top edge
                } else if (i == this.div && j != 0 && j != this.div) {
                    var v0 = vec3.create();
                    var v1 = vec3.create();
                    var v2 = vec3.create();
                    var v3 = vec3.create();
                    var v4 = vec3.create();

                    this.getVertex(v0, i, j);
                    this.getVertex(v1, i, j - 1);
                    this.getVertex(v2, i - 1, j);
                    this.getVertex(v3, i - 1, j + 1);
                    this.getVertex(v4, i, j + 1);

                    var crossvector1 = vec3.create();
                    var crossvector2 = vec3.create();
                    var crossvector3 = vec3.create();
                    var crossvector4 = vec3.create();

                    this.subarray(v0, v1, crossvector1);
                    this.subarray(v0, v2, crossvector2);
                    this.subarray(v0, v3, crossvector3);
                    this.subarray(v0, v4, crossvector4);

                    var norm1 = vec3.create();
                    this.cross(crossvector1, crossvector2, norm1);
                    var norm2 = vec3.create();
                    this.cross(crossvector2, crossvector3, norm2);
                    var norm3 = vec3.create();
                    this.cross(crossvector3, crossvector4, norm3);

                    var totalnorm = vec3.create();
                    this.addarray(norm1, norm2, totalnorm);
                    this.addarray(norm3, totalnorm, totalnorm);

                    var avg_norm = vec3.create();
                    this.normarray([totalnorm[0] / 3, totalnorm[1] / 3, totalnorm[2] / 3], avg_norm);

                    this.nBuffer[3 * (i * (this.div + 1) + j)] = avg_norm[0];
                    this.nBuffer[3 * (i * (this.div + 1) + j) + 1] = avg_norm[1];
                    this.nBuffer[3 * (i * (this.div + 1) + j) + 2] = avg_norm[2];
                    // right edge
                } else if (j == this.div && i != 0 && i != this.div) {
                    var v0 = vec3.create();
                    var v1 = vec3.create();
                    var v2 = vec3.create();
                    var v3 = vec3.create();
                    var v4 = vec3.create();

                    this.getVertex(v0, i, j);
                    this.getVertex(v1, i - 1, j);
                    this.getVertex(v2, i, j - 1);
                    this.getVertex(v3, i + 1, j - 1);
                    this.getVertex(v4, i + 1, j);

                    var crossvector1 = vec3.create();
                    var crossvector2 = vec3.create();
                    var crossvector3 = vec3.create();
                    var crossvector4 = vec3.create();

                    this.subarray(v0, v1, crossvector1);
                    this.subarray(v0, v2, crossvector2);
                    this.subarray(v0, v3, crossvector3);
                    this.subarray(v0, v4, crossvector4);

                    var norm1 = vec3.create();
                    this.cross(crossvector2, crossvector1, norm1);
                    var norm2 = vec3.create();
                    this.cross(crossvector3, crossvector2, norm2);
                    var norm3 = vec3.create();
                    this.cross(crossvector4, crossvector3, norm3);

                    var totalnorm = vec3.create();
                    this.addarray(norm1, norm2, totalnorm);
                    this.addarray(norm3, totalnorm, totalnorm);

                    var avg_norm = vec3.create();
                    this.normarray([totalnorm[0] / 3, totalnorm[1] / 3, totalnorm[2] / 3], avg_norm);

                    this.nBuffer[3 * (i * (this.div + 1) + j)] = avg_norm[0];
                    this.nBuffer[3 * (i * (this.div + 1) + j) + 1] = avg_norm[1];
                    this.nBuffer[3 * (i * (this.div + 1) + j) + 2] = avg_norm[2];
                    // for all of those vertices inside the terrain,
                    // neither on corners nor edges
                } else {
                    var v0 = vec3.create();
                    var v1 = vec3.create();
                    var v2 = vec3.create();
                    var v3 = vec3.create();
                    var v4 = vec3.create();
                    var v5 = vec3.create();
                    var v6 = vec3.create();
                    // such vertices will have 6 points around them.
                    this.getVertex(v0, i, j);
                    this.getVertex(v1, i + 1, j - 1);
                    this.getVertex(v2, i, j - 1);
                    this.getVertex(v3, i - 1, j);
                    this.getVertex(v4, i - 1, j + 1);
                    this.getVertex(v5, i, j + 1);
                    this.getVertex(v6, i + 1, j);

                    var crossvector1 = vec3.create();
                    var crossvector2 = vec3.create();
                    var crossvector3 = vec3.create();
                    var crossvector4 = vec3.create();
                    var crossvector5 = vec3.create();
                    var crossvector6 = vec3.create();

                    this.subarray(v0, v1, crossvector1);
                    this.subarray(v0, v2, crossvector2);
                    this.subarray(v0, v3, crossvector3);
                    this.subarray(v0, v4, crossvector4);
                    this.subarray(v0, v5, crossvector5);
                    this.subarray(v0, v6, crossvector6);
                    // So need to take sum of 6 normals and then take average
                    var norm1 = vec3.create();
                    this.cross(crossvector1, crossvector2, norm1);
                    var norm2 = vec3.create();
                    this.cross(crossvector2, crossvector3, norm2);
                    var norm3 = vec3.create();
                    this.cross(crossvector3, crossvector4, norm3);
                    var norm4 = vec3.create();
                    this.cross(crossvector4, crossvector5, norm3);
                    var norm5 = vec3.create();
                    this.cross(crossvector5, crossvector6, norm3);
                    var norm6 = vec3.create();
                    this.cross(crossvector6, crossvector1, norm3);

                    var totalnorm = vec3.create();
                    this.addarray(norm1, norm2, totalnorm);
                    this.addarray(norm3, totalnorm, totalnorm);
                    this.addarray(norm4, totalnorm, totalnorm);
                    this.addarray(norm5, totalnorm, totalnorm);
                    this.addarray(norm6, totalnorm, totalnorm);

                    var avg_norm = vec3.create();
                    this.normarray([totalnorm[0] / 6, totalnorm[1] / 6, totalnorm[2] / 6], avg_norm);

                    this.nBuffer[3 * (i * (this.div + 1) + j)] = avg_norm[0];
                    this.nBuffer[3 * (i * (this.div + 1) + j) + 1] = avg_norm[1];
                    this.nBuffer[3 * (i * (this.div + 1) + j) + 2] = avg_norm[2];
                }
            }
        }

    }



    /**
     * Set the x,y,z coords of a vertex at location(i,j)
     * @param {Object} v an an array of length 3 holding x,y,z coordinates
     * @param {number} i the ith row of vertices
     * @param {number} j the jth column of vertices
     */
    setVertex(v, i, j) {
        //Your code here
        var vid = 3 * (i * (this.div + 1) + j);
        this.vBuffer[vid] = v[0];
        this.vBuffer[vid + 1] = v[1];
        this.vBuffer[vid + 2] = v[2];
    }

    /**
     * Return the x,y,z coordinates of a vertex at location (i,j)
     * @param {Object} v an an array of length 3 holding x,y,z coordinates
     * @param {number} i the ith row of vertices
     * @param {number} j the jth column of vertices
     */
    getVertex(v, i, j) {
        //Your code here
        var vid = 3 * (i * (this.div + 1) + j);
        v[0] = this.vBuffer[vid]
        v[1] = this.vBuffer[vid + 1];
        v[2] = this.vBuffer[vid + 2];
    }


    /**
     * Diamond Square Algorithm to set height of each vertex
     */

    diamond_square_algorithm() {
        // set four corner to random height
        var vert = vec3.create();

        this.getVertex(vert, 0, 0); // -1, -1
        vert[2] = ((Math.random() * 10) + 1) / 50;
        this.setVertex(vert, 0, 0);

        this.getVertex(vert, 0, this.div); // -1, 1
        vert[2] = ((Math.random() * 10) + 1) / 50;
        this.setVertex(vert, 0, this.div);

        this.getVertex(vert, this.div, 0);
        vert[2] = ((Math.random() * 10) + 1) / 50;
        this.setVertex(vert, this.div, 0);

        this.getVertex(vert, this.div, this.div);
        vert[2] = ((Math.random() * 10) + 1) / 50;
        this.setVertex(vert, this.div, this.div);


        for (var stepsize = this.div; stepsize > 1; stepsize = stepsize / 2) {
            // diamond
            // each diamond center's height will be set by the average of 4 vertices around it, plus random roughness
            for (var i = stepsize / 2; i <= this.div; i = i + stepsize) {
                for (var j = stepsize / 2; j <= this.div; j = j + stepsize) {
                    
                    var height1 = vec3.create();
                    var height2 = vec3.create();
                    var height3 = vec3.create();
                    var height4 = vec3.create();
                    var avg_height = vec3.create();
                    
                    this.getVertex(height1, i - stepsize / 2, j - stepsize / 2);
                    this.getVertex(height2, i - stepsize / 2, j + stepsize / 2);
                    this.getVertex(height3, i + stepsize / 2, j - stepsize / 2);
                    this.getVertex(height4, i + stepsize / 2, j + stepsize / 2);
                    this.getVertex(avg_height, i, j);
                    
                    avg_height[2] = (height1[2] + height2[2] + height3[2] + height4[2] + ((Math.random() * this.roughness * 2) - this.roughness)) / 4;
                    this.setVertex(avg_height, i, j);
                    
                }
            }

            // square
            for (var i = stepsize / 2; i <= this.div; i = i + stepsize) {
                for (var j = stepsize / 2; j <= this.div; j = j + stepsize) {
                    if (i - stepsize / 2 == 0) {
                        // if this point is on the bottom edge
                        // then average over 3 points around it
                        var height1 = vec3.create();
                        var height2 = vec3.create();
                        var height3 = vec3.create();
                        var avg_height = vec3.create();
                        
                        this.getVertex(height1, i, j);
                        this.getVertex(height2, i - stepsize / 2, j - stepsize / 2);
                        this.getVertex(height3, i - stepsize / 2, j + stepsize / 2);
                        this.getVertex(avg_height, i - stepsize / 2, j);

                        avg_height[2] = (height1[2] + height2[2] + height3[2] + ((Math.random() * this.roughness * 2) - this.roughness)) / 3;
                        this.setVertex(avg_height, i - stepsize / 2, j);
                        
                    } else {
                        
                        var height1 = vec3.create();
                        var height2 = vec3.create();
                        var height3 = vec3.create();
                        var height4 = vec3.create();
                        var avg_height = vec3.create();
                        
                        this.getVertex(height1, i, j);
                        this.getVertex(height2, i - stepsize / 2, j - stepsize / 2);
                        this.getVertex(height3, i - stepsize / 2, j + stepsize / 2);
                        this.getVertex(height4, i - stepsize, j);
                        this.getVertex(avg_height, i - stepsize / 2, j);
                        
                        avg_height[2] = (height1[2] + height2[2] + height3[2] + height4[2] + ((Math.random() * this.roughness * 2) - this.roughness)) / 4;
                        this.setVertex(avg_height, i - stepsize / 2, j);
                    }
                    // If this point is on the top edge
                    if (i + stepsize / 2 == this.div) {
                        
                        var height1 = vec3.create();
                        var height2 = vec3.create();
                        var height3 = vec3.create();
                        var avg_height = vec3.create();
                        
                        this.getVertex(height1, i, j);
                        this.getVertex(height2, i + stepsize / 2, j - stepsize / 2);
                        this.getVertex(height3, i + stepsize / 2, j + stepsize / 2);
                        this.getVertex(avg_height, i + stepsize / 2, j);

                        avg_height[2] = (height1[2] + height2[2] + height3[2] + ((Math.random() * this.roughness * 2) - this.roughness)) / 3;
                        this.setVertex(avg_height, i + stepsize / 2, j);
                    } else {

                        var height1 = vec3.create();
                        var height2 = vec3.create();
                        var height3 = vec3.create();
                        var height4 = vec3.create();
                        var avg_height = vec3.create();
                        
                        this.getVertex(height1, i, j);
                        this.getVertex(height2, i + stepsize / 2, j - stepsize / 2);
                        this.getVertex(height3, i + stepsize / 2, j + stepsize / 2);
                        this.getVertex(height4, i + stepsize, j);
                        this.getVertex(avg_height, i + stepsize / 2, j);
                        
                        avg_height[2] = (height1[2] + height2[2] + height3[2] + height4[2] + ((Math.random() * this.roughness * 2) - this.roughness)) / 4;
                        this.setVertex(avg_height, i + stepsize / 2, j);
                    }
                    // if on left edge
                    if (j - stepsize / 2 == 0) {

                        var height1 = vec3.create();
                        var height2 = vec3.create();
                        var height3 = vec3.create();
                        var avg_height = vec3.create();
                        
                        this.getVertex(height1, i, j);
                        this.getVertex(height2, i + stepsize / 2, j - stepsize / 2);
                        this.getVertex(height3, i - stepsize / 2, j - stepsize / 2);
                        this.getVertex(avg_height, i, j - stepsize / 2);
                        
                        avg_height[2] = (height1[2] + height2[2] + height3[2] + ((Math.random() * this.roughness * 2) - this.roughness)) / 3;
                        this.setVertex(avg_height, i, j - stepsize / 2);
                    } else {
                        
                        var height1 = vec3.create();
                        var height2 = vec3.create();
                        var height3 = vec3.create();
                        var height4 = vec3.create();
                        var avg_height = vec3.create();
                        
                        this.getVertex(height1, i, j);
                        this.getVertex(height2, i + stepsize / 2, j - stepsize / 2);
                        this.getVertex(height3, i - stepsize / 2, j - stepsize / 2);
                        this.getVertex(height4, i, j - stepsize);
                        this.getVertex(avg_height, i, j - stepsize / 2);

                        avg_height[2] = (height1[2] + height2[2] + height3[2] + height4[2] + ((Math.random() * this.roughness * 2) - this.roughness)) / 4;
                        this.setVertex(avg_height, i, j - stepsize / 2);
                    }
                    // if on right edge
                    if (j + stepsize / 2 == this.div) {

                        var height1 = vec3.create();
                        var height2 = vec3.create();
                        var height3 = vec3.create();
                        var avg_height = vec3.create();
                        
                        this.getVertex(height1, i, j);
                        this.getVertex(height2, i + stepsize / 2, j + stepsize / 2);
                        this.getVertex(height3, i - stepsize / 2, j + stepsize / 2);
                        this.getVertex(avg_height, i, j + stepsize / 2);
                       
                        avg_height[2] = (height1[2] + height2[2] + height3[2] + ((Math.random() * this.roughness * 2) - this.roughness)) / 3;
                        this.setVertex(avg_height, i, j + stepsize / 2);
                    } else {

                        var height1 = vec3.create();
                        var height2 = vec3.create();
                        var height3 = vec3.create();
                        var height4 = vec3.create();
                        var avg_height = vec3.create();
                        
                        this.getVertex(height1, i, j);
                        this.getVertex(height2, i + stepsize / 2, j + stepsize / 2);
                        this.getVertex(height3, i - stepsize / 2, j + stepsize / 2);
                        this.getVertex(height4, i, j + stepsize);
                        this.getVertex(avg_height, i, j + stepsize / 2);
                        
                        avg_height[2] = (height1[2] + height2[2] + height3[2] + height4[2] + ((Math.random() * this.roughness * 2) - this.roughness)) / 4;
                        this.setVertex(avg_height, i, j + stepsize / 2);
                    }
                }
            }
            this.roughness = this.roughness / 2;
        }
    }


    /**
     * Render the triangles 
     */
    drawTriangles() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, this.VertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.drawElements(gl.TRIANGLES, this.IndexTriBuffer.numItems, gl.UNSIGNED_INT, 0);
    }

    /**
     * Render the triangle edges wireframe style 
     */
    drawEdges() {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, this.VertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.drawElements(gl.LINES, this.IndexEdgeBuffer.numItems, gl.UNSIGNED_INT, 0);
    }

    /**
     * Fill the vertex and buffer arrays 
     */
    generateTriangles() {
        //Your code here
        var deltaX = (this.maxX - this.minX) / this.div;
        var deltaY = (this.maxY - this.minY) / this.div;

        for (var i = 0; i <= this.div; i++) {
            for (var j = 0; j <= this.div; j++) {
                this.vBuffer.push(this.minX + deltaX * j);
                this.vBuffer.push(this.minY + deltaY * i);
                this.vBuffer.push(0);

                this.nBuffer.push(0);
                this.nBuffer.push(0);
                this.nBuffer.push(1);
            }
        }

        for (var i = 0; i < this.div; i++) {
            for (var j = 0; j < this.div; j++) {
                var vid = i * (this.div + 1) + j;
                this.fBuffer.push(vid);
                this.fBuffer.push(vid + 1);
                this.fBuffer.push(vid + this.div + 1);

                this.fBuffer.push(vid + 1);
                this.fBuffer.push(vid + 1 + this.div + 1);
                this.fBuffer.push(vid + this.div + 1);
            }
        }


        //
        this.numVertices = this.vBuffer.length / 3;
        this.numFaces = this.fBuffer.length / 3;
    }



    /**
     * Send the buffer objects to WebGL for rendering 
     */
    loadBuffers() {
        // Specify the vertex coordinates
        this.VertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vBuffer), gl.STATIC_DRAW);
        this.VertexPositionBuffer.itemSize = 3;
        this.VertexPositionBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexPositionBuffer.numItems, " vertices");

        // Specify normals to be able to do lighting calculations
        this.VertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.nBuffer),
            gl.STATIC_DRAW);
        this.VertexNormalBuffer.itemSize = 3;
        this.VertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexNormalBuffer.numItems, " normals");

        // Specify faces of the terrain 
        this.IndexTriBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.fBuffer),
            gl.STATIC_DRAW);
        this.IndexTriBuffer.itemSize = 1;
        this.IndexTriBuffer.numItems = this.fBuffer.length;
        console.log("Loaded ", this.IndexTriBuffer.numItems, " triangles");

        //Setup Edges  
        this.IndexEdgeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.eBuffer),
            gl.STATIC_DRAW);
        this.IndexEdgeBuffer.itemSize = 1;
        this.IndexEdgeBuffer.numItems = this.eBuffer.length;

        console.log("triangulatedPlane: loadBuffers");
    }

    /**
     * Generates line values from faces in faceArray
     * to enable wireframe rendering
     */
    generateLines() {
        var numTris = this.fBuffer.length / 3;
        for (var f = 0; f < numTris; f++) {
            var fid = f * 3;
            this.eBuffer.push(this.fBuffer[fid]);
            this.eBuffer.push(this.fBuffer[fid + 1]);

            this.eBuffer.push(this.fBuffer[fid + 1]);
            this.eBuffer.push(this.fBuffer[fid + 2]);

            this.eBuffer.push(this.fBuffer[fid + 2]);
            this.eBuffer.push(this.fBuffer[fid]);
        }

    }
}
