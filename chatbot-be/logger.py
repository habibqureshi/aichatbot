import logging
import uuid
from fastapi import Depends, Form, WebSocket
from schemas.twilio import TwilioIncoming
# from services.current_user_service import get_current_user


def get_logger( CallSid: str = Form(...)   ):
    print(f"CallSid: {CallSid}")
    logger = logging.getLogger(__name__)
    # ip = getattr(currentUser, 'ip', "NO_IP"),
    extra = {
        "callId": CallSid,
        "requestId": uuid.uuid4(),
        # "ip": ip
    }
    if not logger.hasHandlers():
        logger = logging.getLogger(__name__)
        logger.setLevel(logging.DEBUG)
        ch = logging.StreamHandler()
        ch.setLevel(logging.DEBUG)
        # create formatter
        formatter = logging.Formatter(
        f'%(asctime)s %(levelname)s %(filename)s:%(lineno)d %(requestId)s callSID:%(callId)s %(message)s')
        ch.setFormatter(formatter)
        logger.addHandler(ch)
    logger = logging.LoggerAdapter(logger, extra)
    return logger


def get_ws_logger(websocket: WebSocket):
    logger = logging.getLogger(__name__)
    extra = {
        "callId": websocket.query_params.get("CallSid", "WS_CALL"),
        "requestId": uuid.uuid4(),
    }

    logging.basicConfig(
        filename="app.log",
        format="%(asctime)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s",
    )
    if not logger.hasHandlers():
        logger = logging.getLogger(__name__)
        logger.setLevel(logging.DEBUG)
        ch = logging.StreamHandler()
        ch.setLevel(logging.DEBUG)
        formatter = logging.Formatter(
            "%(asctime)s %(levelname)s %(filename)s:%(lineno)d %(requestId)s callSID:%(callId)s %(message)s"
        )
        ch.setFormatter(formatter)
        logger.addHandler(ch)
    return logging.LoggerAdapter(logger, extra)