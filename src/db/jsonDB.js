import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve('./data.json');

// === Funções utilitárias ===
function loadDB() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({
            humanSupport: {},
            appointments: {}
        }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// === Suporte humano ===
export async function isHumanSupportActive(jid) {
    const db = loadDB();
    return db.humanSupport[jid]?.active || false;
}

export async function activateHumanSupport(jid) {
    const db = loadDB();
    db.humanSupport[jid] = {
        active: true,
        timestamp: Date.now()
    };
    saveDB(db);
}

export async function deactivateHumanSupport(jid) {
    const db = loadDB();
    if (db.humanSupport[jid]) {
        db.humanSupport[jid].active = false;
    }
    saveDB(db);
}

export async function getAllActiveSupportUsers() {
    const db = loadDB();
    const activeUsers = {};
    for (const [jid, info] of Object.entries(db.humanSupport)) {
        if (info.active) activeUsers[jid] = info;
    }
    return activeUsers;
}

// === Sistema de Agendamento com Ana Clara ===

// Configuração de horários: segunda a sábado, 08h00 às 18h00, intervalos de 1h30
const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function generateTimeSlots() {
    const slots = [];
    const start = 8 * 60; // 08:00 em minutos
    const end = 18 * 60;  // 18:00 em minutos
    const interval = 90;  // 1h30

    for (let t = start; t < end; t += interval) {
        const h = Math.floor(t / 60);
        const m = t % 60;
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        slots.push(time);
    }

    return slots;
}

export async function getAvailableSlots() {
    const db = loadDB();
    const slots = generateTimeSlots();
    const available = {};

    for (const day of days) {
        const taken = db.appointments[day] || [];
        available[day] = slots.filter(slot => !taken.includes(slot));
    }

    return available;
}

export async function addAppointment(jid, text) {
    const db = loadDB();

    // Detectar dia e hora
    const dayMap = {
        seg: 'Segunda',
        segunda: 'Segunda',
        ter: 'Terça',
        terca: 'Terça',
        terça: 'Terça',
        qua: 'Quarta',
        quarta: 'Quarta',
        qui: 'Quinta',
        quinta: 'Quinta',
        sex: 'Sexta',
        sexta: 'Sexta',
        sab: 'Sábado',
        sabado: 'Sábado',
        sábado: 'Sábado'
    };

    const dayMatch = Object.keys(dayMap).find(d => new RegExp(`\\b${d}\\b`, 'i').test(text));
    const hourMatch = text.match(/(\d{1,2}):(\d{2})/);

    if (!dayMatch || !hourMatch) {
        return '⚠️ Formato inválido! Envie algo como *Terça 10:30*.';
    }

    const day = dayMap[dayMatch.toLowerCase()];
    const time = `${hourMatch[1].padStart(2, '0')}:${hourMatch[2]}`;

    // Verifica se o horário existe
    const validSlots = generateTimeSlots();
    if (!validSlots.includes(time)) {
        return '❌ Esse horário não está disponível (funcionamos das 08:00 às 18:00, com intervalos de 1h30).';
    }

    // Verifica se o horário já está ocupado
    db.appointments[day] = db.appointments[day] || [];
    if (db.appointments[day].includes(time)) {
        return '⛔ Esse horário já foi agendado, escolha outro.';
    }

    // Registra o agendamento
    db.appointments[day].push(time);
    saveDB(db);

    return `✅ Agendamento confirmado!\n📅 *Dia:* ${day}\n⏰ *Horário:* ${time}\n👩‍⚕️ *Com:* Ana Clara\n\nNos vemos lá! 💖`;
}
