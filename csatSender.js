import { google } from 'googleapis';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
// import { buildCSATLinks } from './utils.js';
import crypto from "crypto";
import { saveTokenToMongo } from "./mongodb.js"; // você cria essa função

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

function findLastCustomerMessage(messages, myEmail) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const headers = messages[i].payload.headers;
    const from = headers.find(h => h.name === "From")?.value || "";
    if (!from.includes(myEmail)) {
      return messages[i]; // última mensagem do cliente
    }
  }
  return null;
}

async function buildCSATLinks(sender, safeSubject, safeBody, uniqueId) {
  const labelsCSAT = ['Péssimo 😞','Ruim 😐','Ok 🙂','Bom 😃','Ótimo 😍'];

  // Gera um token por link
  const links = await Promise.all(labelsCSAT.map(async (label, i) => {
    const token = generateToken();

    // salva o token como "pendente"
    await saveTokenToMongo({ token, usado: false, nota: i + 1, sender, subject: safeSubject, body: safeBody, uniqueId });

    const url = `${SERVER_URL}/feedback?token=${token}`;
    return `<a href="${url}">${label}</a>`;
  }));

  return links;
}

const uniqueId = uuidv4();

dotenv.config();

const SERVER_URL = process.env.SERVER_URL;

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly', // apenas ler e-mails
    'https://www.googleapis.com/auth/gmail.send',     // enviar e-mails
    'https://www.googleapis.com/auth/gmail.modify'    // modificar e-mails
];

// Cria cliente OAuth2
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
);

// Seta o refresh token direto do .env
oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

// Cria instância do Gmail API
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Opcional: logs de tokenssa
oauth2Client.on('tokens', (tokens) => {
    if(tokens.refresh_token){
        console.log('Refresh token novo gerado (não usado no Render):', tokens.refresh_token);
    }
    console.log('Access token:', tokens.access_token);
});

// --- Seu código de envio de e-mails CSAT continua aqui ---



// Função para codificar o e-mail em base64 para enviar pelo Gmail API
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
    ].join('\n');

    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}


// Função principal
export async function sendCSATEmails(labelName = 'csat') {
    try {
        // 1️⃣ Buscar todas as labels
        const resLabels = await gmail.users.labels.list({ userId: 'me' });
        const labels = resLabels.data.labels || [];
        const label = labels.find(l => l.name.toLowerCase() === labelName.toLowerCase());
        if (!label) return console.log(`Label "${labelName}" não encontrada.`);

        
        const finalizadoLabel = labels.find(l => l.name.toLowerCase() === 'finalizado');
        if (!finalizadoLabel) {
            console.log('⚠️ Label "Finalizado" não encontrada. Crie ela manualmente no Gmail.');
            return;
        }


        // 2️⃣ Listar threads com essa label
        const resThreads = await gmail.users.threads.list({
            userId: 'me',
            labelIds: [label.id],
            maxResults: 50
        });

        const threads = resThreads.data.threads || [];
        if (threads.length === 0) return console.log(`Nenhum e-mail encontrado com a label "${labelName}".`);

        // 3️⃣ Para cada thread, pegar a última mensagem
        for (const thread of threads) {
            const resThread = await gmail.users.threads.get({
                userId: 'me',
                id: thread.id, // agora thread.id existe
                format: 'full'
            });
            
            const messages = resThread.data.messages || [];
            
            if(messages.length === 0){ 
                console.log('Thread sem mensagens, ignorando...');
                continue;
            }

            const myEmail = 'suporte@thebestacai.com.br';
            const customerMessage = findLastCustomerMessage(messages, myEmail);

            if(!customerMessage){
                console.log('Nenhuma mensagem do cliente encontrada!');
                continue;
            }

            // const lastMessage = messages[messages.length - 1];
            // const headers = lastMessage.payload.headers;
        
            const headers = customerMessage.payload.headers;
            const sender = headers.find(h => h.name === 'From')?.value || 'Desconhecido';
            const subject = headers.find(h => h.name === 'Subject')?.value || '(Sem assunto)';
            const messageIdOriginal = customerMessage.id; // para reply e label
            const threadId = customerMessage.threadId;

            // Extrair body
            let body = '';
            const parts = customerMessage.payload.parts;
            if (parts && parts.length > 0) {
                const part = parts.find(p => p.mimeType === 'text/plain');
                if (part?.body?.data) body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            } else if (customerMessage.payload.body?.data) {
                body = Buffer.from(customerMessage.payload.body.data, 'base64').toString('utf-8');
            }

            // 4️⃣ Gerar links de feedback (sanitize para evitar múltiplos)
            const safeSubject = subject.replace(/\r?\n/g, ' ').replace(/&/g, 'and');
            const safeBody = body.replace(/\r?\n/g, ' ').replace(/&/g, 'and');

            const labelsCSAT = ['Péssimo 😞','Ruim 😐','Ok 🙂','Bom 😃','Ótimo 😍'];

            // Cada link aponta para GET /feedback com a nota
            const links = labelsCSAT.map((label, i) => {
            return `<a href="${SERVER_URL}/feedback?nota=${i+1}&sender=${encodeURIComponent(sender)}&subject=${encodeURIComponent(safeSubject)}&body=${encodeURIComponent(safeBody)}&uniqueId=${uniqueId}">${label}</a>`;
            });
            // const links = await buildCSATLinks(sender, safeSubject, safeBody, uniqueId);

            // const links = [];
            // const labelsCSAT = ['Péssimo 😞','Ruim 😐','Ok 🙂','Bom 😃','Ótimo 😍'];
            // for (let i = 1; i <= 5; i++) {
            //     const url = `${SERVER_URL}/feedback?nota=${i}&sender=${encodeURIComponent(sender)}&subject=${encodeURIComponent(safeSubject)}&body=${encodeURIComponent(safeBody)}$id${uniqueId}`;
            //     links.push(`<a href="${url}">${labelsCSAT[i-1]}</a>`);
            // }

            // 5️⃣ Montar mensagem HTML
            const messageHTML = `
                Olá! 😊<br><br>
                Queremos saber como foi sua experiência com nosso atendimento.<br>
                ✨ Observação: sua avaliação é voltada exclusivamente ao atendimento, independente das funcionalidades do serviço.
                <br><br>
                Como você avalia nosso atendimento?<br>
                ${links.join(' | ')}<br><br>
                Obrigado por nos ajudar a melhorar! 💛
            `;

            // 6️⃣ Enviar resposta na mesma thread
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

            // 7️⃣ Mover a última mensagem da thread para "Finalizado"
            
            await gmail.users.threads.modify({
                userId: 'me',
                id: threadId,
                requestBody: { 
                    addLabelIds: [finalizadoLabel.id],
                    removeLabelIds: [label.id] 
                }
            });
            console.log(`📌 E-mail original movido para "Finalizado" (${messageIdOriginal})`);

            console.log(`🔍 Total de threads encontradas: ${threads.length}`);

        }

    } catch (err) {
        console.error('Erro ao enviar e-mails CSAT:', err);
    }
}

// Executa
// sendCSATEmails('csat');
