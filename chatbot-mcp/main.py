from src.server import mcp
from src.configs import PORT

if __name__ == "__main__":
    mcp.run(transport="streamable-http", host="0.0.0.0", port=PORT)
