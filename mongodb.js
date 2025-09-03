import { MongoClient, ServerApiVersion } from 'mongodb';
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


// export async function saveEmailToMongo(email) {
//     const database = await connectDB();
//     const exists = await collection.findOne({ sender, subject, nota });
//     if (exists) return;
//     const collection = database.collection('csat'); // sua "tabela"
//     await collection.insertOne(email);
// }