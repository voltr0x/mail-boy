import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export async function searchEmailsMeta(params: any): Promise<any[]> {
    const { subjectQuery, contextQuery, senderQuery, host, port, user, password } = params;

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
    
    const matchedEmails: any[] = [];

    try {
        await client.mailboxOpen('INBOX');

        let searchObj: any = {};
        
        if (host.includes('gmail.com')) {
            let rawQuery = '';
            if (subjectQuery) rawQuery += `subject:${subjectQuery} `;
            if (contextQuery) rawQuery += `${contextQuery} `;
            if (senderQuery) rawQuery += `from:${senderQuery} `;
            searchObj.gmraw = rawQuery.trim();
        } else {
            if (subjectQuery) searchObj.subject = subjectQuery;
            if (contextQuery) searchObj.body = contextQuery;
            if (senderQuery) searchObj.from = senderQuery;
        }
        
        const seq = await client.search(searchObj);
        
        if (!seq || Array.isArray(seq) === false || (seq as number[]).length === 0) {
            return [];
        }

        const typedSeq = seq as number[];
        // take only recent 20 emails
        const limitedSeq = typedSeq.slice(-20);

        if (limitedSeq.length === 0) {
            return [];
        }

        // We fetch by sequence, but request uid
        const messages = client.fetch(limitedSeq, { source: true, uid: true });

        for await (const message of messages) {
            if (!message.source) continue;
            
            const sourceBuffer = Buffer.isBuffer(message.source) ? message.source : Buffer.from(message.source as any);
            const parsed: any = await simpleParser(sourceBuffer);
            
            if (parsed.attachments && parsed.attachments.length > 0) {
                matchedEmails.push({
                    uid: message.uid, // Required for downloading later
                    messageSubject: parsed.subject || 'No Subject',
                    date: parsed.date,
                    sender: parsed.from?.text || 'Unknown',
                    attachments: parsed.attachments.map((att: any) => ({
                        filename: att.filename,
                        contentType: att.contentType,
                        size: att.size
                    }))
                });
            }
        }
    } finally {
        await client.logout();
    }

    return matchedEmails;
}

export async function downloadEmailAttachment(params: any): Promise<any[]> {
    const { uid, filename, host, port, user, password } = params;

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

        // Fetch exactly by UID
        const messages = client.fetch([uid], { source: true }, { uid: true });

        for await (const message of messages) {
            if (!message.source) continue;
            
            const sourceBuffer = Buffer.isBuffer(message.source) ? message.source : Buffer.from(message.source as any);
            const parsed: any = await simpleParser(sourceBuffer);
            
            if (parsed.attachments && parsed.attachments.length > 0) {
                for (const att of parsed.attachments) {
                    // Match the filename requested
                    if (att.filename && att.filename === filename) {
                        matchedAttachments.push({
                            messageSubject: parsed.subject || 'No Subject',
                            date: parsed.date,
                            sender: parsed.from?.text || 'Unknown',
                            filename: att.filename,
                            contentType: att.contentType,
                            size: att.size,
                            contentBase64: att.content.toString('base64'),
                        });
                        break;
                    }
                }
            }
        }
    } finally {
        await client.logout();
    }

    return matchedAttachments;
}
