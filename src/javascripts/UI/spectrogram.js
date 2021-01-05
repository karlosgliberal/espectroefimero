"use strict";
var Util = require("../util/util.js");
var Player = require("../UI/player");
var AnalyserView = require("../3D/visualizer");

var spec3D = {
  cxRot: 90,
  drawingMode: false,
  prevX: 0,

  attached: function () {
    console.log("spectrogram-3d attached");
    Util.setLogScale(20, 20, 20000, 20000);
    spec3D.onResize_();
    spec3D.init_();
    window.addEventListener("resize", spec3D.onResize_.bind(spec3D));
  },

  stop: function () {
    spec3D.player.stop();
  },

  isPlaying: function () {
    return !!this.player.source;
  },

  stopRender: function () {
    spec3D.isRendering = false;
  },

  startRender: function () {
    if (spec3D.isRendering) {
      return;
    }
    spec3D.isRendering = true;
    spec3D.draw_();
  },

  play: function (src) {
    spec3D.src = src;
    spec3D.player.playSrc(src);
  },

  live: function () {
    spec3D.player.live();
  },

  userAudio: function (src) {
    spec3D.player.playUserAudio(src);
  },

  init_: function () {
    // Initialize everything.
    var player = new Player();
    var analyserNode = player.getAnalyserNode();

    var analyserView = new AnalyserView(this.canvas);
    analyserView.setAnalyserNode(analyserNode);
    analyserView.midiAddListener();
    analyserView.initByteBuffer();

    spec3D.player = player;
    spec3D.analyserView = analyserView;
  },

  onResize_: function () {
    console.log("onResize_");
    var canvas = $("#spectrogram")[0];
    spec3D.canvas = canvas;
    canvas.width = $(window).width();
    canvas.height = $(window).height();
  },

  draw_: function () {
    if (!spec3D.isRendering) {
      console.log("stopped draw_");
      return;
    }
    spec3D.analyserView.doFrequencyAnalysis();
    requestAnimationFrame(spec3D.draw_.bind(spec3D));
  },

  freqStart: 20,
  freqEnd: 20000,
  padding: 300,
  yToFreq: function (y) {
    var padding = spec3D.padding;
    var height = $("#spectrogram").height();

    if (
      height < 2 * padding || // The spectrogram isn't tall enough
      y < padding || // Y is out of bounds on top.
      y > height - padding
    ) {
      // Y is out of bounds on the bottom.
      return null;
    }
    var percentFromBottom = 1 - (y - padding) / (height - padding);
    var freq =
      spec3D.freqStart +
      (spec3D.freqEnd - spec3D.freqStart) * percentFromBottom;
    return Util.lin2log(freq);
  },

  // Just an inverse of yToFreq.
  freqToY: function (logFreq) {
    // Go from logarithmic frequency to linear.
    var freq = Util.log2lin(logFreq);
    var height = $("#spectrogram").height();
    var padding = spec3D.padding;
    // Get the frequency percentage.
    var percent =
      (freq - spec3D.freqStart) / (spec3D.freqEnd - spec3D.freqStart);
    // Apply padding, etc.
    return spec3D.padding + percent * (height - 2 * padding);
  },
};

module.exports = spec3D;
