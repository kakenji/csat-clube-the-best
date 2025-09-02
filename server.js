// server.js
import express from 'express';
import { saveEmailToMongo } from './mongodb.js';
import { sendCSATEmails } from './csatSender.js';

const PORT = process.env.PORT || 3333;

const app = express();

app.get('/', (req, res) => {
    res.send('Hello World');
})

app.get('/feedback', async (req, res) => {
    try {
        const { nota, sender, subject, body, threadId } = req.query;
        if (!nota || !sender) return res.status(400).send('Parâmetros inválidos');

        const subjectSafe = subject || "Sem assunto";
        const bodySafe = body || "Sem conteúdo";

        // ✅ Verifica se já existe feedback para esse atendimento
        const existing = await saveEmailToMongo.findOne({
            threadId,
            sender,
            subject: subjectSafe,
            body: bodySafe
        });

        if (existing) {
            console.log('⚠️ Feedback já registrado para este atendimento.');
            return res.status(200).send(`
                <h2>Feedback já registrado 💡</h2>
                <p>Você já avaliou esse atendimento. Obrigado!</p>
            `);
        }

        // ✅ Salva no banco se ainda não existe
        await saveEmailToMongo({
            sender,
            subject: subjectSafe,
            body: bodySafe,
            date: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false }),
            threadId,
            nota: Number(nota)
        });

        console.log('✅ Feedback salvo para:', sender, subjectSafe);

        res.send(`
            <h2>Obrigado pelo seu feedback! 💛</h2>
            <p>Sua avaliação foi registrada com sucesso.</p>
        `);
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao processar o feedback');
    }
});

app.post('/send-csat', async (req, res) => {
    try {
        await sendCSATEmails('csat');
        res.send('CSAT emails enviados!');
    } catch (err) {
        res.status(500).send('Erro ao enviar CSAT emails');
    }
});

app.listen(PORT, () => console.log('Servidor rodando na porta 3333'));

