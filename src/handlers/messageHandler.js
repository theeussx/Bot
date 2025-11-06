// src/handlers/messageHandler.js
import { sendText, sendImage } from '../utils/baileys.js';
import { getGroqChatCompletion } from '../utils/groq.js';
import { botConfig } from '../config/settings.js';
import {
  isHumanSupportActive,
  activateHumanSupport,
  deactivateHumanSupport,
  getAllActiveSupportUsers,
  updateUserTimestamp,
  listTakenTimes,
  addAppointment
} from '../db/jsonDB.js';
import { generateDailySlots, generateAvailableDates, formatDateDisplay } from '../utils/slots.js';

/**
 * Verifica e encerra atendimentos por inatividade.
 */
export async function checkInactivity(sock) {
  const activeUsers = await getAllActiveSupportUsers();
  const now = Date.now();
  const timeout = botConfig.inactivityTimeout;

  for (const jid in activeUsers) {
    const last = activeUsers[jid].timestamp;
    if (now - last > timeout) {
      await deactivateHumanSupport(jid);
      await sendText(sock, jid, botConfig.inactivityEndMessage);
      console.log(`🕓 Atendimento de ${jid} encerrado por inatividade.`);
    }
  }
}

// Comandos
const commandHandlers = {
  '1': handleAbout,
  'sobre': handleAbout,
  '2': handleServices,
  'servicos': handleServices,
  'serviços': handleServices,
  '3': handleHumanSupport,
  'suporte': handleHumanSupport,
  'falar com um atendente': handleHumanSupport,
  '4': handlePayment,
  'pagamento': handlePayment,
  '5': handleAppointmentMenu,
  'agendar': handleAppointmentMenu,
  'menu': handleMenu,
  'voltar': handleMenu
};

/**
 * Handler principal
 */
export async function messageHandler(sock, jid, text, msg) {
  const normalizedText = text?.trim()?.toLowerCase() || '';
  console.log(`📩 Mensagem recebida de ${jid}: ${text}`);

  try {
    await updateUserTimestamp(jid, Date.now());

    if (jid === botConfig.ownerJid && normalizedText.startsWith('!encerrar')) {
      await handleOwnerCloseCommand(sock, jid, normalizedText);
      return;
    }

    // checar inatividade via scheduler preferível; mantém fallback aqui
    await checkInactivity(sock);

    if (await isHumanSupportActive(jid)) {
      console.log(`👩‍💼 ${jid} está em suporte humano. Ignorando.`);
      return;
    }

    // Fluxo de agendamento em memória por JID
    if (await handleAppointmentFlow(sock, jid, text)) return;

    const handler = commandHandlers[normalizedText];
    if (handler) {
      await handler(sock, jid);
      return;
    }

    // fallback IA
    await handleAIResponse(sock, jid, text);
  } catch (err) {
    console.error(`❌ Erro no handler de ${jid}:`, err);
    await sendText(sock, jid, '⚠️ Erro ao processar sua mensagem. Tente novamente.');
  }
}

// ================= Handlers fixos =================
async function handleAbout(sock, jid) {
  await sendText(sock, jid, `*1. Sobre a Empresa*\n\n${botConfig.aboutText}\n\nDigite *menu* para voltar.`);
}

async function handleServices(sock, jid) {
  await sendImage(sock, jid, botConfig.servicesImage, `*2. Nossos Serviços*\n\nConfira abaixo!\n\nDigite *menu* para voltar.`);
}

async function handleHumanSupport(sock, jid) {
  await sendText(sock, jid, botConfig.forwardToHumanMessage);
  await activateHumanSupport(jid);
  if (botConfig.humanSupportNumber) {
    await sendText(sock, `${botConfig.humanSupportNumber}@s.whatsapp.net`, `📞 Novo cliente solicitando suporte: ${jid}`);
  }
}

async function handlePayment(sock, jid) {
  await sendText(sock, jid, `*4. Pagamento Adiantado*\n\n${botConfig.paymentText}\n\nDigite *menu* para voltar.`);
}

async function handleMenu(sock, jid) {
  await sendText(sock, jid, botConfig.welcomeMessage.replace('{botName}', botConfig.botName));
}

// ================= Agendamento =================
const appointmentSessions = new Map();

async function handleAppointmentMenu(sock, jid) {
  // Gera lista de datas disponíveis (próximos N dias, segunda-sábado)
  const dates = generateAvailableDates(botConfig.appointmentDaysAhead);
  // Para cada data, contamos quantos slots disponíveis
  const dailySlots = generateDailySlots();

  let mensagem = '📅 *Agendamento Presencial* - Disponibilidade (Seg a Sáb)\n\n';
  for (const iso of dates) {
    const taken = await listTakenTimes(iso);
    const availableCount = dailySlots.filter(s => !taken.includes(s)).length;
    mensagem += `${formatDateDisplay(iso)} — ${availableCount} horários disponíveis\n`;
  }
  mensagem += `\nResponda com a *data* no formato DD/MM/YYYY que você quer (ex: 06/11/2025).`;
  appointmentSessions.set(jid, { step: 1 });
  await sendText(sock, jid, mensagem);
}

