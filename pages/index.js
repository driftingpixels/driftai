import { useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  useEffect(() => {
    // Simple markdown parser
    function parseMarkdown(text) {
      // Escape HTML
      let html = text.replace(/&/g, '&amp;')
                     .replace(/</g, '&lt;')
                     .replace(/>/g, '&gt;');
      
      // Code blocks (must come before inline code)
      html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
      
      // Inline code
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
      
      // Bold
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
      
      // Italic
      html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
      html = html.replace(/_(.+?)_/g, '<em>$1</em>');
      
      // Links
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
      
      // Blockquotes
      html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
      
      // Unordered lists
      html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
      html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
      html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
      
      // Ordered lists
      html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
      
      // Line breaks -> paragraphs
      html = html.split('\n\n').map(para => {
        if (!para.match(/^<(ul|ol|pre|blockquote)/)) {
          return '<p>' + para.replace(/\n/g, '<br>') + '</p>';
        }
        return para;
      }).join('');
      
      return html;
    }

    // Initialize chat functionality
    const chatContainer = document.querySelector(".chat-container");
    const messageInput = document.getElementById("message-input");
    const sendButton = document.getElementById("send-button");
    const modelOptions = document.querySelectorAll(".model-option");

    let selectedModel = "gemini-flash-latest";
    let conversationHistory = [];
    
    const savedHistory = sessionStorage.getItem('conversationHistory');
    const savedMessages = sessionStorage.getItem('chatMessages');
    
    if (savedHistory) {
        try {
            conversationHistory = JSON.parse(savedHistory);
            console.log('Loaded conversation history:', conversationHistory.length, 'messages');
        } catch (e) {
            console.error('Error loading history:', e);
            conversationHistory = [];
        }
    }
    
    if (savedMessages) {
        try {
            const messages = JSON.parse(savedMessages);
            messages.forEach(msg => {
                addMessage(msg.text, msg.type, false, false);
            });
        } catch (e) {
            console.error('Error loading messages:', e);
        }
    }

    modelOptions.forEach(option => {
        option.addEventListener("click", () => {
            modelOptions.forEach(opt => opt.classList.remove("active"));
            option.classList.add("active");
            selectedModel = option.dataset.model;

            option.style.transform = 'scale(0.95)';
            setTimeout(() => {
                option.style.transform = '';
            }, 150);

            console.log('Model switched to:', selectedModel);
        });
    });

    function sendMessage() {
        const messageText = messageInput.value.trim();
        if (messageText === "") return;

        addMessage(messageText, "sent", false, true);

        console.log('Sending message with history length:', conversationHistory.length);
        console.log('Using model:', selectedModel);

        messageInput.value = "";
        messageInput.style.height = "auto";

        sendButton.disabled = true;

        const loadingMessage = addLoadingMessage();

        const apiUrl = '/api/chat';
        console.log('Calling API:', apiUrl);

        fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: messageText,
                model: selectedModel,
                history: conversationHistory
            })
        })
        .then(async response => {
            console.log('Response status:', response.status);
            
            const responseClone = response.clone();
            
            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                } catch (jsonError) {
                    try {
                        const errorText = await responseClone.text();
                        throw new Error(errorText || `HTTP error! status: ${response.status}`);
                    } catch (textError) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                }
            }
            return response.json();
        })
        .then(data => {
            console.log('Response data:', data);
            
            if (loadingMessage && loadingMessage.parentNode) {
                loadingMessage.remove();
            }

            if (data.error) {
                addMessage(data.error, "system", false, true);
            } else if (data.response) {
                addMessage(data.response, "received", false, true);
                
                conversationHistory.push({
                    role: "user",
                    parts: [{ text: messageText }]
                });

                conversationHistory.push({
                    role: "model",
                    parts: [{ text: data.response }]
                });
                
                saveHistory();
                
                console.log('Response received, history length now:', conversationHistory.length);
            } else {
                console.error('Unexpected response format:', data);
                addMessage("Sorry, received an unexpected response format.", "system", false, true);
            }
        })
        .catch(error => {
            console.error("Error details:", error);
            if (loadingMessage && loadingMessage.parentNode) {
                loadingMessage.remove();
            }
            
            let errorMessage = error.message || "Sorry, something went wrong.";
            addMessage(errorMessage, "system", false, true);
        })
        .finally(() => {
            sendButton.disabled = false;
        });
    }

    function addMessage(text, type, isPlaceholder = false, shouldSave = false) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", type);

        if (!isPlaceholder) {
            if (type === "received" || type === "sent") {
                messageElement.innerHTML = parseMarkdown(text);
            } else {
                messageElement.textContent = text;
            }
        }

        chatContainer.appendChild(messageElement);

        requestAnimationFrame(() => {
            chatContainer.scrollTo({
                top: chatContainer.scrollHeight,
                behavior: 'smooth'
            });
        });
        
        if (shouldSave && !isPlaceholder) {
            saveChatMessages();
        }

        return messageElement;
    }
    
    function addLoadingMessage() {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", "received", "loading");
        
        const dotsContainer = document.createElement("div");
        dotsContainer.classList.add("dots");
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement("div");
            dot.classList.add("dot");
            dotsContainer.appendChild(dot);
        }
        
        messageElement.appendChild(dotsContainer);
        chatContainer.appendChild(messageElement);
        
        requestAnimationFrame(() => {
            chatContainer.scrollTo({
                top: chatContainer.scrollHeight,
                behavior: 'smooth'
            });
        });
        
        return messageElement;
    }
    
    function saveHistory() {
        try {
            sessionStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
        } catch (e) {
            console.error('Error saving history:', e);
        }
    }
    
    function saveChatMessages() {
        try {
            const messages = [];
            chatContainer.querySelectorAll('.message').forEach(msg => {
                const classList = Array.from(msg.classList);
                if (classList.includes('loading')) return;
                
                if (!classList.includes('received') || msg.textContent.trim() !== '') {
                    let type = 'received';
                    if (classList.includes('sent')) type = 'sent';
                    else if (classList.includes('system')) type = 'system';
                    
                    messages.push({
                        text: msg.textContent,
                        type: type
                    });
                }
            });
            sessionStorage.setItem('chatMessages', JSON.stringify(messages));
        } catch (e) {
            console.error('Error saving messages:', e);
        }
    }
    
    window.clearChatHistory = function() {
        conversationHistory = [];
        sessionStorage.removeItem('conversationHistory');
        sessionStorage.removeItem('chatMessages');
        chatContainer.innerHTML = '';
        console.log('Chat history cleared');
        setTimeout(() => {
            const welcomeText = "Hello! I'm Drift, your AI assistant. How can I help you today? 😊";
            addMessage(welcomeText, "received", false, false);
        }, 300);
    };

    if (sendButton) {
        sendButton.addEventListener("click", sendMessage);
    }

    if (messageInput) {
        messageInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });

        messageInput.addEventListener("input", function() {
            this.style.height = 'auto';
            const newHeight = this.scrollHeight;
            this.style.height = newHeight + 'px';
            
            // Adjust chat container padding based on input height
            const inputContainer = this.closest('.input-container');
            if (inputContainer) {
                const totalHeight = inputContainer.scrollHeight;
                chatContainer.style.paddingBottom = (totalHeight + 15) + 'px';
            }
        });
    }

    if (!savedHistory && !savedMessages) {
        setTimeout(() => {
            const welcomeText = "Hello! I'm Drift, your AI assistant. How can I help you today? 😊";
            addMessage(welcomeText, "received", false, false);
        }, 500);
    }

    return () => {
      if (sendButton) {
        sendButton.removeEventListener("click", sendMessage);
      }
    };
  }, []);

  return (
    <div id="root">
      <Head>
        <title>Drift AI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
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
          <div className="footer-text">Made with 💖 by Ryan. Drift is powered by Gemini</div>
        </div>
      </div>
    </div>
  );
}