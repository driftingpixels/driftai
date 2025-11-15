import { useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  useEffect(() => {
    // Initialize chat functionality
    const chatContainer = document.querySelector(".chat-container");
    const messageInput = document.getElementById("message-input");
    const sendButton = document.getElementById("send-button");
    const modelOptions = document.querySelectorAll(".model-option");

    let selectedModel = "gemini-flash-latest"; // Default model
    let conversationHistory = []; // Store conversation history
    
    // Load conversation history from sessionStorage on page load
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

    // Handle model selection
    modelOptions.forEach(option => {
        option.addEventListener("click", () => {
            modelOptions.forEach(opt => opt.classList.remove("active"));
            option.classList.add("active");
            selectedModel = option.dataset.model;

            // Add visual feedback
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

        // Add user's message to chat
        addMessage(messageText, "sent", false, true);

        console.log('Sending message with history length:', conversationHistory.length);
        console.log('Using model:', selectedModel);

        messageInput.value = "";
        messageInput.style.height = "auto"; // Reset height

        // Disable send button while processing
        sendButton.disabled = true;
        const originalContent = sendButton.textContent;
        sendButton.textContent = "...";

        // Add a temporary loading indicator for the bot response
        const loadingMessage = addMessage("", "received", true, false);

        // Use relative URL for API call - Next.js will handle routing
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
            
            // Clone the response so we can read it multiple times if needed
            const responseClone = response.clone();
            
            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                } catch (jsonError) {
                    // If JSON parsing fails, try text
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
            
            // Remove the loading indicator
            if (loadingMessage && loadingMessage.parentNode) {
                loadingMessage.remove();
            }

            if (data.error) {
                addMessage(data.error, "system", false, true);
            } else if (data.response) {
                addMessage(data.response, "received", false, true);
                
                // Add user message to history in Gemini format
                conversationHistory.push({
                    role: "user",
                    parts: [{ text: messageText }]
                });

                // Add model response to history in Gemini format
                conversationHistory.push({
                    role: "model",
                    parts: [{ text: data.response }]
                });
                
                // Save updated history
                saveHistory();
                
                console.log('Response received, history length now:', conversationHistory.length);
            } else {
                console.error('Unexpected response format:', data);
                addMessage("Sorry, received an unexpected response format.", "system", false, true);
            }
        })
        .catch(error => {
            console.error("Error details:", error);
            // Remove the loading indicator
            if (loadingMessage && loadingMessage.parentNode) {
                loadingMessage.remove();
            }
            
            let errorMessage = error.message || "Sorry, something went wrong.";
            addMessage(errorMessage, "system", false, true);
        })
        .finally(() => {
            // Re-enable send button
            sendButton.disabled = false;
            sendButton.textContent = originalContent;
        });
    }

    function addMessage(text, type, isPlaceholder = false, shouldSave = false) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", type);

        if (!isPlaceholder) {
            messageElement.textContent = text;
        }

        chatContainer.appendChild(messageElement);

        // Smooth scroll to bottom
        requestAnimationFrame(() => {
            chatContainer.scrollTo({
                top: chatContainer.scrollHeight,
                behavior: 'smooth'
            });
        });
        
        // Save message to sessionStorage if needed
        if (shouldSave && !isPlaceholder) {
            saveChatMessages();
        }

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
    
    // Add a clear history button functionality
    window.clearChatHistory = function() {
        conversationHistory = [];
        sessionStorage.removeItem('conversationHistory');
        sessionStorage.removeItem('chatMessages');
        chatContainer.innerHTML = '';
        console.log('Chat history cleared');
        // Show welcome message again
        setTimeout(() => {
            const welcomeText = "Hello! I'm Drift, your AI assistant. How can I help you today? 😊";
            addMessage(welcomeText, "received", false, false);
        }, 300);
    };

    // Send button click handler
    if (sendButton) {
        sendButton.addEventListener("click", sendMessage);
    }

    // Enter key handler
    if (messageInput) {
        messageInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });

        // Auto-resize textarea
        messageInput.addEventListener("input", function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight > 150 ? 150 : this.scrollHeight) + 'px';
        });
    }

    // Initial welcome message only if no saved history
    if (!savedHistory && !savedMessages) {
        setTimeout(() => {
            const welcomeText = "Hello! I'm Drift, your AI assistant. How can I help you today? 😊";
            addMessage(welcomeText, "received", false, false);
        }, 500);
    }

    // Cleanup
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
          <div className="footer-text">Made with 💖 by Ryan. AI can make mistakes</div>
        </div>
      </div>
    </div>
  );
}