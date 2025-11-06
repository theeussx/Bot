// src/handlers/messageHandler.js
import {
    sendText,
    sendImage
} from '../utils/baileys.js';
import {
    getGroqChatCompletion
} from '../utils/groq.js';
import {
    botConfig
} from '../config/settings.js';
import {
    isHumanSupportActive,
    activateHumanSupport,
    deactivateHumanSupport,
    getAllActiveSupportUsers
} from '../db/jsonDB.js';

/**
 * Verifica e encerra atendimentos por inatividade.
 * @param {object} sock - Objeto do socket do Baileys.
 */
async function checkInactivity(sock) {
    const activeUsers = await getAllActiveSupportUsers();
    const now = Date.now();
    const timeout = botConfig.inactivityTimeout;

    for (const jid in activeUsers) {
        const lastInteraction = activeUsers[jid].timestamp;
        if (now - lastInteraction > timeout) {
            await deactivateHumanSupport(jid);
            await sendText(sock, jid, botConfig.inactivityEndMessage);
            console.log(`Atendimento de ${jid} encerrado por inatividade.`);
        }
    }
}

/**
 * Lida com as mensagens recebidas.
 * @param {object} sock - Objeto do socket do Baileys.
 * @param {string} jid - JID do remetente.
 * @param {string} text - Conteúdo da mensagem.
 * @param {object} msg - Objeto da mensagem completa.
 */
export async function messageHandler(sock, jid, text, msg) {
    console.log(`Mensagem recebida de ${jid}: ${text}`);

    // Comando de encerramento para o dono do bot
    if (jid === botConfig.ownerJid && text.trim().toLowerCase().startsWith('!encerrar')) {
        const parts = text.trim().split(/\s+/);
        const targetJid = parts[1]; // Espera-se o JID do cliente após o comando

        if (targetJid) {
            await deactivateHumanSupport(targetJid);
            await sendText(sock, jid, `Atendimento do cliente ${targetJid} encerrado com sucesso.`);
            await sendText(sock, targetJid, `Seu atendimento humano foi encerrado pelo suporte. O bot voltará a interagir com você na próxima mensagem. Digite 'menu' para ver as opções novamente.`);
            return;
        } else {
            await sendText(sock, jid, `Comando inválido. Use: !encerrar JID_DO_CLIENTE`);
            return;
        }
    }

    // 1. Verificar e encerrar atendimentos inativos
    await checkInactivity(sock);

    // 2. Verificar se o usuário está no modo de suporte humano
    if (await isHumanSupportActive(jid)) {
        // Se estiver, o bot não responde. Apenas loga ou encaminha para o suporte humano (fora do escopo do bot)
        console.log(`Usuário ${jid} está no modo de suporte humano. Ignorando mensagem.`);
        return;
    }

    // 3. Lidar com o menu de opções
    const normalizedText = text.trim().toLowerCase();

    switch (normalizedText) {
        case '1':
        case 'sobre':
            await sendText(sock, jid, `*1. Sobre a Empresa*\n\n${botConfig.aboutText}\n\nDigite *menu* para voltar ao menu principal.`);
            break;

        case '2':
        case 'servicos':
        case 'serviços':
            await sendImage(sock, jid, botConfig.servicesImage, `*2. Nossos Serviços*\n\nConfira abaixo alguns dos nossos principais serviços!\n\nDigite *menu* para voltar ao menu principal.`);
            break;

        case '3':
        case 'suporte':
        case 'falar com suporte humano':
            await sendText(sock, jid, botConfig.forwardToHumanMessage);
            await activateHumanSupport(jid);
            // Lógica para notificar o suporte humano (opcional, mas recomendado)
            // Ex: sock.sendMessage(`${botConfig.humanSupportNumber}@s.whatsapp.net`, { text: `Novo cliente solicitando suporte: ${jid}` });
            break;

        case '4':
        case 'pagamento':
        case 'pagamento adiantado':
            await sendText(sock, jid, `*4. Pagamento Adiantado*\n\n${botConfig.paymentText}\n\nDigite *menu* para voltar ao menu principal.`);
            break;
        
        case 'menu':
        case 'voltar':
            await sendText(sock, jid, botConfig.welcomeMessage.replace('{botName}', botConfig.botName));
            break;

        default:
            // 4. Conversar com a IA da Groq
            const aiResponse = await getGroqChatCompletion(text);
            await sendText(sock, jid, aiResponse);
            break;
    }
}
