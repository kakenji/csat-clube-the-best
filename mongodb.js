import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  tls: true,
  tlsAllowInvalidCertificates: true
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
    const collection = database.collection('csat'); // sua "tabela"
    await collection.insertOne(email);
}
