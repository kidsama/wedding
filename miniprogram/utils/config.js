// ========== 全局配置：改这里就能定制你的电子请柬 ==========

// 云存储素材域名常量（module.exports 内部引用用，ASSET_BASE 同值）
const ASSET_HOST = 'https://7072-prod-d1gxeb1e1cb3d88a0-1372364674.tcb.qcloud.la';

module.exports = {
  // 云托管服务域名（https 开头，结尾不带斜杠）
  // 注意：自定义域名当前证书未绑定成功，真机体验版走下方 CLOUD_ENV 官方通道，此域名仅作 API_BASE 前缀剥离用
  API_BASE: 'https://wedding.liushaowei.top',

  // 微信云托管环境 ID（wx.cloud.callContainer 官方通道：免合法域名/免备案/免证书）
  CLOUD_ENV: 'prod-d1gxeb1e1cb3d88a0',

  // 云托管服务名称（云托管控制台-服务列表第一列），以 X-WX-SERVICE 传给网关；
  // 环境内只有一个服务时可留空 ''，多个服务时必须填，否则网关无法路由
  CLOUD_SERVICE: 'flask-2xaf',

  // 云存储素材域名（所有图片素材统一放云存储，本地包不放图片）
  ASSET_BASE: ASSET_HOST,

  // 页面素材（对象路径，不用带签名，存储权限需为「所有用户可读」）
  ASSETS: {
    musicOn: '/page_0_music_on.png',    // 音乐按钮图标（播放中）
    coverIllus: '/invite_1/cover-illus.gif',  // 邀请函封面插画 GIF（云存储直链，包体省 1.27MB；原文件已存云存储 /invite_1/）
    coverTitle: '/invite_1/page-1-title-1.png',  // 邀请函封面标题图（云存储直链 /invite_1/）
    headGroom: '/invite_1/invite_1_head_man.png',  // 长页头部新郎头像（云存储直链 /invite_1/）
    headBride: '/invite_1/invite_1_head.womanpng.png',  // 长页头部新娘头像（云存储直链 /invite_1/）
    xiImg: '/invite_1/small_xi.png',  // 长页头部囍字图（云存储直链 /invite_1/，684x833 竖图）
    closeImg: '/invite_1/wenzi_haojiubujian.png',  // 长页尾页"好久不见 婚礼见"文字图（云存储直链 /invite_1/，507x69 横条）
    homeHero: '/%E5%9B%BE%E7%89%87%E5%8E%8B%E7%BC%A9-%E5%B0%8F%E7%A8%8B%E5%BA%8F/DSC09129.jpg'  // 首页海报大图（云存储对象路径，中文已 URL 编码 = /图片压缩-小程序/DSC09129.jpg；留空则自动用第一张照片）
  },

  // ========== 婚礼信息（必改） ==========
  WEDDING: {
    groom: '刘绍伟',          // 新郎名字
    bride: '葛丹',            // 新娘名字
    groomEn: 'LiuShaowei',       // 新郎花体英文名（经典版长页头部展示）
    brideEn: 'GeDan',           // 新娘花体英文名
    date: '2026-10-06 12:00',  // 婚礼时间（用于倒计时，格式固定 YYYY-MM-DD HH:mm）
    lunar: '农历八月廿六',       // 农历日期（按 2026-10-06 推算，建议再核对一下）
    venue: '王府花园酒店·千禧厅', // 酒店名称
    venueTag: '王府花园酒店·千禧厅',    // 场地标签（首页日期条与主场地卡标题展示用）
    address: '河南省新乡市卫辉市太公路新县医院东',  // 酒店详细地址
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
  // photos：本封邀请函展示的照片（云存储文件名，十几张为宜；故事区两两一屏 + 幸福瞬间网格共用）
  // 想调整某封的照片：直接增删文件名即可，顺序即展示顺序
  INVITATIONS: [
    {
      id: 'classic',
      name: '经典版',
      desc: '奶油底 · 简约经典请柬',
      layout: 'long',   // 经典版=整页长图滚动；不填默认 swiper 整屏翻页
      hero: '/%E5%9B%BE%E7%89%87%E5%8E%8B%E7%BC%A9-%E5%B0%8F%E7%A8%8B%E5%BA%8F/DSC09308.jpg',  // 长页头部主图（求婚照，完整编码路径直接拼 ASSET_BASE，与 photos 的纯文件名拼法不同；空=显示占位待补）
      cover: ASSET_HOST + '/%E5%9B%BE%E7%89%87%E5%8E%8B%E7%BC%A9-%E5%B0%8F%E7%A8%8B%E5%BA%8F/DSC09129.jpg',
      photos: [
        'DSC09019.jpg', 'DSC09051.jpg', 'DSC09097.jpg', 'DSC09129.jpg',
        'DSC09152.jpg', 'DSC09175.jpg', 'DSC09209.jpg', 'DSC09232.jpg',
        'DSC09252.jpg', 'DSC09290.jpg', 'DSC09308.jpg', 'DSC09325.jpg'
      ]
    },
    {
      id: 'zhiy',
      name: '致爱版',
      desc: '致爱系列 · 温柔仪式感',
      cover: ASSET_HOST + '/%E5%9B%BE%E7%89%87%E5%8E%8B%E7%BC%A9-%E5%B0%8F%E7%A8%8B%E5%BA%8F/DSC09316-%E8%87%B4%E7%88%B1%E6%91%86%E5%8F%B012%E5%AF%B8A.jpg',
      photos: [
        'DSC09021-致爱摆台横12寸.jpg', 'DSC09317.jpg', 'DSC09031-致爱摆台12寸A.jpg', 'DSC09106-致爱组合A50X50.jpg',
        'DSC09070-致爱摆台横12寸.jpg', 'DSC09118-致爱组合A50X50.jpg', 'DSC09154-致爱组合B25X50.jpg', 'DSC09186-致爱组合A25X50.jpg',
        'DSC09315-致爱组合B50X50.jpg', 'DSC09316-致爱摆台12寸A.jpg', 'DSC09318-致爱摆台12寸A.jpg', 'DSC09322-致爱组合B50X50.jpg'
      ]
    },
    {
      id: 'moments',
      name: '浪漫瞬间',
      desc: '婚纱照精选 · 定格美好',
      cover: ASSET_HOST + '/%E5%9B%BE%E7%89%87%E5%8E%8B%E7%BC%A9-%E5%B0%8F%E7%A8%8B%E5%BA%8F/DSC09320.jpg',
      photos: [
        'DSC09020.jpg', 'DSC09037.jpg', 'DSC09064.jpg', 'DSC09095.jpg',
        'DSC09100.jpg', 'DSC09123.jpg', 'DSC09134.jpg', 'DSC09146.jpg',
        'DSC09163.jpg', 'DSC09182.jpg', 'DSC09217.jpg', 'DSC09243.jpg'
      ]
    }
  ],

  // ========== 经典版长页（S1-S10 模板分节）图片槽位 ==========
  // value = 云存储 /图片压缩-小程序/ 目录下的文件名；'' = 该槽位显示「待补」占位框
  // 想换照片：直接改文件名即可；xiuhe / time / arch 三张待补
  CLASSIC_SLOTS: {
    story1: 'DSC09315-致爱组合B50X50.jpg',    // S1 门当户对：左图（竖版合影，中文文件名由拼链自动编码）
    story1a: 'DSC09031-致爱摆台12寸A.jpg',   // S1 底部双图·左（中文文件名由拼链自动编码）
    story1b: 'DSC09040.jpg',   // S1 底部双图·右
    calendar: 'DSC09023-80x180无纺布海报（无日期和名字）（SJ+支架).jpg',  // S2 结婚啦：日历卡大图（4:9 竖版海报；文件名混排括号：全角开+半角闭，勿"改正"）
    xiuhe: 'DSC09227.jpg',     // S3 慢慢亦漫漫：全幅秀禾图
    fallA: 'DSC09186-致爱组合A25X50.jpg',  // S3 底部双图·左（2:3 竖图；中文文件名由拼链自动编码）
    fallB: 'DSC09152.jpg',     // S3 底部双图·右（2:3 竖图）
    keyword: 'DSC09209.jpg',   // S4 关键词：大图
    welcomeA: 'DSC09232.jpg',  // S5 WELCOME：高图
    welcomeB: 'DSC09235.jpg',  // S5 WELCOME：右图（3:2 横图）
    dateA: 'DSC09290.jpg',     // S6 纵叠图·上
    dateB: '',                 // S6 第二张图已删（仅保留 dateA 单图）
    countdown: 'DSC09312.jpg', // S7 倒计时：大图（3:2 横图）
    time: '',                  // S8 婚礼时间大图已删（不放图）
    arch: ''                   // S9 花拱门大图已删（不放图）
  }
};
