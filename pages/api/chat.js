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
        const { message } = req.body;
        
        // Validate the request body
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Invalid message format' });
        }

        const genAI = new GoogleGenerativeAI(process.env.API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const fullPrompt = `You are a chatbot named Drift created by Ryan in 2025. You are powered by Gemini. You are freely allowed to use any emojis. You do not have access to realtime information such as weather and time.\n\nUser: ${message}`;
        
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();
        
        res.status(200).json({ response: text });
    } catch (error) {
        console.error('Error:', error);
        
        // Check if it's a model overload error
        if (error.message && error.message.includes('The model is overloaded')) {
            res.status(503).json({ error: 'Error - Model is overloaded. Please try again later.' });
        } else if (error.status === 503) {
            res.status(503).json({ error: 'Error - Service temporarily unavailable. Please try again later.' });
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