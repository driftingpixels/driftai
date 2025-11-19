document.addEventListener("DOMContentLoaded", () => {
    const chatContainer = document.querySelector(".chat-container");
    const messageInput = document.getElementById("message-input");
    const sendButton = document.getElementById("send-button");
    const modelOptions = document.querySelectorAll(".model-option");
    const modelToggle = document.querySelector(".model-toggle");
    const uploadButton = document.getElementById("upload-button");
    const imageUploadInput = document.getElementById("image-upload");
    const imagePreviewContainer = document.getElementById("image-preview-container");

    let selectedModel = "gemini-flash-latest"; // Default model
    let conversationHistory = []; // Store conversation history
    let uploadedImages = []; // Store uploaded images

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

    // Handle model selection
    modelOptions.forEach(option => {
        option.addEventListener("click", () => {
            modelOptions.forEach(opt => opt.classList.remove("active"));
            option.classList.add("active");
            selectedModel = option.dataset.model;

            // Update slider position with animation
            updateSlider(option);

            console.log('Model switched to:', selectedModel);
        });
    });

    // Update slider on window resize
    window.addEventListener('resize', () => {
        const activeOption = document.querySelector('.model-option.active');
        if (activeOption) {
            updateSlider(activeOption);
        }
    });

    // Image upload functionality
    uploadButton.addEventListener('click', () => {
        imageUploadInput.click();
    });

    imageUploadInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);

        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();

                reader.onload = (event) => {
                    const imageData = {
                        data: event.target.result,
                        file: file
                    };

                    uploadedImages.push(imageData);
                    addImagePreview(imageData, uploadedImages.length - 1);
                    updatePreviewContainer();
                };

                reader.readAsDataURL(file);
            }
        });

        // Reset the input
        imageUploadInput.value = '';
    });

    function addImagePreview(imageData, index) {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'image-preview';
        previewDiv.dataset.index = index;

        const img = document.createElement('img');
        img.src = imageData.data;
        img.alt = 'Uploaded image';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-image-btn';
        removeBtn.innerHTML = '×';
        removeBtn.addEventListener('click', () => {
            removeImage(index);
        });

        previewDiv.appendChild(img);
        previewDiv.appendChild(removeBtn);
        imagePreviewContainer.appendChild(previewDiv);
    }

    function removeImage(index) {
        // Remove from array
        uploadedImages.splice(index, 1);

        // Clear and rebuild preview
        imagePreviewContainer.innerHTML = '';
        uploadedImages.forEach((img, idx) => {
            addImagePreview(img, idx);
        });

        updatePreviewContainer();
    }

    function updatePreviewContainer() {
        if (uploadedImages.length > 0) {
            imagePreviewContainer.classList.add('has-images');
        } else {
            imagePreviewContainer.classList.remove('has-images');
        }
    }

    sendButton.addEventListener("click", sendMessage);
    messageInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea
    messageInput.addEventListener("input", function () {
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

        // Clear uploaded images after sending
        uploadedImages = [];
        imagePreviewContainer.innerHTML = '';
        updatePreviewContainer();

        // Disable send button while processing
        sendButton.disabled = true;

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
            .then(response => {
                console.log('Response status:', response.status);
                console.log('Response headers:', response.headers);

                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || `HTTP error! status: ${response.status}`);
                    }).catch((jsonErr) => {
                        // If JSON parsing fails, return text response
                        return response.text().then(text => {
                            throw new Error(text || `HTTP error! status: ${response.status}`);
                        });
                    });
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
                    addMessage(`Error: ${data.error}`, "received", false, true);
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
                    addMessage("Sorry, received an unexpected response format.", "received", false, true);
                }
            })
            .catch(error => {
                console.error("Error details:", error);
                // Remove the loading indicator
                if (loadingMessage && loadingMessage.parentNode) {
                    loadingMessage.remove();
                }

                let errorMessage = "Sorry, something went wrong.";
                if (error.message) {
                    errorMessage += ` ${error.message}`;
                }

                addMessage(errorMessage, "received", false, true);
            })
            .finally(() => {
                // Re-enable send button
                sendButton.disabled = false;
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
    window.clearChatHistory = function () {
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