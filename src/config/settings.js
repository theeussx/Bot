// src/config/settings.js
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

// === AJUSTE DE CAMINHOS ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === GARANTE QUE A PASTA DATABASE EXISTA ===
const databaseDir = path.join(__dirname, "./database");
await fs.mkdir(databaseDir, { recursive: true });

// === CAMINHOS DOS ARQUIVOS ===
const APPOINTMENTS_FILE = path.join(databaseDir, "appointments.json");
const HUMAN_SUPPORT_FILE = path.join(databaseDir, "human_support.json");

// === GARANTE QUE OS ARQUIVOS EXISTAM ===
async function ensureFileExists(file, defaultValue) {
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, JSON.stringify(defaultValue, null, 2));
  }
}
await ensureFileExists(APPOINTMENTS_FILE, []);
await ensureFileExists(HUMAN_SUPPORT_FILE, []);

// === DONO DO BOT (COLOQUE SEU NÚMERO AQUI) ===
export const OWNER_NUMBER = "5581986703524@s.whatsapp.net"; // troque pelo número do dono

// === CONFIGURAÇÕES DO BOT ===
export const botConfig = {
  botName: "Ana Clara Beauty 💅",
  ownerJid: OWNER_NUMBER,
  welcomeMessage: `
✨ *Bem-vinda ao {botName}!* ✨
Seu espaço completo de beleza — sobrancelhas, unhas, cílios e muito mais 💖

Escolha uma opção abaixo:
1️⃣ Sobre nós  
2️⃣ Serviços  
3️⃣ Falar com atendente humano  
4️⃣ Pagamento adiantado  
5️⃣ Agendar horário  

Ou digite *menu* pra voltar aqui a qualquer momento.`,
  aboutText: `
💖 *Ana Clara Beauty* — Seu combo de beleza completo em um só lugar!

Cansada de correr de um salão pra outro? Aqui, nós cuidamos de você da ponta dos dedos ao olhar ✨

📍 *Endereço:* Rua Pintor Mário Nunes, 29 — Alto José do Pinho  
📌 *Referência:* Bom Sucesso  
👩‍🎨 *Responsável:* Ana Clara  

🧠 *Desenvolvido por:* Theeussx  
🌐 *Portfólio:* https://theeussx.vercel.app
`,
  servicesList: `
💅 *Nossos Serviços — Ana Clara Beauty* 💖

👁️ *Lash Design (Cílios)*  
- Tufinho — R$50  
- Fans de luxo — R$60  
- Fox Eyes — R$80

🖋️ *Design de Sobrancelhas*  
- Simples — R$15  
- Com Henna — R$20

💅 *Nails Design (Unhas)*  
- Postiça Realista — R$50  
- Gel na Tips — R$70  
- Banho de Gel — R$30

🦶 *Pedicure (Pés)*  
- Pé — R$30

🧶 *Trança Nagô*  
- 2 traços — R$20  
- Cada trança extra — +R$5

✨ Agende agora mesmo e realce sua beleza natural! ✨
`,
  paymentText: `
💳 *Pagamento Adiantado — Ana Clara Beauty*

Para garantir seu horário, você pode efetuar o pagamento adiantado via:
- PIX 💰  
- Dinheiro 💵  

Após o pagamento, envie o comprovante aqui mesmo!  
⚠️ O horário só é confirmado após o pagamento.

👩‍🎨 Ana Clara agradece sua preferência 💖
`,
  forwardToHumanMessage: `
👩‍💻 Um atendente humano vai te responder em breve!
Se desejar voltar ao bot, envie *!voltar* a qualquer momento.
`
};

// === FUNÇÕES BÁSICAS ===
export async function getAppointments() {
  const data = await fs.readFile(APPOINTMENTS_FILE, "utf8");
  return JSON.parse(data || "[]");
}

export async function saveAppointments(appointments) {
  await fs.writeFile(APPOINTMENTS_FILE, JSON.stringify(appointments, null, 2));
}

export async function getHumanSupportList() {
  const data = await fs.readFile(HUMAN_SUPPORT_FILE, "utf8");
  return JSON.parse(data || "[]");
}

export async function saveHumanSupportList(list) {
  await fs.writeFile(HUMAN_SUPPORT_FILE, JSON.stringify(list, null, 2));
}

// === HORÁRIOS DISPONÍVEIS ===
export async function getAvailableSlots() {
  return {
    segunda: [
      { date: "2025-11-10T09:00:00", time: "09:00" },
      { date: "2025-11-10T15:00:00", time: "15:00" },
    ],
    terca: [
      { date: "2025-11-11T09:00:00", time: "09:00" },
      { date: "2025-11-11T15:00:00", time: "15:00" },
    ],
    quarta: [
      { date: "2025-11-12T09:00:00", time: "09:00" },
      { date: "2025-11-12T15:00:00", time: "15:00" },
    ],
    quinta: [
      { date: "2025-11-13T09:00:00", time: "09:00" },
      { date: "2025-11-13T15:00:00", time: "15:00" },
    ],
    sexta: [
      { date: "2025-11-14T09:00:00", time: "09:00" },
      { date: "2025-11-14T15:00:00", time: "15:00" },
    ],
  };
}

