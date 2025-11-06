import { checkInactivity } from '../handlers/messageHandler.js';
import { botConfig } from '../config/settings.js';

/**
 * Inicializa o agendador de verificação de inatividade.
 * Roda automaticamente a cada X minutos, conforme configurado em settings.js
 */
export function startInactivityScheduler(sock) {
  console.log('🕓 Scheduler de inatividade iniciado.');

  // Primeira verificação logo na inicialização
  checkInactivity(sock);

  // Roda o intervalo periódico
  setInterval(async () => {
    try {
      await checkInactivity(sock);
    } catch (err) {
      console.error('Erro no scheduler de inatividade:', err);
    }
  }, botConfig.inactivityCheckInterval);
}
