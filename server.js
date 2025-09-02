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
        const { nota, sender, subject, body } = req.query;
        if (!nota || !sender) return res.status(400).send('Parâmetros inválidos');

        const subjectSafe = subject || "Sem assunto";
        const bodySafe = body || "Sem conteúdo";

        await saveEmailToMongo({
            sender,
            subject: subjectSafe,
            body: bodySafe,
            nota: Number(nota),
            date: new Date().toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                hour12: false
            })
        });

        res.send(`
            <h2>Obrigado pelo seu feedback! 💛</h2>
            <p>Sua avaliação foi registrada com sucesso.</p>
        `);
    } catch (err) {
        console.error('Erro ao salvar feedback:', err);
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

