import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

export class McpClientService {
    private client: Client;
    private transport: SSEClientTransport | null = null;
    public isConnected = false;

    constructor() {
        this.client = new Client(
            {
                name: "mail-boy-client",
                version: "1.0.0"
            },
            {
                capabilities: { tools: {} }
            }
        );
    }

    async connect(url: string = 'http://localhost:3001/mcp') {
        if (this.isConnected) return;
        
        try {
            this.transport = new SSEClientTransport(new URL(url));
            await this.client.connect(this.transport);
            this.isConnected = true;
            console.log('Connected to MCP Server via SSE');
        } catch (error) {
            console.error('Failed to connect to MCP:', error);
            throw error;
        }
    }

    async fetchTools() {
        if (!this.isConnected) await this.connect();
        return await this.client.listTools();
    }

    async callTool(name: string, args: any) {
        if (!this.isConnected) await this.connect();
        return await this.client.callTool({
            name,
            arguments: args
        });
    }

    async disconnect() {
        if (this.transport) {
            await this.transport.close();
            this.isConnected = false;
        }
    }
}

export const mcpService = new McpClientService();
