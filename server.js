// server.js
import express from 'express';
import { saveEmailToMongo } from './mongodb.js';
import { sendCSATEmails } from './csatSender.js';
import { useToken } from './mongodb.js';

const PORT = process.env.PORT || 3333;

const app = express();

app.get('/', (req, res) => {
    res.send('Hello World');
})

app.get("/feedback", (req, res) => {
  const { nota, sender, subject, body, uniqueId } = req.query;

  // Apenas mostra página de confirmação
  res.send(`
    <h1>Obrigado por avaliar!</h1>
    <p>Você selecionou a nota: <strong>${nota}</strong></p>
    <form method="POST" action="/feedback">
      <input type="hidden" name="nota" value="${nota}">
      <input type="hidden" name="sender" value="${sender}">
      <input type="hidden" name="subject" value="${subject}">
      <input type="hidden" name="body" value="${body}">
      <input type="hidden" name="uniqueId" value="${uniqueId}">
      <button type="submit">Confirmar avaliação</button>
    </form>
  `);
});

app.post("/feedback", express.urlencoded({ extended: true }), async (req, res) => {
  const { nota, sender, subject, body, uniqueId } = req.body;

  await saveEmailToMongo({ nota, sender, subject, body, uniqueId });

  res.send("<h1>✅ Avaliação registrada com sucesso! Obrigado pelo feedback!</h1>");
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

