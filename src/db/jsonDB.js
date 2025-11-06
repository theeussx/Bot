// src/db/jsonDB.js
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'data.json');

async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Estrutura inicial
      return { humanSupportActive: {}, appointments: {} };
    }
    console.error("Erro ao ler o banco JSON:", error);
    return { humanSupportActive: {}, appointments: {} };
  }
}

async function writeDB(data) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error("Erro ao escrever no banco JSON:", error);
  }
}

// ======== SUPORTE HUMANO ========
export async function isHumanSupportActive(jid) {
  const db = await readDB();
  const isActive = !!db.humanSupportActive[jid];

  if (isActive) {
    db.humanSupportActive[jid].timestamp = Date.now();
    await writeDB(db);
  }
  return isActive;
}

export async function activateHumanSupport(jid) {
  const db = await readDB();
  db.humanSupportActive[jid] = { timestamp: Date.now() };
  await writeDB(db);
}

export async function deactivateHumanSupport(jid) {
  const db = await readDB();
  delete db.humanSupportActive[jid];
  await writeDB(db);
}

export async function getAllActiveSupportUsers() {
  const db = await readDB();
  return db.humanSupportActive;
}

// ======== AGENDAMENTO ========
// date: 'YYYY-MM-DD', time: 'HH:MM'
export async function addAppointment(date, time, name, jid) {
  const db = await readDB();
  if (!db.appointments) db.appointments = {};
  if (!db.appointments[date]) db.appointments[date] = [];

  // Não permite duplicata do mesmo slot
  const isTaken = db.appointments[date].some(a => a.time === time);
  if (isTaken) return false;

  db.appointments[date].push({ time, name, jid, createdAt: Date.now() });
  await writeDB(db);
  return true;
}

export async function getAppointmentsByDate(date) {
  const db = await readDB();
  return db.appointments?.[date] || [];
}

export async function listTakenTimes(date) {
  const appts = await getAppointmentsByDate(date);
  return appts.map(a => a.time);
}

export async function updateUserTimestamp(jid, timestamp) {
  const db = await readDB();
  if (!db.humanSupportActive[jid]) db.humanSupportActive[jid] = {};
  db.humanSupportActive[jid].timestamp = timestamp;
  await writeDB(db);
}
