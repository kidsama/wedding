const { API_BASE, WEDDING, ASSET_BASE, ASSETS } = require('../../utils/config');
const music = require('../../utils/music');
const { parseWeddingDate, pad } = require('../../utils/common');

// 兜底海报（云托管 /api/photos 请求失败时使用）
const FALLBACK_HERO = 'https://picsum.photos/seed/wedding/750/1400';

Page({
  data: {
    wedding: WEDDING,
    icons: { musicOn: ASSET_BASE + ASSETS.musicOn },
    hero: '',
    letterText: '',
    dateText: '',
    timeText: '',
    countdown: { d: '0', h: '00', m: '00', s: '00' },
    married: false,
    musicPlaying: false,
    ftYear: (String(WEDDING.date).match(/^\d{4}/) || ['2026'])[0]
  },

  onLoad() {
    // 首页邀请信：优先用 config 的 letter 字段，没有则回退用 invitation 拼接
    const letter = WEDDING.letter || (WEDDING.invitation || []).filter((s) => s && s.trim()).join('');
    this.setData({ letterText: letter });
    // 日期展示用：2026-10-06 12:00 → 2026.10.06 / 12:00:00（秒位固定补 00）
    const parts = String(WEDDING.date).split(' ');
    const t = (parts[1] || '').split(':');
    this.setData({
      dateText: (parts[0] || '').replace(/-/g, '.'),
      timeText: t.length === 2 ? `${t[0]}:${t[1]}:00` : (parts[1] || '')
    });
    this.placeMusicButton();
    this.setData({ musicPlaying: music.isPlaying() });
    this._unsubMusic = music.subscribe((p) => this.setData({ musicPlaying: p }));
    this.fetchHero();
    this.initCountdown();
  },

  // 音乐按钮放在右上角胶囊（…/关闭）正下方，避免被遮挡
  placeMusicButton() {
    try {
      const rect = wx.getMenuButtonBoundingClientRect();
      if (rect && rect.bottom) {
        this.setData({ musicTop: rect.bottom + 12 + 'px' });
      }
    } catch (e) {
      /* 取不到胶囊位置时用 wxss 里的兜底 top */
    }
  },

  onShow() {
    // 从分享进入的邀请函（隐藏了底部菜单栏）点「返回首页」回到这里时，恢复菜单栏
    wx.showTabBar({ fail: () => {} });
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer);
    if (this._unsubMusic) this._unsubMusic();
  },

  // ========== 首页海报大图 ==========
  // 优先用 config 里指定的 homeHero；留空则取第一张照片
  fetchHero() {
    if (ASSETS.homeHero) {
      this.setData({ hero: ASSET_BASE + ASSETS.homeHero });
      return;
    }
    wx.request({
      url: `${API_BASE}/api/photos`,
      method: 'GET',
      timeout: 8000,
      success: (res) => {
        const d = res.data && res.data.data;
        const url = (res.data && res.data.code === 0 && Array.isArray(d) && d.length > 0)
          ? d[0].url
          : FALLBACK_HERO;
        this.setData({ hero: url });
      },
      fail: () => this.setData({ hero: FALLBACK_HERO })
    });
  },

  // ========== 相册预览条 ==========
  // 取前 6 张照片做横向预览（失败时静默用兜底图）
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

  // ========== 场地导航（wx.openLocation 个人小程序可用；需在 config.js 配好经纬度） ==========
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

  // ========== 快捷入口 ==========
  goAlbum() {
    wx.switchTab({ url: '/pages/album/album' });
  },

  goSchedule() {
    // 流程页已不在底部菜单，改为普通页面跳转（可返回）
    wx.navigateTo({ url: '/pages/schedule/schedule' });
  },

  // ========== 背景音乐（全局单例） ==========
  toggleMusic() {
    music.toggle();
  },

  // ========== 分享卡片 ==========
  onShareAppMessage() {
    return {
      title: `诚挚邀请您参加 ${WEDDING.groom} ❤ ${WEDDING.bride} 的婚礼`,
      path: '/pages/home/home',
      imageUrl: this.data.hero
    };
  },

  onShareTimeline() {
    return {
      title: `诚挚邀请您参加 ${WEDDING.groom} ❤ ${WEDDING.bride} 的婚礼`,
      query: '',
      imageUrl: this.data.hero
    };
  }
});
