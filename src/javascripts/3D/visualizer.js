var Matrix4x4 = require("./matrix4x4");
var CameraController = require("./cameracontroller");

var input;

var ANALYSISTYPE_3D_SONOGRAM = 2;
// The "model" matrix is the "world" matrix in Standard Annotations and Semantics
var model = 0;
var view = 0;
var projection = 0;

window.blancoMidiRed = 1.2;
window.blancoMidiBlue = 1.2;
window.blancoMidiGreen = 78;
window.blancoMidiYellow = 0;

window.verdeMidiRed = 0;
window.verdeMidiBlue = 0;
window.verdeMidiGreen = 63;
window.verderMidiYellow = 0;

window.moradoMidiRed = 4.0;
window.moradoMidiBlue = 2.0;
window.moradoMidiGreen = 2.0;
window.moradoMidiYellow = 1.2;

/**
 * Class AnalyserView
 */

AnalyserView = function (canvas) {
  // NOTE: the default value of this needs to match the selected radio button

  // This analysis type may be overriden later on if we discover we don't support the right shader features.
  this.analysisType = ANALYSISTYPE_3D_SONOGRAM;

  this.sonogram3DWidth = 256;
  this.sonogram3DHeight = 256;
  this.sonogram3DGeometrySize = 9.5;

  this.freqByteData = 0;
  this.texture = 0;
  this.TEXTURE_HEIGHT = 256;
  this.yoffset = 0;

  this.sonogramShader = 0;
  this.sonogram3DShader = 0;
  this.midi = 0;

  // Background color
  this.backgroundColor = [0.08, 0.08, 0.08, 1];
  this.foregroundColor = [0, 0.7, 0, 1];

  this.canvas = canvas;
  this.initGL();
};

AnalyserView.prototype.getAvailableContext = function (canvas, contextList) {
  if (canvas.getContext) {
    for (var i = 0; i < contextList.length; ++i) {
      try {
        var context = canvas.getContext(contextList[i], { antialias: true });
        if (context !== null) return context;
      } catch (ex) {}
    }
  }
  return null;
};

