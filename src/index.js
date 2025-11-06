// src/index.js
import {
    connectToWhatsApp,
    sendText
} from './utils/baileys.js';
import {
    messageHandler
} from './handlers/messageHandler.js';
import {
    botConfig
} from './config/settings.js';

async function startBot() {
    console.log("Iniciando o Bot de WhatsApp com Groq AI...");

    // Conecta ao WhatsApp e passa o handler de mensagens
    const sock = await connectToWhatsApp(messageHandler);

    // Adiciona um listener para enviar a mensagem de boas-vindas quando o usuário iniciar a conversa
    // Isso é tratado no messageHandler, mas podemos adicionar um listener para 'new_user' se necessário.
    // Por enquanto, o messageHandler é suficiente para responder à primeira mensagem.
}

startBot().catch(err => console.error("Erro fatal ao iniciar o bot:", err));
