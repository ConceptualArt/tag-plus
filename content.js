// Content script for highlighting functionality
let isHighlightModeEnabled = false;
let highlightColor = '#87CEEB'; // Sky blue color

// Load saved state when content script loads
chrome.storage.local.get(['highlightEnabled'], (result) => {
  isHighlightModeEnabled = result.highlightEnabled || false;
  updateCursor();
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleHighlight') {
    isHighlightModeEnabled = request.enabled;
    // Save state to storage
    chrome.storage.local.set({ highlightEnabled: isHighlightModeEnabled });
    updateCursor();
    sendResponse({ success: true, enabled: isHighlightModeEnabled });
    return true; // Keep the message channel open for async response
  } else if (request.action === 'getStatus') {
    sendResponse({ enabled: isHighlightModeEnabled });
    return true;
  } else if (request.action === 'clearHighlights') {
    clearAllHighlights();
    sendResponse({ success: true });
    return true;
  } else if (request.action === 'getMarkedContent') {
    const markedContent = getMarkedContent();
    sendResponse({ success: true, content: markedContent });
    return true;
  } else if (request.action === 'getAllPageContent') {
    const pageContent = getAllReadableContent();
    sendResponse({ success: true, content: pageContent });
    return true;
  }
});

// Handle text selection and highlighting
document.addEventListener('mouseup', (e) => {
  if (!isHighlightModeEnabled) return;
  
  // Don't highlight in the extension popup itself
  if (e.target.closest('.container')) return;
  
  const selection = window.getSelection();
  if (!selection.rangeCount || selection.isCollapsed) return;
  
  highlightSelection(selection);
});

function highlightSelection(selection) {
  const range = selection.getRangeAt(0);
  
  // Don't highlight if selection is empty or whitespace only
  if (!range.toString().trim()) return;
  
  try {
    // Always use the sophisticated approach that handles all cases properly
    highlightRange(range);
    
    // Clear selection after highlighting
    selection.removeAllRanges();
  } catch (error) {
    console.error('Error highlighting selection:', error);
  }
}

function highlightRange(range) {
  // Extract the contents and store the original range position
  const startContainer = range.startContainer;
  const startOffset = range.startOffset;
  const endContainer = range.endContainer;
  const endOffset = range.endOffset;
  
  // Get all text nodes that are fully or partially within the range
  const textNodes = getTextNodesInRange(range);
  
  // Process each text node
  textNodes.forEach(({node, startOffset: start, endOffset: end}) => {
    highlightTextNode(node, start, end);
  });
}

