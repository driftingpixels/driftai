# Drift AI Chatbot

A web-based AI chatbot with an iMessage-style interface using Google's Gemini AI.

## Changes Made for Vercel Deployment

1. Converted the Express.js application to a Next.js application
2. Created API routes in `pages/api/chat.js` for handling chat requests
3. Updated the frontend to work with Next.js
4. Added proper configuration files for Vercel deployment

## Deployment to Vercel

1. Set the environment variable `API_KEY` in the Vercel dashboard with your Google Gemini API key
2. Deploy the project to Vercel

## Environment Variables

- `API_KEY`: Your Google Gemini API key (set in Vercel environment variables)

## Running Locally

1. Install dependencies: `npm install`
2. Run the development server: `npm run dev`
3. Visit http://localhost:3000 to test the application

## Project Structure

- `pages/index.js`: Main page component
- `pages/api/chat.js`: API route for chat functionality
- `public/style.css`: Stylesheet
- `public/app.js`: Client-side JavaScript