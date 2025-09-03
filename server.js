// server.js
import express from 'express';
import { saveEmailToMongo } from './mongodb.js';
import { sendCSATEmails } from './csatSender.js';

const PORT = process.env.PORT || 3333;

const app = express();

app.get('/', (req, res) => {
    res.send('Hello World');
})

app.get("/feedback", async (req, res) => {
  const { token } = req.query;

  const doc = await useToken(token);
  if (!doc) {
    return res.status(400).send("⚠️ Link inválido ou já utilizado.");
  }

  // aqui é o clique real → salva feedback no banco
  await saveEmailToMongo({
    nota: doc.nota,
    sender: doc.sender,
    subject: doc.subject,
    body: doc.body,
    uniqueId: doc.uniqueId,
    token: doc.token
  });

  res.send("✅ Avaliação registrada com sucesso! Obrigado pelo seu feedback!");
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