AnalyserView.prototype.initGL = function () {
  model = new Matrix4x4();
  view = new Matrix4x4();
  projection = new Matrix4x4();
  // ________________________________________
  var sonogram3DWidth = this.sonogram3DWidth;
  var sonogram3DHeight = this.sonogram3DHeight;
  var sonogram3DGeometrySize = this.sonogram3DGeometrySize;
  var backgroundColor = this.backgroundColor;
  // ________________________________________
  var canvas = this.canvas;
  // ________________________________________
  var gl = this.getAvailableContext(canvas, ["webgl", "webgl"]);
  this.gl = gl;

  // If we're missing this shader feature, then we can't do the 3D visualization.
  this.has3DVisualizer = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) > 0;
  var cameraController = new CameraController(canvas);
  this.cameraController = cameraController;

  cameraController.xRot = -180;
  cameraController.yRot = 270;
  cameraController.zRot = 9;

  cameraController.xT = 0;
  // Zoom level.
  cameraController.yT = -2;
  // Translation in the x axis.
  cameraController.zT = -2;

  gl.clearColor(
    backgroundColor[0],
    backgroundColor[1],
    backgroundColor[2],
    backgroundColor[3]
  );
  gl.enable(gl.DEPTH_TEST);

  // Initialization for the 2D visualizations
  var vertices = new Float32Array([]);
  var texCoords = new Float32Array([]);

  var vboTexCoordOffset = vertices.byteLength;
  this.vboTexCoordOffset = vboTexCoordOffset;
  var vbo = gl.createBuffer();
  this.vbo = vbo;

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    vboTexCoordOffset + texCoords.byteLength,
    gl.STATIC_DRAW
  );
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
  gl.bufferSubData(gl.ARRAY_BUFFER, vboTexCoordOffset, texCoords);

  // Initialization for the 3D visualizations
  var numVertices = sonogram3DWidth * sonogram3DHeight;

  if (numVertices > 65536) {
    throw "Sonogram 3D resolution is too high: can only handle 65536 vertices max";
  }
  vertices = new Float32Array(numVertices * 3);
  texCoords = new Float32Array(numVertices * 2);

  for (var z = 0; z < sonogram3DHeight; z++) {
    for (var x = 0; x < sonogram3DWidth; x++) {
      // Generate a reasonably fine mesh in the X-Z plane
      vertices[3 * (sonogram3DWidth * z + x) + 0] =
        (sonogram3DGeometrySize * (x - sonogram3DWidth / 2)) / sonogram3DWidth;
      vertices[3 * (sonogram3DWidth * z + x) + 1] = 0;
      vertices[3 * (sonogram3DWidth * z + x) + 2] =
        (sonogram3DGeometrySize * (z - sonogram3DHeight / 2)) /
        sonogram3DHeight;

      texCoords[2 * (sonogram3DWidth * z + x) + 0] = x / (sonogram3DWidth - 1);
      texCoords[2 * (sonogram3DWidth * z + x) + 1] = z / (sonogram3DHeight - 1);
    }
  }

  var vbo3DTexCoordOffset = vertices.byteLength;
  this.vbo3DTexCoordOffset = vbo3DTexCoordOffset;

  // Create the vertices and texture coordinates
  var sonogram3DVBO = gl.createBuffer();
  this.sonogram3DVBO = sonogram3DVBO;

  gl.bindBuffer(gl.ARRAY_BUFFER, sonogram3DVBO);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    vbo3DTexCoordOffset + texCoords.byteLength,
    gl.STATIC_DRAW
  );
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
  gl.bufferSubData(gl.ARRAY_BUFFER, vbo3DTexCoordOffset, texCoords);

  // Now generate indices
  var sonogram3DNumIndices = (sonogram3DWidth - 1) * (sonogram3DHeight - 1) * 6;
  this.sonogram3DNumIndices = sonogram3DNumIndices - 2 * 600;

  var indices = new Uint16Array(sonogram3DNumIndices);
  var idx = 0;
  for (var z = 0; z < sonogram3DHeight - 1; z++) {
    for (var x = 0; x < sonogram3DWidth - 1; x++) {
      indices[idx++] = z * sonogram3DWidth + x;
      indices[idx++] = z * sonogram3DWidth + x + 1;
      indices[idx++] = (z + 1) * sonogram3DWidth + x;
      indices[idx++] = z * sonogram3DWidth + x;
      indices[idx++] = (z + 1) * sonogram3DWidth + x + 8;
      indices[idx++] = (z + 1) * sonogram3DWidth + x;
    }
  }

  var sonogram3DIBO = gl.createBuffer();
  this.sonogram3DIBO = sonogram3DIBO;

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sonogram3DIBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  // Note we do not unbind this buffer -- not necessary

  if (this.has3DVisualizer) {
    this.sonogram3DShader = o3djs.shader.loadFromURL(
      gl,
      "bin/shaders/sonogram-vertex.shader",
      "bin/shaders/sonogram-fragment.shader"
    );
  }
  //console.log("this.sonogramShader", this.sonogramShader);
  //console.log("this.sonogram3DShader", this.sonogram3DShader);
};

