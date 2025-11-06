// Definições de configuração para o bot
export const botConfig = {
    groqApiKey: process.env.GROQ_API_KEY || "SUA_CHAVE_API_GROQ",
    botName: "Bot atendimento aninha",
    humanSupportNumber: "5581986703524", // Número para o qual o suporte será encaminhado
    ownerJid: "5581986703524@s.whatsapp.net", // JID do dono do bot para comandos administrativos
    inactivityTimeout: 30 * 60 * 1000, // 30 minutos em milissegundos
    welcomeMessage: `
Olá! Eu sou o {botName}, seu atendente.

Como posso te ajudar hoje?

*MENU DE OPÇÕES:*
1️⃣ *Sobre nós*
2️⃣ *Nossos Serviços*
3️⃣ *Falar com um atendente*
4️⃣ *Pagamento Adiantado*

Digite o número da opção desejada ou faça uma pergunta.
    `,
    servicesImage: "https://exemplo.com/servicos.png", // URL da imagem de serviços
    forwardToHumanMessage: "Entendido. Encaminhando sua conversa para um de nossos atendentes. Por favor, aguarde. O bot não responderá mais até que o atendente finalize o seu suporte.",
    aboutText: "Aqui fica o texto sobre loja",
    paymentText: "Para realizar o pagamento adiantado e garantir um desconto especial, utilize o seguinte link: https://pagamento.exemplo.com",
    inactivityEndMessage: "Seu atendimento foi encerrado por inatividade (30 minutos). O bot voltará a interagir com você na próxima mensagem. Digite 'menu' para ver as opções novamente."
};
