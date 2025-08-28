import { google } from 'googleapis';
import readline from 'readline';
import dotenv from 'dotenv';
dotenv.config();

// Cria cliente OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob' // redirect URI out-of-band
);

// Escopos que você precisa
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send'
];

// Gera link de autorização
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline', // essencial para gerar refresh token
  scope: SCOPES
});

console.log('Abra este link no navegador e autorize a conta:');
console.log(authUrl);

// Função para ler o código do terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Cole aqui o código de autorização: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n✅ Seu REFRESH TOKEN é:\n', tokens.refresh_token);
    rl.close();
  } catch (error) {
    console.error('❌ Erro ao gerar refresh token:', error);
    rl.close();
  }
});
