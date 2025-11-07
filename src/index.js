// src/index.js
import 'dotenv/config';
import { connectToWhatsApp } from './utils/baileys.js';
import { messageHandler } from './handlers/messageHandler.js';
import { startInactivityScheduler } from './scheduler/inactivityScheduler.js';

async function startBot() {
  console.log("Iniciando o Bot de WhatsApp com Groq AI...");

  // Conecta e recebe o sock
  const sock = await connectToWhatsApp(messageHandler);

  // Inicia o scheduler de inatividade
  startInactivityScheduler(sock);

  console.log('Bot inicializado e ready.');
}

startBot().catch(err => console.error("Erro fatal ao iniciar o bot:", err));
