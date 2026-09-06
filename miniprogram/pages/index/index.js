const { API_BASE } = require('../../utils/config');

// 云托管 /api/photos 请求失败时的兜底照片列表（与 H5 版一致）
const FALLBACK_PHOTOS = Array.from({ length: 16 }, (_, i) => ({
  url: `https://picsum.photos/seed/${i + 1}/400/400`,
  title: `照片 ${i + 1}`
}));

Page({
  data: {
    photos: [],
    loading: true
  },

  onLoad() {
    this.fetchPhotos();
  },

  // 从云托管获取照片列表，失败则用内置兜底列表
  fetchPhotos() {
    wx.request({
      url: `${API_BASE}/api/photos`,
      method: 'GET',
      timeout: 8000,
      success: (res) => {
        const data = res.data && res.data.data;
        if (res.data && res.data.code === 0 && Array.isArray(data) && data.length > 0) {
          this.setData({ photos: data, loading: false });
        } else {
          this.useFallback();
        }
      },
      fail: () => this.useFallback()
    });
  },

  useFallback() {
    this.setData({ photos: FALLBACK_PHOTOS, loading: false });
  },

  // 点击照片 → 微信原生大图预览（支持双指缩放、左右滑动、保存）
  onPhotoTap(e) {
    const index = e.currentTarget.dataset.index;
    const urls = this.data.photos.map((p) => p.url);
    wx.previewImage({
      current: urls[index],
      urls
    });
  },

  onPullDownRefresh() {
    this.fetchPhotos();
    wx.stopPullDownRefresh();
  },

  // ========== 分享给好友：微信原生卡片 ==========
  onShareAppMessage() {
    const first = this.data.photos[0];
    return {
      title: '📷 我们的相册 | 每一刻都值得珍藏',
      path: '/pages/index/index',
      imageUrl: first ? first.url : ''
    };
  },

  // ========== 分享到朋友圈 ==========
  onShareTimeline() {
    const first = this.data.photos[0];
    return {
      title: '📷 我们的相册 | 每一刻都值得珍藏',
      query: '',
      imageUrl: first ? first.url : ''
    };
  }
});
