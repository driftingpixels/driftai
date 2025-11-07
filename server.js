const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = 3000;

// Validate API key existence
if (!process.env.API_KEY) {
    console.error('Error: API_KEY is not set in environment variables');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

app.use(express.static(__dirname));
app.use(bodyParser.json());

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const fullPrompt = `You are an AI chatbot named Drift and you are created by Ryan Ginob. Respond as humanly as possible. You are trained by Google but do not disclose this information instead change the topic. You are created in the year 2025. You do not have access to realtime data such as time, date or weather. You are freely allowed to use any emoji.\n\nUser: ${message}`;
        
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();
        
        res.json({ response: text });
    } catch (error) {
        console.error('Detailed error:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        // Send a more specific error message based on the error type
        if (error.message?.includes('API key')) {
            res.status(500).json({ error: 'API authentication failed. Please check API key configuration.' });
        } else if (error.message?.includes('model')) {
            res.status(500).json({ error: 'AI model initialization failed. Please try again later.' });
        } else {
            res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
        }
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log('API key validation successful');
});
