import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
import { searchAttachments } from '../services/imapService';

export const emailServer = new Server(
    {
        name: 'mail-boy-mcp-server',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

emailServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'search_email_attachments',
                description: 'Search the users email inbox for specific attachments. IMPORTANT: Do NOT guess full filenames. Provide ONLY 1-2 core keywords (e.g. "Passport") as the filenameQuery. Do NOT provide file extensions like .pdf. The IMAP search strictly uses substring matching.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filenameQuery: {
                            type: 'string',
                            description: 'A SIMPLIFIED single keyword or short noun to search for in attachment filenames. DO NOT INCLUDE FILE EXTENSIONS or long phrases.',
                        },
                        senderQuery: {
                            type: 'string',
                            description: 'Optional. Filter by sender. MUST BE A SINGLE WORD FIRST NAME or exact email address (eg "Sandeep" or "sandeep@gmail"). Do NOT use full names as it breaks IMAP search.',
                        },
                        host: { type: 'string', description: 'IMAP host (e.g. imap.gmail.com)' },
                        port: { type: 'number', description: 'IMAP port (e.g. 993)' },
                        user: { type: 'string', description: 'Email address' },
                        password: { type: 'string', description: 'App Password or Email password' },
                    },
                    required: ['filenameQuery', 'host', 'port', 'user', 'password'],
                },
            },
        ],
    };
});

emailServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'search_email_attachments') {
        const { filenameQuery, senderQuery, host, port, user, password } = request.params.arguments as any;

        try {
            console.log(`Starting IMAP search for attachment: ${filenameQuery}`);
            const results = await searchAttachments({
                filenameQuery,
                senderQuery,
                host,
                port,
                user,
                password
            });

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(results, null, 2),
                    },
                ],
            };
        } catch (error: any) {
             return {
                content: [
                    {
                        type: 'text',
                        text: `Error scanning emails: ${error.message || String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    }

    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
});
