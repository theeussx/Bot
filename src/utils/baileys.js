// src/utils/baileys.js
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
  jidNormalizedUser
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';

const logger = pino({ level: 'silent' });

/**
 * Inicia a conexão com o WhatsApp.
 * @param {Function} messageHandler - Função para lidar com as mensagens recebidas.
 */
export async function connectToWhatsApp(messageHandler) {
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    browser: ['Whatsapp Bot Groq', 'Chrome', '1.0'],
    getMessage: async (key) => ({ conversation: 'Olá' })
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
      console.log('Scan the QR code above to connect.');
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
        : true;
      console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
      if (shouldReconnect) {
        connectToWhatsApp(messageHandler).catch(err => console.error('Erro ao reconectar:', err));
      }
    } else if (connection === 'open') {
      console.log('opened connection');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async (m) => {
    if (!m.messages) return;
    for (const msg of m.messages) {
      if (!msg.message || isJidBroadcast(msg.key.remoteJid) || msg.key.fromMe) continue;
      const jid = jidNormalizedUser(msg.key.remoteJid);
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      await messageHandler(sock, jid, text, msg);
    }
  });

  return sock;
}

export async function sendText(sock, jid, text) {
  try {
    await sock.sendMessage(jid, { text });
  } catch (err) {
    console.error('Erro ao enviar texto', err);
  }
}

export async function sendImage(sock, jid, url, caption) {
  try {
    await sock.sendMessage(jid, { image: { url }, caption });
  } catch (err) {
    console.error('Erro ao enviar imagem', err);
  }
}
