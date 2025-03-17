document.addEventListener('DOMContentLoaded', function() {
  // Load saved settings
  chrome.storage.local.get(['apiKey', 'instructions', 'model'], function(data) {
    if (data.apiKey) document.getElementById('apiKey').value = data.apiKey;
    if (data.instructions) document.getElementById('instructions').value = data.instructions;
    if (data.model) document.getElementById('model').value = data.model;
  });
  
  // Start Bot button
  document.getElementById('startBot').addEventListener('click', function() {
    const apiKey = document.getElementById('apiKey').value;
    const instructions = document.getElementById('instructions').value;
    const model = document.getElementById('model').value;
    
    // Save settings
    chrome.storage.local.set({apiKey, instructions, model});
    
    // Start the bot
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'startBot',
        config: {apiKey, instructions, model}
      });
    });
    
    document.getElementById('status').textContent = 'Bot started!';
  });
  
  // Stop Bot button
  document.getElementById('stopBot').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'stopBot'});
    });
    
    document.getElementById('status').textContent = 'Bot stopped!';
  });
  
  // Highlight Questions button
  document.getElementById('highlightQuestions').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'highlightQuestions'});
    });
    
    document.getElementById('status').textContent = 'Questions highlighted!';
  });
});
