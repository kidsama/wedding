import hashlib
import random
import string
import time
from datetime import datetime, date, timedelta

import requests
from flask import render_template, request

from run import app
from wxcloudrun import db
from wxcloudrun.dao import delete_counterbyid, query_counterbyid, insert_counter, update_counterbyid
from wxcloudrun.dao import query_weight_by_date, query_weights_since, insert_weight, delete_weight_byid
from wxcloudrun.model import Counters, Blessing, Rsvp, Visit, Weights
from wxcloudrun.response import make_succ_empty_response, make_succ_response, make_err_response


# ========== 微信 JS-SDK token 内存缓存 ==========
_wx_cache = {
    'access_token': '',
    'access_token_expires': 0,
    'jsapi_ticket': '',
    'jsapi_ticket_expires': 0,
}


def _get_wx_access_token(app_id, app_secret):
    """获取微信 access_token，带缓存"""
    now = time.time()
    if _wx_cache['access_token'] and _wx_cache['access_token_expires'] > now + 60:
        return _wx_cache['access_token']

    url = 'https://api.weixin.qq.com/cgi-bin/token'
    resp = requests.get(url, params={
        'grant_type': 'client_credential',
        'appid': app_id,
        'secret': app_secret,
    }, timeout=10)
    data = resp.json()
    if 'access_token' not in data:
        raise Exception(f"获取access_token失败: {data}")

    _wx_cache['access_token'] = data['access_token']
    _wx_cache['access_token_expires'] = now + data.get('expires_in', 7200)
    return _wx_cache['access_token']


def _get_wx_jsapi_ticket(app_id, app_secret):
    """获取微信 jsapi_ticket，带缓存"""
    now = time.time()
    if _wx_cache['jsapi_ticket'] and _wx_cache['jsapi_ticket_expires'] > now + 60:
        return _wx_cache['jsapi_ticket']

    access_token = _get_wx_access_token(app_id, app_secret)
    url = 'https://api.weixin.qq.com/cgi-bin/ticket/getticket'
    resp = requests.get(url, params={
        'type': 'jsapi',
        'access_token': access_token,
    }, timeout=10)
    data = resp.json()
    if data.get('errcode') != 0:
        raise Exception(f"获取jsapi_ticket失败: {data}")

    _wx_cache['jsapi_ticket'] = data['ticket']
    _wx_cache['jsapi_ticket_expires'] = now + data.get('expires_in', 7200)
    return _wx_cache['jsapi_ticket']


@app.route('/')
def index():
    """
    :return: 返回index页面
    """
    return render_template('index.html')


@app.route('/MP_verify_<code>.txt')
def mp_verify(code):
    """
    微信公众号「JS接口安全域名」校验文件。
    微信要求域名根路径下能访问 MP_verify_xxx.txt，且文件内容就是文件名中的 xxx。
    动态返回，无需手动放置文件。
    """
    return code


# 内置默认照片列表（与 H5 版一致）
_DEFAULT_PHOTOS = [
    {'url': f'https://picsum.photos/seed/{i}/400/400', 'title': f'照片 {i}'}
    for i in range(1, 17)
]


@app.route('/api/photos', methods=['GET'])
def get_photos():
    """
    照片列表接口，供小程序/H5使用。
    照片URL通过云托管环境变量 PHOTO_URLS 配置（英文逗号分隔），未配置时返回内置默认列表。
    更换照片后无需重新发布小程序。
    """
    import config

    urls = config.PHOTO_URLS
    if urls:
        photos = [{'url': u, 'title': f'照片 {i + 1}'} for i, u in enumerate(urls)]
    else:
        photos = _DEFAULT_PHOTOS
    return make_succ_response(photos)


@app.route('/api/albums', methods=['GET'])
def get_albums():
    """
    相册列表接口：PHOTO_URLS 用英文分号「;」分组，每组一个相册（自动命名 相册1/相册2…）。
    未配置分号时只有一个相册；完全未配置照片时，把内置默认列表对半分成两个相册，便于预览。
    :return: [{ name, cover, count, photos: [{url, title}] }]
    """
    import config

    if config.PHOTO_GROUPS:
        albums = []
        for g in config.PHOTO_GROUPS:
            photos = [{'url': u, 'title': f'{g["name"]} {i + 1}'} for i, u in enumerate(g['urls'])]
            albums.append({
                'name': g['name'],
                'cover': g['urls'][0],
                'count': len(g['urls']),
                'photos': photos,
            })
    else:
        albums = []
        half = (len(_DEFAULT_PHOTOS) + 1) // 2
        for name, chunk in (('相册1', _DEFAULT_PHOTOS[:half]), ('相册2', _DEFAULT_PHOTOS[half:])):
            if not chunk:
                continue
            albums.append({
                'name': name,
                'cover': chunk[0]['url'],
                'count': len(chunk),
                'photos': chunk,
            })
    return make_succ_response(albums)


