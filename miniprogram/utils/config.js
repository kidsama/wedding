// ========== 全局配置：改这里就能定制你的电子请柬 ==========

module.exports = {
  // 云托管服务域名（https 开头，结尾不带斜杠）
  // 上线前需在小程序后台「开发设置 - 服务器域名 - request 合法域名」中填写同一域名
  API_BASE: 'https://wedding.liushaowei.top.tcbaccess.tencentcloudbase.com',

  // ========== 婚礼信息（必改） ==========
  WEDDING: {
    groom: '新郎名',            // 新郎名字
    bride: '新娘名',            // 新娘名字
    date: '2026-10-01 11:58',  // 婚礼时间（用于倒计时，格式固定 YYYY-MM-DD HH:mm）
    lunar: '农历八月十一',       // 农历日期（装饰用，可留空 ''）
    venue: '幸福大酒店 · 3楼宴会厅', // 酒店名称
    address: 'XX市XX区XX路88号',    // 酒店详细地址
    latitude: 0,               // 酒店纬度（填了才能一键导航，坐标可从腾讯地图坐标拾取器获取：lbs.qq.com/getPoint）
    longitude: 0,              // 酒店经度
    musicUrl: '',              // 背景音乐地址（https mp3，留空则不显示音乐按钮）

    // 邀请函正文（每个元素一行，'' 为空行）
    invitation: [
      '我们的生命里，从此有了彼此。',
      '愿与您共赴这场浪漫之约，',
      '见证我们幸福的时刻。',
      '',
      '诚挚邀请您和家人，',
      '拨冗莅临，见证我们的婚礼！'
    ]
  }
};
