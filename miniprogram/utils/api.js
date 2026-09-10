// 云托管统一请求通道：wx.cloud.callContainer
// 真机体验版/正式版无需配置 request 合法域名、无需备案、无需自定义证书。
// 用法与 wx.request 保持一致：request({ url: `${API_BASE}/api/xxx`, method, data, success, fail })
// url 传完整地址（含 API_BASE 前缀）即可，内部自动剥离为容器路径。
const { API_BASE, CLOUD_ENV } = require('./config');

try {
  wx.cloud.init({ env: CLOUD_ENV }); // 幂等，重复调用无副作用
} catch (e) {
  // 基础库过老（<2.12.0）时初始化失败，各调用点走 fail 兜底
}

function request(options) {
  const url = options.url || '';
  const path = url.indexOf(API_BASE) === 0 ? url.slice(API_BASE.length) : url;
  wx.cloud.callContainer({
    config: { env: CLOUD_ENV },
    path,
    method: options.method || 'GET',
    data: options.data,
    header: options.header,
    success: options.success,
    fail: options.fail,
    complete: options.complete
  });
}

module.exports = { request };