@app.route('/api/wx/share', methods=['POST'])
def wx_share():
    """
    微信 JS-SDK 签名接口，前端传入当前页面 URL，返回 wx.config 所需参数
    :return: { appId, timestamp, nonceStr, signature }
    """
    import config

    app_id = config.WX_APP_ID
    app_secret = config.WX_APP_SECRET

    if not app_id or not app_secret:
        return make_err_response('微信 JS-SDK 未配置 AppID/AppSecret')

    # 前端传入的页面 URL（用于签名）
    body = request.get_json(silent=True) or {}
    url = body.get('url', '')
    if not url:
        return make_err_response('缺少 url 参数')

    try:
        jsapi_ticket = _get_wx_jsapi_ticket(app_id, app_secret)
    except Exception as e:
        return make_err_response(str(e))

    # 生成签名
    nonce_str = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
    timestamp = int(time.time())
    sign_str = f'jsapi_ticket={jsapi_ticket}&noncestr={nonce_str}&timestamp={timestamp}&url={url}'
    signature = hashlib.sha1(sign_str.encode('utf-8')).hexdigest()

    return make_succ_response({
        'appId': app_id,
        'timestamp': timestamp,
        'nonceStr': nonce_str,
        'signature': signature,
        # 分享卡片文案（在云托管「服务设置-环境变量」中配置 SHARE_TITLE / SHARE_DESC / SHARE_IMG 即可修改）
        'shareTitle': config.SHARE_TITLE,
        'shareDesc': config.SHARE_DESC,
        'shareImg': config.SHARE_IMG,
    })


@app.route('/api/count', methods=['POST'])
def count():
    """
    :return:计数结果/清除结果
    """

    # 获取请求体参数
    params = request.get_json()

    # 检查action参数
    if 'action' not in params:
        return make_err_response('缺少action参数')

    # 按照不同的action的值，进行不同的操作
    action = params['action']

    # 执行自增操作
    if action == 'inc':
        counter = query_counterbyid(1)
        if counter is None:
            counter = Counters()
            counter.id = 1
            counter.count = 1
            counter.created_at = datetime.now()
            counter.updated_at = datetime.now()
            insert_counter(counter)
        else:
            counter.id = 1
            counter.count += 1
            counter.updated_at = datetime.now()
            update_counterbyid(counter)
        return make_succ_response(counter.count)

    # 执行清0操作
    elif action == 'clear':
        delete_counterbyid(1)
        return make_succ_empty_response()

    # action参数错误
    else:
        return make_err_response('action参数错误')


@app.route('/api/count', methods=['GET'])
def get_count():
    """
    :return: 计数的值
    """
    counter = Counters.query.filter(Counters.id == 1).first()
    return make_succ_response(0) if counter is None else make_succ_response(counter.count)


# ========== 亲友祝福（弹幕） ==========

# 内存级限流：ip -> 最后一次提交时间戳
_bless_rate = {}

# 本地敏感词兜底（云端内容安全不可用时的最后防线）
_BLOCKLIST = ['加微', '微信号', 'vx:', 'vx：', '代刷', '兼职', '贷款', '博彩', '推广', 'https://', 'http://']


def _sec_check(text):
    """
    祝福语内容安全检测：
    1) 本地敏感词过滤（兜底，始终执行）；
    2) 微信 msg_sec_check 内容安全接口（云托管内网免鉴权调用；公网调用缺少
       access_token 会返回错误码，此时视为云端检测不可用，仅依赖本地过滤）。
    """
    low = text.lower()
    if any(w in low for w in _BLOCKLIST):
        return False
    try:
        resp = requests.post('https://api.weixin.qq.com/wxa/msg_sec_check',
                             json={'content': text, 'scene': 3}, timeout=5)
        data = resp.json()
        code = data.get('errcode')
        if code == 0:
            return True
        if code == 87014:      # 内容包含违规信息
            return False
        # 其他错误码（如 40001/41002 等 token 类错误）→ 云端检测不可用，放行
        return True
    except Exception:
        return True


def _blessing_stats():
    total = Blessing.query.count()
    return total


