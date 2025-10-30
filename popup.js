// Popup script for controlling the extension

// Wait for the DOM to be fully loaded before running scripts
document.addEventListener('DOMContentLoaded', function () {

    // --- Element Selectors ---
    const playPauseBtn = document.getElementById('play-pause');
    const clearButton = document.getElementById('clear-highlights');
    const processButton = document.getElementById('process-button');
    const copyButton = document.getElementById('copy-summary');
    const urlInput = document.getElementById('current-url');
    const highlightCount = document.getElementById('highlight-count');
    const categoryListbox = document.getElementById('category-listbox');

    let isHighlightEnabled = false;
    let categories = []; // Store categories
    
    // Log all elements to check they exist
    console.log('=== DOM ELEMENTS CHECK ===');
    console.log('playPauseBtn:', playPauseBtn);
    console.log('clearButton:', clearButton);
    console.log('processButton:', processButton);
    console.log('copyButton:', copyButton);
    console.log('urlInput:', urlInput);
    console.log('highlightCount:', highlightCount);
    console.log('categoryListbox:', categoryListbox);

    // --- Initialize: Load current tab URL and highlight status ---
    function init() {
        loadCurrentTabUrl();
        loadHighlightStatus();
        updateHighlightCount();
        loadCategories();
    }

    /**
     * Load categories from Chrome storage and display them
     */
    function loadCategories() {
        chrome.storage.local.get(['categories'], (result) => {
            categories = result.categories || [];
            console.log('Loaded categories:', categories);
            renderCategories();
        });
    }

    /**
     * Save categories to Chrome storage
     */
    function saveCategories() {
        chrome.storage.local.set({ categories: categories }, () => {
            console.log('Categories saved:', categories);
        });
    }

    /**
     * Add a new category if it doesn't exist
     */
    function addCategory(categoryName) {
        if (!categoryName || categoryName.trim() === '') {
            console.warn('Empty category name, not adding');
            return;
        }

        // Check if category already exists (case-insensitive)
        const exists = categories.some(cat => 
            cat.toLowerCase() === categoryName.toLowerCase()
        );

        if (!exists) {
            categories.push(categoryName);
            saveCategories();
            renderCategories();
            console.log('New category added:', categoryName);
        } else {
            console.log('Category already exists:', categoryName);
        }
    }

    /**
     * Render the category list
     */
    function renderCategories() {
        categoryListbox.innerHTML = '';
        
        if (categories.length === 0) {
            // The CSS will show the placeholder message
            return;
        }

        categories.forEach((category, index) => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.innerHTML = `
                <span class="category-color"></span>
                <span class="category-name">${category}</span>
            `;
            
            // Add click handler to select category
            categoryItem.addEventListener('click', () => {
                // Remove selected class from all items
                document.querySelectorAll('.category-item').forEach(item => {
                    item.classList.remove('selected');
                });
                // Add selected class to clicked item
                categoryItem.classList.add('selected');
            });

            categoryListbox.appendChild(categoryItem);
        });

        // Auto-select the last added category
        const lastItem = categoryListbox.lastElementChild;
        if (lastItem) {
            lastItem.classList.add('selected');
        }
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
                        if (chrome.runtime.lastError) {
                            console.log('Error loading status:', chrome.runtime.lastError.message);
                            return;
                        }
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
            // Change to PAUSE icon when highlighting is active
            playPauseBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16" id="toggle-icon"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5"/></svg>';
        } else {
            playPauseBtn.style.backgroundColor = '';
            playPauseBtn.style.color = '';
            playPauseBtn.title = 'Highlighting OFF - Click to enable';
            // Change to PLAY icon when highlighting is inactive
            playPauseBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16" id="toggle-icon"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/></svg>';
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
                        if (chrome.runtime.lastError) {
                            console.error('Error toggling highlight:', chrome.runtime.lastError.message);
                            // Revert the state if there was an error
                            isHighlightEnabled = !isHighlightEnabled;
                            return;
                        }
                        if (response) {
                            updateToggleButton(isHighlightEnabled);
                            console.log('Highlight mode:', isHighlightEnabled ? 'ON' : 'OFF');
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
        const summaryTextContent = document.getElementById('summary-text-content');
        if (!summaryTextContent) {
            console.error('Summary text content element not found');
            return;
        }
        
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
     * Handles the "Process" button click - Calls API with content
     */
    function handleProcessClick() {
        console.log('=== PROCESS BUTTON CLICKED ===');
        const originalHTML = processButton.innerHTML;
        processButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-stars" viewBox="0 0 16 16"><path d="M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.829 1.828l1.936.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.829l-.645 1.936a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937-.645a2.89 2.89 0 0 0 1.828-1.828zM3.794 1.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387A1.73 1.73 0 0 0 4.593 5.69l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.69A1.73 1.73 0 0 0 2.31 4.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.73 1.73 0 0 0 3.407 2.31zM10.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732L9.1 2.137a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732z"/></svg> Processing...';
        processButton.disabled = true;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            console.log('Active tabs:', tabs);
            if (tabs && tabs[0]) {
                console.log('Tab ID:', tabs[0].id);
                
                // First, get marked content
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { action: 'getMarkedContent' },
                    (markedResponse) => {
                        if (chrome.runtime.lastError) {
                            console.error('Error getting marked content:', chrome.runtime.lastError.message);
                            processButton.innerHTML = originalHTML;
                            processButton.disabled = false;
                            return;
                        }

                        console.log('Marked content response:', markedResponse);

                        let contentToSend = '';
                        
                        // If there's marked content, use it; otherwise get all page content
                        if (markedResponse && markedResponse.content && markedResponse.content.length > 0) {
                            contentToSend = markedResponse.content.map(item => item.text).join(' ');
                            console.log('Using MARKED content, length:', contentToSend.length);
                            console.log('Content preview:', contentToSend.substring(0, 200) + '...');
                            sendToAPI(contentToSend, originalHTML);
                        } else {
                            console.log('No marked content, getting ALL page content');
                            // Get all readable content from the page
                            chrome.tabs.sendMessage(
                                tabs[0].id,
                                { action: 'getAllPageContent' },
                                (pageResponse) => {
                                    console.log('All page content response:', pageResponse);
                                    if (pageResponse && pageResponse.content) {
                                        contentToSend = pageResponse.content;
                                        console.log('Using ALL PAGE content, length:', contentToSend.length);
                                        console.log('Content preview:', contentToSend.substring(0, 200) + '...');
                                        sendToAPI(contentToSend, originalHTML);
                                    } else {
                                        console.error('Failed to get page content');
                                        processButton.innerHTML = originalHTML;
                                        processButton.disabled = false;
                                    }
                                }
                            );
                            return;
                        }
                    }
                );
            }
        });
    }

    /**
     * Send content to the categorization API
     */
    function sendToAPI(content, originalButtonHTML) {
        const apiUrl = 'https://categorize-567586567793.us-central1.run.app/';
        const payload = {
            content: content,
            categories: [] // Empty list as specified
        };
        
        console.log('=== SENDING TO API ===');
        console.log('API URL:', apiUrl);
        console.log('Payload:', payload);
        console.log('Content length:', content.length);
        
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            console.log('=== API RESPONSE RECEIVED ===');
            console.log('Status:', response.status);
            console.log('Status Text:', response.statusText);
            console.log('Headers:', response.headers);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('=== API DATA PARSED ===');
            console.log('Full response data:', data);
            console.log('Type of data:', typeof data);
            console.log('Keys in data:', Object.keys(data));
            console.log('data.category:', data.category);
            console.log('Type of category:', typeof data.category);
            console.log('data.summary:', data.summary);
            console.log('Type of summary:', typeof data.summary);
            
            // Log the exact JSON string
            console.log('Data as JSON string:', JSON.stringify(data, null, 2));
            
            // Get the summary element
            const summaryElement = document.getElementById('summary-text-content');
            
            console.log('DOM Elements check:');
            console.log('summaryElement:', summaryElement);
            
            // Update category - add to listbox
            if (data.category) {
                console.log('Adding category to listbox:', data.category);
                addCategory(data.category);
            } else {
                console.warn('No category in response');
            }
            
            // Update summary - use textContent to prevent HTML injection and avoid highlight issues
            if (data.summary && summaryElement) {
                // Clear any existing content first
                summaryElement.innerHTML = '';
                // Create a new paragraph element
                const p = document.createElement('p');
                p.textContent = data.summary; // Use textContent instead of innerHTML
                summaryElement.appendChild(p);
                console.log('Summary updated');
            } else {
                console.warn('Could not update summary. Element:', summaryElement, 'Data:', data.summary);
            }
            
            // Create tab group with category name
            if (data.category) {
                createTabGroup(data.category);
            }
            
            // Reset button
            processButton.innerHTML = originalButtonHTML;
            processButton.disabled = false;
            console.log('Process button reset');
        })
        .catch(error => {
            console.error('=== API ERROR ===');
            console.error('Error type:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            
            const summaryElement = document.getElementById('summary-text-content');
            const resultsSection = document.getElementById('results-section');
            
            if (summaryElement) {
                summaryElement.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
            }
            
            // Still show the results section to display the error
            if (resultsSection) {
                resultsSection.style.display = 'flex';
                resultsSection.style.flexDirection = 'column';
                resultsSection.style.gap = '16px';
            }
            
            // Reset button
            processButton.innerHTML = originalButtonHTML;
            processButton.disabled = false;
        });
    }

    /**
     * Create a tab group with the category name and assign a color
     */
    function createTabGroup(categoryName) {
        console.log('=== CREATING TAB GROUP ===');
        console.log('Category name:', categoryName);
        
        // Get the current active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                const currentTab = tabs[0];
                console.log('Current tab ID:', currentTab.id);
                console.log('Current tab groupId:', currentTab.groupId);
                
                // If tab is already in a group, update that group instead of creating a new one
                if (currentTab.groupId && currentTab.groupId !== -1) {
                    console.log('Tab already in group, updating existing group:', currentTab.groupId);
                    chrome.tabGroups.update(currentTab.groupId, {
                        title: categoryName,
                        color: 'green'
                    }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('Error updating existing tab group:', chrome.runtime.lastError.message);
                        } else {
                            console.log('Existing tab group updated successfully');
                            console.log('  - Title:', categoryName);
                            console.log('  - Color: green');
                        }
                    });
                } else {
                    // Create a new tab group
                    console.log('Creating new tab group...');
                    chrome.tabs.group({ tabIds: [currentTab.id] }, (groupId) => {
                        if (chrome.runtime.lastError) {
                            console.error('Error creating tab group:', chrome.runtime.lastError.message);
                            return;
                        }
                        
                        console.log('Tab group created with ID:', groupId);
                        
                        // Update the group with title and color
                        chrome.tabGroups.update(groupId, {
                            title: categoryName,
                            color: 'green'
                        }, () => {
                            if (chrome.runtime.lastError) {
                                console.error('Error updating tab group:', chrome.runtime.lastError.message);
                            } else {
                                console.log('Tab group updated successfully');
                                console.log('  - Title:', categoryName);
                                console.log('  - Color: green');
                            }
                        });
                    });
                }
            } else {
                console.error('No active tab found');
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