function getTextNodesInRange(range) {
  const textNodes = [];
  const startContainer = range.startContainer;
  const endContainer = range.endContainer;
  
  // If the range is within a single text node
  if (startContainer === endContainer && startContainer.nodeType === Node.TEXT_NODE) {
    if (range.toString().trim()) {
      textNodes.push({
        node: startContainer,
        startOffset: range.startOffset,
        endOffset: range.endOffset
      });
    }
    return textNodes;
  }
  
  // For ranges spanning multiple nodes, use TreeWalker
  const root = range.commonAncestorContainer;
  const walker = document.createTreeWalker(
    root.nodeType === Node.TEXT_NODE ? root.parentNode : root,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let currentNode;
  walker.currentNode = root;
  
  // Find all text nodes in the document
  const allTextNodes = [];
  while (currentNode = walker.nextNode()) {
    allTextNodes.push(currentNode);
  }
  
  // Filter text nodes that intersect with our range
  allTextNodes.forEach(node => {
    if (!node.nodeValue.trim()) return;
    
    const nodeRange = document.createRange();
    nodeRange.selectNodeContents(node);
    
    // Check if this text node intersects with our selection range
    if (range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0 &&
        range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0) {
      
      let start = 0;
      let end = node.nodeValue.length;
      
      // Adjust start offset if this is the start node
      if (node === startContainer) {
        start = range.startOffset;
      } else if (startContainer.nodeType !== Node.TEXT_NODE && node.parentNode) {
        // Check if we're before the start
        const comparison = range.comparePoint(node, 0);
        if (comparison === -1) return; // Before range start
      }
      
      // Adjust end offset if this is the end node
      if (node === endContainer) {
        end = range.endOffset;
      } else if (endContainer.nodeType !== Node.TEXT_NODE && node.parentNode) {
        // Check if we're after the end
        const comparison = range.comparePoint(node, node.nodeValue.length);
        if (comparison === 1) return; // After range end
      }
      
      if (start < end && node.nodeValue.substring(start, end).trim()) {
        textNodes.push({ node, startOffset: start, endOffset: end });
      }
    }
  });
  
  return textNodes;
}

function highlightTextNode(textNode, start, end) {
  if (!textNode || !textNode.parentNode) return;
  
  const text = textNode.nodeValue;
  const highlightedText = text.substring(start, end);
  
  // Skip if nothing to highlight
  if (!highlightedText.trim()) return;
  
  // Create the highlight span
  const highlightSpan = document.createElement('span');
  highlightSpan.className = 'chrome-highlight-extension';
  highlightSpan.style.backgroundColor = highlightColor;
  highlightSpan.style.cursor = 'pointer';
  highlightSpan.dataset.highlighted = 'true';
  
  // Double-click to remove highlight
  highlightSpan.addEventListener('dblclick', function(e) {
    e.stopPropagation();
    removeHighlight(this);
  });
  
  const parent = textNode.parentNode;
  
  // If we're highlighting the entire text node
  if (start === 0 && end === text.length) {
    parent.insertBefore(highlightSpan, textNode);
    highlightSpan.appendChild(textNode);
  } else {
    // Split the text node and highlight only the selected part
    if (start > 0) {
      const beforeText = document.createTextNode(text.substring(0, start));
      parent.insertBefore(beforeText, textNode);
    }
    
    const highlightedTextNode = document.createTextNode(highlightedText);
    highlightSpan.appendChild(highlightedTextNode);
    parent.insertBefore(highlightSpan, textNode);
    
    if (end < text.length) {
      const afterText = document.createTextNode(text.substring(end));
      parent.insertBefore(afterText, textNode);
    }
    
    parent.removeChild(textNode);
  }
}

function removeHighlight(element) {
  const parent = element.parentNode;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
}

function clearAllHighlights() {
  const highlights = document.querySelectorAll('.chrome-highlight-extension');
  highlights.forEach(highlight => {
    removeHighlight(highlight);
  });
}

function getMarkedContent() {
  const highlights = document.querySelectorAll('.chrome-highlight-extension');
  const markedContent = [];
  
  highlights.forEach((highlight, index) => {
    markedContent.push({
      index: index + 1,
      text: highlight.textContent.trim(),
      element: highlight.parentElement.tagName.toLowerCase(),
      length: highlight.textContent.trim().length
    });
  });
  
  return markedContent;
}

function getAllReadableContent() {
  // Get all text content from common readable elements
  const readableSelectors = [
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'article', 'section', 'main',
    'li', 'td', 'th', 'blockquote', 'pre'
  ];
  
  let content = [];
  
  readableSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const text = el.textContent.trim();
      if (text && text.length > 0) {
        content.push(text);
      }
    });
  });
  
  return content.join(' ');
}

// Visual indicator when highlight mode is active
function updateCursor() {
  if (isHighlightModeEnabled) {
    document.body.style.cursor = 'crosshair';
  } else {
    document.body.style.cursor = '';
  }
}

// Optional: Add keyboard shortcut to toggle (Ctrl+Shift+H)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'H') {
    isHighlightModeEnabled = !isHighlightModeEnabled;
    // Save state to storage
    chrome.storage.local.set({ highlightEnabled: isHighlightModeEnabled });
    updateCursor();
    
    // Notify popup of state change
    chrome.runtime.sendMessage({
      action: 'statusChanged',
      enabled: isHighlightModeEnabled
    });
  }
});