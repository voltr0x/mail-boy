import express from 'express';
import cors from 'cors';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { emailServer } from './mcp/emailServer';

const app = express();
app.use(cors());

let transport: SSEServerTransport | null = null;

app.get('/mcp', async (req, res) => {
    console.log('SSE connection requested');
    transport = new SSEServerTransport('/message', res);
    await emailServer.connect(transport);
});

app.post('/message', async (req, res) => {
    console.log('Message received');
    if (transport) {
        await transport.handlePostMessage(req, res);
    } else {
        res.status(500).json({ error: 'No MCP connection initialized' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Mail Boy MCP Server running on http://localhost:${PORT}`);
});
