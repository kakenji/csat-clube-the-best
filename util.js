// utils.js
import dotenv from 'dotenv';
dotenv.config();

const SERVER_URL = process.env.SERVER_URL;

export function generateFeedbackLinks(sender, subject, body, uniqueId) {
    const labelsCSAT = ['Péssimo 😞','Ruim 😐','Ok 🙂','Bom 😃','Ótimo 😍'];

    const safeSubject = subject.replace(/\r?\n/g, ' ').replace(/&/g, 'and');
    const safeBody = body.replace(/\r?\n/g, ' ').replace(/&/g, 'and');

    return labelsCSAT.map((label, i) => {
        const url = `${SERVER_URL}/feedback?nota=${i + 1}&sender=${encodeURIComponent(sender)}&subject=${encodeURIComponent(safeSubject)}&body=${encodeURIComponent(safeBody)}&id=${uniqueId}`;
        return `<a href="${url}">${label}</a>`;
    });
}
