const { API_BASE } = require('../../utils/config');

// 兜底照片（云托管不可用时）：12 张占位图，自动分成两个相册预览效果
const FALLBACK_PHOTOS = Array.from({ length: 12 }, (_, i) => ({
  url: `https://picsum.photos/seed/${i + 1}/400/400`,
  title: `照片 ${i + 1}`
}));

Page({
  data: {
    mode: 'list',          // list=相册列表  detail=相册内照片
    albums: [],
    currentAlbum: null,    // { name, cover, count, photos }
    currentPhotos: []
  },

  onLoad() {
    this.fetchAlbums();
  },

  // ========== 相册列表 ==========
  fetchAlbums() {
    wx.request({
      url: `${API_BASE}/api/albums`,
      method: 'GET',
      timeout: 8000,
      success: (res) => {
        const d = res.data && res.data.data;
        if (res.data && res.data.code === 0 && Array.isArray(d) && d.length > 0) {
          this.applyAlbums(d);
        } else {
          this.applyAlbums(this.splitIntoAlbums(null));
        }
      },
      fail: () => this.applyAlbums(this.splitIntoAlbums(null))
    });
  },

  // 兜底：把一组扁平照片按前后对半分成两个相册（后端未部署 /api/albums 时预览用）
  splitIntoAlbums(list) {
    const photos = (list && list.length > 0 ? list : FALLBACK_PHOTOS)
      .map((p) => (typeof p === 'string' ? { url: p } : p));
    const half = Math.ceil(photos.length / 2);
    return [
      { name: '婚纱照精选', photos: photos.slice(0, half) },
      { name: '婚纱照', photos: photos.slice(half) }
    ].filter((a) => a.photos.length > 0);
  },

  applyAlbums(albums) {
    // 统一结构：{ name, cover, count, photos: [{url}] }
    const list = albums.map((a, i) => {
      const photos = (a.photos || []).map((p) => (typeof p === 'string' ? { url: p } : p));
      return {
        name: a.name || `相册${i + 1}`,
        cover: a.cover || (photos[0] && photos[0].url) || '',
        count: photos.length,
        photos
      };
    });
    this.setData({ albums: list });
  },

  // ========== 进入相册 / 返回列表 ==========
  openAlbum(e) {
    const album = this.data.albums[e.currentTarget.dataset.index];
    if (!album || album.count === 0) return;
    this.setData({ mode: 'detail', currentAlbum: album, currentPhotos: album.photos });
    wx.setNavigationBarTitle({ title: album.name });
  },

  backToList() {
    this.setData({ mode: 'list', currentAlbum: null, currentPhotos: [] });
    wx.setNavigationBarTitle({ title: '相册' });
  },

  // ========== 大图预览（限当前相册） ==========
  onPhotoTap(e) {
    const urls = this.data.currentPhotos.map((p) => p.url);
    wx.previewImage({ current: urls[e.currentTarget.dataset.index], urls });
  },

  // ========== 分享 ==========
  onShareAppMessage() {
    return {
      title: '我们的幸福相册 ❤',
      path: '/pages/album/album',
      imageUrl: this.data.albums.length > 0 ? this.data.albums[0].cover : ''
    };
  }
});
