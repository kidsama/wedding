const { API_BASE, WEDDING } = require('../../utils/config');

// 云托管 /api/photos 请求失败时的兜底照片列表
const FALLBACK_PHOTOS = Array.from({ length: 16 }, (_, i) => ({
  url: `https://picsum.photos/seed/${i + 1}/400/400`,
  title: `照片 ${i + 1}`
}));

// iOS 不支持 'YYYY-MM-DD HH:mm' 直接 new Date，转成 '/'
function parseWeddingDate(str) {
  return new Date(String(str).replace(/-/g, '/')).getTime();
}

function pad(n) {
  return String(n).padStart(2, '0');
}

Page({
  data: {
    wedding: WEDDING,
    photos: [],
    heroUrl: '',
    countdown: { d: '0', h: '00', m: '00', s: '00' },
    married: false,
    blessings: null,   // null 表示加载中/不可用，页面据此隐藏
    musicPlaying: false
  },

  onLoad() {
    this.fetchPhotos();
    this.fetchBlessings();
    this.initCountdown();
    this.initMusic();
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer);
    if (this._audio) this._audio.destroy();
  },

  onHide() {
    if (this._audio && this.data.musicPlaying) {
      this._audio.pause();
      this.setData({ musicPlaying: false });
    }
  },

  // ========== 照片列表 ==========
  fetchPhotos() {
    wx.request({
      url: `${API_BASE}/api/photos`,
      method: 'GET',
      timeout: 8000,
      success: (res) => {
        const data = res.data && res.data.data;
        if (res.data && res.data.code === 0 && Array.isArray(data) && data.length > 0) {
          this.setData({ photos: data, heroUrl: data[0].url });
        } else {
          this.useFallback();
        }
      },
      fail: () => this.useFallback()
    });
  },

  useFallback() {
    this.setData({ photos: FALLBACK_PHOTOS, heroUrl: FALLBACK_PHOTOS[0].url });
  },

  // 点击照片 → 原生大图预览
  onPhotoTap(e) {
    const urls = this.data.photos.map((p) => p.url);
    wx.previewImage({ current: urls[e.currentTarget.dataset.index], urls });
  },

  // ========== 婚礼倒计时 ==========
  initCountdown() {
    const target = parseWeddingDate(WEDDING.date);
    if (isNaN(target)) return;

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        this.setData({ married: true });
        clearInterval(this._timer);
        return;
      }
      this.setData({
        countdown: {
          d: String(Math.floor(diff / 86400000)),
          h: pad(Math.floor(diff / 3600000) % 24),
          m: pad(Math.floor(diff / 60000) % 60),
          s: pad(Math.floor(diff / 1000) % 60)
        }
      });
    };

    tick();
    this._timer = setInterval(tick, 1000);
  },

  // ========== 地点导航 / 添加日历 ==========
  openMap() {
    const { latitude, longitude, venue, address } = WEDDING;
    if (Number(latitude) && Number(longitude)) {
      wx.openLocation({
        latitude: Number(latitude),
        longitude: Number(longitude),
        name: venue,
        address,
        scale: 18
      });
    } else {
      wx.showToast({ title: '请先在 config.js 填写经纬度', icon: 'none' });
    }
  },

  saveDate() {
    const ts = Math.floor(parseWeddingDate(WEDDING.date) / 1000);
    if (!ts) return;
    wx.addPhoneCalendar({
      title: `${WEDDING.groom} ❤ ${WEDDING.bride} 婚礼`,
      startTime: ts,
      allDay: false,
      description: `${WEDDING.venue}\n${WEDDING.address}`,
      success: () => wx.showToast({ title: '已添加到手机日历', icon: 'success' }),
      fail: () => wx.showToast({ title: '未授权日历权限', icon: 'none' })
    });
  },

  // ========== 好友祝福（复用云托管计数接口） ==========
  fetchBlessings() {
    wx.request({
      url: `${API_BASE}/api/count`,
      method: 'GET',
      timeout: 6000,
      success: (res) => {
        if (res.data && res.data.code === 0 && typeof res.data.data === 'number') {
          this.setData({ blessings: res.data.data });
        }
      }
    });
  },

  onBless() {
    wx.request({
      url: `${API_BASE}/api/count`,
      method: 'POST',
      data: { action: 'inc' },
      header: { 'content-type': 'application/json' },
      timeout: 6000,
      success: (res) => {
        if (res.data && res.data.code === 0) {
          this.setData({ blessings: res.data.data });
          wx.showToast({ title: '感谢您的祝福 ❤', icon: 'none' });
        } else {
          wx.showToast({ title: '稍后再试', icon: 'none' });
        }
      },
      fail: () => wx.showToast({ title: '网络不太顺畅', icon: 'none' })
    });
  },

  // ========== 背景音乐 ==========
  initMusic() {
    if (!WEDDING.musicUrl) return;
    this._audio = wx.createInnerAudioContext();
    this._audio.src = WEDDING.musicUrl;
    this._audio.loop = true;
    this._audio.onError(() => this.setData({ musicPlaying: false }));
    this._audio.play();
    this.setData({ musicPlaying: true });
  },

  toggleMusic() {
    if (!this._audio) return;
    if (this.data.musicPlaying) {
      this._audio.pause();
    } else {
      this._audio.play();
    }
    this.setData({ musicPlaying: !this.data.musicPlaying });
  },

  // ========== 分享卡片 ==========
  onShareAppMessage() {
    return {
      title: `诚挚邀请您参加 ${WEDDING.groom} ❤ ${WEDDING.bride} 的婚礼`,
      path: '/pages/index/index',
      imageUrl: this.data.heroUrl
    };
  },

  onShareTimeline() {
    return {
      title: `诚挚邀请您参加 ${WEDDING.groom} ❤ ${WEDDING.bride} 的婚礼`,
      query: '',
      imageUrl: this.data.heroUrl
    };
  }
});
