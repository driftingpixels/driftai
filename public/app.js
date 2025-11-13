document.addEventListener("DOMContentLoaded", () => {
    const chatContainer = document.querySelector(".chat-container");
    const messageInput = document.getElementById("message-input");
    const sendButton = document.getElementById("send-button");

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

        fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: messageText })
        })
        .then(response => response.json())
        .then(data => {
            addMessage(data.response, "received");
        })
        .catch(error => {
            console.error("Error:", error);
            addMessage("Sorry, something went wrong.", "received");
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