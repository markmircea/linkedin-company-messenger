class LinkedInConnector {
    constructor() {
      this.profiles = [];
      this.currentIndex = 0;
      this.delay = 800; // Reduced from 2000
      this.maxRetries = 3;
      this.isLastPage = false;
      this.connectionMessage = "Considering AI automation? At https://AIBrainL.ink, we're helping companies achieve 80%+ cost savings through custom AI automation solutions. A quick example is our AI voice solution can handle all restaurant calls, providing menu info and managing reservations with 70% less human intervention.";
      console.log("🚀 LinkedIn Connector initialized");
    }
  
    async init() {
      console.log("🔄 Starting automation process...");
      await this.findConnectButtons();
      if (this.profiles.length > 0) {
        console.log(
          `✅ Successfully found ${this.profiles.length} profiles with connect buttons on current page`
        );
        this.processNextProfile();
      } else {
        console.log("❌ No connect buttons found on the page");
        this.goToNextPage();
      }
    }
  
    async findConnectButtons() {
      console.log("🔍 Searching for connect buttons...");
  
      // Wait for page to load fully
      await this.sleep(1000);
      console.log("📜 Scrolling to bottom to ensure all profiles load...");
      window.scrollTo(0, document.body.scrollHeight);
      await this.sleep(800);
      
      // Check for connect buttons
      const connectButtons = document.querySelectorAll('button.artdeco-button span.artdeco-button__text');
      let connectProfiles = [];
      
      connectButtons.forEach(buttonSpan => {
        if (buttonSpan.textContent.trim() === 'Connect') {
          const button = buttonSpan.closest('button');
          if (button) {
            // Try to find a name associated with this profile
            let name = "Person";
            
            // Look for name in the aria-label
            if (button.getAttribute('aria-label')) {
              const ariaLabel = button.getAttribute('aria-label');
              const match = ariaLabel.match(/Invite\s+(.+?)\s+to connect/);
              if (match && match[1]) {
                name = match[1];
              }
            }
            
            // Store button reference and name
            connectProfiles.push({
              button: button,
              name: name
            });
          }
        }
      });
      
      this.profiles = connectProfiles;
      console.log(`📊 Found ${this.profiles.length} profiles with connect buttons`);
    }
  
    async processNextProfile(retryCount = 0) {
      if (this.currentIndex < this.profiles.length) {
        const profile = this.profiles[this.currentIndex];
        console.log(
          `\n👉 Processing profile ${this.currentIndex + 1} of ${
            this.profiles.length
          }`
        );
        console.log(`🎯 Profile Name: ${profile.name}`);
  
        try {
          console.log("🖱️ Clicking connect button");
          profile.button.click();
          
          // Wait for the "Add a note" dialog to appear
          await this.sleep(800);
          
          // Click "Add a note" button
          console.log("🔍 Looking for 'Add a note' button...");
          const addNoteButtons = document.querySelectorAll('button span.artdeco-button__text');
          let addNoteButton = null;
          
          for (const buttonSpan of addNoteButtons) {
            if (buttonSpan.textContent.trim() === 'Add a note') {
              addNoteButton = buttonSpan.closest('button');
              break;
            }
          }
          
          if (addNoteButton) {
            console.log("✅ 'Add a note' button found");
            console.log("🖱️ Clicking 'Add a note' button");
            addNoteButton.click();
            
            // Wait for the textarea to appear
            await this.sleep(600);
            
            // Find and fill the message textarea
            console.log("🔍 Looking for message textarea...");
            const messageTextarea = document.querySelector('textarea#custom-message, textarea.connect-button-send-invite__custom-message');
            
            if (messageTextarea) {
              console.log("✅ Message textarea found");
              console.log("✍️ Typing connection message");
              
              // Focus and click the textarea
              messageTextarea.focus();
              messageTextarea.click();
              
              // Fill the message
              await this.simulateTyping(messageTextarea, this.connectionMessage);
              
              // Verify the content is there
              console.log("✅ Message content verification:", messageTextarea.value);
              
              // Find and click the Send button
              console.log("🔍 Looking for send button...");
              const sendButtons = document.querySelectorAll('button span.artdeco-button__text');
              let sendButton = null;
              
              for (const buttonSpan of sendButtons) {
                if (buttonSpan.textContent.trim() === 'Send') {
                  sendButton = buttonSpan.closest('button');
                  break;
                }
              }
              
              if (sendButton) {
                console.log("✅ Send button found");
                console.log("📤 Sending connection request");
                
                // Wait a moment before clicking send
                await this.sleep(400);
                
                // Remove disabled attribute if present
                if (sendButton.hasAttribute('disabled')) {
                  console.log("⚠️ Send button is disabled, attempting to enable it");
                  sendButton.removeAttribute('disabled');
                }
                
                sendButton.click();
                console.log(`✅ Connection request sent to ${profile.name}`);
              } else {
                console.log("❌ Send button not found");
              }
            } else {
              console.log("❌ Message textarea not found");
            }
          } else {
            console.log("❌ 'Add a note' button not found");
          }
          
          // Close the dialog if it's still open (in case sending failed)
          await this.sleep(600);
          const closeButtons = document.querySelectorAll('button[aria-label="Dismiss"]');
          if (closeButtons.length > 0) {
            console.log("🖱️ Closing dialog");
            closeButtons[0].click();
          }
          
          // Move to next profile
          console.log("➡️ Moving to next profile");
          this.currentIndex++;
          await this.sleep(600);
          this.processNextProfile();
        } catch (error) {
          console.error("❌ Error processing profile:", error);
  
          if (retryCount < this.maxRetries) {
            console.log(
              `🔄 Retrying... (Attempt ${retryCount + 1} of ${this.maxRetries})`
            );
            await this.sleep(2000);
            return this.processNextProfile(retryCount + 1);
          } else {
            console.log("❌ Max retries reached, moving to next profile");
            this.currentIndex++;
            this.processNextProfile();
          }
        }
      } else {
        // Reached end of current page
        console.log("📖 All profiles on current page processed, moving to next page...");
        await this.goToNextPage();
      }
    }
  
    async goToNextPage(retryCount = 0) {
      console.log("🔄 Attempting to go to next page...");
      
      // First scroll to bottom of page
      console.log("📜 Scrolling to bottom of page...");
      window.scrollTo(0, document.body.scrollHeight);
      
      // Wait for content to load after scroll
      await this.sleep(2000);
      
      // Try multiple selector approaches to find the Next button
      let nextButton = null;
      
      // First try by aria-label
      nextButton = document.querySelector('button[aria-label="Next"]');
      
      // If not found, try by button text
      if (!nextButton) {
        const allButtons = document.querySelectorAll('button');
        for (const button of allButtons) {
          const buttonText = button.textContent.trim();
          if (buttonText === 'Next' || buttonText.includes('Next')) {
            nextButton = button;
            break;
          }
        }
      }
      
      // If still not found, try by class name pattern
      if (!nextButton) {
        nextButton = document.querySelector('.artdeco-pagination__button--next');
      }
      
      if (nextButton) {
          console.log("✅ Found next button!");
          try {
              // Make sure button is visible by scrolling to it
              nextButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
              await this.sleep(1000);
              
              console.log("👆 Clicking next button");
              nextButton.click();
              
              // Wait for page load
              await this.sleep(3000);
              
              // Reset for new page
              this.currentIndex = 0;
              this.profiles = [];
              
              // Find connect buttons on new page
              await this.findConnectButtons();
              
              if (this.profiles.length > 0) {
                  console.log(`✅ Found ${this.profiles.length} profiles with connect buttons on new page`);
                  this.processNextProfile();
              } else {
                  if (retryCount < 3) {
                      console.log("⚠️ No connect buttons found, retrying...");
                      await this.sleep(3000);
                      return this.goToNextPage(retryCount + 1);
                  } else {
                      console.log("⚠️ No connect buttons found after retries. Attempting to continue to next page anyway.");
                      return this.goToNextPage(0); // Try to go to next page regardless
                  }
              }
          } catch (error) {
              console.error("❌ Error clicking next button:", error);
              if (retryCount < 3) {
                  await this.sleep(3000);
                  return this.goToNextPage(retryCount + 1);
              } else {
                  console.log("🔄 Failed to navigate properly. Attempting to refresh and continue...");
                  // Try scrolling up and then down
                  window.scrollTo(0, 0);
                  await this.sleep(1000);
                  window.scrollTo(0, document.body.scrollHeight);
                  await this.sleep(2000);
                  return this.goToNextPage(0);
              }
          }
      } else {
          console.log("⚠️ Next button not found on first attempt, trying alternative detection methods...");
          
          if (retryCount < 3) {
              // Try scrolling up a bit and then back down to trigger any lazy loading
              window.scrollTo(0, document.body.scrollHeight - 500);
              await this.sleep(1000);
              window.scrollTo(0, document.body.scrollHeight);
              await this.sleep(2000);
              return this.goToNextPage(retryCount + 1);
          } else {
              // Last resort: try to look for pagination and find the current page number
              try {
                  const paginationButtons = document.querySelectorAll('.artdeco-pagination__indicator--number button');
                  if (paginationButtons.length > 0) {
                      // Find which one is active
                      let currentPage = 1;
                      let nextPageButton = null;
                      
                      for (const button of paginationButtons) {
                          if (button.getAttribute('aria-current') === 'true' || 
                              button.parentElement.classList.contains('active') ||
                              button.classList.contains('active')) {
                              currentPage = parseInt(button.textContent.trim());
                              break;
                          }
                      }
                      
                      // Try to click the next page number directly
                      for (const button of paginationButtons) {
                          const pageNum = parseInt(button.textContent.trim());
                          if (pageNum === currentPage + 1) {
                              nextPageButton = button;
                              break;
                          }
                      }
                      
                      if (nextPageButton) {
                          console.log(`✅ Found pagination button for page ${currentPage + 1}`);
                          nextPageButton.click();
                          await this.sleep(3000);
                          this.currentIndex = 0;
                          this.profiles = [];
                          await this.findConnectButtons();
                          this.processNextProfile();
                          return;
                      }
                  }
                  
                  console.log("🏁 No viable pagination found. Automation cannot proceed to next page.");
              } catch (error) {
                  console.error("❌ Error with pagination fallback:", error);
                  console.log("🏁 Cannot navigate to next page. Automation complete.");
              }
          }
      }
    }
  
    async simulateTyping(element, text) {
      // Much faster typing - just set the value directly
      element.value = text;
      
      // Trigger all required events
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      element.dispatchEvent(new KeyboardEvent("keyup", { key: "Tab" }));
      element.dispatchEvent(new Event("blur", { bubbles: true }));
    }
  
    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    
    // Allow user to change connection message
    setConnectionMessage(message) {
      this.connectionMessage = message;
      console.log(`✅ Connection message updated to: "${message}"`);
    }
  }
  
  console.log("🤖 LinkedIn Connection Automator Script Loaded");
  console.log("▶️ Starting automation...");
  const connector = new LinkedInConnector();

// You can customize the connection message here
connector.setConnectionMessage("Considering AI automation? At https://AIBrainL.ink, we're helping companies achieve 80%+ cost savings through custom AI automation solutions. A quick example is our AI voice solution can handle all restaurant calls, providing menu info and managing reservations with 70% less human intervention!");

connector.init();