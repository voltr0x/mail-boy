import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { mcpService } from './mcpClient';

export async function chatWithGemini(
    prompt: string,
    history: any[],
    geminiKey: string,
    imapSettings: any,
    onToolCall: (name: string, args: any) => void
) {
    const llm = new ChatGoogleGenerativeAI({
        apiKey: geminiKey,
        model: "gemini-2.5-flash",
    });

    // We capture the toolData to return to the UI separately so it can render the download buttons
    let capturedToolData: any = null;

    const executeMcpTool = async (args: any, requestedToolName: string) => {
        onToolCall(requestedToolName, args);
        const mcpArgs = { ...args, ...imapSettings };
        try {
            const result = await mcpService.callTool(requestedToolName, mcpArgs);
            const textResult = result.content[0].text;
            
            try {
                const parsed = JSON.parse(textResult);
                
                // If it's a download action and succeeded, capture for the UI
                if (requestedToolName === 'download_attachment' && Array.isArray(parsed) && parsed.length > 0) {
                    capturedToolData = result.content; 
                    return `Successfully downloaded attachment ${args.filename}!`;
                }

                if (Array.isArray(parsed) && parsed.length > 0) {
                    return `Found ${parsed.length} results! Result: ${textResult}`;
                } else if (Array.isArray(parsed) && parsed.length === 0) {
                    return `0 results found. Try using a DIFFERENT or BROADER search query.`;
                }
                
                return textResult;
            } catch (e) {
                return `Tool executed. Result: ${textResult}`;
            }
        } catch (err: any) {
            return `Error running tool: ${err.message}`;
        }
    };

    const searchEmailsBySubjectTool = tool(async (args) => executeMcpTool(args, 'search_emails_by_subject'), {
        name: "search_emails_by_subject",
        description: "Search email inbox by subject to find emails. Returns list of matches with UID, subject, and attachments (metadata only).",
        schema: z.object({
            subjectQuery: z.string().describe("A keyword to search for in email subjects."),
            senderQuery: z.string().optional().describe("MUST BE A SINGLE WORD FIRST NAME or exact email."),
        })
    });

    const searchEmailsByContextTool = tool(async (args) => executeMcpTool(args, 'search_emails_by_context'), {
        name: "search_emails_by_context",
        description: "Search email inbox using a broad context query (checks body, subject, etc.). Returns list of matches with UID, subject, and attachments (metadata only). Useful if you don't know the exact subject.",
        schema: z.object({
            contextQuery: z.string().describe("A broad keyword or phrase related to the email content."),
            senderQuery: z.string().optional().describe("MUST BE A SINGLE WORD FIRST NAME or exact email."),
        })
    });

    const downloadAttachmentTool = tool(async (args) => executeMcpTool(args, 'download_attachment'), {
        name: "download_attachment",
        description: "Downloads the specified attachment base64 content. MUST be used ONLY after finding the correct email UID via one of the search tools.",
        schema: z.object({
            uid: z.number().describe("The exact numeric UID of the email."),
            filename: z.string().describe("The exact filename of the attachment to download from that email."),
        })
    });

    const systemPrompt = `You are Mail Boy, an AI assistant. Help users manage and download their email attachments.
Your workflow:
1. First, search for emails using EITHER 'search_emails_by_subject' OR 'search_emails_by_context'.
2. If multiple options are returned, ask the user which one they would like to download by listing the subjects/filenames. DO NOT try to download them all at once.
3. Once the user clearly chooses an option (or if there's only one obvious option), use the 'download_attachment' tool, passing the exact 'uid' and 'filename' of the requested attachment.
IMPORTANT: Never use download_attachment before you have the precise UID from a search tool.`;

    const agent = createReactAgent({
        llm,
        tools: [searchEmailsBySubjectTool, searchEmailsByContextTool, downloadAttachmentTool],
        messageModifier: new SystemMessage(systemPrompt),
    });

    const langGraphMessages = history.map(msg =>
        msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
    );
    langGraphMessages.push(new HumanMessage(prompt));

    const finalState = await agent.invoke({
        messages: langGraphMessages
    });

    const finalMessage = finalState.messages[finalState.messages.length - 1];

    return {
        text: finalMessage.content,
        toolData: capturedToolData
    };
}
