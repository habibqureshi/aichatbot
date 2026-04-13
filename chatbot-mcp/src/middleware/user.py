from fastmcp.server.middleware import Middleware, MiddlewareContext


class UserMiddleware(Middleware):
    async def on_call_tool(self, context: MiddlewareContext, call_next):
        # This method receives ALL messages regardless of type
        print(f"UserMiddleware: {context.fastmcp_context.request_context.request.headers}")
        headers = context.fastmcp_context.request_context.request.headers
        context.fastmcp_context.set_state(
            "call_sid", headers.get("x-call-id", "invalid")
        )
        raw_phone = (
            headers.get("x-patient-no")
            or headers.get("x-customer-no")
            or "invalid"
        )
        context.fastmcp_context.set_state("patient_number", raw_phone)
        context.fastmcp_context.set_state("customer_number", raw_phone)
        context.fastmcp_context.set_state("tenant_id", int(headers.get("x-tenant-id")))
        result = await call_next(context)
        return result
