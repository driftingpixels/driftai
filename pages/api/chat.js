const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        console.log('Method not allowed:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check if API key is available
    if (!process.env.API_KEY) {
        console.error('API_KEY environment variable is not set');
        return res.status(500).json({ error: 'API key not configured. Please set API_KEY in your environment variables.' });
    }

    try {
        const { message, model = 'gemini-1.5-flash-latest', history = [] } = req.body;
        
        console.log('=== API Request ===');
        console.log('Model:', model);
        console.log('Message length:', message?.length);
        console.log('History length:', history.length);
        
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
        const allowedModels = ['gemini-1.5-flash-latest', 'gemini-1.5-pro-latest', 'gemini-flash-latest', 'gemini-pro-latest'];
        const selectedModel = allowedModels.includes(model) ? model : 'gemini-1.5-flash-latest';

        console.log('Using model:', selectedModel);

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
        
        console.log('Sending message to AI...');
        
        // Send the current message
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();
        
        console.log('Response generated successfully');
        console.log('Response length:', text.length);
        
        res.status(200).json({ response: text });
    } catch (error) {
        console.error('=== API Error ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        // More specific error handling
        const errorMessage = error.message || 'Unknown error';
        
        // Check for specific error types
        if (errorMessage.includes('API key')) {
            console.error('API key error detected');
            res.status(401).json({ error: 'Invalid API key. Please check your API_KEY environment variable.' });
        } else if (errorMessage.includes('quota') || errorMessage.includes('exceeded')) {
            console.error('Quota error detected');
            res.status(429).json({ error: 'API quota exceeded. Please try again later.' });
        } else if (errorMessage.includes('overloaded')) {
            console.error('Overload error detected');
            res.status(503).json({ error: 'AI service is overloaded. Please try again in a moment.' });
        } else if (error.status === 503) {
            console.error('Service unavailable');
            res.status(503).json({ error: 'Service temporarily unavailable. Please try again later.' });
        } else if (errorMessage.includes('400')) {
            console.error('Bad request detected');
            res.status(400).json({ error: 'Invalid request format. Please try again.' });
        } else if (errorMessage.includes('model')) {
            console.error('Model error detected');
            res.status(400).json({ error: 'Invalid model selected. Please try using a different model.' });
        } else {
            console.error('Generic error');
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