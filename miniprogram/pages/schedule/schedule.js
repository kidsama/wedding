const { API_BASE, WEDDING } = require('../../utils/config');
const { getVisitorKey } = require('../../utils/common');

Page({
  data: {
    wedding: WEDDING,
    // 到场回执
    rsvpAttend: null,      // null=未选择 true=参加 false=不参加
    rsvpGuests: 1,
    rsvpName: '',
    rsvpStats: null,
    rsvpMine: false
  },

  onLoad() {
    this._vk = getVisitorKey();
    this.fetchRsvp();
    this.fetchRsvpStats();
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

  // ========== 分享 ==========
  onShareAppMessage() {
    return {
      title: `诚挚邀请您参加 ${WEDDING.groom} ❤ ${WEDDING.bride} 的婚礼`,
      path: '/pages/home/home'
    };
  }
});
