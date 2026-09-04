import hashlib
import random
import string
import time
from datetime import datetime

import requests
from flask import render_template, request

from run import app
from wxcloudrun.dao import delete_counterbyid, query_counterbyid, insert_counter, update_counterbyid
from wxcloudrun.model import Counters
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
