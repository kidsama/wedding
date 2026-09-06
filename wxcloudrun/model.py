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
