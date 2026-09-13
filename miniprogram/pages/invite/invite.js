const { API_BASE, WEDDING, ASSET_BASE, ASSETS, INVITATIONS, CLASSIC_SLOTS } = require('../../utils/config');
const { request } = require('../../utils/api');
const music = require('../../utils/music');
const { parseWeddingDate, pad, getVisitorKey, thumbUrl } = require('../../utils/common');

// 云存储素材完整地址
const ICONS = {
  musicOn: ASSET_BASE + ASSETS.musicOn
};

// 兜底照片列表（邀请函未配置 photos 时使用；外链无法缩略，thumb=url）
const FALLBACK_PHOTOS = Array.from({ length: 12 }, (_, i) => {
  const url = `https://picsum.photos/seed/${i + 1}/400/400`;
  return { url, thumb: url, title: `照片 ${i + 1}` };
});

// 云存储照片目录（/图片压缩-小程序/，中文已 URL 编码）
const PHOTO_DIR = '/%E5%9B%BE%E7%89%87%E5%8E%8B%E7%BC%A9-%E5%B0%8F%E7%A8%8B%E5%BA%8F/';

// 经典版长页 S1-S10 槽位照片直链（值为空的槽位不生成，wxml 显示占位框）
// 展示用 1200px 缩略（长页最大显示宽 ~1000 物理像素），onImgTap 预览同图足够清晰
const CLASSIC_IMG = {};
Object.keys(CLASSIC_SLOTS).forEach((k) => {
  if (CLASSIC_SLOTS[k]) {
    CLASSIC_IMG[k] = thumbUrl(ASSET_BASE + PHOTO_DIR + encodeURIComponent(CLASSIC_SLOTS[k]), 1200);
  }
});

// S2 日历卡：按婚礼日期生成当月月历（周一起始，婚礼日标红）
function buildCal(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7; // 周一=0
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push({ d: null, on: false, k: 'b' + i });
  for (let i = 1; i <= days; i++) cells.push({ d: i, on: i === day, k: 'd' + i });
  const tail = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < tail; i++) cells.push({ d: null, on: false, k: 'e' + i });
  return { label: `${m + 1}/${pad(day)}`, year: String(y), cells };
}

const WED_TS = parseWeddingDate(WEDDING.date);
const WED_D = isNaN(WED_TS) ? null : new Date(WED_TS);
const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];
const DATE_LONG = WED_D
  ? `${WED_D.getFullYear()}年${WED_D.getMonth() + 1}月${WED_D.getDate()}日 星期${WEEK_CN[WED_D.getDay()]}`
  : '';
const TIME_SHORT = WED_D ? `${pad(WED_D.getHours())}:${pad(WED_D.getMinutes())}` : '';
const CAL_DATA = WED_D ? buildCal(WED_TS) : { label: '', year: '', cells: [] };
// S9 地图图钉（包内本地图标）
const MAP_MARKERS = [
  {
    id: 1,
    latitude: Number(WEDDING.latitude),
    longitude: Number(WEDDING.longitude),
    iconPath: '/images/map-pin.png',
    width: 36,
    height: 48
  }
];

// 按邀请函配置的文件名生成照片直链列表（未配置则回退兜底图）
// url=原图（previewImage 大图预览/分享卡用），thumb=1080px 缩略（页面展示用）
function photosForInvite(inv) {
  const files = inv && inv.photos;
  if (!files || files.length === 0) return FALLBACK_PHOTOS;
  return files.map((f) => {
    const url = ASSET_BASE + PHOTO_DIR + encodeURIComponent(f);
    return { url, thumb: thumbUrl(url, 1080), title: f };
  });
}

