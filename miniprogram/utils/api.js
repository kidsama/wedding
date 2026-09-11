// 云托管统一请求通道：wx.cloud.callContainer
// 真机体验版/正式版无需配置 request 合法域名、无需备案、无需自定义证书。
// 用法与 wx.request 保持一致：request({ url: `${API_BASE}/api/xxx`, method, data, success, fail })
// url 传完整地址（含 API_BASE 前缀）即可，内部自动剥离为容器路径。
const { API_BASE, CLOUD_ENV, CLOUD_SERVICE } = require('./config');

try {
  wx.cloud.init({ env: CLOUD_ENV }); // 幂等，重复调用无副作用
} catch (e) {
  // 基础库过老（<2.12.0）时初始化失败，各调用点走 fail 兜底
}

function request(options) {
  const url = options.url || '';
  const path = url.indexOf(API_BASE) === 0 ? url.slice(API_BASE.length) : url;
  // 官方示例均携带 X-WX-SERVICE；环境内多服务时缺它网关无法路由，直接 fail
  const header = Object.assign(
    CLOUD_SERVICE ? { 'X-WX-SERVICE': CLOUD_SERVICE } : {},
    options.header || {}
  );
  wx.cloud.callContainer({
    config: { env: CLOUD_ENV },
    path,
    method: options.method || 'GET',
    data: options.data,
    header,
    success: (res) => {
      // 非 2xx 一定不是业务数据：留日志便于真机 vConsole 排查
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        console.error('[api] HTTP ' + res.statusCode, path, res.data);
      }
      if (options.success) options.success(res);
    },
    fail: (err) => {
      // 关键诊断日志：err.errMsg 含云托管错误码（如 -601031 服务不存在、-601034 未开通）
      console.error('[api] callContainer FAIL', path, err && err.errMsg, err);
      if (options.fail) options.fail(err);
    },
    complete: options.complete
  });
}

module.exports = { request };
