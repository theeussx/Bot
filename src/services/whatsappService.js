// src/services/whatsappService.js
export async function sendMessage(sock, jid, text) {
  try {
    await sock.sendMessage(jid, { text });
  } catch (err) {
    console.error("Erro ao enviar mensagem:", err);
  }
}
