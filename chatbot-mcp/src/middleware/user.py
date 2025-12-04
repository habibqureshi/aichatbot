from fastmcp.server.middleware import Middleware, MiddlewareContext


class UserMiddleware(Middleware):
    async def on_call_tool(self, context: MiddlewareContext, call_next):
        # This method receives ALL messages regardless of type
        headers = context.fastmcp_context.request_context.request.headers
        context.fastmcp_context.set_state(
            "call_sid", headers.get("x-call-id", "invalid")
        )
        context.fastmcp_context.set_state(
            "patient_number", headers.get("x-patient-no", "invalid")
        )
        result = await call_next(context)
        return result
