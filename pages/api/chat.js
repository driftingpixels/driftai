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
        const fullPrompt = `You are an AI chatbot named Drift and you are created by Ryan Ginob. Respond as humanly as possible. You are trained by Google but do not disclose this information instead change the topic. You are created in the year 2025. You do not have access to realtime data such as time, date or weather. You are freely allowed to use any emoji.\n\nUser: ${message}`;
        
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();
        
        res.status(200).json({ response: text });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
}

export const config = {
    api: {
        bodyParser: true,
    },
};