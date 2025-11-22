import { useEffect } from 'react';
import Head from 'next/head';
import katex from 'katex';

export default function Home() {
  useEffect(() => {
    // Simple markdown parser with LaTeX support
    function parseMarkdown(text) {
      // Store LaTeX expressions to protect them from markdown processing
      const latexPlaceholders = [];
      let placeholderIndex = 0;

      // Process block LaTeX first ($$...$$)
      text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, latex) => {
        try {
          const rendered = katex.renderToString(latex.trim(), {
            displayMode: true,
            throwOnError: false,
            output: 'html'
          });
          const placeholder = `___LATEX_BLOCK_${placeholderIndex}___`;
          latexPlaceholders.push({ placeholder, rendered });
          placeholderIndex++;
          return placeholder;
        } catch (e) {
          console.error('LaTeX render error (block):', e);
          return match; // Return original if rendering fails
        }
      });

      // Process inline LaTeX ($...$)
      text = text.replace(/\$([^\$\n]+?)\$/g, (match, latex) => {
        try {
          const rendered = katex.renderToString(latex.trim(), {
            displayMode: false,
            throwOnError: false,
            output: 'html'
          });
          const placeholder = `___LATEX_INLINE_${placeholderIndex}___`;
          latexPlaceholders.push({ placeholder, rendered });
          placeholderIndex++;
          return placeholder;
        } catch (e) {
          console.error('LaTeX render error (inline):', e);
          return match; // Return original if rendering fails
        }
      });

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

      // Restore LaTeX placeholders with rendered HTML
      latexPlaceholders.forEach(({ placeholder, rendered }) => {
        html = html.replace(placeholder, rendered);
      });

      return html;
    }

    // Initialize chat functionality
    const chatContainer = document.querySelector(".chat-container");
    const messageInput = document.getElementById("message-input");
    const sendButton = document.getElementById("send-button");
    const uploadButton = document.getElementById("upload-button");
    const fileInput = document.getElementById("file-input");
    const imagePreviewContainer = document.querySelector(".image-preview-container");
    const modelOptions = document.querySelectorAll(".model-option");
    const modelToggle = document.querySelector(".model-toggle");
    const settingsBtn = document.querySelector(".settings-btn");
    const settingsPanel = document.querySelector(".settings-panel");
    const settingsOverlay = document.querySelector(".settings-overlay");
    const customSelect = document.querySelector(".custom-select");
    const customSelectTrigger = customSelect.querySelector(".custom-select-trigger");
    const customOptions = customSelect.querySelector(".custom-options");
    const imageViewerPanel = document.querySelector(".image-viewer-panel");
    const imageViewerOverlay = document.querySelector(".image-viewer-overlay");
    const imageViewerImg = document.querySelector(".image-viewer-img");


    let selectedPersona = localStorage.getItem('selectedPersona') || 'friendly';
    let selectedModel = "gemini-flash-latest";
    let conversationHistory = [];
    let selectedImages = [];

    // Set initial persona in custom dropdown
    if (customSelect) {
      const initialOption = customSelect.querySelector(`.custom-option[data-value="${selectedPersona}"]`);
      if (initialOption) {
        customSelect.querySelector('.custom-select-trigger span').textContent = initialOption.textContent;
        customOptions.querySelector('.custom-option.selected')?.classList.remove('selected');
        initialOption.classList.add('selected');
      }

      customSelectTrigger.addEventListener("click", () => {
        customSelect.classList.toggle("open");
      });

      customOptions.addEventListener("click", (e) => {
        if (e.target.classList.contains("custom-option")) {
          const selectedOption = e.target;
          const selectedValue = selectedOption.dataset.value;

          selectedPersona = selectedValue;
          localStorage.setItem('selectedPersona', selectedPersona);
          console.log('Persona changed to:', selectedPersona);

          customSelect.querySelector('.custom-select-trigger span').textContent = selectedOption.textContent;
          customOptions.querySelector('.custom-option.selected')?.classList.remove('selected');
          selectedOption.classList.add('selected');
          customSelect.classList.remove("open");
        }
      });

      window.addEventListener("click", (e) => {
        if (!customSelect.contains(e.target)) {
          customSelect.classList.remove("open");
        }
      });
    }

    // Theme switching functionality
    const themeToggle = document.querySelector(".theme-toggle");
    const themeOptions = document.querySelectorAll(".theme-option");
    let selectedTheme = localStorage.getItem('selectedTheme') || 'light';

    // Apply saved theme on page load
    document.documentElement.setAttribute('data-theme', selectedTheme);

    // Set initial active theme option
    if (themeToggle) {
      themeOptions.forEach(option => {
        if (option.dataset.theme === selectedTheme) {
          option.classList.add('active');
        } else {
          option.classList.remove('active');
        }
      });

      // Create and add the slider element for theme toggle
      const themeSlider = document.createElement('div');
      themeSlider.className = 'theme-toggle-slider';
      themeToggle.insertBefore(themeSlider, themeToggle.firstChild);

      // Function to update theme slider position
      function updateThemeSlider(activeOption) {
        const left = activeOption.offsetLeft;
        const width = activeOption.offsetWidth;
        themeSlider.style.width = `${width}px`;
        themeSlider.style.left = `${left}px`;
      }

      // Initialize theme slider position
      const activeThemeOption = document.querySelector('.theme-option.active');
      if (activeThemeOption) {
        updateThemeSlider(activeThemeOption);
      }

      // Theme option click handler
      themeOptions.forEach(option => {
        option.addEventListener('click', () => {
          const theme = option.dataset.theme;

          // Update active states
          themeOptions.forEach(opt => opt.classList.remove('active'));
          option.classList.add('active');

          // Apply theme
          selectedTheme = theme;
          document.documentElement.setAttribute('data-theme', theme);
          localStorage.setItem('selectedTheme', theme);

          // Update slider position with animation
          updateThemeSlider(option);
        });
      });

      // Update slider on window resize
      window.addEventListener('resize', () => {
        const activeThemeOption = document.querySelector('.theme-option.active');
        if (activeThemeOption) {
          updateThemeSlider(activeThemeOption);
        }
      });
    }

    // Upload button click handler
    uploadButton.addEventListener("click", () => {
      fileInput.click();
    });

    // File input change handler
    fileInput.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files);

      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageData = {
              data: event.target.result,
              name: file.name,
              type: file.type
            };
            selectedImages.push(imageData);
            displayImagePreview(imageData);
          };
          reader.readAsDataURL(file);
        }
      }

      // Reset file input
      fileInput.value = '';
    });

    function displayImagePreview(imageData) {
      const previewDiv = document.createElement("div");
      previewDiv.className = "image-preview";

      const img = document.createElement("img");
      img.src = imageData.data;

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-image-btn";
      removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      removeBtn.onclick = () => {
        selectedImages = selectedImages.filter(img => img.data !== imageData.data);

        // If this is the last image, animate the collapse
        if (selectedImages.length === 0) {
          animateAndClearImages();
        } else {
          // Otherwise just remove the preview
          previewDiv.remove();
        }
      };

      previewDiv.appendChild(img);
      previewDiv.appendChild(removeBtn);
      imagePreviewContainer.appendChild(previewDiv);
      imagePreviewContainer.classList.add('has-images');

      const inputWrapper = document.querySelector('.input-wrapper');
      if (inputWrapper) {
        inputWrapper.classList.add('has-images');
      }
    }

    function clearImagePreviews() {
      imagePreviewContainer.innerHTML = '';
      imagePreviewContainer.classList.remove('has-images');
      const inputWrapper = document.querySelector('.input-wrapper');
      if (inputWrapper) {
        inputWrapper.classList.remove('has-images');
      }
      selectedImages = [];
    }

    function animateAndClearImages() {
      // Remove the class to trigger the collapse animation
      imagePreviewContainer.classList.remove('has-images');
      const inputWrapper = document.querySelector('.input-wrapper');
      if (inputWrapper) {
        inputWrapper.classList.remove('has-images');
      }

      // Wait for the animation to finish (400ms) before clearing the content
      setTimeout(() => {
        imagePreviewContainer.innerHTML = '';
        selectedImages = [];
      }, 400);
    }

    // Load conversation history from localStorage on page load
    const savedHistory = localStorage.getItem('conversationHistory');
    const savedMessages = localStorage.getItem('chatMessages');

    if (savedHistory) {
      try {
        conversationHistory = JSON.parse(savedHistory);

        // Fix for invalid history: Clear if it starts with a model message
        // (Gemini API rejects histories that start with model role)
        if (conversationHistory.length > 0 && conversationHistory[0].role === 'model') {
          console.log('Detected invalid history format (starts with model message). Clearing...');
          conversationHistory = [];
          localStorage.removeItem('conversationHistory');
          localStorage.removeItem('chatMessages');
          // Will show welcome message below in the normal flow
        }
      } catch (e) {
        console.error('Error loading history:', e);
        conversationHistory = [];
      }
    }

    // Restore previous messages to chat UI
    if (savedMessages && conversationHistory.length > 0) {
      try {
        const messages = JSON.parse(savedMessages);
        messages.forEach(msg => {
          addMessage(msg.text, msg.type, false, false, msg.images);
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
      const left = activeOption.offsetLeft;
      const width = activeOption.offsetWidth;

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

    // Settings panel functionality
    function openSettings() {
      if (settingsPanel && settingsOverlay) {
        settingsPanel.classList.add('active');
        settingsOverlay.classList.add('active');
      }
    }

    function closeSettings() {
      if (settingsPanel && settingsOverlay) {
        settingsPanel.classList.remove('active');
        settingsOverlay.classList.remove('active');
      }
    }

    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        if (settingsPanel.classList.contains('active')) {
          closeSettings();
        } else {
          openSettings();
        }
      });
    }

    if (settingsOverlay) {
      settingsOverlay.addEventListener('click', closeSettings);
    }

    // Image viewer functionality
    function updateImageDimensions() {
      if (!imageViewerImg) return;

      // Reset styles to get natural dimensions if needed, though naturalWidth/Height should work
      const padding = 64; // 32px padding * 2
      const maxWidth = window.innerWidth * 0.9 - padding;
      const maxHeight = window.innerHeight * 0.9 - padding;

      const naturalWidth = imageViewerImg.naturalWidth;
      const naturalHeight = imageViewerImg.naturalHeight;

      if (naturalWidth === 0 || naturalHeight === 0) return;

      // Calculate scale to fit within max dimensions (90% of screen)
      // This handles both upscaling small images and downscaling large ones
      const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight);

      const finalWidth = naturalWidth * scale;
      const finalHeight = naturalHeight * scale;

      imageViewerImg.style.width = `${finalWidth}px`;
      imageViewerImg.style.height = `${finalHeight}px`;
    }

    function openImageViewer(imageSrc) {
      if (imageViewerPanel && imageViewerOverlay && imageViewerImg) {
        // Reset dimensions initially to avoid flickering old size
        imageViewerImg.style.width = '';
        imageViewerImg.style.height = '';

        const showPanel = () => {
          updateImageDimensions();
          imageViewerPanel.classList.add('active');
          imageViewerOverlay.classList.add('active');
        };

        imageViewerImg.onload = showPanel;
        imageViewerImg.src = imageSrc;

        if (imageViewerImg.complete) {
          showPanel();
        }
      }
    }

    window.addEventListener('resize', updateImageDimensions);

    function closeImageViewer() {
      if (imageViewerPanel && imageViewerOverlay) {
        imageViewerPanel.classList.remove('active');
        imageViewerOverlay.classList.remove('active');
      }
    }

    if (imageViewerOverlay) {
      imageViewerOverlay.addEventListener('click', closeImageViewer);
    }


    // Event delegation for message image clicks
    if (chatContainer) {
      chatContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('message-image') &&
          e.target.closest('.message.sent')) {
          openImageViewer(e.target.src);
        }
      });
    }


    function sendMessage() {
      const messageText = messageInput.value.trim();
      if (messageText === "" && selectedImages.length === 0) return;

      const messagesToSend = [...selectedImages];
      addMessage(messageText, "sent", false, true, messagesToSend);

      // Animate removal of images immediately
      if (selectedImages.length > 0) {
        animateAndClearImages();
      }

      messageInput.value = "";
      messageInput.style.height = "auto";

      sendButton.disabled = true;

      const loadingMessage = addLoadingMessage();

      const apiUrl = '/api/chat';

      // Prepare image data for API
      const imageData = selectedImages.map(img => ({
        data: img.data.split(',')[1], // Remove data:image/jpeg;base64, prefix
        mimeType: img.type
      }));

      fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText,
          model: selectedModel,
          history: conversationHistory,
          persona: selectedPersona,
          images: imageData
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

            // Build user message parts
            const userParts = [];
            if (messageText) {
              userParts.push({ text: messageText });
            }
            imageData.forEach(img => {
              userParts.push({
                inlineData: {
                  data: img.data,
                  mimeType: img.mimeType
                }
              });
            });

            conversationHistory.push({
              role: "user",
              parts: userParts
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

          // Clear images after sending (already animated out, just ensuring state is clean)
          // clearImagePreviews(); // No longer needed here as it's handled by animateAndClearImages
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

    function addMessage(text, type, isPlaceholder = false, shouldSave = false, images = []) {
      const messageElement = document.createElement("div");
      messageElement.classList.add("message", type);

      if (!isPlaceholder) {
        // Add images if present
        if (images && images.length > 0) {
          const imagesContainer = document.createElement("div");
          imagesContainer.className = "message-images";

          images.forEach(img => {
            const imgElement = document.createElement("img");
            imgElement.src = img.data;
            imgElement.className = "message-image";
            imagesContainer.appendChild(imgElement);
          });

          messageElement.appendChild(imagesContainer);
        }

        // Add text if present
        if (text) {
          const textContainer = document.createElement("div");
          if (type === "received" || type === "sent") {
            textContainer.innerHTML = parseMarkdown(text);
          } else {
            textContainer.textContent = text;
          }
          messageElement.appendChild(textContainer);
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

            // Extract images
            const images = [];
            msg.querySelectorAll('.message-image').forEach(img => {
              images.push({ data: img.src });
            });

            messages.push({
              text: msg.textContent,
              type: type,
              images: images
            });
          }
        });
        localStorage.setItem('chatMessages', JSON.stringify(messages));
      } catch (e) {
        console.error('Error saving messages:', e);
      }
    }

    window.clearChatHistory = function () {
      conversationHistory = [];
      localStorage.removeItem('conversationHistory');
      localStorage.removeItem('chatMessages');
      chatContainer.innerHTML = '';
      clearImagePreviews();
      setTimeout(() => {
        const welcomeText = 'Hello I am Drift, your AI assistant created by Ryan';
        addMessage(welcomeText, "received", false, true);
        // Welcome message is UI-only - Gemini API rejects histories starting with model role
      }, 300);
    };

    if (sendButton) {
      sendButton.addEventListener("click", sendMessage);
    }

    if (messageInput) {
      messageInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          if (!sendButton.disabled) {
            sendMessage();
          }
        }
      });

      messageInput.addEventListener("input", function () {
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

    // Show welcome message if conversation history is empty
    if (conversationHistory.length === 0) {
      setTimeout(() => {
        const welcomeText = 'Hello I am Drift, your AI assistant created by Ryan';
        addMessage(welcomeText, "received", false, true);
        // Welcome message is UI-only - Gemini API rejects histories starting with model role
      }, 500);
    }

    return () => {
      if (sendButton) {
        sendButton.removeEventListener("click", sendMessage);
      }
      if (settingsBtn) {
        settingsBtn.removeEventListener("click", openSettings);
      }
      if (settingsOverlay) {
        settingsOverlay.removeEventListener("click", closeSettings);
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

      <div className="settings-overlay"></div>

      <div className="image-viewer-overlay"></div>

      <div className="image-viewer-panel">
        <img className="image-viewer-img" src="" alt="Enlarged view" />
      </div>

      <div className="settings-panel">
        <h3>Persona</h3>
        <label htmlFor="persona-select">Choose personality:</label>
        <div className="custom-select-wrapper">
          <div className="custom-select">
            <div className="custom-select-trigger">
              <span>Friendly</span>
              <div className="arrow"></div>
            </div>
            <div className="custom-options">
              <div className="custom-option" data-value="friendly">Friendly</div>
              <div className="custom-option" data-value="neutral">Neutral</div>
              <div className="custom-option" data-value="toxic">Toxic</div>
            </div>
          </div>
        </div>

        <h3 style={{ marginTop: '24px' }}>Theme</h3>
        <label>Change theme:</label>
        <div className="theme-toggle">
          <button className="theme-option active" data-theme="light">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            Light
          </button>
          <button className="theme-option" data-theme="dark">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
            Dark
          </button>
        </div>
      </div>

      <div className="titlebar">
        Drift AI
        <button
          className="settings-btn"
          title="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        <button
          className="clear-history-btn"
          onClick={() => typeof window !== 'undefined' && window.clearChatHistory && window.clearChatHistory()}
          title="Clear chat history"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
      <div className="content-below-titlebar">
        <div className="chat-container"></div>
        <div className="input-container">
          <div className="model-toggle">
            <button className="model-option active" data-model="gemini-flash-latest">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              Fast
            </button>
            <button className="model-option" data-model="gemini-pro-latest">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3h12l4 6-10 13L2 9z"></path>
                <path d="M11 3 8 9l4 13 4-13-3-6"></path>
                <path d="M2 9h20"></path>
              </svg>
              Pro
            </button>
          </div>
          <div className="input-wrapper">
            <div className="input-controls">
              <div className="image-preview-container"></div>
              <div className="input-row">
                <input
                  type="file"
                  id="file-input"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                />
                <button id="upload-button" aria-label="Upload image">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <textarea
                  id="message-input"
                  placeholder="Type a message..."
                  rows="1"
                />
                <button id="send-button" aria-label="Send message">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 19V5M5 12L12 5L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="footer-text">Made with 💖 by Ryan • Drift is powered by Gemini</div>
        </div>
      </div>
    </div>
  );
}