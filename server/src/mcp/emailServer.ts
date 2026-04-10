import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
import { searchEmailsMeta, downloadEmailAttachment } from '../services/imapService';

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
                name: 'search_emails_by_subject',
                description: 'Search the users email inbox for emails with a specific subject. Returns a list of matching emails and their attachments without downloading the actual files.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        subjectQuery: {
                            type: 'string',
                            description: 'A keyword or phrase to search for in the email subject.',
                        },
                        senderQuery: {
                            type: 'string',
                            description: 'Optional. Filter by sender. MUST BE A SINGLE WORD FIRST NAME or exact email address (eg "Sandeep" or "sandeep@gmail").',
                        },
                        host: { type: 'string', description: 'IMAP host' },
                        port: { type: 'number', description: 'IMAP port' },
                        user: { type: 'string', description: 'Email address' },
                        password: { type: 'string', description: 'App Password or Email password' },
                    },
                    required: ['subjectQuery', 'host', 'port', 'user', 'password'],
                },
            },
            {
                name: 'search_emails_by_context',
                description: 'Search the users email inbox using a broad context query (checks body, subject, etc.). Returns a list of matching emails and their attachments without downloading the files.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contextQuery: {
                            type: 'string',
                            description: 'A broad keyword or phrase related to the email content to search for in the entire email (body, subject).',
                        },
                        senderQuery: {
                            type: 'string',
                            description: 'Optional. Filter by sender. MUST BE A SINGLE WORD FIRST NAME or exact email address.',
                        },
                        host: { type: 'string', description: 'IMAP host' },
                        port: { type: 'number', description: 'IMAP port' },
                        user: { type: 'string', description: 'Email address' },
                        password: { type: 'string', description: 'App Password' },
                    },
                    required: ['contextQuery', 'host', 'port', 'user', 'password'],
                },
            },
            {
                name: 'download_attachment',
                description: 'Fetches the actual contents of a specific attachment from an email using its UID and filename. Use this ONLY after finding the correct email using a search tool.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uid: {
                            type: 'number',
                            description: 'The exact UID of the email containing the attachment to download.',
                        },
                        filename: {
                            type: 'string',
                            description: 'The exact filename of the attachment to download.',
                        },
                        host: { type: 'string', description: 'IMAP host' },
                        port: { type: 'number', description: 'IMAP port' },
                        user: { type: 'string', description: 'Email address' },
                        password: { type: 'string', description: 'App Password' },
                    },
                    required: ['uid', 'filename', 'host', 'port', 'user', 'password'],
                },
            },
        ],
    };
});

emailServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'search_emails_by_subject' || request.params.name === 'search_emails_by_context') {
        const { subjectQuery, contextQuery, senderQuery, host, port, user, password } = request.params.arguments as any;

        try {
            console.log(`Starting IMAP search for emails. Subject: ${subjectQuery}, Context: ${contextQuery}`);
            const results = await searchEmailsMeta({
                subjectQuery,
                contextQuery,
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
    } else if (request.params.name === 'download_attachment') {
        const { uid, filename, host, port, user, password } = request.params.arguments as any;

        try {
            console.log(`Downloading attachment ${filename} from UID ${uid}`);
            const results = await downloadEmailAttachment({
                uid,
                filename,
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
                        text: `Error downloading attachment: ${error.message || String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    }

    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
});
