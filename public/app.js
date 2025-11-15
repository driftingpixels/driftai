document.addEventListener("DOMContentLoaded", () => {
    const chatContainer = document.querySelector(".chat-container");
    const messageInput = document.getElementById("message-input");
    const sendButton = document.getElementById("send-button");
    const modelOptions = document.querySelectorAll(".model-option");

    let selectedModel = "gemini-flash-latest"; // Default model
    let conversationHistory = []; // Store conversation history

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
        addMessage(messageText, "sent");
        
        // Add user message to history in Gemini format
        conversationHistory.push({
            role: "user",
            parts: [{ text: messageText }]
        });

        console.log('Sending message with history length:', conversationHistory.length);
        console.log('Using model:', selectedModel);

        messageInput.value = "";
        messageInput.style.height = "auto"; // Reset height

        // Disable send button while processing
        sendButton.disabled = true;
        const originalContent = sendButton.textContent;
        sendButton.textContent = "...";

        // Add a temporary loading indicator for the bot response
        const loadingMessage = addMessage("", "received", true);

        fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: messageText,
                model: selectedModel,
                history: conversationHistory.slice(0, -1) // Send history without current message
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || `HTTP error! status: ${response.status}`);
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
                addMessage(`Error: ${data.error}`, "received");
                // Remove the failed user message from history
                conversationHistory.pop();
            } else {
                addMessage(data.response, "received");
                
                // Add model response to history in Gemini format
                conversationHistory.push({
                    role: "model",
                    parts: [{ text: data.response }]
                });
                
                console.log('Response received, history length now:', conversationHistory.length);
            }
        })
        .catch(error => {
            console.error("Error:", error);
            // Remove the loading indicator
            if (loadingMessage) {
                loadingMessage.remove();
            }
            addMessage(`Sorry, something went wrong: ${error.message}`, "received");
            // Remove the failed user message from history
            conversationHistory.pop();
        })
        .finally(() => {
            // Re-enable send button
            sendButton.disabled = false;
            sendButton.textContent = originalContent;
        });
    }

    function addMessage(text, type, isPlaceholder = false) {
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

        return messageElement;
    }

    // Initial welcome message
    setTimeout(() => {
        const welcomeText = "Hello! I'm Drift, your AI assistant. How can I help you today? 😊";
        addMessage(welcomeText, "received");
        
        // Add welcome message to history
        conversationHistory.push({
            role: "model",
            parts: [{ text: welcomeText }]
        });
    }, 500);
});d");
            // Remove the failed user message from history
            conversationHistory.pop();
        })
        .finally(() => {
            // Re-enable send button
            sendButton.disabled = false;
            sendButton.textContent = originalContent;
        });
    }

    function addMessage(text, type, isPlaceholder = false) {
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

        return messageElement;
    }

    // Initial welcome message
    setTimeout(() => {
        const welcomeText = "Hello! I'm Drift, your AI assistant. How can I help you today? 😊";
        addMessage(welcomeText, "received");
        
        // Add welcome message to history
        conversationHistory.push({
            role: "model",
            parts: [{ text: welcomeText }]
        });
    }, 500);
});d");
        })
        .finally(() => {
            // Re-enable send button
            sendButton.disabled = false;
            sendButton.textContent = originalContent;
        });
    }

    function addMessage(text, type, isPlaceholder = false) {
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

        return messageElement;
    }

    // Initial welcome message
    setTimeout(() => {
        const welcomeText = "Hello! I'm Drift, your AI assistant. How can I help you today? 😊";
        addMessage(welcomeText, "received");
        
        // Add welcome message to history
        conversationHistory.push({
            role: "model",
            parts: [{ text: welcomeText }]
        });
    }, 500);
});