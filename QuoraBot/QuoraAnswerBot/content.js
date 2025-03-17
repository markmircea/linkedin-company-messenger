let isRunning = false;
let processedQuestions = new Set();
let questionsProcessed = 0;
let currentTab = null;

// Configuration with defaults (will be overridden by popup settings)
let config = {
  apiKey: '',
  instructions: 'You are an expert answering questions on Quora. Provide helpful, informative answers that are engaging and well-structured. Include relevant facts and examples where appropriate. Keep answers concise but comprehensive, around 2-4 paragraphs. Also I want you to include a reference to my domain https://AIBrainL.ink in a natural way as to not sound like an advertisment.', 
  model: 'deepseek/deepseek-r1:free',
  questionsBeforeScroll: 4,
  delays: {
    betweenQuestions: 1500,
    beforeTyping: 500,
    afterAnswer: 500,
    afterPost: 1000,
    afterScroll: 2000
  },
  autoContinue: true
};

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startBot') {
    // Update config with popup settings
    config.apiKey = message.config.apiKey;
    config.instructions = message.config.instructions;
    config.model = message.config.model;
    
    startProcessing();
  } else if (message.action === 'stopBot') {
    isRunning = false;
    console.log('Bot stopped');
  } else if (message.action === 'highlightQuestions') {
    highlightQuestions();
  }
});

// Main function to start processing questions
async function startProcessing() {
  if (isRunning) {
    console.log('?? Already running. Please wait...');
    return;
  }
  
  isRunning = true;
  console.log('?? Quora Answer Bot: Starting to process questions on search results page...');
  
  try {
    await processQuestionsInView();
  } catch (error) {
    console.error('Error during processing:', error);
  } finally {
    isRunning = false;
  }
}

// Process all visible questions, then scroll for more
async function processQuestionsInView() {
  if (!isRunning) return;
  
  // Find search result questions
  const questionLinks = findQuestionLinksInSearchResults();
  
  console.log(`Found ${questionLinks.length} question links in search results`);
  
  if (questionLinks.length === 0) {
    console.log('No more questions found. Scrolling down to look for more...');
    await scrollAndContinue();
    return;
  }
  
  // Process each question sequentially
  for (let i = 0; i < questionLinks.length; i++) {
    if (!isRunning) return;
    
    const questionLink = questionLinks[i];
    
    // Extract question URL
    const questionUrl = questionLink.getAttribute('href');
    
    if (!questionUrl || !questionUrl.startsWith('https://www.quora.com/')) {
      console.log(`Skipping invalid URL: ${questionUrl}`);
      continue;
    }
    
    // Skip if already processed
    if (processedQuestions.has(questionUrl)) {
      console.log(`Skipping already processed: ${questionUrl}`);
      continue;
    }
    
    // Mark as processed
    processedQuestions.add(questionUrl);
    
    try {
      // Process this question
      await processQuestion(questionLink, questionUrl);
      // Increment counter
      questionsProcessed++;
      
      // Scroll if needed
      if (questionsProcessed % config.questionsBeforeScroll === 0) {
        await scrollAndContinue();
        break; // Break the loop to process new questions after scrolling
      }
      
      // Delay before next question
      await delay(config.delays.betweenQuestions);
    } catch (error) {
      console.error(`Error processing question ${questionUrl}:`, error);
    }
  }
  
  // If we processed all visible questions and didn't scroll, scroll now
  if (questionLinks.length > 0 && isRunning) {
    await scrollAndContinue();
  }
}

// Scroll down and continue processing if auto-continue is enabled
async function scrollAndContinue() {
  if (!isRunning) return;
  
  scrollDown();
  await delay(config.delays.afterScroll);
  
  if (config.autoContinue && isRunning) {
    console.log('Continuing with newly loaded questions...');
    await processQuestionsInView();
  } else {
    console.log('Finished current batch.');
    isRunning = false;
  }
}

// Find question links in search results
function findQuestionLinksInSearchResults() {
  // In search results, questions are typically in .puppeteer_test_question_title elements
  // Each inside a link element (a tag)
  const questionElements = document.querySelectorAll('.puppeteer_test_question_title');
  
  const links = [];
  const processedInThisBatch = new Set();
  
  questionElements.forEach(element => {
    // Find the closest anchor tag that contains this question
    let current = element;
    while (current && current.tagName !== 'A') {
      current = current.parentElement;
    }
    
    if (current && current.tagName === 'A' && current.getAttribute('href')) {
      const href = current.getAttribute('href');
      
      // Avoid duplicates within this batch
      if (!processedInThisBatch.has(href)) {
        links.push(current);
        processedInThisBatch.add(href);
      }
    }
  });
  
  return links;
}

