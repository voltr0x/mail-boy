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

    const searchTool = tool(async (args) => {
        onToolCall('search_email_attachments', args);

        const mcpArgs = {
            ...args,
            ...imapSettings
        };

        try {
            const result = await mcpService.callTool('search_email_attachments', mcpArgs);
            const textResult = result.content[0].text;

            try {
                const parsed = JSON.parse(textResult);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    capturedToolData = result.content; // Pass it to the UI
                    // Tell the AI it succeeded
                    return `Found ${parsed.length} attachments! Result: ${textResult}`;
                } else {
                    return `0 attachments found matching "${args.filenameQuery}". HINT: The search failed. Do NOT guess the full filename. Try using a DIFFERENT or SHORTER single keyword.`;
                }
            } catch (e) {
                return `Search executed. Result: ${textResult}`;
            }

        } catch (err: any) {
            return `Error running tool: ${err.message}`;
        }
    }, {
        name: "search_email_attachments",
        description: "Search email inbox for specific attachments. IMPORTANT: Do NOT guess full filenames. Provide ONLY 1-2 core keywords (e.g. 'Passport'). The system uses exact substring matching. If it fails, try a simpler word.",
        schema: z.object({
            filenameQuery: z.string().describe("SIMPLIFIED single keyword. DO NOT INCLUDE FILE EXTENSIONS or long phrases."),
            senderQuery: z.string().optional().describe("MUST BE A SINGLE WORD FIRST NAME or exact email. Do NOT use full names (e.g. 'Viraj Shirodkar') as IMAP will fail. Use just 'Viraj'"),
        })
    });

    const agent = createReactAgent({
        llm,
        tools: [searchTool],
        messageModifier: new SystemMessage("You are Mail Boy, an AI assistant. Help users manage email attachments. Use the search_email_attachments tool. Do not guess exact filenames; use single simple keywords because the search is strict substring matching. If a search gives 0 results, TRY AGAIN automatically with an even simpler word before giving up. The IMAP credentials will be magically passed in the background."),
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
