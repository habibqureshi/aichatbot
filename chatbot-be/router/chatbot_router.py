from typing import Optional
from fastapi import APIRouter, Depends, Header, Query
from logging import Logger
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage, AIMessageChunk, SystemMessage
import json
from langgraph.types import Command
from uuid import uuid4 as uuid
from langgraph.graph import StateGraph
from graph.bot_graph import get_graph
from graph_state import ChatState

router = APIRouter(
    prefix="/api/v1",  # Prefix for all user-related routes
    tags=["ai_assistant"],  # Tag for grouping these routes in the docs
)


@router.get("/chat")
async def chat(
    query: str,
    id: Optional[str] = "",
    graph: StateGraph = Depends(get_graph),
):


    print(f"Query: {query}, ID: {id}")
    async def message_stream():
        threadId = id
        print("dumpring")
        # yield f"data: {json.dumps({'id': str("hayedabhsjdbajhsbd")})}\n\n"
        # return
        command = ChatState(
            userInput=query,
            messages=[HumanMessage(content=query)],

        )
        if threadId:
            config = {
                "configurable": {
                    "thread_id": threadId,
                },
            }
            command = Command(
                resume=query
            )
            yield f"data: {json.dumps({"id": threadId})}\n\n".encode("utf-8")
        else:
            threadId = str(uuid())
            config = {
                "configurable": {
                    "thread_id": threadId,
                },
            }
            # yield json.dumps({"id": return_id})
            yield f"data: {json.dumps({"id": threadId})}\n\n".encode("utf-8")
        print(config,command)
        # print(await list(graph.get_state_history(config)))
        async for chunk in graph.astream(
            command,
            subgraphs=True,
            config=config,
            stream_mode=["updates", "messages", "values"],
        ):
            if isinstance(chunk, tuple):
                match chunk[1]:
                    case "values":
                        if "messages" in chunk[2]:
                            updates = chunk[2].get("messages")[-1]
                            if (
                                isinstance(updates, SystemMessage)
                                and hasattr(updates, "metadata")
                                and updates.metadata.get("out") is True
                            ):
                                # yield json.dumps({"data": updates.content})
                                yield f"data: {json.dumps({"threadId": threadId,"chunk":updates.content})}\n\n".encode("utf-8")

                    case "messages":
                        values = chunk[2][0]
                        if isinstance(values, AIMessageChunk) and values.content:
                            # yield json.dumps({"data": values.content})
                            yield f"data: {json.dumps({"threadId": threadId,"chunk":values.content})}\n\n".encode("utf-8")

    return StreamingResponse(message_stream(), media_type="text/event-stream")
