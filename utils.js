// utils.js
import dotenv from 'dotenv';
dotenv.config();

const SERVER_URL = process.env.SERVER_URL;

export function buildCSATLinks(sender, safeSubject, safeBody, uniqueId) {
  const labelsCSAT = ['Péssimo 😞','Ruim 😐','Ok 🙂','Bom 😃','Ótimo 😍'];

  return labelsCSAT.map((label, i) => {
    const url = `${SERVER_URL}/feedback?nota=${i + 1}&sender=${encodeURIComponent(sender)}&subject=${encodeURIComponent(safeSubject)}&body=${encodeURIComponent(safeBody)}&id=${uniqueId}`;
    return `<a href="${url}">${label}</a>`;
  });
}