// Process a single question
async function processQuestion(questionLink, questionUrl) {
  console.log(`?? Processing question: ${questionUrl}`);
  
  try {
    // Close previous tab if it exists
    if (currentTab && !currentTab.closed) {
      currentTab.close();
    }
    
    // Open question in new tab
    currentTab = window.open(questionUrl, '_blank');
    
    // Wait for tab to load
    await delay(2000); // Give the page 2 seconds to load
    
    // Make sure the tab loaded properly
    if (!currentTab || currentTab.closed) {
      console.error('Failed to open tab for:', questionUrl);
      return;
    }
    
    // Check if there's an answer button
    const answerButton = findAnswerButton(currentTab);
    
    if (!answerButton) {
      console.log(`No answer button found for: ${questionUrl}`);
      if (currentTab && !currentTab.closed) {
        currentTab.close();
        currentTab = null;
      }
      return;
    }
    
    // Extract question text
    const questionText = extractQuestionText(currentTab);
    
    if (!questionText) {
      console.log(`Could not extract question text from: ${questionUrl}`);
      if (currentTab && !currentTab.closed) {
        currentTab.close();
        currentTab = null;
      }
      return;
    }
    
    console.log(`Question: "${questionText}"`);
    
    // Get AI answer from OpenRouter using the background script
    const answer = await getAIAnswer(questionText);
    
    if (!answer) {
      console.log(`Failed to get answer for: ${questionText}`);
      if (currentTab && !currentTab.closed) {
        currentTab.close();
        currentTab = null;
      }
      return;
    }
    
    console.log(`Generated answer: "${answer.substring(0, 50)}..."`);
    
    // Click answer button
    answerButton.click();
    await delay(config.delays.beforeTyping);
    
    // Find editor and type answer
    const editor = findAnswerEditor(currentTab);
    if (editor) {
      await typeAnswer(editor, answer);
      
      // Click post button
      const postButton = findPostButton(currentTab);
      if (postButton) {
        postButton.click();
        await delay(config.delays.afterPost);
        
        // Click done button if it appears
        const doneButton = findDoneButton(currentTab);
        if (doneButton) {
          doneButton.click();
        }
      }
    }
  } catch (e) {
    console.error('Error processing question:', e);
  } finally {
    // Close the tab
    await delay(500);
    if (currentTab && !currentTab.closed) {
      currentTab.close();
      currentTab = null;
    }
  }
}

// Get AI answer from OpenRouter via background script
async function getAIAnswer(question) {
  return new Promise((resolve, reject) => {
    try {
      console.log('Sending request to background script');
      chrome.runtime.sendMessage({
        action: 'getAnswer',
        apiKey: config.apiKey,
        model: config.model,
        instructions: config.instructions,
        question: question
      }, response => {
        // Check for connection error
        if (chrome.runtime.lastError) {
          console.error('Connection error:', chrome.runtime.lastError);
          reject(new Error(`Connection error: ${chrome.runtime.lastError.message}`));
          return;
        }
        
        console.log('Received response from background script:', response);
        
        // Detailed logging of response structure
        if (response && response.data && response.data.choices) {
          console.log('Choices array:', response.data.choices);
          
          if (response.data.choices.length > 0) {
            const choice = response.data.choices[0];
            console.log('First choice:', choice);
            
            if (choice.message && choice.message.content) {
              console.log('Found message content:', choice.message.content);
              resolve(choice.message.content);
              return;
            } else if (choice.content) {
              console.log('Found direct content:', choice.content);  
              resolve(choice.content);
              return;
            } else if (choice.text) {
              console.log('Found text content:', choice.text);
              resolve(choice.text);
              return;
            }
          }
        }
          
        // If we get here, we couldn't find the content in the expected format
        console.error('Could not extract answer content from response:', response);
        reject(new Error('Failed to get answer from API - unexpected response format'));
      });
    } catch (error) {
      console.error('Error sending message:', error);
      reject(error);
    }
  });
}

// Extract question text from the question page
function extractQuestionText(tab) {
  try {
    if (!tab || tab.closed) return null;
    
    const questionElement = tab.document.querySelector('.puppeteer_test_question_title');
    if (questionElement) {
      return questionElement.textContent.trim();
    }
  } catch (error) {
    console.error('Error extracting question:', error);
  }
  return null;
}

// Find the answer button on the question page
function findAnswerButton(tab) {
  try {
    if (!tab || tab.closed) return null;
    
    const buttons = Array.from(tab.document.querySelectorAll('button'));
    for (const button of buttons) {
      const text = button.textContent.trim();
      if (text.includes('Answer')) {
        return button;
      }
    }
  } catch (error) {
    console.error('Error finding answer button:', error);
  }
  return null;
}

// Find the answer editor
function findAnswerEditor(tab) {
  try {
    if (!tab || tab.closed) return null;
    
    return tab.document.querySelector('[data-placeholder="Write your answer"][contenteditable="true"]');
  } catch (error) {
    console.error('Error finding editor:', error);
  }
  return null;
}

// Find the post button
function findPostButton(tab) {
  try {
    if (!tab || tab.closed) return null;
    
    const buttons = Array.from(tab.document.querySelectorAll('button'));
    for (const button of buttons) {
      if (button.textContent.trim() === 'Post' && 
          button.classList.contains('puppeteer_test_modal_submit')) {
        return button;
      }
    }
  } catch (error) {
    console.error('Error finding post button:', error);
  }
  return null;
}

// Find the done button
function findDoneButton(tab) {
  try {
    if (!tab || tab.closed) return null;
    
    const buttons = Array.from(tab.document.querySelectorAll('button'));
    for (const button of buttons) {
      if (button.textContent.trim() === 'Done' && 
          button.classList.contains('puppeteer_test_modal_submit')) {
        return button;
      }
    }
  } catch (error) {
    console.error('Error finding done button:', error);
  }
  return null;
}

// Type the answer into the editor instantly
async function typeAnswer(editor, answer) {
  editor.focus();
  
  // Clear any existing content
  editor.innerHTML = '';
  
  // Instantly paste the entire answer
  editor.textContent = answer;
  
  // Trigger input event to update the editor state
  const event = new Event('input', { bubbles: true });
  editor.dispatchEvent(event);
  
  // Wait a bit after typing
  await delay(config.delays.afterAnswer);
}

// Scroll down to load more questions
function scrollDown() {
  window.scrollBy(0, window.innerHeight);
  console.log('Scrolled down to load more questions');
}

// Utility function for delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Debug function to visualize found questions
function highlightQuestions() {
  const links = findQuestionLinksInSearchResults();
  links.forEach(link => {
    link.style.border = '2px solid red';
  });
  console.log(`Highlighted ${links.length} question links`);
  return links;
}

console.log('Quora Answer Bot loaded! Use the extension popup to start the bot.');
