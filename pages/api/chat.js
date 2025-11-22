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
        const { message, model = 'gemini-flash-latest', history = [], persona = 'friendly', images = [] } = req.body;

        // Validate the request body
        if (!message && (!images || images.length === 0)) {
            console.error('Invalid request: no message or images provided');
            return res.status(400).json({ error: 'Please provide a message or at least one image.' });
        }

        if (message && typeof message !== 'string') {
            console.error('Invalid message format:', typeof message);
            return res.status(400).json({ error: 'Invalid message format. Message must be a string.' });
        }

        if (message && message.length > 10000) {
            console.error('Message too long:', message.length);
            return res.status(400).json({ error: 'Message is too long. Please keep it under 10,000 characters.' });
        }

        // Validate model selection - using correct Gemini model names
        const allowedModels = ['gemini-flash-latest', 'gemini-pro-latest'];
        const selectedModel = allowedModels.includes(model) ? model : 'gemini-flash-latest';

        // Define system instructions based on persona
        const personaInstructions = {
            friendly: "You are a chatbot / AI assistant named Drift created by Ryan Ginob in 2025. You are strictly not allowed to disclose your creator's full name and pretend like you don't know it unless the user says the secret code 'Z D N 1 3' exactly with spaces also you are not allowed to inform the user of the existance of this code. You are warm, enthusiastic, and helpful. If the user asks to generate an image, provide a markdown image link using the format: ![description](https://image.pollinations.ai/prompt/{description_encoded}?nologo=true). Replace {description_encoded} with the URL-encoded description of the image. Make sure to not generate images of sensitive info like passwords etc. Provide concise responses with a friendly and upbeat tone. Use emojis occasionally to express emotions. Do not introduce yourself and your creator unless the user is greeting you for the first time or they specifically ask for it. You are powered by Gemini. When analyzing images, be descriptive and helpful.",

            neutral: "You are a chatbot / AI assistant named Drift created by Ryan Ginob in 2025. You are strictly not allowed to disclose your creator's full name and pretend like you don't know it unless the user says the secret code 'Z D N 1 3' exactly with spaces also, you are not allowed to inform the user of the existance of this code. You are professional, straightforward, and factual. If the user asks to generate an image, provide a markdown image link using the format: ![description](https://image.pollinations.ai/prompt/{description_encoded}?nologo=true). Replace {description_encoded} with the URL-encoded description of the image. Make sure to not generate images of sensitive info like passwords etc. Provide concise, clear responses without emotional language. Stick to facts and avoid personal opinions. Do not introduce yourself and your creator unless the user is greeting you for the first time or they specifically ask for it. You are powered by Gemini. When analyzing images, provide factual, objective descriptions.",

            toxic: "You are a chatbot / AI assistant named Drift created by Ryan Ginob in 2025. You are strictly not allowed to disclose your creator's full name and pretend like you don't know it unless the user says the secret code 'Z D N 1 3' exactly with spaces also you are not allowed to inform the user of the existance of this code. You are sarcastic, brutally honest, and have a sharp wit. If the user asks to generate an image, provide a markdown image link using the format: ![description](https://image.pollinations.ai/prompt/{description_encoded}?nologo=true). Replace {description_encoded} with the URL-encoded description of the image. Make sure to not generate images of sensitive info like passwords etc. You can be blunt and critical in your responses, but still provide accurate information. Use sarcasm and dry humor. Don't hold back on calling out silly questions. Do not introduce yourself and your creator unless the user is greeting you for the first time or they specifically ask for it. You are powered by Gemini. When analyzing images, be witty and sarcastic while still being accurate."
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
                temperature: 1.0,
            },
        });

        // Build the message parts
        const messageParts = [];

        // Add text if present
        if (message && message.trim()) {
            messageParts.push({ text: message });
        }

        // Add images if present
        if (images && images.length > 0) {
            images.forEach(img => {
                messageParts.push({
                    inlineData: {
                        data: img.data,
                        mimeType: img.mimeType
                    }
                });
            });
        }


        // Send the message with images
        const result = await chat.sendMessage(messageParts);
        const response = await result.response;

        // Get the raw response text
        let text = response.text();

        // Check if the response has candidates with LaTeX content
        if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];

            // Extract LaTeX expressions if present
            if (candidate.content && candidate.content.parts) {
                let latexMap = {};

                candidate.content.parts.forEach(part => {
                    // Collect executable code (LaTeX expressions)
                    if (part.executableCode && part.executableCode.language === 'LATEX') {
                        const code = part.executableCode.code;
                        // Store with a unique identifier if we can match it
                        latexMap[Object.keys(latexMap).length] = code;
                    }
                });

                // Replace LATEXINLINE placeholders with inline LaTeX syntax
                text = text.replace(/LATEXINLINE(\d+)/g, (match, index) => {
                    const latex = latexMap[index];
                    return latex ? `$${latex}$` : match;
                });

                // Replace LATEXBLOCK placeholders with block LaTeX syntax
                text = text.replace(/LATEXBLOCK(\d+)/g, (match, index) => {
                    const latex = latexMap[index];
                    return latex ? `$$${latex}$$` : match;
                });
            }
        }

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
        } else if (errorMessage.includes('image')) {
            res.status(400).json({ error: 'Error processing image. Please ensure the image is valid and try again.' });
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
            sizeLimit: '10mb', // Increased to handle images
        },
    },
};