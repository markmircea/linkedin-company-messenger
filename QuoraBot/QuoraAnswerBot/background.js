// Updated background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getAnswer') {
    console.log('Background script received message:', message);
    
    // Keep the connection alive until we have a response
    const fetchData = async () => {
      try {
        console.log('Attempting API call to OpenRouter');
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${message.apiKey}`,
            "HTTP-Referer": "chrome-extension://" + chrome.runtime.id,
            "X-Title": "Quora Answer Bot - AIBRAINL.INK",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: message.model,
            messages: [
              {
                role: "system",
                content: message.instructions
              },
              {
                role: "user",
                content: message.question
              }
            ]
          })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error response:', errorText);
          sendResponse({success: false, error: `API error: ${response.status} ${errorText}`});
          return;
        }
        
        const data = await response.json();
        console.log('API success response:', data);
        sendResponse({success: true, data: data});
      } catch (error) {
        console.error('Fetch error details:', error);
        sendResponse({success: false, error: error.toString()});
      }
    };
    
    fetchData();
    return true; // Indicates we'll respond asynchronously
  }
});

// Log when background script is initialized
console.log('Background script initialized');