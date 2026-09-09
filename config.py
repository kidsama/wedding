import os
from urllib.parse import quote

# 是否开启debug模式（生产环境必须为 False）
DEBUG = False

# 读取数据库环境变量
username = os.environ.get("MYSQL_USERNAME", 'root')
password = os.environ.get("MYSQL_PASSWORD", 'root')
db_address = os.environ.get("MYSQL_ADDRESS", '127.0.0.1:3306')

# ========== 微信 JS-SDK 配置（用于自定义分享卡片） ==========
# 需要在微信公众号后台获取 AppID 和 AppSecret，并配置 JS 接口安全域名
WX_APP_ID = os.environ.get("WX_APP_ID", '')
WX_APP_SECRET = os.environ.get("WX_APP_SECRET", '')

# 分享卡片默认展示信息（当 JS-SDK 未配置时使用 meta 标签兜底）
SHARE_TITLE = os.environ.get("SHARE_TITLE", '我们的相册')
SHARE_DESC = os.environ.get("SHARE_DESC", '每一刻都值得珍藏')
SHARE_IMG = os.environ.get("SHARE_IMG", '')

# 相册照片列表：优先读云托管环境变量 PHOTO_URLS（英文逗号分隔的图片URL）；未配置时使用下方内置 DEFAULT_PHOTO_GROUPS
# 环境变量支持多相册分组：用英文分号「;」分隔组；组内可用「|」给相册命名（| 前为名称）
# 如 婚纱照精选|url1,url2;婚纱照|url3,url4 → 相册「婚纱照精选」=[url1,url2]、「婚纱照」=[url3,url4]
#
# cloud:// fileID 转 https 直链规则（微信云存储控制台复制的是 cloud:// 格式）：
#   cloud://<env>.<bucket>/<路径>  →  https://<bucket>.tcb.qcloud.la/<路径>
# 中文路径需 URL 编码后填写（如「图片压缩-小程序」= %E5%9B%BE%E7%89%87%E5%8E%8B%E7%BC%A9-%E5%B0%8F%E7%A8%8B%E5%BA%8F）
_DIR_COMPRESS = '/%E5%9B%BE%E7%89%87%E5%8E%8B%E7%BC%A9-%E5%B0%8F%E7%A8%8B%E5%BA%8F/'  # /图片压缩-小程序/
_ASSET_HOST = 'https://7072-prod-d1gxeb1e1cb3d88a0-1372364674.tcb.qcloud.la'

# 内置相册（「婚纱照」：云存储 /图片压缩-小程序/ 下的照片，2026-09-10 用户提供完整清单 76 张，按编号排序）
# 注：含 12 张婚庆制品图（摆台/海报/组合相框，文件名带「致爱」「无纺布海报」字样）；DSC09129.jpg 同时用作小程序首页主图
_PHOTO_FILES = [
    'DSC09019.jpg', 'DSC09020.jpg', 'DSC09021-致爱摆台横12寸.jpg', 'DSC09023-80x180无纺布海报（无日期和名字）（SJ+支架).jpg',
    'DSC09024.jpg', 'DSC09027.jpg', 'DSC09030.jpg', 'DSC09031-致爱摆台12寸A.jpg',
    'DSC09033.jpg', 'DSC09037.jpg', 'DSC09040.jpg', 'DSC09051.jpg',
    'DSC09064.jpg', 'DSC09066.jpg', 'DSC09067.jpg', 'DSC09070-致爱摆台横12寸.jpg',
    'DSC09075.jpg', 'DSC09095.jpg', 'DSC09097.jpg', 'DSC09099.jpg',
    'DSC09100.jpg', 'DSC09102.jpg', 'DSC09106-致爱组合A50X50.jpg', 'DSC09107.jpg',
    'DSC09118-致爱组合A50X50.jpg', 'DSC09123.jpg', 'DSC09124.jpg', 'DSC09129.jpg',
    'DSC09130.jpg', 'DSC09134.jpg', 'DSC09136.jpg', 'DSC09142.jpg',
    'DSC09146.jpg', 'DSC09152.jpg', 'DSC09153.jpg', 'DSC09154-致爱组合B25X50.jpg',
    'DSC09158.jpg', 'DSC09163.jpg', 'DSC09167.jpg', 'DSC09170.jpg',
    'DSC09172.jpg', 'DSC09173.jpg', 'DSC09175.jpg', 'DSC09182.jpg',
    'DSC09186-致爱组合A25X50.jpg', 'DSC09192.jpg', 'DSC09209.jpg', 'DSC09211.jpg',
    'DSC09212.jpg', 'DSC09215.jpg', 'DSC09217.jpg', 'DSC09227.jpg',
    'DSC09228.jpg', 'DSC09232.jpg', 'DSC09235.jpg', 'DSC09242.jpg',
    'DSC09243.jpg', 'DSC09252.jpg', 'DSC09253.jpg', 'DSC09255.jpg',
    'DSC09261.jpg', 'DSC09290.jpg', 'DSC09298.jpg', 'DSC09303.jpg',
    'DSC09308.jpg', 'DSC09312.jpg', 'DSC09315-致爱组合B50X50.jpg', 'DSC09316-致爱摆台12寸A.jpg',
    'DSC09317.jpg', 'DSC09318-致爱摆台12寸A.jpg', 'DSC09320.jpg', 'DSC09322-致爱组合B50X50.jpg',
    'DSC09325.jpg', 'DSC09326.jpg', 'DSC09328.jpg', 'DSC09329.jpg',
]

DEFAULT_PHOTO_GROUPS = [
    {
        'name': '婚纱照',
        'urls': [_ASSET_HOST + _DIR_COMPRESS + quote(f, safe='') for f in _PHOTO_FILES],
    },
]

_env_photo_urls = os.environ.get("PHOTO_URLS", '')
if _env_photo_urls.strip():
    PHOTO_GROUPS = []
    for _gi, _group in enumerate(_env_photo_urls.split(';')):
        _name = ''
        if '|' in _group:
            _name, _group = _group.split('|', 1)
            _name = _name.strip()
        _urls = [u.strip() for u in _group.split(',') if u.strip()]
        if _urls:
            PHOTO_GROUPS.append({'name': _name or f'相册{_gi + 1}', 'urls': _urls})
else:
    PHOTO_GROUPS = [{'name': g['name'], 'urls': list(g['urls'])} for g in DEFAULT_PHOTO_GROUPS]

# 拍平后的全部照片（兼容 /api/photos 老接口：邀请函故事页、首页海报用）
PHOTO_URLS = [u for g in PHOTO_GROUPS for u in g['urls']]

# 祝福总量上限（防刷，超过后不再接受新祝福）
MAX_BLESSINGS = int(os.environ.get("MAX_BLESSINGS", '500'))
