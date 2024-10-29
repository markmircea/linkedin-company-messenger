class LinkedInAutomator {
  constructor() {
    this.companyLinks = [];
    this.currentIndex = 0;
    this.delay = 2000;
    this.maxRetries = 3;
    this.activeTab = null;
    this.isLastPage = false;
    console.log("🚀 Automator initialized");
  }

  generateMessage(companyName) {
    return `Hi ${companyName}!

I am reaching out to express my interest in joining your software development team. With extensive experience in PHP/Laravel, REST APIs & GraphQL creation and consumption, AI integration, and front-end technologies (Vue.js, React), I have created secure, scalable web applications for many enterprise clients. 

 I am also highly skilled in Caching and Queuing Strategies with Redis and RabbitMQ, Version Control with Git, and Hands-on experience with modern front-end technologies and frameworks to build responsive and dynamic user interfaces such as Vue, Vite, React, Inertia, Node.js, Tailwind CSS, HTML5.`;
  }

  async init() {
    console.log("🔄 Starting automation process...");
    await this.collectCompanyLinks();
    if (this.companyLinks.length > 0) {
      console.log(
        `✅ Successfully found ${this.companyLinks.length} companies on current page`
      );
      console.log("📋 Company URLs:", this.companyLinks);
      this.processNextCompany();
    } else {
      console.log("❌ No company links found on the page");
    }
  }

  async collectCompanyLinks() {
    console.log("🔍 Searching for company links...");

    // Wait longer for results to load fully
    await this.sleep(5000);
    console.log("📜 Scrolling to bottom to load all companies...");
    window.scrollTo(0, document.body.scrollHeight);
    
    // Function to check if page is fully loaded
    const checkForCompanies = async (attempts = 0, maxAttempts = 5) => {
        const links = document.querySelectorAll('a[href*="/company/"][data-test-app-aware-link]');
        console.log(`📊 Found ${links.length} links on attempt ${attempts + 1}`);
        
        if (links.length < 10 && attempts < maxAttempts) {  // Assuming there should be at least 10 companies
            console.log("⏳ Waiting for more companies to load...");
            await this.sleep(3000);
            return checkForCompanies(attempts + 1, maxAttempts);
        }
        return links;
    };

    const links = await checkForCompanies();
    console.log(`📊 Found ${links.length} total links before filtering`);

    this.companyLinks = Array.from(links)
        .map((link) => ({
            url: link.href,
            name: this.extractCompanyName(link.href),
        }))
        .filter((value, index, self) =>
            index === self.findIndex((t) => t.url === value.url)
        );

    console.log(`🧹 After removing duplicates: ${this.companyLinks.length} unique companies`);
}

  extractCompanyName(url) {
    try {
      // Extract company name from URL
      const companyName = url.split("/company/")[1].split("/")[0];
      // Capitalize first letter and replace hyphens with spaces
      return companyName
        .split("-")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
    } catch (e) {
      return "Company";
    }
  }


  async goToNextPage(retryCount = 0) {
    console.log("🔄 Attempting to go to next page...");
    
    // First scroll to bottom of page
    console.log("📜 Scrolling to bottom of page...");
    window.scrollTo(0, document.body.scrollHeight);
    
    // Wait for content to load after scroll
    await this.sleep(5000);
    
    const nextButton = document.querySelector('button[aria-label="Next"]');
    
    if (nextButton) {
        console.log("✅ Found next button!");
        try {
            console.log("👆 Clicking next button");
            nextButton.click();
            
            // Wait longer for page load
            await this.sleep(8000);
            
            // Reset for new page
            this.currentIndex = 0;
            this.companyLinks = [];
            
            // Collect links from new page
            await this.collectCompanyLinks();
            
            if (this.companyLinks.length > 0) {
                console.log(`✅ Found ${this.companyLinks.length} companies on new page`);
                this.processNextCompany();
            } else {
                if (retryCount < 3) {
                    console.log("⚠️ No companies found, retrying...");
                    await this.sleep(5000);
                    return this.goToNextPage(retryCount + 1);
                }
            }
        } catch (error) {
            console.error("❌ Error clicking button:", error);
            if (retryCount < 3) {
                await this.sleep(5000);
                return this.goToNextPage(retryCount + 1);
            }
        }
    } else {
        if (retryCount < 3) {
            console.log("⚠️ Next button not found, waiting and retrying...");
            await this.sleep(5000);
            return this.goToNextPage(retryCount + 1);
        } else {
            console.log("🏁 Failed to find next button after all retries");
        }
    }
}


  async processNextCompany(retryCount = 0) {
    if (this.currentIndex < this.companyLinks.length) {
      const company = this.companyLinks[this.currentIndex];
      console.log(
        `\n👉 Processing company ${this.currentIndex + 1} of ${
          this.companyLinks.length
        }`
      );
      console.log(`🎯 Company Name: ${company.name}`);
      console.log(`🌐 Opening URL: ${company.url}`);

      try {
        if (!this.activeTab || this.activeTab.closed) {
          // Only open a new tab if we don't have one or if it's closed
          this.activeTab = window.open(company.url, "_blank");

          if (!this.activeTab) {
            console.log(
              "⚠️ Tab opening was blocked. Please allow popups and try again."
            );
            throw new Error("Tab blocked");
          }
        } else {
          // Use existing tab
          this.activeTab.location.href = company.url;
        }

        console.log("📂 Tab handled");

        // Wait for a short time to ensure the page starts loading
        await this.sleep(1000);

        if (this.activeTab.closed) {
          throw new Error("Tab was closed immediately");
        }

        // Set up a timeout to handle cases where the load event never fires
        const timeout = setTimeout(() => {
          console.log("⚠️ Tab load timeout - moving to next company");
          this.currentIndex++;
          this.processNextCompany();
        }, 30000); // 30 second timeout

        // Try to access the tab's document to verify it's working
        try {
          // This will throw if we can't access the tab
          this.activeTab.document;

          this.activeTab.addEventListener("load", () => {
            clearTimeout(timeout);
            console.log("📄 Company page loaded");
            this.handleCompanyPage(this.activeTab, company);
          });
        } catch (e) {
          // If we can't access the tab's document, wait and try direct navigation
          console.log(
            "⚠️ Cannot access tab directly, attempting alternative method..."
          );
          clearTimeout(timeout);
          await this.sleep(2000);

          if (!this.activeTab.closed) {
            console.log("📄 Proceeding with company page processing");
            this.handleCompanyPage(this.activeTab, company);
          } else {
            throw new Error("Tab access denied");
          }
        }
      } catch (error) {
        console.error("❌ Error processing company:", error);

        if (retryCount < this.maxRetries) {
          console.log(
            `🔄 Retrying... (Attempt ${retryCount + 1} of ${this.maxRetries})`
          );
          await this.sleep(2000);
          return this.processNextCompany(retryCount + 1);
        } else {
          console.log("❌ Max retries reached, moving to next company");
          this.currentIndex++;
          this.processNextCompany();
        }
      }
    } else {
      // Reached end of current page
      console.log("📖 End of current page or no companies found, attempting next page...");
        await this.goToNextPage();
    }
  }

  async simulateTyping(element, text) {
    // Clear the field first
    element.value = "";
    element.dispatchEvent(new Event("input", { bubbles: true }));

    // Type character by character
    for (let i = 0; i < text.length; i++) {
      element.value += text[i];
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // Trigger all possible events that LinkedIn might be listening for
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    element.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter" }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  async handleCompanyPage(tab, company) {
    try {
      console.log("⏳ Waiting initial delay...");
      await this.sleep(this.delay);

      // Click message button
      console.log("🔍 Looking for message button...");
      const messageButton = tab.document.querySelector(
        "button[data-test-message-page-button]"
      );
      if (!messageButton) {
        console.log("❌ Message button not found");
        console.log("🚫 Moving to next company");
        this.currentIndex++;
        this.processNextCompany();
        return;
      }
      console.log("✅ Message button found");
      console.log("🖱️ Clicking message button");
      messageButton.click();

      console.log("⏳ Waiting for modal to appear...");
      await this.sleep(this.delay);

      // Select Careers option
      console.log("🔍 Looking for topic dropdown...");
      await this.sleep(this.delay);
      const topicSelect = tab.document.querySelector(
        "#org-message-page-modal-conversation-topic"
      );
      if (topicSelect) {
        console.log("✅ Topic dropdown found");
        console.log('📝 Selecting "Careers" option');
        topicSelect.value = "urn:li:fsd_pageMailboxConversationTopic:6";
        topicSelect.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        console.log("❌ Topic dropdown not found");
      }

      console.log("⏳ Waiting before typing message...");

      // Input message
      console.log("🔍 Looking for message textarea...");
      const messageArea = tab.document.querySelector(
        "#org-message-page-modal-message"
      );
      if (messageArea) {
        console.log("✅ Message textarea found");
        console.log(`✍️ Typing personalized message for ${company.name}`);

        // Focus and click the textarea
        messageArea.focus();
        messageArea.click();
        await this.sleep(500);

        const personalizedMessage = this.generateMessage(company.name);
        console.log("📝 Message content:", personalizedMessage);

        // Simulate real typing
        await this.simulateTyping(messageArea, personalizedMessage);

        // Double-check the content is there
        console.log("✅ Message content verification:", messageArea.value);
      } else {
        console.log("❌ Message textarea not found");
      }

      console.log("⏳ Waiting before sending...");

      // Click send button
      console.log("🔍 Looking for send button...");
      const sendButton = tab.document.querySelector(
        "button.artdeco-button--primary"
      );
      if (sendButton) {
        // Verify message content one last time before sending
        const messageArea = tab.document.querySelector(
          "#org-message-page-modal-message"
        );
        if (messageArea && messageArea.value.trim() === "") {
          console.log(
            "⚠️ Warning: Message area appears to be empty despite typing. Retrying..."
          );
          await this.simulateTyping(
            messageArea,
            this.generateMessage(company.name)
          );
          await this.sleep(1000);
        }

        console.log("✅ Send button found");
        console.log("📤 Sending message");
        sendButton.click();
      } else {
        console.log("❌ Send button not found");
      }

      console.log("⏳ Waiting after sending...");

      console.log(`✅ Message sent to ${company.name}`);

      console.log("➡️ Moving to next company");
      this.currentIndex++;
      this.processNextCompany();
    } catch (error) {
      console.error("❌ Error processing company page:", error);
      console.log("➡️ Moving to next company");
      this.currentIndex++;
      this.processNextCompany();
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

console.log("🤖 LinkedIn Automator Script Loaded");
console.log("▶️ Starting automation...");
const automator = new LinkedInAutomator();
automator.init();


