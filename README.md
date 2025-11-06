# WhatsApp Bot com Groq AI e Baileys

Este projeto implementa um bot de WhatsApp com inteligência artificial (Groq AI) e a biblioteca Baileys, seguindo uma estrutura modular e de fácil adaptação.

## Estrutura do Projeto

A estrutura de pastas foi pensada para facilitar a manutenção e a adaptação para diferentes lojas:

```
whatsapp-bot-groq/
├── src/
│   ├── config/
│   │   └── settings.js       # Configurações do bot (API Key, mensagens, JID do dono, tempo limite)
│   ├── db/
│   │   ├── data.json         # Banco de dados JSON simples (estado do suporte humano com timestamp)
│   │   └── jsonDB.js         # Funções para manipulação do JSON DB
│   ├── handlers/
│   │   └── messageHandler.js # Lógica principal de tratamento de mensagens, menu e encerramento de suporte
│   ├── utils/
│   │   ├── baileys.js        # Funções utilitárias para o Baileys (conexão, envio de msg)
│   │   └── groq.js           # Funções utilitárias para a Groq AI (comunicação com API)
│   └── index.js              # Arquivo principal para iniciar o bot
├── package.json              # Dependências e scripts
└── README.md                 # Este arquivo
```

## Funcionalidades

1.  **Menu de Opções:** Responde a `1`, `2`, `3` ou `4` com as respectivas informações.
2.  **Sobre a Empresa (1):** Envia o texto configurado em `settings.js`.
3.  **Serviços (2):** Envia uma imagem (URL configurável) com uma legenda.
4.  **Suporte Humano (3):** Ativa o modo de suporte humano para o JID do cliente e o bot para de responder.
5.  **Pagamento Adiantado (4):** Envia o texto de pagamento configurado em `settings.js`.
6.  **Conversa com IA:** Qualquer outra mensagem é enviada para a Groq AI para uma resposta inteligente.
7.  **Encerramento por Inatividade:** O suporte humano é encerrado automaticamente após 30 minutos de inatividade do cliente.
8.  **Comando de Encerramento (Dono):** O dono do bot pode encerrar o suporte humano de um cliente usando o comando `!encerrar JID_DO_CLIENTE`.

## Configuração

1.  **Instalar Dependências:**
    ```bash
    cd whatsapp-bot-groq
    npm install
    ```

2.  **Configurar Chave Groq e JID do Dono:**
    Edite o arquivo `src/config/settings.js` e substitua `"SUA_CHAVE_API_GROQ"` pela sua chave de API da Groq. **É crucial** que você defina o `ownerJid` com o seu JID completo (ex: `5511999999999@s.whatsapp.net`) para poder usar o comando de encerramento.

    ```javascript
    // src/config/settings.js
    export const botConfig = {
        groqApiKey: process.env.GROQ_API_KEY || "SUA_CHAVE_API_GROQ",
        ownerJid: "5511999999999@s.whatsapp.net", // <-- Seu JID AQUI
        // ... outras configurações
    };
    ```

3.  **Configurar Mensagens e URLs:**
    Ainda em `src/config/settings.js`, personalize as mensagens, a URL da imagem de serviços (`servicesImage`) e o número de suporte humano (`humanSupportNumber`).

## Como Executar

1.  **Iniciar o Bot:**
    ```bash
    npm start
    ```

2.  **Conexão:**
    Ao iniciar, um código QR será exibido no terminal. Use seu celular para escanear o código no WhatsApp (Configurações > Aparelhos Conectados).

3.  **Uso:**
    Após a conexão, o bot estará ativo e pronto para responder às mensagens de acordo com o menu e a IA da Groq.
