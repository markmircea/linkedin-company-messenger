// Quora Answer Bot - Console Version for Search Results Page
// Paste this script directly into the browser console while on a Quora search results page

(function() {
    'use strict';

    // Configuration - EDIT THESE VALUES
    const config = {
        // Your OpenRouter proxy server URL (REQUIRED)
        PROXY_URL: 'http://localhost:3000/api/generate',
        // Set the model you want to use
        MODEL: 'deepseek/deepseek-r1:free',
        // Custom instructions for the AI
        CUSTOM_INSTRUCTIONS: 'You are an expert answering questions on Quora. Provide helpful, informative answers that are engaging and well-structured. Use a friendly, conversational tone. Include relevant facts and examples where appropriate. Keep answers concise but comprehensive, around 3-5 paragraphs.',
        // Number of questions to process before scrolling
        QUESTIONS_BEFORE_SCROLL: 4,
        // Delay between operations (ms)
        DELAYS: {
            BETWEEN_QUESTIONS: 1500,  // Reduced delay between questions
            BEFORE_TYPING: 500,       // Reduced delay before typing
            TYPING_SPEED: 'instant',  // 'instant' for paste-like speed, or a number in ms for delay per character
            AFTER_ANSWER: 500,        // Reduced delay after answer
            AFTER_POST: 1000,         // Reduced delay after posting
            AFTER_SCROLL: 2000        // Delay after scrolling to let new content load
        },
        // Maximum number of questions to process (0 = unlimited)
        MAX_QUESTIONS: 0,
        // Auto-continue after scrolling
        AUTO_CONTINUE: true,
        // Use mock answers if API fails (true) or stop processing (false)
        USE_MOCK_FALLBACK: true
    };

    // Track processed questions to avoid duplicates
    const processedQuestions = new Set();
    let questionsProcessed = 0;
    let currentTab = null;
    let isRunning = false;

    // Main function to start processing questions
    async function startProcessing() {
        if (isRunning) {
            console.log('🤖 Already running. Please wait...');
            return;
        }
        
        isRunning = true;
        console.log('🤖 Quora Answer Bot: Starting to process questions on search results page...');
        
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
            // Check if we've reached the maximum number of questions
            if (config.MAX_QUESTIONS > 0 && questionsProcessed >= config.MAX_QUESTIONS) {
                console.log(`Reached maximum number of questions (${config.MAX_QUESTIONS}). Stopping.`);
                return;
            }
            
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
                if (questionsProcessed % config.QUESTIONS_BEFORE_SCROLL === 0) {
                    await scrollAndContinue();
                    break; // Break the loop to process new questions after scrolling
                }
                
                // Delay before next question
                await delay(config.DELAYS.BETWEEN_QUESTIONS);
            } catch (error) {
                console.error(`Error processing question ${questionUrl}:`, error);
            }
        }
        
        // If we processed all visible questions and didn't scroll, scroll now
        if (questionLinks.length > 0) {
            await scrollAndContinue();
        }
    }

    // Scroll down and continue processing if auto-continue is enabled
    async function scrollAndContinue() {
        scrollDown();
        await delay(config.DELAYS.AFTER_SCROLL);
        
        if (config.AUTO_CONTINUE) {
            console.log('Continuing with newly loaded questions...');
            await processQuestionsInView();
        } else {
            console.log('Finished current batch. Run startQuoraBot() again to process more.');
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
        console.log(`🤖 Processing question: ${questionUrl}`);
        
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
            
            // Get AI answer from OpenRouter through proxy
            let answer;
            try {
                answer = await getAIAnswer(questionText);
                if (!answer && config.USE_MOCK_FALLBACK) {
                    console.log("API failed, using mock answer as fallback");
                    answer = generateMockAnswer(questionText);
                }
            } catch (error) {
                if (config.USE_MOCK_FALLBACK) {
                    console.log("API error, using mock answer as fallback");
                    answer = generateMockAnswer(questionText);
                } else {
                    throw error;
                }
            }
            
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
            await delay(config.DELAYS.BEFORE_TYPING);
            
            // Find editor and type answer
            const editor = findAnswerEditor(currentTab);
            if (editor) {
                await typeAnswer(editor, answer);
                
                // Click post button
                const postButton = findPostButton(currentTab);
                if (postButton) {
                    postButton.click();
                    await delay(config.DELAYS.AFTER_POST);
                    
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

    // Get AI-generated answer from OpenRouter via proxy
    async function getAIAnswer(question) {
        try {
            console.log(`Sending request to proxy: ${config.PROXY_URL}`);
            
            const response = await fetch(config.PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: question,
                    instructions: config.CUSTOM_INSTRUCTIONS
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Proxy request failed: ${response.status} ${errorText}`);
            }
            
            const data = await response.json();
            
            if (data && data.choices && data.choices[0] && data.choices[0].message) {
                return data.choices[0].message.content;
            } else {
                console.error('Invalid API response:', data);
                return null;
            }
        } catch (error) {
            console.error('API error:', error);
            return null;
        }
    }

    // Generate a mock answer based on the question (fallback if API fails)
    function generateMockAnswer(question) {
        // In a real implementation, you would make an API call to OpenRouter here
        // For now, we'll use some basic template responses
        
        const templates = [
            `Based on my experience, ${question.replace(/\?$/, '')} is quite common. Many people find success with this approach because it offers several key benefits. First, it provides a structured framework that's easy to follow. Second, it's adaptable to various situations and contexts. Finally, it has been proven effective by numerous case studies and real-world applications.\n\nHowever, it's important to consider some limitations as well. Not every situation is the same, and what works in one context might not work in another. I would recommend starting with a small implementation to test results before fully committing.`,
            
            `When considering ${question.replace(/\?$/, '')}, several factors come into play. The most important consideration is understanding your specific goals and requirements. Different approaches have different strengths and weaknesses.\n\nIn my experience, the most successful implementations share a few common characteristics: clear objectives, thoughtful planning, and consistent execution. It's also crucial to regularly evaluate your results and make adjustments as needed.\n\nI would recommend researching several options and perhaps consulting with someone who has direct experience in this area for your specific situation.`,
            
            `${question.replace(/\?$/, '')} is actually a fascinating topic. From what I've seen, the approach varies significantly depending on the specific context and goals. Some key principles to keep in mind include: consistency, adaptability, and ongoing learning.\n\nMany experts in this field suggest starting with a basic framework and then iteratively refining it based on feedback and results. This allows for a customized approach that addresses your unique circumstances.\n\nUltimately, success often comes down to persistence and willingness to adapt your strategy as you learn more about what works and what doesn't.`
        ];
        
        // Select a random template
        const template = templates[Math.floor(Math.random() * templates.length)];
        return template;
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

    // Type the answer into the editor, either instantly or character by character
    async function typeAnswer(editor, answer) {
        editor.focus();
        
        // Clear any existing content
        editor.innerHTML = '';
        
        if (config.DELAYS.TYPING_SPEED === 'instant') {
            // Instantly paste the entire answer
            editor.textContent = answer;
            
            // Trigger input event to update the editor state
            const event = new Event('input', { bubbles: true });
            editor.dispatchEvent(event);
        } else {
            // Type the answer character by character with the specified delay
            for (let i = 0; i < answer.length; i++) {
                editor.textContent += answer[i];
                
                // Trigger input event to update the editor state
                const event = new Event('input', { bubbles: true });
                editor.dispatchEvent(event);
                
                // Add delay between characters
                await delay(config.DELAYS.TYPING_SPEED);
            }
        }
        
        // Wait a bit after typing
        await delay(config.DELAYS.AFTER_ANSWER);
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

    // Test proxy connection
    async function testProxy() {
        try {
            console.log(`Testing connection to proxy at ${config.PROXY_URL}...`);
            const response = await fetch(config.PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: "Test question",
                    instructions: "This is a test."
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Proxy test failed: ${response.status} ${errorText}`);
                return false;
            }
            
            const data = await response.json();
            console.log('Proxy connection successful!');
            console.log('Response preview:', data);
            return true;
        } catch (error) {
            console.error('Proxy test error:', error);
            return false;
        }
    }

    // Start processing immediately
    console.log('🤖 Quora Answer Bot with OpenRouter Integration: Ready to start');
    console.log('Make sure your proxy server is running at ' + config.PROXY_URL);
    console.log('To test the proxy connection, type: testProxyConnection()');
    console.log('To begin processing, type: startQuoraBot()');
    console.log('To highlight questions without processing, type: highlightQuestions()');
    
    // Expose the functions to global scope
    window.startQuoraBot = startProcessing;
    window.highlightQuestions = highlightQuestions;
    window.testProxyConnection = testProxy;
})();

// To test proxy connection:
// testProxyConnection()
// To start the bot:
// startQuoraBot()