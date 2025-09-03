
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { generateFeedbackLinks } from './utils.js';

dotenv.config();

const uniqueId = uuidv4();
const SERVER_URL = process.env.SERVER_URL;

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify'
];

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

oauth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
        console.log('Refresh token novo gerado (não usado no Render):', tokens.refresh_token);
    }
    console.log('Access token:', tokens.access_token);
});

function makeBody(to, subject, message, headers = {}) {
    const str = [
        `To: ${to}`,
        'Content-Type: text/html; charset=UTF-8',
        'MIME-Version: 1.0',
        `Subject: ${subject}`,
        headers['In-Reply-To'] ? `In-Reply-To: ${headers['In-Reply-To']}` : '',
        headers['References'] ? `References: ${headers['References']}` : '',
        '',
        message
    ].join('');

    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export async function sendCSATEmails(labelName = 'csat') {
    try {
        const resLabels = await gmail.users.labels.list({ userId: 'me' });
        const labels = resLabels.data.labels || [];
        const label = labels.find(l => l.name.toLowerCase() === labelName.toLowerCase());
        if (!label) return console.log(`Label "${labelName}" não encontrada.`);

        const finalizadoLabel = labels.find(l => l.name.toLowerCase() === 'finalizado');
        if (!finalizadoLabel) {
            console.log('⚠️ Label "Finalizado" não encontrada. Crie ela manualmente no Gmail.');
            return;
        }

        const resThreads = await gmail.users.threads.list({
            userId: 'me',
            labelIds: [label.id],
            maxResults: 50
        });

        const threads = resThreads.data.threads || [];
        if (threads.length === 0) return console.log(`Nenhum e-mail encontrado com a label "${labelName}".`);

        for (const thread of threads) {
            const resThread = await gmail.users.threads.get({
                userId: 'me',
                id: thread.id,
                format: 'full'
            });

            const messages = resThread.data.messages || [];
            if (messages.length === 0) {
                console.log('Thread sem mensagens, ignorando...');
                continue;
            }

            const lastMessage = messages[messages.length - 1];
            const headers = lastMessage.payload.headers;

            const sender = headers.find(h => h.name === 'From')?.value || 'Desconhecido';
            const subject = headers.find(h => h.name === 'Subject')?.value || '(Sem assunto)';
            const messageIdOriginal = lastMessage.id;
            const threadId = lastMessage.threadId;

            let body = '';
            const parts = lastMessage.payload.parts;
            if (parts && parts.length > 0) {
                const part = parts.find(p => p.mimeType === 'text/plain');
                if (part?.body?.data) body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            } else if (lastMessage.payload.body?.data) {
                body = Buffer.from(lastMessage.payload.body.data, 'base64').toString('utf-8');
            }

            const links = generateFeedbackLinks(sender, subject, body, uniqueId);

            const messageHTML = `
                Olá! 😊<br><br>
                Queremos saber como foi sua experiência com nosso atendimento.<br><br>
                Como você avalia nosso atendimento?<br>
                ${links.join(' | ')}<br><br>
                Obrigado por nos ajudar a melhorar! 💛
            `;

            const raw = makeBody(sender, `Re: ${subject}`, messageHTML, {
                'In-Reply-To': headers.find(h => h.name === 'Message-ID')?.value,
                'References': headers.find(h => h.name === 'Message-ID')?.value
            });

            await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw,
                    threadId
                }
            });

            console.log(`✅ Resposta enviada para ${sender} na thread ${threadId}`);

            await gmail.users.messages.modify({
                userId: 'me',
                id: messageIdOriginal,
                requestBody: {
                    addLabelIds: [finalizadoLabel.id],
                    removeLabelIds: [label.id]
                }
            });
            console.log(`📌 E-mail original movido para "Finalizado" (${messageIdOriginal})`);
        }

    } catch (err) {
        console.error('Erro ao enviar e-mails CSAT:', err);
    }
}
