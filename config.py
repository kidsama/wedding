import os

# 是否开启debug模式
DEBUG = True

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

# 相册照片列表：环境变量 PHOTO_URLS（英文逗号分隔的图片URL），未配置时使用内置默认列表
PHOTO_URLS = [u.strip() for u in os.environ.get("PHOTO_URLS", '').split(',') if u.strip()]