// 故事区六屏「杂志画册式」章节：遇见/四季/旅途/日常/决定/邀请
// 文案为占位草稿（相遇年份、早餐数等），拿到真实素材后直接替换即可
function buildChapters(list) {
  // 从第 start 张起取 n 张；g 记录全局序号，供大图预览定位
  const take = (start, n) => {
    const out = [];
    for (let i = start; i < start + n && i < list.length; i++) {
      out.push({ url: list[i].url, thumb: list[i].thumb || thumbUrl(list[i].url, 1080), g: i });
    }
    return out;
  };
  const dateStr = (WEDDING.date || '').slice(0, 10).replace(/-/g, '.');
  return [
    {
      layout: 'hero',
      no: 'CHAPTER 01',
      title: '遇 见',
      en: 'THE FIRST HELLO',
      lines: ['人海茫茫，多看了你一眼，就再也没能移开。'],
      foot: '20XX · 我们相遇的城市', // 占位：换成真实的相遇年份与地点
      photo: take(0, 1)[0] || null
    },
    {
      layout: 'grid4',
      no: 'CHAPTER 02',
      title: '四 季',
      en: 'FOUR SEASONS',
      labels: ['春 · 相识', '夏 · 同行', '秋 · 相守', '冬 · 归家'],
      photos: take(1, 4)
    },
    {
      layout: 'strip',
      no: 'CHAPTER 03',
      title: '旅 途',
      en: 'ON THE ROAD',
      lines: ['一起走过的路，都成了回忆里的坐标。'],
      photos: take(5, 3)
    },
    {
      layout: 'daily',
      no: 'CHAPTER 04',
      title: '日 常',
      en: 'EVERYDAY LIFE',
      accentNum: '1000+', // 占位：换成真实数字
      accentUnit: '顿一起吃的早餐',
      photos: take(8, 3)
    },
    {
      layout: 'yes',
      no: 'CHAPTER 05',
      title: '决 定',
      en: 'SAID YES',
      badgeTitle: '终身合伙人 ✓',
      badgeSub: `已签约 · ${dateStr}`,
      photo: take(11, 1)[0] || null
    },
    {
      layout: 'letter',
      no: 'CHAPTER 06',
      title: '邀 请',
      en: 'YOU ARE INVITED',
      quote: '我们想把人生里最重要的一天，留一个位置给你。',
      lines: [dateStr, WEDDING.venue || '', '期待您的见证与祝福。'].filter(Boolean),
      sign: `${WEDDING.groom} & ${WEDDING.bride}`
    }
  ];
}

// 尾页花押：双方名字首字母
const MONOGRAM = `${WEDDING.groom[0] || ''} & ${WEDDING.bride[0] || ''}`;

