console.log("Xeriee LinkedIn Extension Loaded");

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "injectPost") {
        const findEditor = () => {
            return document.querySelector('.ql-editor') ||
                document.querySelector('div[contenteditable="true"][role="textbox"]') ||
                document.querySelector('.editor-content[contenteditable="true"]');
        };

        const findStartBtn = () => {
            // 1. Try common classes
            const btn = document.querySelector('.share-box-feed-entry__trigger, button.artdeco-button--muted.inline-flex.align-items-center');
            if (btn) return btn;

            // 2. Try by aria-label (more stable for international users)
            const ariaBtn = document.querySelector('button[aria-label*="Start a post"], button[aria-label*="Create a post"]');
            if (ariaBtn) return ariaBtn;

            // 3. Try searching by text content
            const allBtns = Array.from(document.querySelectorAll('button, span, div.artdeco-button, .share-box-feed-entry__trigger'));
            return allBtns.find(el => {
                const text = el.innerText.toLowerCase();
                return text.includes('start a post') || text.includes('write a post');
            });
        };

        let editor = findEditor();

        const inject = () => {
            editor = findEditor();
            if (editor) {
                editor.innerHTML = `<p>${request.text}</p>`;
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                // For LinkedIn's Quill editor, sometimes textContent needs a kick
                editor.dispatchEvent(new Event('blur', { bubbles: true }));
                sendResponse({ status: "success" });
                return true;
            }
            return false;
        };

        if (editor) {
            inject();
        } else {
            const startPostBtn = findStartBtn();
            if (startPostBtn) {
                startPostBtn.click();
                // Wait for the modal to appear
                let attempts = 0;
                const interval = setInterval(() => {
                    if (inject() || attempts > 15) { // Increased wait time
                        clearInterval(interval);
                        if (attempts > 15) sendResponse({ status: "not_found" });
                    }
                    attempts++;
                }, 500);
            } else {
                sendResponse({ status: "not_found" });
            }
        }
    } else if (request.action === "getPageContext") {
        // Scrape visible posts on the feed
        const posts = Array.from(document.querySelectorAll('.feed-shared-update-v2__description-wrapper'))
            .slice(0, 5) // Get top 5 visible posts
            .map(el => el.innerText.trim())
            .filter(text => text.length > 50) // Only count substantial posts
            .join("\n---\n");

        sendResponse({ context: posts || "No recent feed activity found." });
    }
    return true; // Keep channel open for async response
});
