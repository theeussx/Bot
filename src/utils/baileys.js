import {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    isJidBroadcast,
    jidNormalizedUser,
    delay
} from '@whiskeysockets/baileys';
import {
    Boom
} from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';

const logger = pino({
    level: 'silent'
});

/**
 * Inicia a conexão com o WhatsApp.
 * @param {Function} messageHandler - Função para lidar com as mensagens recebidas.
 */
export async function connectToWhatsApp(messageHandler) {
    const {
        state,
        saveCreds
    } = await useMultiFileAuthState('baileys_auth_info');
    const {
        version
    } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser: ['Whatsapp Bot Groq', 'Chrome', '1.0'],
        getMessage: async (key) => {
            // Implementar lógica para buscar mensagens se necessário
            return {
                conversation: 'Olá'
            };
        },
    });

    // Evento de conexão
    sock.ev.on('connection.update', (update) => {
        const {
            connection,
            lastDisconnect,
            qr
        } = update;

        if (qr) {
            qrcode.generate(qr, {
                small: true
            });
            console.log('Scan the QR code above to connect.');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) ?
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut :
                true;
            console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp(messageHandler);
            }
        } else if (connection === 'open') {
            console.log('opened connection');
        }
    });

    // Evento de credenciais
    sock.ev.on('creds.update', saveCreds);

    // Evento de mensagens
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

/**
 * Envia uma mensagem de texto.
 * @param {object} sock - Objeto do socket do Baileys.
 * @param {string} jid - JID do destinatário.
 * @param {string} text - Texto da mensagem.
 */
export async function sendText(sock, jid, text) {
    await sock.sendMessage(jid, {
        text
    });
}

/**
 * Envia uma imagem com legenda.
 * @param {object} sock - Objeto do socket do Baileys.
 * @param {string} jid - JID do destinatário.
 * @param {string} url - URL da imagem.
 * @param {string} caption - Legenda da imagem.
 */
export async function sendImage(sock, jid, url, caption) {
    await sock.sendMessage(jid, {
        image: {
            url
        },
        caption
    });
}