Page({
  data: {
    wedding: WEDDING,
    monogram: MONOGRAM,
    icons: ICONS,
    coverIllus: ASSET_BASE + ASSETS.coverIllus, // 封面插画（云存储直链）
    coverTitle: ASSET_BASE + ASSETS.coverTitle, // 封面标题图（云存储直链）
    headGroom: ASSET_BASE + ASSETS.headGroom, // 长页头部新郎头像（云存储直链）
    headBride: ASSET_BASE + ASSETS.headBride, // 长页头部新娘头像（云存储直链）
    xiImg: ASSET_BASE + ASSETS.xiImg, // 长页头部囍字图（云存储直链）
    closeImg: ASSET_BASE + ASSETS.closeImg, // 长页尾页"好久不见 婚礼见"文字图（云存储直链）
    // 直达详情模式（当前只保留经典版；首页「打开邀请函」直接进入本页）
    mode: 'detail',
    invitations: INVITATIONS,
    currentInvite: null,
    current: 0,
    photos: [],
    heroUrl: '',
    chapters: [],
    // 详情排版模式：swiper=整屏翻页（默认），long=经典版整页长图滚动
    layout: 'swiper',
    heroLong: '',
    // 经典版长页 S1-S10 数据（槽位照片 / 日历卡 / 竖排字母 / 婚礼日期时间 / 地图图钉）
    classic: CLASSIC_IMG,
    cal: CAL_DATA,
    loveWords: [
      { k: 'w1', letters: [{ t: 'F' }, { t: 'a' }, { t: 'l' }, { t: 'l' }] },
      { k: 'w2', letters: [{ t: 'I' }, { t: 'n' }] },
      { k: 'w3', letters: [{ t: 'L' }, { t: 'o' }, { t: 'v' }, { t: 'e' }] }
    ],
    dateLong: DATE_LONG,
    timeShort: TIME_SHORT,
    mapMarkers: MAP_MARKERS,
    classicRsvpDone: false,
    revealed: {},
    countdown: { d: '0', h: '00', m: '00', s: '00' },
    married: false,
    visitTotal: null,
    musicPlaying: false,
    // 到场回执
    rsvpAttend: null,      // null=未选择 true=参加 false=不参加
    rsvpGuests: 1,
    rsvpName: '',
    rsvpStats: null,
    rsvpMine: false
  },

  onLoad(options) {
    // 本页已从底部菜单栏移除（普通页面，天然全屏无菜单栏）；
    // 无论从首页「打开邀请函」还是分享卡片进入，都直达请柬详情（当前只有经典版）
    const invId = options && options.id;
    this.openInviteById(invId);
    this._vk = getVisitorKey();
    this.setData({ musicPlaying: music.isPlaying() });
    this.placeMusicButton();
    this._unsubMusic = music.subscribe((p) => this.setData({ musicPlaying: p }));
    this.sendVisit();
    this.fetchVisitStats();
    this.fetchRsvp();
    this.fetchRsvpStats();
    this.initCountdown();
  },

  // 音乐按钮与首页音乐按钮保持在同一屏幕高度：
  // 首页是 custom 导航（页面原点=屏幕顶），按钮屏幕位置 = 胶囊 bottom + 12；
  // 本页是系统导航栏（页面原点=导航栏底部 = 胶囊 bottom + 胶囊距状态栏间距），
  // 故页面内 top = (胶囊bottom + 12) - (胶囊bottom + gap) = 12 - gap（gap = 胶囊top - 状态栏高）
  placeMusicButton() {
    try {
      const rect = wx.getMenuButtonBoundingClientRect();
      const win = (wx.getWindowInfo && wx.getWindowInfo()) || wx.getSystemInfoSync();
      if (rect && rect.top && win && win.statusBarHeight) {
        const gap = rect.top - win.statusBarHeight;
        this.setData({ musicTop: Math.max(12 - gap, 4) + 'px' });
      }
    } catch (e) {
      /* 取不到胶囊位置时用 wxss 里的兜底 top */
    }
  },

  onShow() {
    // 长页模式：从大图预览/后台返回时恢复自动上滚
    if (this.data.layout === 'long' && this.data.mode === 'detail') {
      clearTimeout(this._startTimer);
      this._startTimer = setTimeout(() => this.startAutoScroll(), 1500);
    }
  },

  onHide() {
    // 长页模式切后台/预览大图时停止自动上滚，回来由 onShow 恢复
    this.stopAutoScroll();
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer);
    if (this._unsubMusic) this._unsubMusic();
    this.leaveLongMode();
  },

  // ========== 进入请柬详情 ==========
  openInviteById(id) {
    const list = this.data.invitations || [];
    const inv = list.find((i) => i.id === id) || list[0];
    if (!inv) return;
    this.setData({
      mode: 'detail',
      currentInvite: inv,
      current: 0,
      layout: inv.layout === 'long' ? 'long' : 'swiper',
      revealed: {},
      heroLong: inv.hero ? thumbUrl(ASSET_BASE + inv.hero, 1200) : '',
      classicRsvpDone: false
    });
    // 每封邀请函用自己的十几张照片：六屏杂志式章节 + 幸福瞬间网格共用
    this.applyPhotos(photosForInvite(inv));
    // 导航标题不带邀请函名（「经典版」等内部命名不展示给宾客）
    wx.setNavigationBarTitle && wx.setNavigationBarTitle({ title: '许久未见，甚是想念' });
    // 经典版长页：滚动渐显 + 缓慢自动上滚；其余邀请函维持整屏翻页
    if (this.data.layout === 'long') this.enterLongMode();
    else this.leaveLongMode();
  },

  // 翻页追踪：驱动各屏入场渐显动画
  onSwiperChange(e) {
    this.setData({ current: e.detail.current });
  },

  // ========== 经典版长页模式：滚动渐显 + 缓慢自动上滚 ==========
  onPageScroll(e) {
    this._scrollTop = e.scrollTop;
  },

  enterLongMode() {
    this._scrollTop = 0;
    this._userHold = false;
    setTimeout(() => this.setupReveal(), 200);
    // 先让宾客看一会头部，再开始缓缓上滚
    clearTimeout(this._startTimer);
    this._startTimer = setTimeout(() => this.startAutoScroll(), 2000);
  },

  leaveLongMode() {
    this.stopAutoScroll();
    clearTimeout(this._startTimer);
    clearTimeout(this._resumeTimer);
    this.disconnectReveal();
    this._userHold = false;
  },

  startAutoScroll() {
    if (this._autoTimer || this.data.layout !== 'long' || this.data.mode !== 'detail') return;
    this.computeLongMaxH();
    // 约 33px/s 匀速上滚，手指触摸即停
    this._autoTimer = setInterval(() => this.tickAutoScroll(), 30);
  },

  stopAutoScroll() {
    if (this._autoTimer) {
      clearInterval(this._autoTimer);
      this._autoTimer = null;
    }
  },

  tickAutoScroll() {
    if (this._userHold) return;
    const next = (this._scrollTop || 0) + 1;
    if (this._longMaxH && next >= this._longMaxH) {
      this.stopAutoScroll(); // 滚到底自动停止
      return;
    }
    wx.pageScrollTo({ scrollTop: next, duration: 0, fail: () => {} });
  },

  computeLongMaxH() {
    const q = wx.createSelectorQuery();
    q.select('.long-body').boundingClientRect();
    q.exec((res) => {
      if (!res || !res[0]) return;
      let wh = 667;
      try {
        wh = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).windowHeight;
      } catch (err) {
        wh = 667;
      }
      this._longMaxH = Math.max(0, res[0].height - wh);
    });
    // 图片加载会让内容变高，延迟再校准两次
    setTimeout(() => { if (this._autoTimer) this.computeLongMaxH(); }, 3000);
    setTimeout(() => { if (this._autoTimer) this.computeLongMaxH(); }, 8000);
  },

  // 暂停自动上滚 ms 毫秒（触摸/弹窗/看大图时用）
  pauseAuto(ms) {
    clearTimeout(this._resumeTimer);
    this._userHold = true;
    this._resumeTimer = setTimeout(() => { this._userHold = false; }, ms || 4000);
  },

  onLongTouchStart() {
    clearTimeout(this._resumeTimer);
    this._userHold = true;
  },

  onLongTouchEnd() {
    this.pauseAuto(4000);
  },

  setupReveal() {
    this.disconnectReveal();
    if (this.data.layout !== 'long') return;
    this._revealObs = wx.createIntersectionObserver(this, { observeAll: true });
    this._revealObs.relativeToViewport({ bottom: 80 }).observe('.reveal', (res) => {
      const sec = res.dataset && res.dataset.sec;
      if (res.intersectionRatio > 0 && sec && !this.data.revealed[sec]) {
        this.setData({ ['revealed.' + sec]: true });
      }
    });
    // 兜底：观察器异常时直接全部显示，避免内容被 opacity:0 卡住
    setTimeout(() => {
      if (this.data.layout !== 'long' || Object.keys(this.data.revealed).length > 0) return;
      const all = { h0: true, h1: true, h2: true, h3: true, s1: true, s2: true, s3: true, s4: true, s5: true, s6: true, s6b: true, s6bEnd: true, s7: true, s8: true, s9: true, s10: true };
      (this.data.chapters || []).forEach((c, i) => { all['c' + i] = true; });
      this.setData({ revealed: all });
    }, 1200);
  },

  disconnectReveal() {
    if (this._revealObs) {
      this._revealObs.disconnect();
      this._revealObs = null;
    }
  },

  // ========== 访问记录 ==========
  sendVisit() {
    request({
      url: `${API_BASE}/api/visit`,
      method: 'POST',
      data: { visitorKey: this._vk },
      timeout: 8000
    });
  },

  fetchVisitStats() {
    request({
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
    request({
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
    request({
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
    this.postRsvp(attend);
  },

  // 回执提交公共实现（swiper 版与经典版长页共用）
  postRsvp(attend) {
    request({
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
          this.setData({ rsvpMine: true, classicRsvpDone: true });
          if (this.data.layout === 'long') this.pauseAuto(6000);
          this.fetchRsvpStats();
        } else {
          wx.showToast({ title: (res.data && res.data.errorMsg) || '提交失败', icon: 'none' });
        }
      },
      fail: () => wx.showToast({ title: '网络不太顺畅', icon: 'none' })
    });
  },

  // 经典版长页 S10：确认出席（姓名必填）
  submitClassicRsvp() {
    if (!this.data.rsvpName.trim()) {
      return wx.showToast({ title: '请填写姓名', icon: 'none' });
    }
    this.postRsvp(true);
  },

  // 经典版长页 S10：无法到场
  submitClassicNo() {
    this.postRsvp(false);
  },

  // 经典版长页 S10：输入框聚焦期间暂停自动上滚，失焦后短暂停顿再恢复
  onFormFocus() {
    this.pauseAuto(600000);
  },

  onFormBlur() {
    this.pauseAuto(4000);
  },

  // 经典版长页：点击分节大图预览单张
  onImgTap(e) {
    this.pauseAuto(4000);
    const url = e.currentTarget.dataset.src;
    if (url) wx.previewImage({ current: url, urls: [url] });
  },

  rsvpGuestsSafe() {
    const g = Number(this.data.rsvpGuests);
    return isNaN(g) ? 1 : Math.max(1, Math.min(20, g));
  },

  // ========== 照片编排（六屏杂志式章节：遇见/四季/旅途/日常/决定/邀请） ==========
  applyPhotos(list) {
    this.setData({
      photos: list,
      heroUrl: list.length ? list[0].url : '',
      chapters: buildChapters(list)
    });
  },

  onPhotoTap(e) {
    this.pauseAuto(4000);
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

  // ========== 背景音乐（全局单例，切 Tab 不间断） ==========
  toggleMusic() {
    music.toggle();
  },

  // ========== 分享卡片（带当前邀请函 id，直达对应请柬） ==========
  onShareAppMessage() {
    const inv = this.data.currentInvite || (this.data.invitations && this.data.invitations[0]) || {};
    return {
      title: `诚挚邀请您参加 ${WEDDING.groom} ❤ ${WEDDING.bride} 的婚礼`,
      path: `/pages/invite/invite?entry=share&id=${inv.id || ''}`,
      imageUrl: this.data.heroUrl || inv.cover
    };
  },

  onShareTimeline() {
    const inv = this.data.currentInvite || (this.data.invitations && this.data.invitations[0]) || {};
    return {
      title: `诚挚邀请您参加 ${WEDDING.groom} ❤ ${WEDDING.bride} 的婚礼`,
      query: `entry=share&id=${inv.id || ''}`,
      imageUrl: this.data.heroUrl || inv.cover
    };
  }
});
