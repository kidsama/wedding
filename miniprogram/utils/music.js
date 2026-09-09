// ========== 全局背景音乐（跨页面单例）==========
// 所有页面共享同一个 InnerAudioContext，切 Tab 音乐不间断；
// 页面通过 subscribe 同步播放状态，通过 toggle/start/pause 控制。

const { WEDDING } = require('./config');

let audio = null;
let playing = false;
const listeners = [];

function ensureAudio() {
  if (audio || !WEDDING.musicUrl) return audio;
  audio = wx.createInnerAudioContext();
  audio.src = WEDDING.musicUrl;
  audio.loop = true;
  audio.onPlay(() => setPlaying(true));
  audio.onPause(() => setPlaying(false));
  audio.onStop(() => setPlaying(false));
  audio.onError(() => setPlaying(false));
  return audio;
}

function setPlaying(v) {
  if (playing === v) return;
  playing = v;
  listeners.slice().forEach((fn) => {
    try { fn(v); } catch (e) { /* 单个页面回调异常不影响其他订阅者 */ }
  });
}

function start() {
  const a = ensureAudio();
  if (a) a.play();
}

function pause() {
  if (audio) audio.pause();
}

function toggle() {
  if (playing) pause(); else start();
}

function isPlaying() {
  return playing;
}

// 订阅播放状态变化；订阅时立即回调一次当前状态，返回取消订阅函数
function subscribe(fn) {
  if (typeof fn === 'function') {
    listeners.push(fn);
    fn(playing);
  }
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

module.exports = { start, pause, toggle, isPlaying, subscribe };