@app.route('/api/blessings', methods=['GET'])
def list_blessings():
    """
    获取祝福列表（最新60条）与总数，供小程序弹幕展示
    :return: { total, items: [{id, name, message}] }
    """
    try:
        items = Blessing.query.order_by(Blessing.id.desc()).limit(60).all()
        total = Blessing.query.count()
    except Exception as e:
        return make_err_response(str(e))
    return make_succ_response({
        'total': total,
        'items': [{'id': b.id, 'name': b.name, 'message': b.message} for b in reversed(items)]
    })


@app.route('/api/blessings', methods=['POST'])
def add_blessing():
    """
    新增一条祝福（带内容安全检测 + 频率限制 + 总量上限）
    :param name: 称呼（<=20字）
    :param message: 祝福语（<=100字）
    """
    import config

    body = request.get_json(silent=True) or {}
    name = (body.get('name') or '').strip()[:20]
    message = (body.get('message') or '').strip()[:100]
    if not name or not message:
        return make_err_response('请填写称呼和祝福语')

    # 频率限制：同一 IP 60 秒内只允许提交一条
    ip = request.headers.get('X-Real-IP') or request.remote_addr or ''
    now = time.time()
    if now - _bless_rate.get(ip, 0) < 60:
        return make_err_response('发送太频繁啦，休息一下再送祝福')
    if Blessing.query.count() >= config.MAX_BLESSINGS:
        return make_err_response('祝福已达上限，感谢大家的热情！')
    if not _sec_check(message):
        return make_err_response('祝福语包含不合适的内容，请修改后再送出')

    try:
        b = Blessing(name=name, message=message, created_at=datetime.now())
        db.session.add(b)
        db.session.commit()
        total = Blessing.query.count()
    except Exception as e:
        db.session.rollback()
        return make_err_response(str(e))
    _bless_rate[ip] = now
    return make_succ_response({'id': b.id, 'total': total})


# ========== 到场回执 ==========

def _rsvp_stats():
    rows = Rsvp.query.filter(Rsvp.attend.is_(True)).all()
    attending = len(rows)
    guests = sum(r.guests or 1 for r in rows)
    return {'attending': attending, 'guests': guests}


@app.route('/api/rsvp', methods=['GET'])
def get_rsvp():
    """
    查询我的回执（?visitorKey=xxx）
    """
    vk = (request.args.get('visitorKey') or '')[:64]
    if not vk:
        return make_succ_response(None)
    r = Rsvp.query.filter(Rsvp.visitor_key == vk).order_by(Rsvp.id.desc()).first()
    if r is None:
        return make_succ_response(None)
    return make_succ_response({'attend': bool(r.attend), 'guests': r.guests, 'name': r.name})


@app.route('/api/rsvp', methods=['POST'])
def post_rsvp():
    """
    提交/更新回执（同一 visitorKey 覆盖更新）
    :param visitorKey: 前端生成的访客标识
    :param name: 称呼（选填）
    :param attend: 是否出席
    :param guests: 出席人数（含本人，1-20）
    """
    body = request.get_json(silent=True) or {}
    vk = (body.get('visitorKey') or '').strip()[:64]
    if not vk:
        return make_err_response('缺少访客标识')
    name = (body.get('name') or '').strip()[:20]
    attend = bool(body.get('attend'))
    try:
        guests = int(body.get('guests') or 1)
    except (TypeError, ValueError):
        guests = 1
    guests = max(1, min(20, guests))

    now = datetime.now()
    try:
        r = Rsvp.query.filter(Rsvp.visitor_key == vk).order_by(Rsvp.id.desc()).first()
        if r is None:
            r = Rsvp(visitor_key=vk, name=name, attend=attend, guests=guests,
                     created_at=now, updated_at=now)
            db.session.add(r)
        else:
            r.name = name
            r.attend = attend
            r.guests = guests if attend else 0
            r.updated_at = now
        db.session.commit()
        stats = _rsvp_stats()
    except Exception as e:
        db.session.rollback()
        return make_err_response(str(e))
    return make_succ_response(stats)


@app.route('/api/rsvp/stats', methods=['GET'])
def rsvp_stats():
    """
    回执统计：出席组数与总人数
    """
    try:
        stats = _rsvp_stats()
    except Exception as e:
        return make_err_response(str(e))
    return make_succ_response(stats)


# ========== 访问记录 ==========

