"use strict";

window.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
);
window.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
window.isAndroid = /Android/.test(navigator.userAgent) && !window.MSStream;

window.requestAnimFrame = (function () {
  return (
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function (callback) {
      window.setTimeout(callback, 1000 / 60);
    }
  );
})();

// -~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~
var spec3D = require("./UI/spectrogram");
// -~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~

window.midiRed = 40;

$(function () {
  WebMidi.enable(function (err) {
    if (err) {
      console.log("WebMidi could not be enabled.", err);
    } else {
      console.log("WebMidi enabled!");
      $(function () {
        var startup = function () {
          var source = null; // global source for user dropped audio
          window.parent.postMessage("ready", "*");
          var sp = spec3D;
          sp.attached();
          $("body").click(function (e) {
            //$("body").fadeIn().delay(2000).fadeOut();
            // $("#record").fadeIn().delay(2000).fadeOut();
            sp.startRender();
            var wasPlaying = sp.isPlaying();
            sp.stop();
            sp.drawingMode = false;
            sp.live();
          });

          var killSound = function () {
            sp.startRender();
            var wasPlaying = sp.isPlaying();
            sp.stop();
            sp.drawingMode = false;
          };

          window.addEventListener("blur", function () {
            //killSound();
          });
          document.addEventListener("visibilitychange", function () {
            //killSound();
          });
        };

        startup();
      });
    }
  });
});
