// ========== 全局背景音乐（跨页面单例）==========
// 所有页面共享同一个 InnerAudioContext，切 Tab 音乐不间断；
// 页面通过 subscribe 同步播放状态，通过 toggle/start/pause 控制。

const { WEDDING } = require('./config');

let audio = null;
let playing = false;
let fadeTimer = null;   // 渐响定时器
let fadedIn = false;    // 本次会话是否已做过渐响（只在第一次播放时）
const listeners = [];

// 从候选池随机选一首（每次冷启动小程序抽一次，本次会话内固定）
function pickSong() {
  const pool = WEDDING.musicUrls || (WEDDING.musicUrl ? [WEDDING.musicUrl] : []);
  if (!pool.length) return '';
  return pool[Math.floor(Math.random() * pool.length)];
}

function clearFade() {
  if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
}

// 渐响：音量从 0 线性升到 1（秒数取 config 的 musicFadeIn）
function startFade(sec) {
  clearFade();
  const STEP = 50; // ms
  const total = Math.max(1, Math.round(sec * 1000));
  let elapsed = 0;
  try { audio.volume = 0; } catch (e) { return; }
  fadeTimer = setInterval(() => {
    elapsed += STEP;
    const v = Math.min(1, elapsed / total);
    try { audio.volume = v; } catch (e) { clearFade(); return; }
    if (v >= 1) clearFade();
  }, STEP);
}

function ensureAudio() {
  if (audio) return audio;
  const src = pickSong();
  if (!src) return null;
  audio = wx.createInnerAudioContext();
  audio.src = src;
  audio.loop = true;
  audio.onPlay(() => {
    setPlaying(true);
    // 只在本次会话首次播放时渐响，暂停后恢复不重做
    if (!fadedIn) {
      fadedIn = true;
      const sec = Number(WEDDING.musicFadeIn);
      if (sec > 0) startFade(sec);
    }
  });
  audio.onPause(() => { clearFade(); setPlaying(false); });
  audio.onStop(() => { clearFade(); setPlaying(false); });
  audio.onError(() => { clearFade(); setPlaying(false); });
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
