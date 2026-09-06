const { API_BASE, WEDDING } = require('../../utils/config');

// 兜底照片列表（云托管 /api/photos 请求失败时使用）
const FALLBACK_PHOTOS = Array.from({ length: 12 }, (_, i) => ({
  url: `https://picsum.photos/seed/${i + 1}/400/400`,
  title: `照片 ${i + 1}`
}));

// 穿插在照片之间的情话
const LOVE_QUOTES = [
  '一见倾心，再见倾城。',
  '山水一程，三生有幸。',
  '往后余生，风雪是你，平淡是你。',
  '陪伴，是最长情的告白。',
  '春风十里，不如你。',
  '愿岁月可回首，且以深情共白头。'
];

// 弹幕占位祝福（后端暂无数据时展示）
const DEFAULT_BLESSINGS = [
  { name: '亲友', message: '新婚快乐，百年好合！' },
  { name: '亲友', message: '祝永结同心，白头偕老！' },
  { name: '亲友', message: '愿你们永远幸福！' },
  { name: '亲友', message: '佳偶天成，永浴爱河！' },
  { name: '亲友', message: '祝爱情天长地久！' },
  { name: '亲友', message: '幸福美满，早生贵子！' }
];

// iOS 不支持 'YYYY-MM-DD HH:mm' 直接 new Date，把 '-' 换成 '/'
function parseWeddingDate(str) {
  return new Date(String(str).replace(/-/g, '/')).getTime();
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// 尾页花押：双方名字首字母
const MONOGRAM = `${WEDDING.groom[0] || ''} & ${WEDDING.bride[0] || ''}`;

Page({
  data: {
    wedding: WEDDING,
    monogram: MONOGRAM,
    current: 0,
    photos: [],
    heroUrl: '',
    stories: [],
    countdown: { d: '0', h: '00', m: '00', s: '00' },
    married: false,
    danmakuLanes: [[], [], []],
    blessingTotal: null,
    showBlessModal: false,
    blessName: '',
    blessText: '',
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

  // 翻页追踪：驱动各屏入场渐显动画
  onSwiperChange(e) {
    this.setData({ current: e.detail.current });
  },

  // ========== 照片列表 + 艺术分组 ==========
  fetchPhotos() {
    wx.request({
      url: `${API_BASE}/api/photos`,
      method: 'GET',
      timeout: 8000,
      success: (res) => {
        const data = res.data && res.data.data;
        if (res.data && res.data.code === 0 && Array.isArray(data) && data.length > 0) {
          this.applyPhotos(data);
        } else {
          this.applyPhotos(FALLBACK_PHOTOS);
        }
      },
      fail: () => this.applyPhotos(FALLBACK_PHOTOS)
    });
  },

  applyPhotos(list) {
    // 两两一组，配一句情话，奇数组左右互换形成错落感；每组独占一屏
    const stories = [];
    for (let i = 0; i < list.length; i += 2) {
      stories.push({
        a: list[i],
        b: list[i + 1] || null,
        quote: LOVE_QUOTES[stories.length % LOVE_QUOTES.length],
        reverse: stories.length % 2 === 1
      });
    }
    this.setData({
      photos: list,
      heroUrl: list[0].url,
      stories
    });
  },

  onPhotoTap(e) {
    const urls = this.data.photos.map((p) => p.url);
    wx.previewImage({ current: urls[e.currentTarget.dataset.index], urls });
  },

  // ========== 倒计时 ==========
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

  // ========== 地点导航（填了经纬度直接导航；没填则让用户在地图上选一次） ==========
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
      return;
    }
    wx.chooseLocation({
      success: (res) => {
        wx.openLocation({
          latitude: res.latitude,
          longitude: res.longitude,
          name: res.name || venue,
          address: res.address || address,
          scale: 18
        });
      },
      fail: () => {
        wx.showToast({ title: '未选择位置', icon: 'none' });
      }
    });
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

  // ========== 亲友祝福（弹幕） ==========
  fetchBlessings() {
    wx.request({
      url: `${API_BASE}/api/blessings`,
      method: 'GET',
      timeout: 8000,
      success: (res) => {
        const data = res.data && res.data.data;
        if (res.data && res.data.code === 0 && data) {
          this.applyBlessings(data.items || [], data.total || 0);
        }
      }
    });
  },

  applyBlessings(items, total) {
    const list = items.length > 0
      ? items.map((b) => ({ name: b.name, message: b.message }))
      : DEFAULT_BLESSINGS;

    // 分 3 条弹幕轨道，循环滚动
    const lanes = [[], [], []];
    list.forEach((b, i) => {
      lanes[i % 3].push(`${b.name}：${b.message}`);
    });
    this.setData({ danmakuLanes: lanes, blessingTotal: items.length > 0 ? total : null });
  },

  openBlessModal() {
    this.setData({ showBlessModal: true, blessName: '', blessText: '' });
  },

  closeBlessModal() {
    this.setData({ showBlessModal: false });
  },

  onNameInput(e) {
    this.setData({ blessName: e.detail.value });
  },

  onTextInput(e) {
    this.setData({ blessText: e.detail.value });
  },

  submitBlessing() {
    const name = this.data.blessName.trim();
    const message = this.data.blessText.trim();
    if (!name) return wx.showToast({ title: '请填写您的称呼', icon: 'none' });
    if (!message) return wx.showToast({ title: '请填写祝福语', icon: 'none' });

    wx.request({
      url: `${API_BASE}/api/blessings`,
      method: 'POST',
      data: { name, message },
      timeout: 8000,
      success: (res) => {
        if (res.data && res.data.code === 0) {
          this.setData({ showBlessModal: false });
          wx.showToast({ title: '感谢您的祝福 ❤', icon: 'none' });
          this.fetchBlessings();
        } else {
          wx.showToast({ title: (res.data && res.data.errorMsg) || '提交失败', icon: 'none' });
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
