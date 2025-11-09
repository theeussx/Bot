import {
  botConfig,
  gerarPromptIA,
  addAppointment,
  cancelAppointment,
  finishAppointment,
  getAvailableSlots,
  activateHumanSupport,
  deactivateHumanSupport,
  isHumanSupportActive
} from "../config/settings.js";

import { callGroqAPI } from "../services/groqService.js";

// Armazena usuários que já receberam o menu inicial
const greetedUsers = new Set();
// Armazena quem está sendo processado pra evitar mensagens duplicadas
const processingUsers = new Set();

export async function handleMessage(sock, msg) {
  if (!msg || msg.key.fromMe || !msg.message) return;

  const from = msg.key.remoteJid;
  const messageContent =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    "";

  const text = messageContent.trim().toLowerCase();
  if (!text) return;

  if (processingUsers.has(from)) return;
  processingUsers.add(from);

  try {
    // === PRIMEIRO CONTATO: envia menu automaticamente ===
    if (!greetedUsers.has(from)) {
      greetedUsers.add(from);
      const welcomeMsg = botConfig.welcomeMessage.replace("{botName}", botConfig.botName);
      await sock.sendMessage(from, { text: welcomeMsg });
      return; // não processa mais nada nessa primeira mensagem
    }

    // === SUPORTE HUMANO ATIVO ===
    if (await isHumanSupportActive(from)) {
      if (text === "!voltar") {
        await deactivateHumanSupport(from);
        await sock.sendMessage(from, {
          text: "✅ Você saiu do modo atendimento humano. Voltando ao menu principal!"
        });

        // Avisar o dono que o usuário saiu
        const avisoSaida = `
📢 *Atendimento encerrado pelo usuário!*
👤 wa.me/${from.replace("@s.whatsapp.net", "")}
        `;
        await sock.sendMessage(botConfig.ownerJid, { text: avisoSaida });
      } else {
        await sock.sendMessage(from, {
          text: "👩‍💻 O atendimento humano está ativo. Use *!voltar* para retornar ao bot."
        });
      }
      return;
    }

    // === COMANDO DO DONO: ENCERRAR AGENDAMENTO ===
    if (text.startsWith("!encerrar")) {
      if (from !== botConfig.ownerJid) {
        await sock.sendMessage(from, { text: "⚠️ Apenas o dono pode encerrar agendamentos." });
        return;
      }

      const id = text.split(" ")[1];
      if (!id) {
        await sock.sendMessage(from, { text: "❌ Use o comando corretamente: *!encerrar <id>*" });
        return;
      }

      const resposta = await finishAppointment(id);
      await sock.sendMessage(from, { text: resposta });
      return;
    }

    // === AGENDAMENTO ===
    if (text === "5" || text.includes("agendar")) {
      const slots = await getAvailableSlots();
      let resposta = "📅 *Horários disponíveis:*\n\n";

      for (const [dia, horas] of Object.entries(slots)) {
        resposta += `*${dia}:*\n${horas.map(slot => slot.time).join(", ")}\n\n`;
      }

      resposta += "Digite o dia e o horário que deseja, por exemplo: _terça às 15:00_.";
      await sock.sendMessage(from, { text: resposta });
      return;
    }

    // === CANCELAR AGENDAMENTO ===
    if (text === "!cancelar") {
      const resposta = await cancelAppointment(from);
      await sock.sendMessage(from, { text: resposta });
      return;
    }

    // === FINALIZAR AGENDAMENTO ===
    if (text.startsWith("!finalizar")) {
      const id = text.split(" ")[1];
      const resposta = await finishAppointment(id);
      await sock.sendMessage(from, { text: resposta });
      return;
    }

    // === ATENDENTE HUMANO ===
    if (text === "3" || text.includes("atendente")) {
      await activateHumanSupport(from);
      await sock.sendMessage(from, { text: botConfig.forwardToHumanMessage });

      // Avisar o dono que alguém pediu atendimento humano
      const aviso = `
📢 *Novo atendimento humano solicitado!*
👤 Usuário: wa.me/${from.replace("@s.whatsapp.net", "")}
💬 Está aguardando o atendente entrar na conversa.
      `;
      await sock.sendMessage(botConfig.ownerJid, { text: aviso });
      return;
    }

    // === MENU ===
    if (text === "menu") {
      const msg = botConfig.welcomeMessage.replace("{botName}", botConfig.botName);
      await sock.sendMessage(from, { text: msg });
      return;
    }

    // === SOBRE NÓS ===
    if (text === "1") {
      await sock.sendMessage(from, { text: botConfig.aboutText });
      return;
    }

    // === SERVIÇOS ===
    if (text === "2") {
      await sock.sendMessage(from, { text: botConfig.servicesList });
      return;
    }

    // === PAGAMENTO ADIANTADO ===
    if (text === "4") {
      await sock.sendMessage(from, { text: botConfig.paymentText });
      return;
    }

    // === TENTAR AGENDAR AUTOMATICAMENTE ===
    const agendamentoMsg = await addAppointment(from, text);
    if (!agendamentoMsg.startsWith("⚠️")) {
      await sock.sendMessage(from, { text: agendamentoMsg });
      return;
    }

    // === RESPOSTA AUTOMÁTICA PELA IA ===
    const prompt = gerarPromptIA(messageContent);
    const iaResponse = await callGroqAPI(prompt);
    await sock.sendMessage(from, { text: iaResponse });

  } catch (error) {
    console.error("Erro ao processar mensagem:", error);
    await sock.sendMessage(from, {
      text: "⚠️ Ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes."
    });
  } finally {
    processingUsers.delete(from);
  }
}
