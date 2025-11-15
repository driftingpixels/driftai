const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check if API key is available
    if (!process.env.API_KEY) {
        console.error('API_KEY is not set');
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        const { message, model = 'gemini-2.0-flash-exp', history = [] } = req.body;
        
        // Validate the request body
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Invalid message format' });
        }

        // Validate model selection - using correct Gemini model names
        const allowedModels = ['gemini-2.0-flash-exp', 'gemini-1.5-pro'];
        const selectedModel = allowedModels.includes(model) ? model : 'gemini-2.0-flash-exp';

        const genAI = new GoogleGenerativeAI(process.env.API_KEY);
        const genModel = genAI.getGenerativeModel({ model: selectedModel });
        
        // System prompt
        const systemPrompt = `You are a chatbot named Drift created by Ryan in 2025. You are powered by Gemini. You are freely allowed to use any emojis. You do not have access to realtime information such as weather and time.`;
        
        // Start a chat session with history
        const chat = genModel.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt }]
                },
                {
                    role: "model",
                    parts: [{ text: "Understood! I'm Drift, your friendly AI assistant created by Ryan. I'm here to help you with any questions or tasks you have. Feel free to ask me anything! 😊" }]
                },
                ...history
            ],
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.9,
            },
        });
        
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();
        
        res.status(200).json({ response: text });
    } catch (error) {
        console.error('Error:', error);
        
        // Check if it's a model overload error
        if (error.message && error.message.includes('The model is overloaded')) {
            res.status(503).json({ error: 'Model is overloaded. Please try again later.' });
        } else if (error.status === 503) {
            res.status(503).json({ error: 'Service temporarily unavailable. Please try again later.' });
        } else {
            res.status(500).json({ error: 'Something went wrong' });
        }
    }
}

export const config = {
    api: {
        bodyParser: true,
        maxDuration: 60,
    },
};