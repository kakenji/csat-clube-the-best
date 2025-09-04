import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, { tls: true });

let dbPromise;

async function connectDB() {
    if (!dbPromise) {
        dbPromise = client.connect().then(() => {
            console.log("✅ Conectado ao MongoDB!");
            return client.db("gmail_csat");
        });
    }
    return dbPromise;
}

// 👉 1. Salvar feedback final
export async function saveEmailToMongo(email) {
    const database = await connectDB();
    const collection = database.collection('csat'); 

    // Evita duplicação
    const exists = await collection.findOne({ uniqueId: email.uniqueId });
    if(exists) return;
    // const exists = await collection.findOne({ 
    //     sender: email.sender, 
    //     subject: email.subject, 
    //     nota: email.nota 
    // });
    // if (exists) return;

    await collection.insertOne(email);
    console.log('📩 Feedback salvo no MongoDB');
}

// 👉 2. Salvar token pendente
export async function saveTokenToMongo(tokenDoc) {
    const database = await connectDB();
    const collection = database.collection('tokens');
    await collection.insertOne(tokenDoc);
    console.log(`🔑 Token salvo: ${tokenDoc.token}`);
}

// 👉 3. Consumir token (marcar como usado)
export async function useToken(token) {
    const database = await connectDB();
    const collection = database.collection('tokens');

    // Busca token ainda não usado
    const doc = await collection.findOne({ token, usado: false });
    if (!doc) return null;

    // Marca como usado
    await collection.updateOne({ token }, { $set: { usado: true } });
    console.log(`✅ Token consumido: ${token}`);

    return doc;
}
