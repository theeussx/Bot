import fs from "fs";
import path from "path";
import crypto from "crypto";

const DB_PATH = path.resolve("./data.json");

// === Funções utilitárias ===
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(
      DB_PATH,
      JSON.stringify(
        {
          humanSupport: {},
          appointments: {},
        },
        null,
        2
      )
    );
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// === SUPORTE HUMANO ===
export async function isHumanSupportActive(jid) {
  const db = loadDB();
  return db.humanSupport[jid]?.active || false;
}

export async function activateHumanSupport(jid) {
  const db = loadDB();
  db.humanSupport[jid] = {
    active: true,
    timestamp: Date.now(),
  };
  saveDB(db);
}

export async function deactivateHumanSupport(jid) {
  const db = loadDB();
  if (db.humanSupport[jid]) {
    delete db.humanSupport[jid];
    saveDB(db);
    return true;
  }
  return false;
}

export async function getAllActiveSupportUsers() {
  const db = loadDB();
  const activeUsers = {};
  for (const [jid, info] of Object.entries(db.humanSupport)) {
    if (info.active) activeUsers[jid] = info;
  }
  return activeUsers;
}

// === CONFIGURAÇÃO DE HORÁRIOS ===
const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const dayMap = {
  seg: "Segunda",
  segunda: "Segunda",
  ter: "Terça",
  terca: "Terça",
  terça: "Terça",
  qua: "Quarta",
  quarta: "Quarta",
  qui: "Quinta",
  quinta: "Quinta",
  sex: "Sexta",
  sexta: "Sexta",
  sab: "Sábado",
  sabado: "Sábado",
  sábado: "Sábado",
};

function generateTimeSlots() {
  const slots = [];
  const start = 8 * 60; // 08:00
  const end = 18 * 60; // 18:00
  const interval = 90; // 1h30

  for (let t = start; t < end; t += interval) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    slots.push(time);
  }
  return slots;
}

// === LISTAR HORÁRIOS DISPONÍVEIS ===
export async function getAvailableSlots() {
  const db = loadDB();
  const slots = generateTimeSlots();
  const available = {};

  for (const day of days) {
    const taken = (db.appointments[day] || []).filter(a => a.status === "ativo");
    const takenTimes = taken.map(a => a.time);
    available[day] = slots.filter(slot => !takenTimes.includes(slot));
  }

  return available;
}

// === AGENDAR HORÁRIO ===
export async function addAppointment(jid, text) {
  const db = loadDB();

  const dayMatch = Object.keys(dayMap).find(d => new RegExp(`\\b${d}\\b`, "i").test(text));
  const hourMatch = text.match(/(\d{1,2}):(\d{2})/);

  if (!dayMatch || !hourMatch) {
    return "⚠️ Formato inválido! Envie algo como *Terça 10:30*.";
  }

  const day = dayMap[dayMatch.toLowerCase()];
  const time = `${hourMatch[1].padStart(2, "0")}:${hourMatch[2]}`;

  const validSlots = generateTimeSlots();
  if (!validSlots.includes(time)) {
    return "❌ Esse horário não está disponível (funcionamos das 08:00 às 18:00, com intervalos de 1h30).";
  }

  db.appointments[day] = db.appointments[day] || [];

  const ocupado = db.appointments[day].some(a => a.time === time && a.status === "ativo");
  if (ocupado) return "⛔ Esse horário já foi agendado, escolha outro.";

  const id = crypto.randomUUID();
  db.appointments[day].push({
    id,
    jid,
    time,
    status: "ativo",
  });

  saveDB(db);

  return `✅ Agendamento confirmado!\n📅 *Dia:* ${day}\n⏰ *Horário:* ${time}\n🔢 *ID:* ${id}\n👩‍⚕️ *Com:* Ana Clara\n\nNos vemos lá! 💖\n\nUse *!cancelar* para cancelar ou *!finalizar ${id}* para concluir o atendimento.`;
}

// === CANCELAR AGENDAMENTO ===
export async function cancelAppointment(jid) {
  const db = loadDB();
  let cancelado = false;

  for (const day of Object.keys(db.appointments)) {
    db.appointments[day] = db.appointments[day].filter(a => {
      if (a.jid === jid && a.status === "ativo") {
        cancelado = true;
        return false;
      }
      return true;
    });
  }

  saveDB(db);
  return cancelado
    ? "❌ Agendamento cancelado com sucesso! O horário foi liberado novamente. 💅"
    : "⚠️ Nenhum agendamento ativo encontrado para você.";
}

// === FINALIZAR AGENDAMENTO ===
export async function finishAppointment(id) {
  const db = loadDB();
  let found = false;

  for (const day of Object.keys(db.appointments)) {
    const index = db.appointments[day].findIndex(a => a.id === id && a.status === "ativo");
    if (index !== -1) {
      db.appointments[day][index].status = "finalizado";
      found = true;
      break;
    }
  }

  saveDB(db);
  return found
    ? `✨ Agendamento *${id}* finalizado com sucesso!`
    : "⚠️ Nenhum agendamento ativo encontrado com esse ID.";
}

// === LISTAR AGENDAMENTOS DO CLIENTE ===
export async function listUserAppointments(jid) {
  const db = loadDB();
  const results = [];

  for (const [day, slots] of Object.entries(db.appointments)) {
    for (const slot of slots) {
      if (slot.jid === jid) results.push({ day, ...slot });
    }
  }

  if (!results.length) return "Você não possui agendamentos ativos no momento.";

  let msg = "📋 *Seus agendamentos:*\n\n";
  for (const r of results) {
    msg += `🗓️ *${r.day}* às *${r.time}* — ${r.status === "ativo" ? "🟢 Ativo" : "✅ Finalizado"}\n🔢 ID: ${r.id}\n\n`;
  }

  return msg.trim();
}
