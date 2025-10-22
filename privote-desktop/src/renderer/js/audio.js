/**
 * Audio Processing and Visualization
 * Handles audio conversion, visualization, and timer
 */

import { state } from "./state.js";

/**
 * Convert audio blob to WAV format
 * @param {Blob} audioBlob - Audio blob to convert
 * @returns {Promise<Blob>} WAV blob
 */
export async function convertToWav(audioBlob) {
  try {
    console.log("Converting audio to WAV format...");

    const audioContext = new (window.AudioContext || window.webkitAudioContext)(
      {
        sampleRate: 16000,
      }
    );

    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const channelData =
      audioBuffer.numberOfChannels > 1
        ? mergeChannels(audioBuffer)
        : audioBuffer.getChannelData(0);

    const wavBuffer = encodeWAV(channelData, audioBuffer.sampleRate);
    const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });

    console.log(
      `Converted to WAV: ${wavBlob.size} bytes, ${audioBuffer.duration.toFixed(
        2
      )}s`
    );

    return wavBlob;
  } catch (error) {
    console.error("Error converting to WAV:", error);
    return audioBlob;
  }
}

/**
 * Merge stereo channels to mono
 * @param {AudioBuffer} audioBuffer - Audio buffer
 * @returns {Float32Array} Mono channel data
 */
function mergeChannels(audioBuffer) {
  const left = audioBuffer.getChannelData(0);
  const right =
    audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;
  const mono = new Float32Array(left.length);

  for (let i = 0; i < left.length; i++) {
    mono[i] = (left[i] + right[i]) / 2;
  }

  return mono;
}

/**
 * Encode Float32Array to WAV format
 * @param {Float32Array} samples - Audio samples
 * @param {number} sampleRate - Sample rate
 * @returns {ArrayBuffer} WAV buffer
 */
function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

/**
 * Write string to DataView
 * @param {DataView} view - DataView
 * @param {number} offset - Offset
 * @param {string} string - String to write
 */
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Initialize audio visualizer
 */
export function initializeVisualizer() {
  const canvas = document.getElementById("visualizer-canvas");
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#262626";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#6366f1";
  ctx.fillRect(canvas.width / 2 - 2, canvas.height / 2 - 10, 4, 20);
}

/**
 * Setup audio visualization
 * @param {MediaStream} stream - Media stream
 */
export function setupAudioVisualization(stream) {
  const canvas = document.getElementById("visualizer-canvas");
  const ctx = canvas.getContext("2d");

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);

  source.connect(analyser);
  analyser.fftSize = 256;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    if (!state.isRecording) {
      initializeVisualizer();
      return;
    }

    requestAnimationFrame(draw);

    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = "#262626";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

      const gradient = ctx.createLinearGradient(
        0,
        canvas.height - barHeight,
        0,
        canvas.height
      );
      gradient.addColorStop(0, "#6366f1");
      gradient.addColorStop(1, "#8b5cf6");
      ctx.fillStyle = gradient;

      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }
  }

  draw();
}

/**
 * Start recording timer
 */
export function startTimer() {
  state.timerInterval = setInterval(() => {
    const elapsed = Date.now() - state.recordingStartTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    const timerDisplay = document.getElementById("recording-timer");
    timerDisplay.textContent = `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, 1000);
}

/**
 * Stop recording timer
 */
export function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }

  setTimeout(() => {
    document.getElementById("recording-timer").textContent = "00:00:00";
  }, 2000);
}