AnalyserView.prototype.midiAddListener = function () {
  var midi = WebMidi.getInputByName("OP-Z");

  if (midi) {
    midi.addListener("controlchange", "all", function (e) {
      console.log("blancoMidiRed", blancoMidiBlue);
      console.log("blancoMidiBlue", blancoMidiBlue);
      console.log("blancoMidiGreen", blancoMidiGreen);
      console.log("blancoMidiYellow", blancoMidiYellow);

      console.log("verdeMidiRed", verdeMidiRed);
      console.log("verdeMidiBlue", verdeMidiBlue);
      console.log("verdeMidiGreen", verdeMidiGreen);
      console.log("verderMidiYellow", verderMidiYellow);

      console.log("moradoMidiRed", moradoMidiRed);
      console.log("moradoMidiBlue", moradoMidiBlue);
      console.log("moradoMidiGreen", moradoMidiGreen);
      console.log("moradoMidiYellow", moradoMidiYellow);

      switch (e.controller.number) {
        case 1:
          blancoMidiGreen = e.data[2] * 2;
          break;
        case 2:
          blancoMidiBlue = e.data[2] + blancoMidiBlue * 0.09;
          break;
        case 3:
          blancoMidiYellow = e.data[2] * 2;
          break;
        case 4:
          blancoMidiRed = e.data[2] * 2;
          break;

        case 5:
          verdeMidiGreen += e.data[2];
          break;
        case 6:
          verdeMidiBlue = e.data[2] * 2;
          break;
        case 7:
          verdeMidiGreen -= e.data[2];
          break;
        case 8:
          verdeMidiRed = e.data[2] * 2;
          break;

        case 9:
          moradoMidiGreen = e.data[2] * 2;
          break;
        case 10:
          moradoMidiBlue = e.data[2] * 2;
          break;
        case 11:
          moradoMidiYellow = e.data[2] * 0.2;
          break;
        case 12:
          moradoMidiRed = e.data[2];
          break;
      }
    });
  }
};

AnalyserView.prototype.initByteBuffer = function () {
  var gl = this.gl;
  var TEXTURE_HEIGHT = this.TEXTURE_HEIGHT;

  if (
    !this.freqByteData ||
    this.freqByteData.length != this.analyser.frequencyBinCount
  ) {
    freqByteData = new Uint8Array(this.analyser.frequencyBinCount);
    this.freqByteData = freqByteData;

    // (Re-)Allocate the texture object
    if (this.texture) {
      gl.deleteTexture(this.texture);
      this.texture = null;
    }
    var texture = gl.createTexture();
    this.texture = texture;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // TODO(kbr): WebGL needs to properly clear out the texture when null is specified
    var tmp = new Uint8Array(freqByteData.length * TEXTURE_HEIGHT);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.ALPHA,
      freqByteData.length,
      TEXTURE_HEIGHT,
      0,
      gl.ALPHA,
      gl.UNSIGNED_BYTE,
      tmp
    );
  }
};

AnalyserView.prototype.setAnalysisType = function (type) {
  // Check for read textures in vertex shaders.
  if (!this.has3DVisualizer && type == ANALYSISTYPE_3D_SONOGRAM) return;

  this.analysisType = type;
};

AnalyserView.prototype.analysisType = function () {
  return this.analysisType;
};

AnalyserView.prototype.doFrequencyAnalysis = function (event) {
  var freqByteData = this.freqByteData;
  this.analyser.smoothingTimeConstant = 0;
  this.analyser.getByteFrequencyData(freqByteData);
  this.drawGL();
};

