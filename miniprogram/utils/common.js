// ========== 通用工具 ==========

// iOS 不支持 'YYYY-MM-DD HH:mm' 直接 new Date，把 '-' 换成 '/'
function parseWeddingDate(str) {
  return new Date(String(str).replace(/-/g, '/')).getTime();
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// 访客标识：本地生成并持久化，用于访问记录与回执去重
function getVisitorKey() {
  let vk = wx.getStorageSync('visitorKey');
  if (!vk) {
    vk = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    wx.setStorageSync('visitorKey', vk);
  }
  return vk;
}

// 云存储直链追加缩略参数（腾讯云数据万象 imageMogr2）：
// 等比缩到宽 w 并压质量 80，供网格/列表等小尺寸展示用；
// 大图预览（previewImage）仍传原始 URL。非云存储链接原样返回。
function thumbUrl(url, w) {
  if (!url || url.indexOf('tcb.qcloud.la') === -1 || url.indexOf('?') !== -1) return url;
  return url + '?imageMogr2/thumbnail/' + w + 'x/quality/80';
}

module.exports = { parseWeddingDate, pad, getVisitorKey, thumbUrl };
