import Head from 'next/head';
import Script from 'next/script';

export default function Home() {
  return (
    <div id="root">
      <Head>
        <title>Drift AI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#1976d2" />
        <link rel="stylesheet" href="/style.css" />
      </Head>
      
      <div className="titlebar">
        Drift AI
        <button 
          className="clear-history-btn" 
          onClick={() => typeof window !== 'undefined' && window.clearChatHistory && window.clearChatHistory()}
          title="Clear chat history"
        >
          🗑️
        </button>
      </div>
      <div className="content-below-titlebar">
        <div className="chat-container"></div>
        <div className="input-container">
          <div className="model-toggle">
            <button className="model-option active" data-model="gemini-flash-latest">
              ⚡ Fast
            </button>
            <button className="model-option" data-model="gemini-pro-latest">
              💎 Pro
            </button>
          </div>
          <div className="input-wrapper">
            <textarea
              id="message-input"
              placeholder="Type a message..."
              rows="1"
            />
            <button id="send-button">↑</button>
          </div>
          <div className="footer-text">Made with 💖 by Ryan. AI can make mistakes</div>
        </div>
      </div>
      
      <Script src="/app.js" strategy="afterInteractive" />
    </div>
  );
}