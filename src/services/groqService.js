// src/services/groqService.js
import fetch from "node-fetch";
import { botConfig } from "../config/settings.js";

export async function callGroqAPI(prompt) {
  const apiKey = botConfig.groqApiKey;
  const url = "https://api.groq.com/openai/v1/chat/completions";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192", // <-- modelo atualizado
        messages: [
          {
            role: "system",
            content: "Você é um assistente simpático e profissional do salão Ana Clara Beauty. Responda com clareza e empatia, ajudando clientes a entender os serviços, agendar horários e tirar dúvidas. Seja breve e educado!"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro ao chamar a API Groq:", data);
      return "⚠️ Ocorreu um problema com a IA. Tente novamente mais tarde.";
    }

    return data.choices?.[0]?.message?.content?.trim() || "Desculpe, não entendi bem sua pergunta 😅";
  } catch (error) {
    console.error("Erro ao chamar Groq API:", error);
    return "⚠️ Houve um erro ao tentar obter a resposta da IA.";
  }
}
