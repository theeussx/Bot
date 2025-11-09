// src/index.js
import 'dotenv/config';
import { connectToWhatsApp } from './utils/baileys.js';
import { handleMessage } from './handlers/messageHandler.js';
import { startInactivityScheduler } from './scheduler/inactivityScheduler.js';

async function startBot() {
  console.log("Iniciando bot whatsapp...");

  // Conecta e recebe o sock
  const sock = await connectToWhatsApp(handleMessage);

  // Inicia o scheduler de inatividade
  startInactivityScheduler(sock);

  console.log('Bot iniciado');
}

startBot().catch(err => console.error("Erro fatal ao iniciar o bot:", err));