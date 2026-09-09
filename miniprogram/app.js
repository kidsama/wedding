// 小程序全局逻辑
const music = require('./utils/music');

App({
  onLaunch() {
    // 全局背景音乐：进入小程序即播放，各页面右上角红色按钮可暂停/继续
    music.start();
  },

  onHide() {
    // 退到后台时暂停音乐（页面间切 Tab 不受影响，音乐持续播放）
    music.pause();
  }
});
