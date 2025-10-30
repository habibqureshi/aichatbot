from fastmcp import FastMCP
from datetime import datetime
import os
import importlib
from starlette.requests import Request
from starlette.responses import JSONResponse

mcp = FastMCP("SaaS MCP Server")


tools_dir = os.path.join(os.path.dirname(__file__), "tools")
[
    getattr(module, "register_tools")(mcp)
    for f in os.listdir(tools_dir)
    if f.endswith(".py") and not f.startswith("__")
    for module in [importlib.import_module(f"src.tools.{f[:-3]}")]
    if hasattr(module, "register_tools")
]


@mcp.custom_route("/health/check", methods=["GET"])
async def health(req: Request) -> JSONResponse:
    return JSONResponse(
        {"status": "Ok!", "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
    )
