// src/utils/groq.js
import Groq from "groq-sdk";
import { BOT_SETTINGS } from '../config/settings.js';

const groq = new Groq({
    apiKey: BOT_SETTINGS.GROQ_API_KEY,
});

/**
 * Gera uma resposta de chat usando a API da Groq.
 * @param {string} userInput - A mensagem do usuário.
 * @returns {Promise<string>} A resposta gerada pela IA.
 */
export async function getGroqChatCompletion(userInput) {
    if (!BOT_SETTINGS.GROQ_API_KEY || BOT_SETTINGS.GROQ_API_KEY === 'SUA_CHAVE_GROQ_AQUI') {
        return "A chave da API da Groq não foi configurada. Por favor, adicione sua chave no arquivo `src/config/settings.js`.";
    }

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Você é o ${BOT_SETTINGS.BOT_NAME}, um assistente virtual para uma loja. Responda de forma amigável, concisa e útil. O menu de opções já foi apresentado ao usuário.`
                },
                {
                    role: "user",
                    content: userInput,
                },
            ],
            model: BOT_SETTINGS.GROQ_MODEL,
        });

        return completion.choices[0]?.message?.content || "Não foi possível obter uma resposta da IA.";
    } catch (error) {
        console.error("Erro ao se comunicar com a API da Groq:", error);
        return "Ocorreu um erro ao tentar processar sua solicitação com a IA.";
    }
}
