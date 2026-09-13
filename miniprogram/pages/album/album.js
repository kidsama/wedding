const { LOCAL_PHOTO_GROUPS } = require('../../utils/photos');
const { thumbUrl } = require('../../utils/common');

// 展示用缩略宽度：网格 400x（3 列布局单格最大约 345 物理像素，余量充足）、封面 600x
// （原图仅在 previewImage 大图预览时加载）
const THUMB_GRID = 400;
const THUMB_COVER = 600;

// 各相册子标题（按相册名匹配，未匹配到用默认文案）
const ALBUM_SUBTITLES = {
  '婚纱照': '每一帧，都是我们的故事',
  '婚纱照精选': '每一帧，都是我们的故事',
  '婚礼现场': '2026.10.06 · 与您共同见证'
};
const DEFAULT_SUBTITLE = '记录属于我们的美好瞬间';

// 「婚礼现场」占位空相册：婚礼当天照片在 utils/photos.js 加同名相册分组后，此占位自动隐藏
const PLACEHOLDER_ALBUM = { name: '婚礼现场', cover: '', count: 0, photos: [] };

Page({
  data: {
    mode: 'list',          // list=相册列表  detail=相册内照片
    albums: [],
    currentAlbum: null,    // { name, cover, count, photos }
    currentPhotos: []
  },

  onLoad() {
    this.applyAlbums(this.buildLocalAlbums());
  },

  // ========== 相册列表 ==========
  // 静态内置：照片走云存储直链（常驻可用），不调后端接口、不受云托管停机影响
  buildLocalAlbums() {
    return LOCAL_PHOTO_GROUPS.map((g) => ({
      name: g.name,
      photos: g.urls.map((u, i) => ({ url: u, title: `${g.name} ${i + 1}` }))
    }));
  },

  applyAlbums(albums) {
    // 统一结构：{ name, coverThumb, count, subtitle, photos: [{url, thumb}] }
    // url=原图（大图预览用），thumb=缩略图（网格展示用，省 CDN 流量）
    const list = albums.map((a, i) => {
      const photos = (a.photos || []).map((p) => {
        const o = typeof p === 'string' ? { url: p } : p;
        return { ...o, thumb: thumbUrl(o.url, THUMB_GRID) };
      });
      const name = a.name || `相册${i + 1}`;
      const cover = a.cover || (photos[0] && photos[0].url) || '';
      return {
        name,
        coverThumb: thumbUrl(cover, THUMB_COVER),
        count: photos.length,
        subtitle: ALBUM_SUBTITLES[name] || DEFAULT_SUBTITLE,
        photos
      };
    });
    // 追加「婚礼现场」空相册占位（后端已有同名真实相册时不再追加）
    if (!list.some((a) => a.name === PLACEHOLDER_ALBUM.name)) {
      list.push({
        ...PLACEHOLDER_ALBUM,
        subtitle: ALBUM_SUBTITLES[PLACEHOLDER_ALBUM.name] || DEFAULT_SUBTITLE
      });
    }
    this.setData({ albums: list });
  },

  // ========== 进入相册 / 返回列表 ==========
  openAlbum(e) {
    const album = this.data.albums[e.currentTarget.dataset.index];
    if (!album) return;
    if (album.count === 0) {
      wx.showToast({ title: '婚礼当天开放，敬请期待', icon: 'none' });
      return;
    }
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
