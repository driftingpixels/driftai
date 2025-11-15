import Head from 'next/head';
import Script from 'next/script';

export default function Home() {
  return (
    <div id="root">
      <Head>
        <title>Drift AI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="/style.css" />
      </Head>
      
      <div className="titlebar">Drift AI</div>
      <div className="content-below-titlebar">
        <div className="chat-container"></div>
        <div className="input-container">
          <div className="model-toggle">
            <button className="model-option active" data-model="gemini-2.0-flash-exp">
              ⚡ Fast
            </button>
            <button className="model-option" data-model="gemini-1.5-pro">
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
        </div>
        <div className="footer-text">Made with 💖 by Ryan. AI can make mistakes</div>
      </div>
      
      <Script src="/app.js" strategy="afterInteractive" />
    </div>
  );
}