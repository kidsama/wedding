import hashlib
import random
import string
import time
from datetime import datetime

import requests
from flask import render_template, request

from run import app
from wxcloudrun import db
from wxcloudrun.dao import delete_counterbyid, query_counterbyid, insert_counter, update_counterbyid
from wxcloudrun.model import Counters, Blessing
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
    新增一条祝福
    :param name: 称呼（<=20字）
    :param message: 祝福语（<=100字）
    """
    body = request.get_json(silent=True) or {}
    name = (body.get('name') or '').strip()[:20]
    message = (body.get('message') or '').strip()[:100]
    if not name or not message:
        return make_err_response('请填写称呼和祝福语')
    try:
        b = Blessing(name=name, message=message, created_at=datetime.now())
        db.session.add(b)
        db.session.commit()
        total = Blessing.query.count()
    except Exception as e:
        db.session.rollback()
        return make_err_response(str(e))
    return make_succ_response({'id': b.id, 'total': total})
