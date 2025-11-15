const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check if API key is available
    if (!process.env.API_KEY) {
        console.error('API_KEY is not set');
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        const { message, model = 'gemini-flash-latest', history = [] } = req.body;
        
        console.log('Received request:', { model, historyLength: history.length });
        
        // Validate the request body
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Invalid message format' });
        }

        // Validate model selection - using correct Gemini model names
        const allowedModels = ['gemini-flash-latest', 'gemini-pro-latest'];
        const selectedModel = allowedModels.includes(model) ? model : 'gemini-flash-latest';

        const genAI = new GoogleGenerativeAI(process.env.API_KEY);
        
        // Configure the model with system instruction
        const genModel = genAI.getGenerativeModel({ 
            model: selectedModel,
            systemInstruction: "You are a chatbot named Drift created by Ryan in 2025. You are powered by Gemini. You are freely allowed to use any emojis. You do not have access to realtime information such as weather and time."
        });
        
        // Start a chat session with the full history
        const chat = genModel.startChat({
            history: history,
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.9,
            },
        });
        
        // Send the current message
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();
        
        console.log('Response generated successfully with context');
        
        res.status(200).json({ response: text });
    } catch (error) {
        console.error('Error:', error);
        console.error('Error details:', error.message);

        // Check if it's a model overload error
        if (error.message && (error.message.includes('overloaded') || error.message.includes('quota'))) {
            res.status(503).json({ error: 'Model is overloaded. Please try again later.' });
        } else if (error.status === 503) {
            res.status(503).json({ error: 'Service temporarily unavailable. Please try again later.' });
        } else if (error.message && (error.message.includes('API key') || error.message.includes('400') || error.message.includes('401'))) {
            res.status(401).json({ error: 'Invalid API key or request. Please check your configuration.' });
        } else {
            res.status(500).json({ error: `Error: ${error.message || 'Something went wrong'}` });
        }
    }
}

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4mb',
        },
        responseLimit: false,
        externalResolver: true,
    },
};