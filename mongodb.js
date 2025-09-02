import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  tls: true
});

let db;

async function connectDB() {
    if (!db) {
        await client.connect();
        db = client.db("gmail_csat"); // seu banco
        console.log("✅ Conectado ao MongoDB!");
    }
    return db;
}

export async function saveEmailToMongo(email) {
    const database = await connectDB();
    const collection = database.collection('csat'); // define antes de usar

    const exists = await collection.findOne({
        sender: email.sender,
        subject: email.subject,
        nota: email.nota
    });

    if (exists) {
        console.log('⚠️ Feedback duplicado detectado, ignorando...');
        return;
    }

    await collection.insertOne(email);
    console.log('✅ Feedback salvo no MongoDB');
}




// export async function checkIfFeedbackExists(threadId) {
//     const database = await connectDB();
//     const collection = database.collection('csat');
//     return await collection.findOne({ threadId });
// }
