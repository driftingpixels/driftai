document.addEventListener("DOMContentLoaded", () => {
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

    sendButton.addEventListener("click", sendMessage);
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

        // Use absolute URL for API call to ensure correct routing
        const apiUrl = `${window.location.origin}/api/chat`;
        console.log('API URL:', apiUrl);

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
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || `HTTP error! status: ${response.status}`);
                }).catch(() => {
                    throw new Error(`HTTP error! status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            // Remove the loading indicator
            if (loadingMessage) {
                loadingMessage.remove();
            }

            if (data.error) {
                addMessage(`Error: ${data.error}`, "received", false, true);
            } else {
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
            }
        })
        .catch(error => {
            console.error("Error:", error);
            // Remove the loading indicator
            if (loadingMessage) {
                loadingMessage.remove();
            }
            addMessage(`Sorry, something went wrong: ${error.message}`, "received", false, true);
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
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
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
                if (!msg.classList.contains('received') || msg.textContent.trim() !== '') {
                    messages.push({
                        text: msg.textContent,
                        type: msg.classList.contains('sent') ? 'sent' : 'received'
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

    // Initial welcome message only if no saved history
    if (!savedHistory && !savedMessages) {
        setTimeout(() => {
            const welcomeText = "Hello! I'm Drift, your AI assistant. How can I help you today? 😊";
            addMessage(welcomeText, "received", false, false);
        }, 500);
    }
});