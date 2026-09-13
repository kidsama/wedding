import logging

from sqlalchemy.exc import OperationalError

from wxcloudrun import db
from wxcloudrun.model import Counters, Weights

# 初始化日志
logger = logging.getLogger('log')


def query_counterbyid(id):
    """
    根据ID查询Counter实体
    :param id: Counter的ID
    :return: Counter实体
    """
    try:
        return Counters.query.filter(Counters.id == id).first()
    except OperationalError as e:
        logger.info("query_counterbyid errorMsg= {} ".format(e))
        return None


def delete_counterbyid(id):
    """
    根据ID删除Counter实体
    :param id: Counter的ID
    """
    try:
        counter = Counters.query.get(id)
        if counter is None:
            return
        db.session.delete(counter)
        db.session.commit()
    except OperationalError as e:
        logger.info("delete_counterbyid errorMsg= {} ".format(e))


def insert_counter(counter):
    """
    插入一个Counter实体
    :param counter: Counters实体
    """
    try:
        db.session.add(counter)
        db.session.commit()
    except OperationalError as e:
        logger.info("insert_counter errorMsg= {} ".format(e))


def update_counterbyid(counter):
    """
    根据ID更新counter的值
    :param counter实体
    """
    try:
        counter = query_counterbyid(counter.id)
        if counter is None:
            return
        db.session.flush()
        db.session.commit()
    except OperationalError as e:
        logger.info("update_counterbyid errorMsg= {} ".format(e))


# ========== 体重日记 ==========

def query_weight_by_date(date):
    """
    查询某一天的体重记录（一天一条，date 唯一）
    :param date: datetime.date
    :return: Weights 实体或 None
    """
    try:
        return Weights.query.filter(Weights.date == date).first()
    except OperationalError as e:
        logger.info("query_weight_by_date errorMsg= {} ".format(e))
        return None


def query_weights_since(start_date):
    """
    查询 start_date（含）之后的体重记录，按日期升序
    :param start_date: datetime.date；传 None 表示全部
    :return: Weights 列表
    """
    try:
        q = Weights.query
        if start_date is not None:
            q = q.filter(Weights.date >= start_date)
        return q.order_by(Weights.date.asc()).all()
    except OperationalError as e:
        logger.info("query_weights_since errorMsg= {} ".format(e))
        return []


def insert_weight(weight):
    """
    插入一条体重记录
    :param weight: Weights 实体
    """
    try:
        db.session.add(weight)
        db.session.commit()
        return True
    except OperationalError as e:
        db.session.rollback()
        logger.info("insert_weight errorMsg= {} ".format(e))
        return False


def delete_weight_byid(wid):
    """
    根据 ID 删除体重记录
    :param wid: Weights 的 ID
    :return: 是否删除了记录
    """
    try:
        w = Weights.query.get(wid)
        if w is None:
            return False
        db.session.delete(w)
        db.session.commit()
        return True
    except OperationalError as e:
        db.session.rollback()
        logger.info("delete_weight_byid errorMsg= {} ".format(e))
        return False
