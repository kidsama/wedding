# -*- coding: utf-8 -*-
"""
体重日记接口本地自测（临时 SQLite，不碰云 MySQL）
用法：python tests/test_weight_api.py
覆盖：POST 保存/同日覆盖、GET list 环比与 days 过滤、DELETE、export、参数校验
"""
import io
import json
import os
import sys
import tempfile
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

# 避免本机无 MySQL 时 import 阶段卡住：先给默认环境变量
os.environ.setdefault('MYSQL_USERNAME', 'test')
os.environ.setdefault('MYSQL_PASSWORD', 'test')
os.environ.setdefault('MYSQL_ADDRESS', '127.0.0.1:3306')

# 在导入 wxcloudrun 之前注入 SQLite URI（__init__.py 支持 DATABASE_URI 覆盖）
_tmpdir = tempfile.mkdtemp()
os.environ['DATABASE_URI'] = 'sqlite:///' + os.path.join(_tmpdir, 'test.db').replace('\\', '/')

# 先导入 wxcloudrun 创建 app（与生产入口 python run.py 的初始化顺序一致，避免循环导入）
import wxcloudrun  # noqa: E402,F401
from wxcloudrun import app, db  # noqa: E402

with app.app_context():
    db.create_all()

client = app.test_client()
failures = []


def check(name, cond, detail=''):
    tag = 'PASS' if cond else 'FAIL'
    print('[%s] %s %s' % (tag, name, detail))
    if not cond:
        failures.append(name)


def post(path, body):
    r = client.post(path, data=json.dumps(body), content_type='application/json')
    return r.status_code, json.loads(r.data.decode('utf-8'))


def get(path):
    r = client.get(path)
    return r.status_code, json.loads(r.data.decode('utf-8'))


today = date.today().strftime('%Y-%m-%d')
yesterday = (date.today() - timedelta(days=1)).strftime('%Y-%m-%d')
d3 = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')

# 1. 新增三条记录
code, res = post('/api/weight', {'date': d3, 'weight': 72.0})
check('保存-3天前新建', code == 200 and res['code'] == 0 and res['data']['created'] is True, str(res))
code, res = post('/api/weight', {'date': yesterday, 'weight': 72.5})
check('保存-昨天新建', code == 200 and res['data']['created'] is True, str(res))
code, res = post('/api/weight', {'weight': 72.4})  # 缺省日期=今天
check('保存-今天(缺省日期)', code == 200 and res['data']['date'] == today, str(res))

# 2. 同日覆盖
code, res = post('/api/weight', {'weight': 72.6})
check('保存-今天覆盖', code == 200 and res['data']['created'] is False and res['data']['weight'] == 72.6, str(res))

# 3. 列表 + 环比
code, res = get('/api/weight/list')
items = res['data']['items']
check('列表-条数', len(items) == 3, str(len(items)))
check('列表-升序', items[0]['date'] == d3 and items[-1]['date'] == today, str([i['date'] for i in items]))
check('环比-今天', items[-1]['diff'] == 0.1, str(items[-1]))
check('环比-昨天', items[1]['diff'] == 0.5, str(items[1]))
check('环比-首条为null', items[0]['diff'] is None, str(items[0]))
check('latest', res['data']['latest']['weight'] == 72.6, str(res['data']['latest']))

# 4. days 过滤（最近2天 → 今天+昨天）
code, res = get('/api/weight/list?days=2')
check('过滤-days=2', len(res['data']['items']) == 2, str(len(res['data']['items'])))
code, res = get('/api/weight/list?days=0')
check('过滤-days=0为全部', len(res['data']['items']) == 3, str(len(res['data']['items'])))

# 5. 校验
code, res = post('/api/weight', {'weight': 15})
check('校验-低于下限', code == 200 and res['code'] == -1, str(res))
code, res = post('/api/weight', {'weight': 500})
check('校验-高于上限', code == 200 and res['code'] == -1, str(res))
code, res = post('/api/weight', {'weight': 'abc'})
check('校验-非法数值', code == 200 and res['code'] == -1, str(res))
code, res = post('/api/weight', {'weight': 72.36})
check('校验-四舍五入一位小数', code == 200 and res['data']['weight'] == 72.4, str(res))

# 6. 删除
wid = items[-1]['id']
r = client.delete('/api/weight/%d' % wid)
code, res = r.status_code, json.loads(r.data.decode('utf-8'))
check('删除-成功', code == 200 and res['code'] == 0, str(res))
r = client.delete('/api/weight/%d' % wid)
res2 = json.loads(r.data.decode('utf-8'))
check('删除-重复删除报错', res2['code'] == -1, str(res2))
code, res = get('/api/weight/list')
check('删除后条数', len(res['data']['items']) == 2, str(len(res['data']['items'])))

# 7. 导出
code, res = get('/api/weight/export')
check('导出-格式', code == 200 and res['data'][0] == {'date': d3, 'weight': 72.0}, str(res))

print()
if failures:
    print('结果：失败 %d 项 -> %s' % (len(failures), ', '.join(failures)))
    sys.exit(1)
print('结果：全部通过')
