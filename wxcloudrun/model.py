from datetime import datetime

from wxcloudrun import db


# 说明：MySQL 5.7（NO_ZERO_DATE 模式）下，一张表里第二个及以后的 TIMESTAMP NOT NULL 列
# 若无显式默认值，会隐式取 '0000-00-00 00:00:00' 而建表报 1067。
# 因此所有时间列统一加 server_default=func.now()（建表合法 + Python 未传值时兜底）。

# 计数表
class Counters(db.Model):
    # 设置结构体表格名称
    __tablename__ = 'Counters'

    # 设定结构体对应表格的字段
    id = db.Column(db.Integer, primary_key=True)
    count = db.Column(db.Integer, default=1)
    created_at = db.Column('createdAt', db.TIMESTAMP, nullable=False,
                           default=datetime.now, server_default=db.func.now())
    updated_at = db.Column('updatedAt', db.TIMESTAMP, nullable=False,
                           default=datetime.now, server_default=db.func.now(),
                           onupdate=datetime.now)


# 亲友祝福表（电子请柬弹幕）
class Blessing(db.Model):
    __tablename__ = 'Blessings'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(20), nullable=False)      # 称呼
    message = db.Column(db.String(100), nullable=False)  # 祝福语
    created_at = db.Column('createdAt', db.TIMESTAMP, nullable=False,
                           default=datetime.now, server_default=db.func.now())


# 到场回执表（一人一条，按 visitor_key 覆盖更新）
class Rsvp(db.Model):
    __tablename__ = 'Rsvps'

    id = db.Column(db.Integer, primary_key=True)
    visitor_key = db.Column(db.String(64), nullable=False, index=True)  # 前端生成的访客标识
    name = db.Column(db.String(20), default='')                         # 称呼（选填）
    attend = db.Column(db.Boolean, default=True)                        # 是否出席
    guests = db.Column(db.Integer, default=1)                           # 出席人数（含本人）
    created_at = db.Column('createdAt', db.TIMESTAMP, nullable=False,
                           default=datetime.now, server_default=db.func.now())
    updated_at = db.Column('updatedAt', db.TIMESTAMP, nullable=False,
                           default=datetime.now, server_default=db.func.now(),
                           onupdate=datetime.now)


# 访问记录表
class Visit(db.Model):
    __tablename__ = 'Visits'

    id = db.Column(db.Integer, primary_key=True)
    visitor_key = db.Column(db.String(64), nullable=False, index=True)  # 前端生成的访客标识
    created_at = db.Column('createdAt', db.TIMESTAMP, nullable=False,
                           default=datetime.now, server_default=db.func.now())


# 体重日记表（一天一条，date 唯一索引保证重复保存即覆盖）
class Weights(db.Model):
    __tablename__ = 'Weights'

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, unique=True)  # 记录日期（YYYY-MM-DD）
    weight = db.Column(db.Float, nullable=False)            # 体重 kg，一位小数
    created_at = db.Column('createdAt', db.TIMESTAMP, nullable=False,
                           default=datetime.now, server_default=db.func.now())
    updated_at = db.Column('updatedAt', db.TIMESTAMP, nullable=False,
                           default=datetime.now, server_default=db.func.now(),
                           onupdate=datetime.now)
