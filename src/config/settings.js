// src/config/settings.js
export const botConfig = {
  groqApiKey: process.env.GROQ_API_KEY,
  botName: "Bot atendimento aninha",
  groqModel: "llama-3.3-70b-versatile",

  humanSupportNumber: "5581986703524",
  ownerJid: "5581986703524@s.whatsapp.net",

  // Inatividade
  inactivityTimeout: 30 * 60 * 1000, // 30 minutos
  inactivityCheckInterval: 5 * 60 * 1000, // 5 minutos

  // Agendamento
  attendantName: "Ana clara",
  appointmentSlotMinutes: 90, // 1h30 = 90 minutos
  appointmentStartHour: 8, // 08:00
  appointmentEndHour: 18, // 18:00
  appointmentDaysAhead: 14, // quantos dias à frente mostrar (ex.: 14 dias)

  // Mensagens
  welcomeMessage: `
Olá! Eu sou o {botName}, seu atendente 🤖  
Como posso te ajudar hoje?

*MENU DE OPÇÕES:*
1️⃣ *Sobre nós*
2️⃣ *Nossos Serviços*
3️⃣ *Falar com um atendente*
4️⃣ *Pagamento Adiantado*
5️⃣ *Agendar horário presencial*

Digite o número da opção desejada ou envie uma pergunta.
  `,
  aboutText: "Aqui fica o texto sobre a loja.",
  paymentText: "Para realizar o pagamento adiantado e garantir um desconto especial, utilize o link: https://pagamento.exemplo.com",

  forwardToHumanMessage: "Entendido. Encaminhando sua conversa para um de nossos atendentes. Por favor, aguarde. O bot não responderá mais até que o atendente finalize o seu suporte.",
  inactivityEndMessage: "Seu atendimento foi encerrado por inatividade (30 minutos). Digite *menu* para voltar às opções.",

  servicesImage: "https://exemplo.com/servicos.png"
};