AnalyserView.prototype.drawGL = function () {
  var canvas = this.canvas;
  var gl = this.gl;

  var sonogram3DVBO = this.sonogram3DVBO;
  var vbo3DTexCoordOffset = this.vbo3DTexCoordOffset;
  var sonogram3DGeometrySize = this.sonogram3DGeometrySize;
  var sonogram3DNumIndices = this.sonogram3DNumIndices;
  var sonogram3DHeight = this.sonogram3DHeight;
  var freqByteData = this.freqByteData;
  var texture = this.texture;
  var TEXTURE_HEIGHT = this.TEXTURE_HEIGHT;
  var sonogram3DShader = this.sonogram3DShader;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0,
    0,
    this.yoffset,
    freqByteData.length,
    1,
    gl.ALPHA,
    gl.UNSIGNED_BYTE,
    freqByteData
  );

  this.yoffset = (this.yoffset + 1) % TEXTURE_HEIGHT;

  var vertexLoc;
  var texCoordLoc;
  var frequencyDataLoc;
  var foregroundColorLoc;
  var backgroundColorLoc;
  var texCoordOffset;

  gl.bindBuffer(gl.ARRAY_BUFFER, sonogram3DVBO);
  sonogram3DShader.bind();
  vertexLoc = sonogram3DShader.gPositionLoc;
  texCoordLoc = sonogram3DShader.gTexCoord0Loc;
  frequencyDataLoc = sonogram3DShader.frequencyDataLoc;
  foregroundColorLoc = sonogram3DShader.foregroundColorLoc;
  backgroundColorLoc = sonogram3DShader.backgroundColorLoc;

  gl.uniform1i(sonogram3DShader.vertexFrequencyDataLoc, 0);

  var normalizedYOffset = this.yoffset / (TEXTURE_HEIGHT - 1);

  gl.uniform1f(sonogram3DShader.yoffsetLoc, normalizedYOffset);

  var discretizedYOffset =
    Math.floor(normalizedYOffset * (sonogram3DHeight - 1)) /
    (sonogram3DHeight - 1);

  gl.uniform1f(sonogram3DShader.vertexYOffsetLoc, discretizedYOffset);
  gl.uniform1f(sonogram3DShader.coloresLoc, moradoMidiYellow);
  gl.uniform1f(sonogram3DShader.transparenciaLoc, moradoMidiRed);
  gl.uniform1f(sonogram3DShader.translucidoLoc, moradoMidiGreen);

  gl.uniform1f(
    sonogram3DShader.verticalScaleLoc,
    (sonogram3DGeometrySize / 3.5) * verdeMidiGreen * 0.02
  );

  gl.uniform1f(
    sonogram3DShader.verticalScaleLoc,
    (sonogram3DGeometrySize / 3.5) * verdeMidiGreen * 0.02
  );

  projection.loadIdentity();
  projection.perspective(55 /*35*/, canvas.width / canvas.height, 1, 100);
  view.loadIdentity();
  view.translate(0, 0, -12 + blancoMidiBlue /* midiBlue * 0.2 -13.0*/);

  // Add in camera controller's rotation
  model.loadIdentity();
  model.rotate(this.cameraController.xRot + blancoMidiRed, 1, 0, 0);
  model.rotate(this.cameraController.yRot + blancoMidiYellow, 0, 1, 0);
  model.rotate(this.cameraController.zRot + blancoMidiGreen, 0, 0, 1);
  model.translate(
    this.cameraController.xT,
    this.cameraController.yT * verdeMidiBlue,
    this.cameraController.zT * -verderMidiYellow
  );

  // Compute necessary matrices
  var mvp = new Matrix4x4();
  mvp.multiply(model);
  mvp.multiply(view);
  mvp.multiply(projection);
  gl.uniformMatrix4fv(
    sonogram3DShader.worldViewProjectionLoc,
    gl.FALSE,
    mvp.elements
  );
  texCoordOffset = vbo3DTexCoordOffset;
  // console.log('model',mvp.elements);

  if (frequencyDataLoc) {
    gl.uniform1i(frequencyDataLoc, 0);
  }
  if (foregroundColorLoc) {
    gl.uniform4fv(foregroundColorLoc, this.foregroundColor);
  }
  if (backgroundColorLoc) {
    gl.uniform4fv(backgroundColorLoc, this.backgroundColor);
  }

  // Set up the vertex attribute arrays
  gl.enableVertexAttribArray(vertexLoc);
  gl.vertexAttribPointer(
    vertexLoc,
    3,
    gl.FLOAT,
    false,
    //Segmentos
    0,
    //frangas de frecuencias con 1
    0
  );
  gl.enableVertexAttribArray(texCoordLoc);
  gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, gl.FALSE, 0, texCoordOffset);

  // Clear the render area
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.drawElements(gl.TRIANGLES, sonogram3DNumIndices, gl.UNSIGNED_SHORT, 0);

  // Disable the attribute arrays for cleanliness
  gl.disableVertexAttribArray(vertexLoc);
  gl.disableVertexAttribArray(texCoordLoc);
};

AnalyserView.prototype.setAnalyserNode = function (analyser) {
  this.analyser = analyser;
};

module.exports = AnalyserView;