@app.route('/api/visit', methods=['POST'])
def record_visit():
    """
    记录一次访问（前端进入页面时调用，visitorKey 由前端本地生成并持久化）
    """
    body = request.get_json(silent=True) or {}
    vk = (body.get('visitorKey') or '').strip()[:64]
    if vk:
        try:
            db.session.add(Visit(visitor_key=vk, created_at=datetime.now()))
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return make_err_response(str(e))
    return make_succ_empty_response()


@app.route('/api/visit/stats', methods=['GET'])
def visit_stats():
    """
    访问统计：总浏览次数与独立访客数
    """
    try:
        total = Visit.query.count()
        unique = db.session.query(db.func.count(db.distinct(Visit.visitor_key))).scalar()
    except Exception as e:
        return make_err_response(str(e))
    return make_succ_response({'total': total or 0, 'unique': unique or 0})


# ========== 体重日记（个人使用，环境共享下仅自己的两个小程序可调） ==========

_WEIGHT_MIN = 20.0
_WEIGHT_MAX = 300.0


def _parse_date_str(s, default_date):
    """
    把 YYYY-MM-DD 字符串解析为 date；非法或缺省时返回 default_date
    """
    s = (s or '').strip()
    if not s:
        return default_date
    try:
        return datetime.strptime(s, '%Y-%m-%d').date()
    except ValueError:
        return default_date


def _weight_item(w, prev_weight):
    """
    单条记录转 dict，附带与前一记录的环比差值（一位小数）
    """
    diff = None
    if prev_weight is not None:
        diff = round(w.weight - prev_weight, 1)
    return {
        'id': w.id,
        'date': w.date.strftime('%Y-%m-%d'),
        'weight': round(w.weight, 1),
        'diff': diff,
    }


@app.route('/api/weight', methods=['POST'])
def save_weight():
    """
    保存体重（同一天重复保存即覆盖）
    :param weight: 体重 kg，20-300，一位小数
    :param date: 可选，YYYY-MM-DD，缺省今天
    """
    body = request.get_json(silent=True) or {}
    try:
        weight = round(float(body.get('weight')), 1)
    except (TypeError, ValueError):
        return make_err_response('请输入有效的体重数值')
    if not (_WEIGHT_MIN <= weight <= _WEIGHT_MAX):
        return make_err_response('体重需在 %.0f-%.0f kg 之间' % (_WEIGHT_MIN, _WEIGHT_MAX))

    d = _parse_date_str(body.get('date'), date.today())
    now = datetime.now()
    try:
        existing = query_weight_by_date(d)
        if existing is not None:
            existing.weight = weight
            existing.updated_at = now
            db.session.commit()
            return make_succ_response({'id': existing.id, 'date': d.strftime('%Y-%m-%d'),
                                       'weight': weight, 'created': False})
        w = Weights(date=d, weight=weight, created_at=now, updated_at=now)
        if not insert_weight(w):
            return make_err_response('保存失败，请稍后再试')
        return make_succ_response({'id': w.id, 'date': d.strftime('%Y-%m-%d'),
                                   'weight': weight, 'created': True})
    except Exception as e:
        db.session.rollback()
        return make_err_response(str(e))


@app.route('/api/weight/list', methods=['GET'])
def list_weights():
    """
    体重记录列表（按日期升序，含环比差值）
    :param days: 可选，最近 N 天（按日期过滤，非记录条数）；0 或缺省表示全部
    """
    try:
        days = int(request.args.get('days', 0))
    except ValueError:
        days = 0
    start = None
    if days and days > 0:
        start = date.today() - timedelta(days=days - 1)
    try:
        rows = query_weights_since(start)
    except Exception as e:
        return make_err_response(str(e))
    items = []
    prev = None
    for w in rows:
        items.append(_weight_item(w, prev))
        prev = w.weight
    latest = items[-1] if items else None
    return make_succ_response({'items': items, 'latest': latest})


@app.route('/api/weight/<int:wid>', methods=['DELETE'])
def remove_weight(wid):
    """
    删除一条体重记录
    """
    try:
        if delete_weight_byid(wid):
            return make_succ_empty_response()
        return make_err_response('记录不存在')
    except Exception as e:
        return make_err_response(str(e))


@app.route('/api/weight/export', methods=['GET'])
def export_weights():
    """
    导出全部体重记录 JSON（备份用）
    """
    try:
        rows = query_weights_since(None)
    except Exception as e:
        return make_err_response(str(e))
    return make_succ_response([{'date': w.date.strftime('%Y-%m-%d'),
                                'weight': round(w.weight, 1)} for w in rows])
