// src/services/groqService.js
import Groq from "groq-sdk";
import dotenv from "dotenv";
import { botConfig } from "../config/settings.js";

dotenv.config();

// === CLIENTE GROQ ===
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// === FUNÇÃO PRINCIPAL ===
export async function callGroqAPI(prompt) {
  try {
    const completion = await client.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content: botConfig.gerarPromptIA
            ? botConfig.gerarPromptIA(prompt)
            : `Você é a assistente do salão ${botConfig.botName}. Seja educada, simpática e breve.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.6,
      max_tokens: 300
    });

    return completion.choices[0]?.message?.content?.trim() || "💬 (Sem resposta da IA)";
  } catch (error) {
    console.error("Erro ao chamar Groq API:", error);
    return "⚠️ Ocorreu um erro ao tentar responder. Tente novamente em alguns instantes.";
  }
}
