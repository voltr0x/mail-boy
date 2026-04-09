import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export async function searchAttachments(params: any): Promise<any[]> {
    const { filenameQuery, senderQuery, host, port, user, password } = params;

    const client = new ImapFlow({
        host,
        port,
        secure: port === 993,
        auth: {
            user,
            pass: password,
        },
        logger: false as any,
    });

    await client.connect();
    
    const matchedAttachments: any[] = [];

    try {
        await client.mailboxOpen('INBOX');

        let searchObj: any = {};
        
        if (host.includes('gmail.com')) {
            // Use native Gmail X-GM-RAW search to find attachments by string on Google's own servers!
            let rawQuery = `filename:${filenameQuery}`;
            if (senderQuery) rawQuery += ` from:${senderQuery}`;
            searchObj.gmraw = rawQuery;
        } else {
            // Fallback for non-Gmail IMAP providers
            if (senderQuery) searchObj.from = senderQuery;
        }
        
        const seq = await client.search(searchObj);
        
        if (!seq || Array.isArray(seq) === false || (seq as number[]).length === 0) {
            return [];
        }

        const typedSeq = seq as number[];
        const limitedSeq = typedSeq.slice(-100);

        if (limitedSeq.length === 0) {
            return [];
        }

        const messages = client.fetch(limitedSeq, { source: true });

        for await (const message of messages) {
            if (!message.source) continue;
            
            const sourceBuffer = Buffer.isBuffer(message.source) ? message.source : Buffer.from(message.source as any);
            const parsed: any = await simpleParser(sourceBuffer);
            
            if (parsed.attachments && parsed.attachments.length > 0) {
                for (const att of parsed.attachments) {
                    if (att.filename && att.filename.toLowerCase().includes(filenameQuery.toLowerCase())) {
                        matchedAttachments.push({
                            messageSubject: parsed.subject || 'No Subject',
                            date: parsed.date,
                            sender: parsed.from?.text || 'Unknown',
                            filename: att.filename,
                            contentType: att.contentType,
                            size: att.size,
                            contentBase64: att.content.toString('base64'),
                        });
                    }
                }
            }
        }
    } finally {
        await client.logout();
    }

    return matchedAttachments;
}
