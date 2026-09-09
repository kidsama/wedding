const { API_BASE, WEDDING, ASSET_BASE, ASSETS } = require('../../utils/config');
const music = require('../../utils/music');
const { parseWeddingDate, pad, getVisitorKey } = require('../../utils/common');

// 云存储素材完整地址
const ICONS = {
  musicOn: ASSET_BASE + ASSETS.musicOn
};

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

// 尾页花押：双方名字首字母
const MONOGRAM = `${WEDDING.groom[0] || ''} & ${WEDDING.bride[0] || ''}`;

Page({
  data: {
    wedding: WEDDING,
    monogram: MONOGRAM,
    icons: ICONS,
    current: 0,
    photos: [],
    heroUrl: '',
    stories: [],
    countdown: { d: '0', h: '00', m: '00', s: '00' },
    married: false,
    danmakuLanes: [[], [], []],
    blessingTotal: null,
    visitTotal: null,
    showBlessModal: false,
    blessName: '',
    blessText: '',
    musicPlaying: false,
    // 到场回执
    rsvpAttend: null,      // null=未选择 true=参加 false=不参加
    rsvpGuests: 1,
    rsvpName: '',
    rsvpStats: null,
    rsvpMine: false
  },

  onLoad(options) {
    // 通过分享卡片进入时，隐藏底部菜单栏，呈现全屏沉浸式请柬
    this._shareEntry = !!(options && options.entry === 'share');
    this._tabBarPending = this._shareEntry;
    if (this._shareEntry) this.hideTabBarForShare();
    this._vk = getVisitorKey();
    this.setData({ musicPlaying: music.isPlaying() });
    this._unsubMusic = music.subscribe((p) => this.setData({ musicPlaying: p }));
    this.sendVisit();
    this.fetchVisitStats();
    this.fetchPhotos();
    this.fetchBlessings();
    this.fetchRsvp();
    this.fetchRsvpStats();
    this.initCountdown();
  },

  onShow() {
    // onLoad 里调用可能因时机过早未生效，首次 onShow 再补一次；
    // 之后切 Tab 回来不再触发，避免把正常浏览时的菜单栏也藏掉
    if (this._tabBarPending) this.hideTabBarForShare();
  },

  hideTabBarForShare() {
    this._tabBarPending = false;
    wx.hideTabBar({ animation: false, fail: () => {} });
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer);
    if (this._unsubMusic) this._unsubMusic();
  },

  // 翻页追踪：驱动各屏入场渐显动画
  onSwiperChange(e) {
    this.setData({ current: e.detail.current });
  },

  // ========== 访问记录 ==========
  sendVisit() {
    wx.request({
      url: `${API_BASE}/api/visit`,
      method: 'POST',
      data: { visitorKey: this._vk },
      timeout: 8000
    });
  },

  fetchVisitStats() {
    wx.request({
      url: `${API_BASE}/api/visit/stats`,
      method: 'GET',
      timeout: 8000,
      success: (res) => {
        if (res.data && res.data.code === 0 && res.data.data) {
          this.setData({ visitTotal: res.data.data.unique || 0 });
        }
      }
    });
  },

  // ========== 到场回执 ==========
  fetchRsvp() {
    wx.request({
      url: `${API_BASE}/api/rsvp?visitorKey=${encodeURIComponent(this._vk)}`,
      method: 'GET',
      timeout: 8000,
      success: (res) => {
        const d = res.data && res.data.data;
        if (res.data && res.data.code === 0 && d) {
          this.setData({
            rsvpAttend: !!d.attend,
            rsvpGuests: d.guests || 1,
            rsvpName: d.name || '',
            rsvpMine: true
          });
        }
      }
    });
  },

  fetchRsvpStats() {
    wx.request({
      url: `${API_BASE}/api/rsvp/stats`,
      method: 'GET',
      timeout: 8000,
      success: (res) => {
        if (res.data && res.data.code === 0 && res.data.data) {
          this.setData({ rsvpStats: res.data.data });
        }
      }
    });
  },

  onRsvpAttend(e) {
    this.setData({ rsvpAttend: e.currentTarget.dataset.attend === 'yes' });
  },

  onRsvpName(e) {
    this.setData({ rsvpName: e.detail.value });
  },

  onGuestsAdd() {
    this.setData({ rsvpGuests: Math.min(20, this.data.rsvpGuests + 1) });
  },

  onGuestsSub() {
    this.setData({ rsvpGuests: Math.max(1, this.data.rsvpGuests - 1) });
  },

  submitRsvp() {
    const attend = this.data.rsvpAttend;
    if (attend === null) {
      return wx.showToast({ title: '请先选择是否出席', icon: 'none' });
    }
    wx.request({
      url: `${API_BASE}/api/rsvp`,
      method: 'POST',
      data: {
        visitorKey: this._vk,
        name: this.data.rsvpName.trim(),
        attend,
        guests: attend ? this.rsvpGuestsSafe() : 0
      },
      timeout: 8000,
      success: (res) => {
        if (res.data && res.data.code === 0) {
          wx.showToast({ title: attend ? '期待您的到来 ❤' : '已收到您的回复', icon: 'none' });
          this.setData({ rsvpMine: true });
          this.fetchRsvpStats();
        } else {
          wx.showToast({ title: (res.data && res.data.errorMsg) || '提交失败', icon: 'none' });
        }
      },
      fail: () => wx.showToast({ title: '网络不太顺畅', icon: 'none' })
    });
  },

  rsvpGuestsSafe() {
    const g = Number(this.data.rsvpGuests);
    return isNaN(g) ? 1 : Math.max(1, Math.min(20, g));
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

  // ========== 地点导航（wx.openLocation 个人小程序可用，无需申请权限；需在 config.js 配好经纬度） ==========
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
    // 未配置经纬度：弹窗展示地址（不写剪切板，避免隐私声明）
    wx.showModal({
      title: '婚礼地点',
      content: `${venue}\n${address}`,
      showCancel: false,
      confirmText: '知道了'
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

  // ========== 背景音乐（全局单例，切 Tab 不间断） ==========
  toggleMusic() {
    music.toggle();
  },

  // ========== 分享卡片 ==========
  onShareAppMessage() {
    return {
      title: `诚挚邀请您参加 ${WEDDING.groom} ❤ ${WEDDING.bride} 的婚礼`,
      path: '/pages/invite/invite?entry=share',
      imageUrl: this.data.heroUrl
    };
  },

  onShareTimeline() {
    return {
      title: `诚挚邀请您参加 ${WEDDING.groom} ❤ ${WEDDING.bride} 的婚礼`,
      query: 'entry=share',
      imageUrl: this.data.heroUrl
    };
  }
});
