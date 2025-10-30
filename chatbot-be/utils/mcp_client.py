from fastmcp.client import Client, StreamableHttpTransport
from mcp import ClientSession
from typing import Optional


class MCPClient:
    """A high-level MCP client wrapper."""

    def __init__(self):
        self.client: Optional[Client] = None
        self.transport = None
        self.connected = False
        self.session: Optional[ClientSession] = None

    async def connect(self, url: str, headers: dict) -> bool:
        """Connect to an MCP server via stdio transport."""
        try:

            # Create stdio transport
            self.transport = StreamableHttpTransport(
                url=url,
                headers=headers,
            )

            # Create client
            self.client = Client(self.transport)

            await self.client._connect()
            self.session = self.client.session

            await self.session.initialize()
            self.connected = True
            print("Connected to MCP")
            return True

        except Exception as e:
            print(f"❌ Failed to connect: {e}")
            self.connected = False
            return False

    async def disconnect(self):
        """Disconnect from the MCP server."""
        if self.client and self.connected:
            try:
                await self.client._disconnect()
                self.connected = False
                print("✅ Disconnected from MCP server")
            except Exception as e:
                print(f"⚠️  Error during disconnect: {e}")
