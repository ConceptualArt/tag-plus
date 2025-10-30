// Popup script for controlling the extension

// Wait for the DOM to be fully loaded before running scripts
document.addEventListener('DOMContentLoaded', function () {

    // --- Element Selectors ---
    const playPauseBtn = document.getElementById('play-pause');
    const toggleIcon = document.getElementById('toggle-icon');
    const clearButton = document.getElementById('clear-highlights');
    const processButton = document.getElementById('process-button');
    const copyButton = document.getElementById('copy-summary');
    const summaryTextContent = document.getElementById('summary-text-content');
    const urlInput = document.getElementById('current-url');
    const highlightCount = document.getElementById('highlight-count');

    let isHighlightEnabled = false;

    // --- Initialize: Load current tab URL and highlight status ---
    function init() {
        loadCurrentTabUrl();
        loadHighlightStatus();
        updateHighlightCount();
    }

    /**
     * Fetches the URL of the currently active tab and displays it.
     */
    function loadCurrentTabUrl() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs && tabs[0]) {
                const url = tabs[0].url;
                // Display full URL or shortened version
                urlInput.value = url;
                urlInput.title = url; // Show full URL on hover
            } else {
                urlInput.value = 'No active tab found.';
            }
        });
    }

    /**
     * Load the current highlight status from content script
     */
    function loadHighlightStatus() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { action: 'getStatus' },
                    (response) => {
                        if (response) {
                            isHighlightEnabled = response.enabled;
                            updateToggleButton(isHighlightEnabled);
                        }
                    }
                );
            }
        });
    }

    /**
     * Update the toggle button appearance based on state
     */
    function updateToggleButton(enabled) {
        if (enabled) {
            playPauseBtn.style.backgroundColor = '#6B4C29'; // Brown when active
            playPauseBtn.style.color = '#FFFFFF';
            playPauseBtn.title = 'Highlighting ON - Click to disable';
            // Change to play icon
            toggleIcon.innerHTML = '<path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/>';
        } else {
            playPauseBtn.style.backgroundColor = '';
            playPauseBtn.style.color = '';
            playPauseBtn.title = 'Highlighting OFF - Click to enable';
            // Change to pause icon
            toggleIcon.innerHTML = '<path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5"/>';
        }
    }

    /**
     * Update the highlight count display
     */
    function updateHighlightCount() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { action: 'getMarkedContent' },
                    (response) => {
                        if (response && response.success) {
                            const count = response.content.length;
                            highlightCount.textContent = count;
                        }
                    }
                );
            }
        });
    }

    /**
     * Toggle highlight mode on/off
     */
    function toggleHighlightMode() {
        isHighlightEnabled = !isHighlightEnabled;
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { action: 'toggleHighlight', enabled: isHighlightEnabled },
                    (response) => {
                        if (response) {
                            updateToggleButton(isHighlightEnabled);
                        }
                    }
                );
            }
        });
    }

    /**
     * Handles the "Clear" button click.
     */
    function handleClearClick() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs && tabs[0]) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { action: 'clearHighlights' },
                    (response) => {
                        if (response && response.success) {
                            // Update count immediately
                            highlightCount.textContent = '0';
                            
                            // Visual feedback
                            const originalHTML = clearButton.innerHTML;
                            clearButton.innerHTML = 'Cleared!';
                            setTimeout(() => {
                                clearButton.innerHTML = originalHTML;
                            }, 1500);
                        }
                    }
                );
            }
        });
    }

    /**
     * Copies the summary text to the user's clipboard.
     */
    function copySummaryToClipboard() {
        const textToCopy = summaryTextContent.innerText;
        
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                // Show "Copied!" confirmation
                const originalHTML = copyButton.innerHTML;
                copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-copy" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"/></svg> Copied!';
                setTimeout(() => {
                    copyButton.innerHTML = originalHTML;
                }, 1500);
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
            });
    }

    /**
     * Handles the "Process" button click - Prints marked content to console
     */
    function handleProcessClick() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { action: 'getMarkedContent' },
                    (response) => {
                        if (response && response.success) {
                            const content = response.content;
                            
                            // Visual feedback
                            const originalHTML = processButton.innerHTML;
                            processButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-stars" viewBox="0 0 16 16"><path d="M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.829 1.828l1.936.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.829l-.645 1.936a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937-.645a2.89 2.89 0 0 0 1.828-1.828zM3.794 1.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387A1.73 1.73 0 0 0 4.593 5.69l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.69A1.73 1.73 0 0 0 2.31 4.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.73 1.73 0 0 0 3.407 2.31zM10.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732L9.1 2.137a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732z"/></svg> Processing...';
                            
                            // Print to the page's console
                            chrome.scripting.executeScript({
                                target: { tabId: tabs[0].id },
                                func: (markedContent) => {
                                    console.log('%c📝 MARKED CONTENT', 'font-size: 20px; font-weight: bold; color: #4F4439;');
                                    console.log('%c════════════════════════════════════════', 'color: #4F4439;');
                                    console.log(`Total highlights: ${markedContent.length}`);
                                    console.log('%c════════════════════════════════════════', 'color: #4F4439;');
                                    
                                    if (markedContent.length === 0) {
                                        console.log('%c⚠️ No content highlighted yet', 'color: #ffc107; font-weight: bold;');
                                    } else {
                                        markedContent.forEach((item) => {
                                            console.log(`\n%c[${item.index}] ${item.element.toUpperCase()} element`, 'color: #FDC65A; font-weight: bold;');
                                            console.log(`Text: "${item.text}"`);
                                            console.log(`Length: ${item.length} characters`);
                                            console.log('─────────────────────────────────────');
                                        });
                                        
                                        // Also print as a clean array
                                        console.log('\n%c📋 Array format:', 'font-weight: bold; color: #4F4439;');
                                        console.log(markedContent.map(item => item.text));
                                    }
                                    
                                    console.log('%c════════════════════════════════════════', 'color: #4F4439;');
                                },
                                args: [content]
                            });
                            
                            setTimeout(() => {
                                processButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-stars" viewBox="0 0 16 16"><path d="M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.829 1.828l1.936.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.829l-.645 1.936a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937-.645a2.89 2.89 0 0 0 1.828-1.828zM3.794 1.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387A1.73 1.73 0 0 0 4.593 5.69l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.69A1.73 1.73 0 0 0 2.31 4.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.73 1.73 0 0 0 3.407 2.31zM10.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732L9.1 2.137a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732z"/></svg> Processed ✓';
                                setTimeout(() => {
                                    processButton.innerHTML = originalHTML;
                                }, 1500);
                            }, 1000);
                        }
                    }
                );
            }
        });
    }

    // --- Event Listeners ---
    playPauseBtn.addEventListener('click', toggleHighlightMode);
    clearButton.addEventListener('click', handleClearClick);
    copyButton.addEventListener('click', copySummaryToClipboard);
    processButton.addEventListener('click', handleProcessClick);

    // Listen for status changes from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'statusChanged') {
            isHighlightEnabled = request.enabled;
            updateToggleButton(isHighlightEnabled);
        } else if (request.action === 'highlightCountChanged') {
            updateHighlightCount();
        }
    });

    // Update highlight count periodically when popup is open
    setInterval(updateHighlightCount, 1000);

    // --- Initial Load ---
    init();

});