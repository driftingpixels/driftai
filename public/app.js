document.addEventListener("DOMContentLoaded", () => {
    const chatContainer = document.querySelector(".chat-container");
    const messageInput = document.getElementById("message-input");
    const sendButton = document.getElementById("send-button");
    const modelOptions = document.querySelectorAll(".model-option");
    
    let selectedModel = "gemini-flash-latest"; // Default model

    // Handle model selection
    modelOptions.forEach(option => {
        option.addEventListener("click", () => {
            modelOptions.forEach(opt => opt.classList.remove("active"));
            option.classList.add("active");
            selectedModel = option.dataset.model;
        });
    });

    sendButton.addEventListener("click", sendMessage);
    messageInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    function sendMessage() {
        const messageText = messageInput.value.trim();
        if (messageText === "") return;

        addMessage(messageText, "sent");
        messageInput.value = "";

        // Disable send button while processing
        sendButton.disabled = true;
        sendButton.textContent = "Sending...";

        fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
                message: messageText,
                model: selectedModel
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                addMessage(`Error: ${data.error}`, "received");
            } else {
                addMessage(data.response, "received");
            }
        })
        .catch(error => {
            console.error("Error:", error);
            addMessage(`Sorry, something went wrong: ${error.message}`, "received");
        })
        .finally(() => {
            // Re-enable send button
            sendButton.disabled = false;
            sendButton.textContent = "Send";
        });
    }

    function addMessage(text, type) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", type);
        messageElement.textContent = text;
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
});