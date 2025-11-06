// src/db/jsonDB.js
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.resolve('whatsapp-bot-groq/src/db/data.json');

/**
 * Estrutura do DB:
 * {
 *   "humanSupportActive": {
 *     "jid@s.whatsapp.net": {
 *       "timestamp": 1678886400000 // Última interação
 *     }
 *   }
 * }
 */

/**
 * Lê o conteúdo do banco de dados JSON.
 * @returns {Promise<object>} O objeto de dados.
 */
async function readDB() {
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Erro ao ler o banco de dados JSON:", error);
        // Se o arquivo não existir ou estiver vazio, retorna um objeto inicial
        return { humanSupportActive: {} };
    }
}

/**
 * Escreve o conteúdo no banco de dados JSON.
 * @param {object} data - O objeto de dados a ser escrito.
 */
async function writeDB(data) {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error("Erro ao escrever no banco de dados JSON:", error);
    }
}

/**
 * Verifica se um JID está no modo de suporte humano e atualiza o timestamp.
 * @param {string} jid - O JID do usuário.
 * @returns {Promise<boolean>} True se estiver ativo, False caso contrário.
 */
export async function isHumanSupportActive(jid) {
    const db = await readDB();
    const isActive = !!db.humanSupportActive[jid];
    
    if (isActive) {
        // Atualiza o timestamp da última interação
        db.humanSupportActive[jid].timestamp = Date.now();
        await writeDB(db);
    }
    
    return isActive;
}

/**
 * Ativa o modo de suporte humano para um JID.
 * @param {string} jid - O JID do usuário.
 */
export async function activateHumanSupport(jid) {
    const db = await readDB();
    db.humanSupportActive[jid] = {
        timestamp: Date.now()
    };
    await writeDB(db);
}

/**
 * Desativa o modo de suporte humano para um JID.
 * @param {string} jid - O JID do usuário.
 */
export async function deactivateHumanSupport(jid) {
    const db = await readDB();
    delete db.humanSupportActive[jid];
    await writeDB(db);
}

/**
 * Obtém todos os JIDs ativos no suporte humano.
 * @returns {Promise<object>} Objeto com JIDs e seus timestamps.
 */
export async function getAllActiveSupportUsers() {
    const db = await readDB();
    return db.humanSupportActive;
}
