// ========== 全局配置：改这里就能定制你的电子请柬 ==========

// 云存储素材域名常量（module.exports 内部引用用，ASSET_BASE 同值）
const ASSET_HOST = 'https://7072-prod-d1gxeb1e1cb3d88a0-1372364674.tcb.qcloud.la';

module.exports = {
  // 云托管服务域名（https 开头，结尾不带斜杠）
  // 上线前需在小程序后台「开发设置 - 服务器域名 - request 合法域名」中填写同一域名
  // 注意：必须与云托管控制台绑定的自定义域名一致（曾误拼 .tcbaccess.tencentcloudbase.com 后缀导致全部请求 404/证书不匹配）
  API_BASE: 'https://wedding.liushaowei.top',

  // 云存储素材域名（所有图片素材统一放云存储，本地包不放图片）
  ASSET_BASE: ASSET_HOST,

  // 页面素材（对象路径，不用带签名，存储权限需为「所有用户可读」）
  ASSETS: {
    musicOn: '/page_0_music_on.png',    // 音乐按钮图标（播放中）
    homeHero: '/%E5%9B%BE%E7%89%87%E5%8E%8B%E7%BC%A9-%E5%B0%8F%E7%A8%8B%E5%BA%8F/DSC09129.jpg'  // 首页海报大图（云存储对象路径，中文已 URL 编码 = /图片压缩-小程序/DSC09129.jpg；留空则自动用第一张照片）
  },

  // ========== 婚礼信息（必改） ==========
  WEDDING: {
    groom: '刘绍伟',          // 新郎名字
    bride: '葛丹',            // 新娘名字
    date: '2026-10-06 12:00',  // 婚礼时间（用于倒计时，格式固定 YYYY-MM-DD HH:mm）
    lunar: '农历八月廿六',       // 农历日期（按 2026-10-06 推算，建议再核对一下）
    venue: '王府花园酒店 · 千禧厅', // 酒店名称
    venueTag: '男方婚宴场地',    // 场地标签（首页日期条与主场地卡标题展示用）
    address: '卫辉市城郊乡王府花园酒店',  // 酒店详细地址
    latitude: 35.388633,       // 酒店纬度（填了才能一键导航）
    longitude: 114.072949,     // 酒店经度
    musicUrl: 'https://7072-prod-d1gxeb1e1cb3d88a0-1372364674.tcb.qcloud.la/ZhizizhishouJianjiban.mp3',
    // 背景音乐：云存储直链（对象 /ZhizizhishouJianjiban.mp3，无签名可访问，InnerAudioContext 直接播放、无需域名白名单）
    // （注意使用有版权授权的音乐；文件不存在时音乐按钮会自动隐藏）

    // 婚礼日程（时间线展示，钟点按实际安排改）
    schedule: [
      { time: '10:30', label: '宾客入席' },
      { time: '12:00', label: '婚礼仪式' },
      { time: '12:30', label: '喜宴开席' }
    ],

    // 邀请函正文（每个元素一行，'' 为空行）
    invitation: [
      '我们的生命里，从此有了彼此。',
      '愿与您共赴这场浪漫之约，',
      '见证我们幸福的时刻。',
      '',
      '诚挚邀请您和家人，',
      '拨冗莅临，见证我们的婚礼！'
    ],

    // 首页下滑区「邀请信」段落（与上面邀请函页的 invitation 分开，互不影响）
    letter: '一起走过四季、晚风和人间琐碎，想到余生都有你，就对未来充满期待。从一时心动，到日久生定，我们决定并肩走剩下的路，从恋爱体验，正式升级为终身合伙人。请你来坐坐，见证我们最笨拙也最笃定的一刻。'
  },

  // ========== 邀请函列表（邀请函 Tab 先展示卡片列表，点开查看具体请柬） ==========
  // 新增邀请函往数组里加一项即可；cover 为云存储直链（中文已 URL 编码）
  INVITATIONS: [
    {
      id: 'classic',
      name: '经典版',
      desc: '奶油底 · 简约经典请柬',
      cover: ASSET_HOST + '/%E5%9B%BE%E7%89%87%E5%8E%8B%E7%BC%A9-%E5%B0%8F%E7%A8%8B%E5%BA%8F/DSC09129.jpg'
    },
    {
      id: 'zhiy',
      name: '致爱版',
      desc: '致爱系列 · 温柔仪式感',
      cover: ASSET_HOST + '/%E5%9B%BE%E7%89%87%E5%8E%8B%E7%BC%A9-%E5%B0%8F%E7%A8%8B%E5%BA%8F/DSC09316-%E8%87%B4%E7%88%B1%E6%91%86%E5%8F%B012%E5%AF%B8A.jpg'
    },
    {
      id: 'moments',
      name: '浪漫瞬间',
      desc: '婚纱照精选 · 定格美好',
      cover: ASSET_HOST + '/%E5%9B%BE%E7%89%87%E5%8E%8B%E7%BC%A9-%E5%B0%8F%E7%A8%8B%E5%BA%8F/DSC09320.jpg'
    }
  ]
};
