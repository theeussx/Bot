import { sendText } from '../utils/baileys.js';
import { botConfig } from '../config/settings.js';
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

  // === ENCERRAR SUPORTE HUMANO MANUALMENTE ===
  if (text === '!encerrar') {
    const isHuman = await isHumanSupportActive(jid);
    if (isHuman) {
      await deactivateHumanSupport(jid); // Remove do banco
      await sendText(sock, jid, "✅ O suporte humano foi encerrado. Agora o bot está ativo novamente! 🤖");
    } else {
      await sendText(sock, jid, "⚠️ Você não está em atendimento humano no momento.");
    }
    return;
  }

  // === SE O SUPORTE HUMANO ESTIVER ATIVO, BOT NÃO RESPONDE ===
  if (await isHumanSupportActive(jid)) return;

  // === INÍCIO / MENU ===
  if (['oi', 'olá', 'ola', 'menu', 'início', 'inicio'].includes(text)) {
    const menu = botConfig.welcomeMessage.replace('{botName}', botConfig.botName);
    await sendText(sock, jid, menu);
    return;
  }

  // === OPÇÃO 1: SOBRE NÓS ===
  if (text === '1') {
    await sendText(sock, jid, botConfig.aboutText || "Somos um salão especializado em beleza e cuidados femininos. 💅✨");
    return;
  }

  // === OPÇÃO 2: NOSSOS SERVIÇOS ===
  if (text === '2') {
    await sendText(sock, jid,
      "💇‍♀️ *Serviços da Ana Clara:*\n- Escova\n- Hidratação\n- Progressiva\n- Corte feminino\n\nDigite *5* para agendar um horário presencial."
    );
    return;
  }

  // === OPÇÃO 3: SUPORTE HUMANO ===
  if (text === '3' || text.includes('suporte')) {
    await activateHumanSupport(jid);
    await sendText(sock, jid, botConfig.forwardToHumanMessage);

    // Gera link clicável do WhatsApp pra você entrar direto na conversa
    const link = `https://wa.me/${jid.replace('@s.whatsapp.net', '')}`;
    await sendText(sock, botConfig.ownerJid, 
      `👩‍💻 *Novo atendimento humano iniciado!*\n\n📱 Cliente: ${jid}\n🔗 Converse diretamente: ${link}`
    );
    return;
  }

  // === OPÇÃO 4: PAGAMENTO ===
  if (text === '4') {
    await sendText(sock, jid, botConfig.paymentText);
    return;
  }

  // === OPÇÃO 5: AGENDAMENTO ===
  if (text === '5' || text.includes('agendar')) {
    const available = await getAvailableSlots();
    const diasComHorarios = Object.entries(available).filter(([_, h]) => h.length > 0);

    if (diasComHorarios.length === 0) {
      await sendText(sock, jid, "😕 Nenhum horário disponível no momento. Digite *3* para falar com o suporte humano.");
      return;
    }

    let tabela = "📅 *Horários disponíveis:*\n\n";
    for (const [dia, horarios] of diasComHorarios) {
      tabela += `*${dia}:* ${horarios.join(', ')}\n`;
    }

    await sendText(sock, jid, tabela);
    await sendText(sock, jid, "Escolha o horário enviando algo como: *Terça 10:30*");
    return;
  }

  // === REGISTRAR AGENDAMENTO ===
  if (/(\d{1,2}:\d{2})/.test(text)) {
    const resposta = await addAppointment(jid, text);

    if (resposta.startsWith('✅')) {
      await sendText(sock, jid, resposta);

      // Mensagem pra você (dono)
      const link = `https://wa.me/${jid.replace('@s.whatsapp.net', '')}`;
      await sendText(sock, botConfig.ownerJid, 
        `📢 *Novo agendamento confirmado!*\n\n👤 Cliente: ${jid}\n🔗 Acesse: ${link}\n\n${resposta}`
      );
      return;
    }

    await sendText(sock, jid, resposta);
    return;
  }

  // === RESPOSTA IA (fallback) ===
  try {
    const completion = await groq.chat.completions.create({
      model: botConfig.groqModel,
      messages: [
        {
          role: "system",
          content: `Você é ${botConfig.botName}, um atendente simpático e prestativo de um salão de beleza.`,
        },
        { role: "user", content: text },
      ],
    });

    const respostaIA = completion.choices[0]?.message?.content || "Desculpe, não entendi 😅. Digite *menu* para ver as opções novamente.";
    await sendText(sock, jid, respostaIA);
  } catch (err) {
    console.error("Erro IA:", err);
    await sendText(sock, jid, "⚠️ Ocorreu um erro com a IA. Digite *menu* para continuar.");
  }
}