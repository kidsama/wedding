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

module.exports = { parseWeddingDate, pad, getVisitorKey };