// === AGENDAMENTO ===
export async function addAppointment(user, text, sock) {
  const availableSlots = await getAvailableSlots();
  const allSlots = Object.entries(availableSlots).flatMap(([day, slots]) =>
    slots.map(slot => ({ ...slot, day }))
  );

  const diasSemana = {
    domingo: 0, segunda: 1, terca: 2, terça: 2,
    quarta: 3, quinta: 4, sexta: 5, sabado: 6, sábado: 6
  };

  const diaEncontrado = Object.keys(diasSemana).find(d => text.toLowerCase().includes(d));
  const horaMatch = text.match(/\d{1,2}[:h]\d{2}/);
  const horaEncontrada = horaMatch ? horaMatch[0].replace("h", ":") : null;

  if (!diaEncontrado || !horaEncontrada) {
    return "⚠️ Por favor, informe o dia e a hora (ex: segunda às 15:00).";
  }

  const match = allSlots.find(slot =>
    slot.day.toLowerCase().startsWith(diaEncontrado.slice(0, 3)) &&
    slot.time.startsWith(horaEncontrada)
  );

  if (!match) {
    return "⚠️ Nenhum horário correspondente foi encontrado. Tente outro horário.";
  }

  const appointments = await getAppointments();
  const id = crypto.randomUUID();
  const novo = { id, user, date: match.date, status: "ativo" };

  appointments.push(novo);
  await saveAppointments(appointments);

  const dataBonita = new Date(match.date).toLocaleString("pt-BR", {
    dateStyle: "full",
    timeStyle: "short"
  });

  // Notifica o dono
  if (sock && OWNER_NUMBER) {
    const aviso = `📅 Novo agendamento!\n👤 Cliente: ${user}\n🗓️ ${dataBonita}`;
    await sock.sendMessage(OWNER_NUMBER, { text: aviso });
  }

  return `✅ Agendamento realizado com sucesso!\n🗓️ ${dataBonita}\n🔢 ID: *${id}*\n\nUse *!cancelar* para cancelar ou *!finalizar ${id}* para marcar como concluído.`;
}

// === CANCELAR AGENDAMENTO ===
export async function cancelAppointment(user) {
  const appointments = await getAppointments();
  const ativos = appointments.filter(a => a.user === user && a.status === "ativo");

  if (ativos.length === 0) {
    return "⚠️ Você não tem agendamentos ativos.";
  }

  for (const a of ativos) {
    a.status = "cancelado";
  }

  await saveAppointments(appointments);
  return "❌ Seu agendamento foi cancelado com sucesso!";
}

// === FINALIZAR AGENDAMENTO ===
export async function finishAppointment(id) {
  const appointments = await getAppointments();
  const agendamento = appointments.find(a => a.id === id);

  if (!agendamento) {
    return "⚠️ Agendamento não encontrado.";
  }

  agendamento.status = "finalizado";
  await saveAppointments(appointments);
  return `✅ Agendamento *${id}* finalizado com sucesso!`;
}

// === SUPORTE HUMANO ===
export async function activateHumanSupport(user, sock) {
  const list = await getHumanSupportList();

  if (!list.includes(user)) {
    list.push(user);
    await saveHumanSupportList(list);

    // Notifica o dono
    if (sock && OWNER_NUMBER) {
      const aviso = `🧑‍💬 O usuário ${user} pediu suporte humano.`;
      await sock.sendMessage(OWNER_NUMBER, { text: aviso });
    }
  }

  return "✅ Suporte humano ativado! Um atendente vai falar com você em breve.";
}

export async function deactivateHumanSupport(user) {
  const list = await getHumanSupportList();
  const newList = list.filter(u => u !== user);
  await saveHumanSupportList(newList);
  return "🟢 Você saiu do modo de suporte humano.";
}

export async function isHumanSupportActive(user) {
  const list = await getHumanSupportList();
  return Array.isArray(list) && list.includes(user);
}

// === PROMPT DA IA ===
export function gerarPromptIA(texto) {
  return `
Você é uma assistente virtual do salão *Ana Clara Beauty* 💅.
Fale de forma simpática e breve.
Baseie suas respostas nas informações abaixo:

- Serviços: sobrancelhas, unhas, cílios, pedicure e tranças.
- Valores e opções descritos na lista de serviços.
- Endereço: Rua Pintor Mário Nunes, 29 — Alto José do Pinho (Bom Sucesso).
- Desenvolvido por Theeussx — https://theeussx.vercel.app

Usuário perguntou: "${texto}"
Responda de modo natural, como se fosse uma atendente real.
  `;
}
