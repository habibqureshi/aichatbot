import logging
import uuid
from fastapi import Form, WebSocket

_LOG_FORMAT = (
    "%(asctime)s %(levelname)s %(filename)s:%(lineno)d "
    "%(requestId)s callSID:%(callId)s %(message)s"
)

_logger = logging.getLogger("app")

if not _logger.handlers:
    _logger.setLevel(logging.DEBUG)

    _stream_handler = logging.StreamHandler()
    _stream_handler.setLevel(logging.DEBUG)
    _stream_handler.setFormatter(logging.Formatter(_LOG_FORMAT))
    _logger.addHandler(_stream_handler)

    _logger.propagate = False


def _make_adapter(call_sid: str) -> logging.LoggerAdapter:
    return logging.LoggerAdapter(
        _logger,
        {"callId": call_sid, "requestId": uuid.uuid4()},
    )


def get_logger(CallSid: str = Form(...)) -> logging.LoggerAdapter:
    return _make_adapter(CallSid)


def get_ws_logger(websocket: WebSocket) -> logging.LoggerAdapter:
    call_sid = websocket.query_params.get("CallSid", "WS_CALL")
    return _make_adapter(call_sid)
