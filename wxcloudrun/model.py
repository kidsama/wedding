from datetime import datetime

from wxcloudrun import db


# 计数表
class Counters(db.Model):
    # 设置结构体表格名称
    __tablename__ = 'Counters'

    # 设定结构体对应表格的字段
    id = db.Column(db.Integer, primary_key=True)
    count = db.Column(db.Integer, default=1)
    created_at = db.Column('createdAt', db.TIMESTAMP, nullable=False, default=datetime.now())
    updated_at = db.Column('updatedAt', db.TIMESTAMP, nullable=False, default=datetime.now())


# 亲友祝福表（电子请柬弹幕）
class Blessing(db.Model):
    __tablename__ = 'Blessings'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(20), nullable=False)      # 称呼
    message = db.Column(db.String(100), nullable=False)  # 祝福语
    created_at = db.Column('createdAt', db.TIMESTAMP, nullable=False, default=datetime.now())


# 到场回执表（一人一条，按 visitor_key 覆盖更新）
class Rsvp(db.Model):
    __tablename__ = 'Rsvps'

    id = db.Column(db.Integer, primary_key=True)
    visitor_key = db.Column(db.String(64), nullable=False, index=True)  # 前端生成的访客标识
    name = db.Column(db.String(20), default='')                         # 称呼（选填）
    attend = db.Column(db.Boolean, default=True)                        # 是否出席
    guests = db.Column(db.Integer, default=1)                           # 出席人数（含本人）
    created_at = db.Column('createdAt', db.TIMESTAMP, nullable=False, default=datetime.now())
    updated_at = db.Column('updatedAt', db.TIMESTAMP, nullable=False, default=datetime.now())


# 访问记录表
class Visit(db.Model):
    __tablename__ = 'Visits'

    id = db.Column(db.Integer, primary_key=True)
    visitor_key = db.Column(db.String(64), nullable=False, index=True)  # 前端生成的访客标识
    created_at = db.Column('createdAt', db.TIMESTAMP, nullable=False, default=datetime.now())