/**
 * Flow:
 * step 1 -> espera data (DD/MM/YYYY)
 * step 2 -> mostra horários disponíveis desse dia (HH:MM) e pede escolher horário
 * step 3 -> pede nome completo pra confirmar
 */
async function handleAppointmentFlow(sock, jid, rawText) {
  const session = appointmentSessions.get(jid);
  if (!session) return false;

  const text = rawText?.trim();
  // Passo 1: escolher data
  if (session.step === 1) {
    // converte DD/MM/YYYY -> YYYY-MM-DD
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) {
      await sendText(sock, jid, 'Formato inválido. Envie a data como DD/MM/YYYY (ex: 06/11/2025).');
      return true;
    }
    const iso = `${match[3]}-${match[2]}-${match[1]}`;
    // Verifica se é Domingo
    const d = new Date(`${iso}T00:00:00`);
    if (d.getDay() === 0) {
      await sendText(sock, jid, 'Desculpe, não atendemos aos domingos. Escolha outra data (Seg-Sáb).');
      return true;
    }
    // Verifica se data está dentro do range permitido
    const availableDates = generateAvailableDates(botConfig.appointmentDaysAhead);
    if (!availableDates.includes(iso)) {
      await sendText(sock, jid, `Escolha uma data dentro dos próximos ${botConfig.appointmentDaysAhead} dias (Seg-Sáb).`);
      return true;
    }

    // lista horários livres
    const dailySlots = generateDailySlots();
    const taken = await listTakenTimes(iso);
    const free = dailySlots.filter(s => !taken.includes(s));
    if (!free.length) {
      await sendText(sock, jid, `😕 Nenhum horário disponível em ${formatDateDisplay(iso)}. Escolha outra data.`);
      return true;
    }

    session.date = iso;
    session.freeSlots = free;
    session.step = 2;
    appointmentSessions.set(jid, session);

    await sendText(sock, jid, `⏰ Horários disponíveis em ${formatDateDisplay(iso)}:\n${free.join(', ')}\n\nResponda com o horário desejado (ex: 10:30).`);
    return true;
  }

  // Passo 2: escolher horário
  if (session.step === 2) {
    const chosen = text;
    if (!session.freeSlots.includes(chosen)) {
      await sendText(sock, jid, `⚠️ Horário inválido ou indisponível. Escolha um dos horários listados: ${session.freeSlots.join(', ')}`);
      return true;
    }
    session.time = chosen;
    session.step = 3;
    appointmentSessions.set(jid, session);
    await sendText(sock, jid, 'Por favor, digite seu *nome completo* para confirmar o agendamento:');
    return true;
  }

  // Passo 3: confirmar nome e salvar
  if (session.step === 3) {
    const name = text;
    const ok = await addAppointment(session.date, session.time, name, jid);
    if (!ok) {
      // Slot acabou de ser reservado por outro
      session.step = 1;
      appointmentSessions.set(jid, session);
      await sendText(sock, jid, '⚠️ Esse horário acabou de ser reservado. Volte a escolher uma data.');
      return true;
    }
    await sendText(sock, jid, `✅ Agendamento confirmado!\n*${formatDateDisplay(session.date)} às ${session.time}*\nAtendente: *${botConfig.attendantName}*\nNome: *${name}*\n\nSe precisar alterar, contate o suporte.`);
    appointmentSessions.delete(jid);
    return true;
  }

  return false;
}

// ================= Outros handlers =================
async function handleOwnerCloseCommand(sock, ownerJid, commandText) {
  const [, targetJid] = commandText.split(/\s+/);
  if (!targetJid) {
    await sendText(sock, ownerJid, `❗ Use: *!encerrar JID_DO_CLIENTE*`);
    return;
  }

  await deactivateHumanSupport(targetJid);
  await sendText(sock, ownerJid, `✅ Atendimento do cliente ${targetJid} encerrado.`);
  await sendText(sock, targetJid, `📢 Seu atendimento foi encerrado. Digite *menu* para voltar às opções.`);
}

async function handleAIResponse(sock, jid, text) {
  await sendText(sock, jid, '🤖 Estou pensando na melhor resposta pra você...');
  const aiResponse = await getGroqChatCompletion(text).catch(() => null);
  if (!aiResponse) {
    await sendText(sock, jid, '😅 Não consegui entender agora. Pode repetir?');
    return;
  }
  await sendText(sock, jid, aiResponse);
}
