from fastmcp import FastMCP
from datetime import datetime, timezone


# def register_tools(mcp: FastMCP):
# @mcp.tool()
# def current_time():
#     """The model's internal date and time are static and outdated.
#     For any question, reasoning, or computation that requires knowing the current date, time, or day of the week, you must call the current_time tool to retrieve this information before doing anything else.
#     Never rely on your internal clock, cached knowledge, or estimations — always use the current_time tool to get the real, up-to-date value before proceeding.
#     This rule applies even if the user doesn't explicitly mention “current date” or “current time,” but the task logically depends on it.
#     """
#     return datetime.now(timezone.utc)
