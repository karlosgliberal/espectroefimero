var Util = require("../util/util.js");

function Player() {
  // Create an audio graph.
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  context = new AudioContext();

  var analyser = context.createAnalyser();
  //analyser.fftSize = 2048 * 2 * 2
  // analyser.fftSize = (window.isMobile)? 2048 : 8192;
  analyser.fftSize = window.isMobile ? 1024 : 2048;
  analyser.smoothingTimeConstant = 0;

  // Create a mix.
  var mix = context.createGain();

  // Create a bandpass filter.
  var bandpass = context.createBiquadFilter();
  bandpass.Q.value = 10;
  bandpass.type = "bandpass";

  var filterGain = context.createGain();
  filterGain.gain.value = 1;

  // Connect audio processing graph
  mix.connect(analyser);
  analyser.connect(filterGain);
  filterGain.connect(context.destination);

  this.context = context;
  this.mix = mix;
  // this.bandpass = bandpass;
  this.filterGain = filterGain;
  this.analyser = analyser;

  this.buffers = {};
}

Player.prototype.live = function () {
  // The AudioContext may be in a suspended state prior to the page receiving a user
  // gesture. If it is, resume it.
  if (this.context.state === "suspended") {
    this.context.resume();
  }
  if (window.isIOS) {
    window.parent.postMessage("error2", "*");
    console.log("cant use mic on ios");
  } else {
    if (this.input) {
      this.input.disconnect();
      this.input = null;
      return;
    }

    var self = this;
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        self.onStream_(stream);
      })
      .catch(function () {
        self.onStreamError(this);
      });

    this.filterGain.gain.value = 0;
  }
};

Player.prototype.onStream_ = function (stream) {
  var input = this.context.createMediaStreamSource(stream);
  input.connect(this.mix);
  this.input = input;
  this.stream = stream;
};

Player.prototype.setLoop = function (loop) {
  this.loop = loop;
};

Player.prototype.createSource_ = function (buffer, loop) {
  var source = this.context.createBufferSource();
  source.buffer = buffer;
  source.loop = loop;
  source.connect(this.mix);
  return source;
};

Player.prototype.stop = function () {
  if (this.source) {
    this.source.stop(0);
    this.source = null;
    clearTimeout(this.playTimer);
    this.playTimer = null;
  }
  if (this.input) {
    this.input.disconnect();
    this.input = null;
    return;
  }
};

Player.prototype.getAnalyserNode = function () {
  return this.analyser;
};

Player.prototype.setBandpassFrequency = function (freq) {
  if (freq == null) {
    console.log("Removing bandpass filter");
    // Remove the effect of the bandpass filter completely, connecting the mix to the analyser directly.
    this.mix.disconnect();
    this.mix.connect(this.analyser);
  } else {
    // console.log('Setting bandpass frequency to %d Hz', freq);
    // Only set the frequency if it's specified, otherwise use the old one.
    this.bandpass.frequency.value = freq;
    this.mix.disconnect();
    this.mix.connect(this.bandpass);
    // bandpass is connected to filterGain.
    this.filterGain.connect(this.analyser);
  }
};

module.exports = Player;
