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
      
      // Headers (must come before bold/italic)
      html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
      html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
      html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
      
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
      
      // Lists - process line by line to properly handle ordered and unordered
      let lines = html.split('\n');
      let result = [];
      let inList = false;
      let listType = null;
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let isUnordered = /^[\*\-]\s+(.+)$/.test(line);
        let isOrdered = /^\d+\.\s+(.+)$/.test(line);
        
        if (isUnordered || isOrdered) {
          let content = line.replace(/^[\*\-]\s+/, '').replace(/^\d+\.\s+/, '');
          let currentListType = isOrdered ? 'ol' : 'ul';
          
          if (!inList) {
            result.push(`<${currentListType}>`);
            inList = true;
            listType = currentListType;
          } else if (listType !== currentListType) {
            result.push(`</${listType}>`);
            result.push(`<${currentListType}>`);
            listType = currentListType;
          }
          
          result.push(`<li>${content}</li>`);
        } else {
          if (inList) {
            result.push(`</${listType}>`);
            inList = false;
            listType = null;
          }
          result.push(line);
        }
      }
      
      if (inList) {
        result.push(`</${listType}>`);
      }
      
      html = result.join('\n');
      
      // Line breaks -> paragraphs
      html = html.split('\n\n').map(para => {
        if (!para.match(/^<(ul|ol|pre|blockquote|h[1-3])/)) {
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
    const modelToggle = document.querySelector(".model-toggle");

    let selectedModel = "gemini-flash-latest";
    let conversationHistory = [];
    
    // Load conversation history from localStorage on page load
    const savedHistory = localStorage.getItem('conversationHistory');
    const savedMessages = localStorage.getItem('chatMessages');
    
    if (savedHistory) {
        try {
            conversationHistory = JSON.parse(savedHistory);
        } catch (e) {
            console.error('Error loading history:', e);
            conversationHistory = [];
        }
    }
    
    // Restore previous messages to chat UI
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

    // Create and add the slider element
    const slider = document.createElement('div');
    slider.className = 'model-toggle-slider';
    modelToggle.insertBefore(slider, modelToggle.firstChild);

    // Function to update slider position and width
    function updateSlider(activeOption) {
        const rect = activeOption.getBoundingClientRect();
        const containerRect = modelToggle.getBoundingClientRect();
        const left = rect.left - containerRect.left;
        const width = rect.width;
        
        slider.style.width = `${width}px`;
        slider.style.left = `${left}px`;
    }

    // Initialize slider position
    const activeOption = document.querySelector('.model-option.active');
    if (activeOption) {
        updateSlider(activeOption);
    }

    modelOptions.forEach(option => {
        option.addEventListener("click", () => {
            modelOptions.forEach(opt => opt.classList.remove("active"));
            option.classList.add("active");
            selectedModel = option.dataset.model;

            // Update slider position with animation
            updateSlider(option);
        });
    });

    // Update slider on window resize
    window.addEventListener('resize', () => {
        const activeOption = document.querySelector('.model-option.active');
        if (activeOption) {
            updateSlider(activeOption);
        }
    });

    function sendMessage() {
        const messageText = messageInput.value.trim();
        if (messageText === "") return;

        addMessage(messageText, "sent", false, true);

        messageInput.value = "";
        messageInput.style.height = "auto";

        sendButton.disabled = true;

        const loadingMessage = addLoadingMessage();

        const apiUrl = '/api/chat';

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
            } else {
                console.error('Unexpected response format:', data);
                addMessage("Sorry, received an unexpected response format.", "system", false, true);
            }
        })
        .catch(error => {
            console.error("Error:", error);
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
            localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
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
            localStorage.setItem('chatMessages', JSON.stringify(messages));
        } catch (e) {
            console.error('Error saving messages:', e);
        }
    }
    
    window.clearChatHistory = function() {
        conversationHistory = [];
        localStorage.removeItem('conversationHistory');
        localStorage.removeItem('chatMessages');
        chatContainer.innerHTML = '';
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
            <button id="send-button" aria-label="Send message"></button>
          </div>
          <div className="footer-text">Made with 💖 by Ryan • Drift is powered by Gemini</div>
        </div>
      </div>
    </div>
  );
}