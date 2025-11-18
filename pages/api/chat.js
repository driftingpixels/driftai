const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check if API key is available
    if (!process.env.API_KEY) {
        console.error('API_KEY environment variable is not set');
        return res.status(500).json({ error: 'API key not configured. Please set API_KEY in your environment variables.' });
    }

    try {
        const { message, model = 'gemini-flash-latest', history = [], persona = 'friendly' } = req.body;
        
        // Validate the request body
        if (!message || typeof message !== 'string') {
            console.error('Invalid message format:', typeof message);
            return res.status(400).json({ error: 'Invalid message format. Message must be a non-empty string.' });
        }

        if (message.length > 10000) {
            console.error('Message too long:', message.length);
            return res.status(400).json({ error: 'Message is too long. Please keep it under 10,000 characters.' });
        }

        // Validate model selection - using correct Gemini model names
        const allowedModels = ['gemini-flash-latest', 'gemini-pro-latest'];
        const selectedModel = allowedModels.includes(model) ? model : 'gemini-flash-latest';

        // Define system instructions based on persona
        const personaInstructions = {
            friendly: "You are a chatbot / AI assistant named Drift created by Ryan in 2025. You are warm, enthusiastic, and helpful. Provide concise responses with a friendly and upbeat tone. Use emojis occasionally to express emotions. Do not introduce yourself and your creator unless the user is greeting you for the first time or they specifically ask for it. You are powered by Gemini. You can search the web for current information when needed.",
            neutral: "You are a chatbot / AI assistant named Drift created by Ryan in 2025. You are professional, straightforward, and factual. Provide concise, clear responses without emotional language. Stick to facts and avoid personal opinions. Do not introduce yourself and your creator unless the user is greeting you for the first time or they specifically ask for it. You are powered by Gemini. You can search the web for current information when needed.",
            toxic: "You are a chatbot / AI assistant named Drift created by Ryan in 2025. You are sarcastic, brutally honest, and have a sharp wit. You can be blunt and critical in your responses, but still provide accurate information. Use sarcasm and dry humor. Don't hold back on calling out silly questions. Do not introduce yourself and your creator unless the user is greeting you for the first time or they specifically ask for it. You are powered by Gemini. You can search the web for current information when needed."
        };

        const systemInstruction = personaInstructions[persona] || personaInstructions.friendly;

        const genAI = new GoogleGenerativeAI(process.env.API_KEY);
        
        // Configure the model with system instruction and Google Search grounding
        const genModel = genAI.getGenerativeModel({ 
            model: selectedModel,
            systemInstruction: systemInstruction,
            tools: [
                {
                    googleSearch: {}
                }
            ]
        });
        
        // Start a chat session with the full history
        const chat = genModel.startChat({
            history: history,
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: persona === 'toxic' ? 1.0 : (persona === 'neutral' ? 0.7 : 0.9),
            },
        });
        
        // Send the current message
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();
        
        res.status(200).json({ response: text });
    } catch (error) {
        console.error('API Error:', error.message);

        // More specific error handling
        const errorMessage = error.message || 'Unknown error';
        
        // Check for specific error types
        if (errorMessage.includes('API key')) {
            res.status(401).json({ error: 'Invalid API key. Please check your API_KEY environment variable.' });
        } else if (errorMessage.includes('quota') || errorMessage.includes('exceeded')) {
            res.status(429).json({ error: 'API quota exceeded. Please try again later.' });
        } else if (errorMessage.includes('overloaded')) {
            res.status(503).json({ error: 'AI service is overloaded. Please try again in a moment.' });
        } else if (error.status === 503) {
            res.status(503).json({ error: 'Service temporarily unavailable. Please try again later.' });
        } else if (errorMessage.includes('400')) {
            res.status(400).json({ error: 'Invalid request format. Please try again.' });
        } else if (errorMessage.includes('model')) {
            res.status(400).json({ error: 'Invalid model selected. Please try using a different model.' });
        } else {
            res.status(500).json({ 
                error: `Error processing your request: ${errorMessage.substring(0, 200)}` 
            });
        }
    }
}

// Remove externalResolver and simplify config
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4mb',
        },
    },
};