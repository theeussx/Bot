import { sendText } from '../utils/baileys.js';
import {
  botConfig,
} from '../config/settings.js';
import {
  getAvailableSlots,
  addAppointment,
  activateHumanSupport,
  deactivateHumanSupport,
  isHumanSupportActive
} from '../db/jsonDB.js';
import Groq from 'groq-sdk';
import fs from 'fs/promises';

const groq = new Groq({ apiKey: botConfig.groqApiKey });

// =======================================
// === Função principal de mensagens ===
// =======================================
export async function messageHandler(sock, jid, text, msg) {
  text = text.trim().toLowerCase();

  // === Encerrar suporte humano manualmente ===
  if (text === '!encerrar') {
    const isHuman = await isHumanSupportActive(jid);
    if (isHuman) {
      await deactivateHumanSupport(jid);
      await sendText(sock, jid, "✅ O suporte humano foi encerrado. Agora você pode voltar a falar com o bot normalmente! 🤖");
    } else {
      await sendText(sock, jid, "⚠️ Você não está em atendimento humano no momento.");
    }
    return;
  }

  // === Verifica se o suporte humano está ativo ===
  if (await isHumanSupportActive(jid)) return; // ignora mensagens enquanto suporte humano está ativo

  // === Comandos principais ===
  if (['oi', 'olá', 'ola', 'menu', 'início', 'inicio'].includes(text)) {
    const menu = botConfig.welcomeMessage.replace('{botName}', botConfig.botName);
    await sendText(sock, jid, menu);
    return;
  }

  // === Opção 1: Sobre nós ===
  if (text === '1') {
    await sendText(sock, jid, botConfig.aboutText || "Somos um salão especializado em beleza e cuidados femininos. 💅✨");
    return;
  }

  // === Opção 2: Nossos serviços ===
  if (text === '2') {
    await sendText(sock, jid,
      "💇‍♀️ *Serviços da Ana Clara:*\n- Escova\n- Hidratação\n- Progressiva\n- Corte feminino\n\nDigite *5* para agendar um horário presencial."
    );
    return;
  }

  // === Opção 3: Falar com um atendente ===
  if (text === '3' || text.includes('suporte')) {
    await activateHumanSupport(jid);
    await sendText(sock, jid, botConfig.forwardToHumanMessage);
    await sendText(sock, botConfig.ownerJid, `👩‍💻 Novo atendimento humano iniciado com o número: ${jid}`);
    return;
  }

  // === Opção 4: Pagamento adiantado ===
  if (text === '4') {
    await sendText(sock, jid, botConfig.paymentText);
    return;
  }

  // === Opção 5: Agendamento ===
  if (text === '5' || text.includes('agendar')) {
    const available = await getAvailableSlots();

    // Verifica se há horários disponíveis
    const diasComHorarios = Object.entries(available)
      .filter(([_, horarios]) => horarios.length > 0);

    if (diasComHorarios.length === 0) {
      await sendText(sock, jid, "😕 Nenhum horário disponível no momento. Digite *3* para falar com o suporte humano.");
      return;
    }

    // Monta tabela bonita
    let tabela = "📅 *Horários disponíveis:*\n\n";
    for (const [dia, horarios] of diasComHorarios) {
      tabela += `*${dia}:* ${horarios.join(', ')}\n`;
    }

    await sendText(sock, jid, tabela);
    await sendText(sock, jid, "Escolha o horário enviando algo como: *Terça 10:30*");
    return;
  }

  // === Tenta registrar agendamento se detectar hora ===
  if (/(\d{1,2}:\d{2})/.test(text)) {
    const resposta = await addAppointment(jid, text);

    // Se confirmar agendamento
    if (resposta.startsWith('✅')) {
      await sendText(sock, jid, resposta);
      await sendText(sock, botConfig.ownerJid, `📢 Novo agendamento confirmado:\n👤 Cliente: ${jid}\n${resposta}`);
      return;
    }

    // Caso contrário, só envia resposta normal
    await sendText(sock, jid, resposta);
    return;
  }

  // === Resposta IA (fallback) ===
  try {
    const completion = await groq.chat.completions.create({
      model: botConfig.groqModel,
      messages: [
        {
          role: "system",
          content: `Você é ${botConfig.botName}, um assistente simpático e prestativo de um salão de beleza.`,
        },
        { role: "user", content: text },
      ],
    });

    const respostaIA = completion.choices[0]?.message?.content || "Desculpe, não entendi 😅. Digite *menu* para ver as opções novamente.";
    await sendText(sock, jid, respostaIA);
  } catch (err) {
    console.error("Erro IA:", err);
    await sendText(sock, jid, "⚠️ Ocorreu um erro com a IA, mas você pode digitar *menu* para continuar.");
  }
}