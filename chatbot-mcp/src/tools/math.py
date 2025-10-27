def register_tools(mcp):
    @mcp.tool()
    def add(a: int, b: int) -> int:
        """Return the sum of two numbers."""
        return a + b

    @mcp.tool()
    def multiply(a: int, b: int) -> int:
        """Return the product of two numbers."""
        return a * b
