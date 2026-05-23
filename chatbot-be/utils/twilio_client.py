from fastapi.websockets import WebSocket
from twilio.rest import Client


def get_twilio_client(websocket: WebSocket) -> Client:
    return websocket.app.state.twilio_client
