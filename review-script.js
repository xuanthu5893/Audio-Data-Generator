// Get DOM elements
const csvInput = document.getElementById('csvInput');
const audioFilesInput = document.getElementById('audioFilesInput');
const audioFolderInput = document.getElementById('audioFolderInput');
const csvStatus = document.getElementById('csvStatus');
const audioStatus = document.getElementById('audioStatus');
const loadDataBtn = document.getElementById('loadDataBtn');
const dataDisplay = document.getElementById('dataDisplay');
const reviewTableBody = document.getElementById('reviewTableBody');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const totalCount = document.getElementById('totalCount');
const audioCount = document.getElementById('audioCount');
const noAudioCount = document.getElementById('noAudioCount');

// Store uploaded files and data
let csvFile = null;
let audioFiles = [];
let csvData = [];
let audioFileMap = new Map();
let displayedData = [];

// Type mapping
const typeMapping = {
    'ng_hype': 'Hype',
    'ng_legal': 'Legal Violation',
    'ng_prohibited': 'Prohibited Words',
    'ng_scam': 'Scam',
    'ng_misunderstand': 'Misunderstanding',
    'ng_threaten': 'Threaten'
};

// Get display name for type
function getTypeDisplayName(type) {
    if (!type || !type.trim()) return '';
    return typeMapping[type.trim()] || type.trim();
}

// Handle CSV file selection
csvInput.addEventListener('change', (e) => {
    csvFile = e.target.files[0];
    if (csvFile) {
        csvStatus.textContent = `✅ ${csvFile.name}`;
        csvStatus.style.color = '#28a745';
        checkIfReadyToLoad();
    } else {
        csvStatus.textContent = 'No file selected';
        csvStatus.style.color = '#666';
    }
});

// Handle audio files selection (individual files)
audioFilesInput.addEventListener('change', (e) => {
    const selectedFiles = Array.from(e.target.files).filter(file => file.type.startsWith('audio/'));
    audioFiles = selectedFiles;

    if (audioFiles.length > 0) {
        audioStatus.textContent = `✅ ${audioFiles.length} file(s) selected`;
        audioStatus.style.color = '#28a745';
        checkIfReadyToLoad();
    } else {
        audioStatus.textContent = 'No files selected';
        audioStatus.style.color = '#666';
    }
});

// Handle audio folder selection
audioFolderInput.addEventListener('change', (e) => {
    const selectedFiles = Array.from(e.target.files).filter(file => file.type.startsWith('audio/'));
    audioFiles = selectedFiles;

    if (audioFiles.length > 0) {
        audioStatus.textContent = `✅ ${audioFiles.length} file(s) from folder`;
        audioStatus.style.color = '#28a745';
        checkIfReadyToLoad();
    } else {
        audioStatus.textContent = 'No audio files found in folder';
        audioStatus.style.color = '#dc3545';
    }
});

// Check if ready to load
function checkIfReadyToLoad() {
    if (csvFile || audioFiles.length > 0) {
        loadDataBtn.style.display = 'block';
    } else {
        loadDataBtn.style.display = 'none';
    }
}

// Parse CSV file with proper handling of multi-line fields
async function parseCSV(file) {
    const text = await file.text();
    const result = [];

    // Parse CSV properly handling quotes and newlines
    const rows = parseCSVText(text);

    if (rows.length < 2) {
        throw new Error('CSV file is empty or has no data rows');
    }

    // Parse header
    const headers = rows[0].map(h => h.trim());

    // Find column indices (case-insensitive)
    const ngWordIndex = headers.findIndex(h =>
        h.toLowerCase().includes('ng') && h.toLowerCase().includes('word')
    );
    const sentenceIndex = headers.findIndex(h =>
        h.toLowerCase().includes('sentence')
    );
    const conversationIndex = headers.findIndex(h =>
        h.toLowerCase().includes('conversation')
    );
    const typeIndex = headers.findIndex(h =>
        h.toLowerCase().includes('type')
    );

    // Parse data rows
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

        result.push({
            ngWord: ngWordIndex >= 0 ? row[ngWordIndex]?.trim() || '' : row[0]?.trim() || '',
            sentence: sentenceIndex >= 0 ? row[sentenceIndex]?.trim() || '' : row[1]?.trim() || '',
            conversation: conversationIndex >= 0 ? row[conversationIndex]?.trim() || '' : row[2]?.trim() || '',
            type: typeIndex >= 0 ? row[typeIndex]?.trim() || '' : ''
        });
    }

    return result;
}

// Parse CSV text properly handling quoted fields and newlines
function parseCSVText(text) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote - add one quote to field
                currentField += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote mode
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // Field separator
            currentRow.push(currentField);
            currentField = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            // Row separator (outside quotes)
            if (char === '\r' && nextChar === '\n') {
                i++; // Skip \n in \r\n
            }

            // Add last field and row
            currentRow.push(currentField);

            // Only add non-empty rows
            if (currentRow.some(field => field.trim())) {
                rows.push(currentRow);
            }

            currentRow = [];
            currentField = '';
        } else {
            // Regular character
            currentField += char;
        }
    }

    // Add last field and row if any
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        if (currentRow.some(field => field.trim())) {
            rows.push(currentRow);
        }
    }

    return rows;
}

// Create audio file map
function createAudioFileMap(files) {
    const map = new Map();

    files.forEach(file => {
        // Extract base name without extension
        const baseName = file.name.replace(/\.[^/.]+$/, '');

        // Remove timestamp if exists (pattern: _1234567890 or _1761800059761)
        // This handles both short and long timestamps
        const ngWord = baseName.replace(/_\d{10,}$/, '');

        // Store with original case (important for Japanese characters)
        map.set(ngWord.trim(), file);

        // Also store lowercase normalized version
        const normalizedKey = ngWord.toLowerCase().trim();
        if (normalizedKey !== ngWord.trim()) {
            map.set(normalizedKey, file);
        }

        // Store original filename as well
        map.set(file.name, file);

        // Store base name too
        map.set(baseName.trim(), file);
    });

    return map;
}

// Find matching audio file for NG Word
function findAudioFile(ngWord) {
    if (!ngWord) return null;

    const trimmedNgWord = ngWord.trim();

    // Try exact match first (case-sensitive, important for Japanese)
    if (audioFileMap.has(trimmedNgWord)) {
        return audioFileMap.get(trimmedNgWord);
    }

    // Try lowercase match
    const normalizedNgWord = trimmedNgWord.toLowerCase();
    if (audioFileMap.has(normalizedNgWord)) {
        return audioFileMap.get(normalizedNgWord);
    }

    // Try with common audio extensions
    const extensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
    for (const ext of extensions) {
        // Try exact + extension
        if (audioFileMap.has(trimmedNgWord + ext)) {
            return audioFileMap.get(trimmedNgWord + ext);
        }
        // Try lowercase + extension
        if (audioFileMap.has(normalizedNgWord + ext)) {
            return audioFileMap.get(normalizedNgWord + ext);
        }
    }

    // Try finding by partial match
    for (const [key, file] of audioFileMap.entries()) {
        // Skip entries that are just filenames with extensions
        if (key.includes('.')) continue;

        // Normalize both strings for comparison (handle full-width/half-width differences)
        const normalizedKey = normalizeJapaneseString(key);
        const normalizedSearch = normalizeJapaneseString(trimmedNgWord);

        // Check if normalized strings match
        if (normalizedKey === normalizedSearch) {
            return file;
        }

        // Check if the key starts with ngWord or vice versa
        if (key.startsWith(trimmedNgWord) || trimmedNgWord.startsWith(key)) {
            return file;
        }

        // Check case-insensitive partial match
        const keyLower = key.toLowerCase();
        if (keyLower.startsWith(normalizedNgWord) || normalizedNgWord.startsWith(keyLower)) {
            return file;
        }

        // Check if ngWord is contained in key (for files like "ngword_timestamp")
        if (key.includes(trimmedNgWord)) {
            return file;
        }
    }

    return null;
}

// Normalize Japanese string (handle full-width/half-width, spaces, etc.)
function normalizeJapaneseString(str) {
    return str
        .trim()
        .replace(/\s+/g, '') // Remove all whitespace
        .normalize('NFKC'); // Normalize Unicode (handles full-width/half-width)
}

// Load and display data
loadDataBtn.addEventListener('click', async () => {
    try {
        loadDataBtn.disabled = true;
        loadDataBtn.textContent = '⏳ Loading...';

        // Parse CSV if provided
        if (csvFile) {
            csvData = await parseCSV(csvFile);
        }

        // Create audio file map if provided
        if (audioFiles.length > 0) {
            audioFileMap = createAudioFileMap(audioFiles);
        }

        // If no CSV but has audio files, create entries from audio files
        if (csvData.length === 0 && audioFiles.length > 0) {
            csvData = audioFiles.map(file => ({
                ngWord: file.name.replace(/\.[^/.]+$/, '').replace(/_\d+$/, ''),
                sentence: '',
                conversation: ''
            }));
        }

        // Match CSV data with audio files
        displayedData = csvData.map(row => {
            const audioFile = findAudioFile(row.ngWord);
            return {
                ...row,
                audioFile: audioFile,
                audioUrl: audioFile ? URL.createObjectURL(audioFile) : null,
                audioFileName: audioFile ? audioFile.name : null
            };
        });

        // Display data
        displayData(displayedData);
        dataDisplay.style.display = 'block';

        // Update stats
        updateStats();

        loadDataBtn.textContent = '✅ Loaded Successfully!';
        setTimeout(() => {
            loadDataBtn.textContent = '🚀 Load & Display Data';
            loadDataBtn.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data: ' + error.message);
        loadDataBtn.textContent = '🚀 Load & Display Data';
        loadDataBtn.disabled = false;
    }
});

// Display data in table (2-column layout)
function displayData(data) {
    reviewTableBody.innerHTML = '';

    if (data.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    data.forEach((row, index) => {
        const tr = document.createElement('tr');

        // Index
        const indexTd = document.createElement('td');
        indexTd.textContent = index + 1;
        indexTd.style.textAlign = 'center';
        tr.appendChild(indexTd);

        // NG Word with status indicator
        const ngWordTd = document.createElement('td');
        const ngWordContainer = document.createElement('div');
        ngWordContainer.style.display = 'flex';
        ngWordContainer.style.alignItems = 'center';

        const statusIndicator = document.createElement('span');
        statusIndicator.className = 'status-indicator ' + (row.audioUrl ? 'status-has-audio' : 'status-no-audio');
        ngWordContainer.appendChild(statusIndicator);

        const ngWordText = document.createElement('span');
        ngWordText.textContent = row.ngWord;
        ngWordText.className = 'ng-word-cell';
        ngWordContainer.appendChild(ngWordText);

        ngWordTd.appendChild(ngWordContainer);
        tr.appendChild(ngWordTd);

        // Type
        const typeTd = document.createElement('td');
        const typeDisplayName = getTypeDisplayName(row.type);
        if (typeDisplayName) {
            const typeBadge = document.createElement('span');
            typeBadge.className = 'type-badge';
            typeBadge.textContent = typeDisplayName;
            typeTd.appendChild(typeBadge);
        }
        tr.appendChild(typeTd);

        // Action Button
        const actionTd = document.createElement('td');
        actionTd.style.textAlign = 'center';

        const viewBtn = document.createElement('button');
        viewBtn.className = 'view-detail-btn';
        viewBtn.textContent = '👁️ View Detail';
        viewBtn.addEventListener('click', () => {
            showDetailModal(row);
        });

        actionTd.appendChild(viewBtn);
        tr.appendChild(actionTd);

        reviewTableBody.appendChild(tr);
    });
}

// Update statistics
function updateStats() {
    const total = displayedData.length;
    const withAudio = displayedData.filter(row => row.audioUrl).length;
    const withoutAudio = total - withAudio;

    totalCount.textContent = total;
    audioCount.textContent = withAudio;
    noAudioCount.textContent = withoutAudio;
}

// Search functionality
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();

    if (!searchTerm) {
        displayData(displayedData);
        return;
    }

    const filtered = displayedData.filter(row =>
        row.ngWord.toLowerCase().includes(searchTerm) ||
        (row.sentence && row.sentence.toLowerCase().includes(searchTerm)) ||
        (row.conversation && row.conversation.toLowerCase().includes(searchTerm))
    );

    displayData(filtered);
});

// Export CSV
exportCsvBtn.addEventListener('click', () => {
    if (displayedData.length === 0) {
        alert('No data to export!');
        return;
    }

    let csvContent = 'NG Word,Sentence,Conversation,Has Audio\n';

    displayedData.forEach(row => {
        const ngWord = (row.ngWord || '').replace(/"/g, '""');
        const sentence = (row.sentence || '').replace(/"/g, '""');
        const conversation = (row.conversation || '').replace(/"/g, '""');
        const hasAudio = row.audioUrl ? 'Yes' : 'No';

        csvContent += `"${ngWord}","${sentence}","${conversation}","${hasAudio}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `review_export_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// ==========================================
// Detail Modal Functions
// ==========================================

const detailModal = document.getElementById('detailModal');
const closeDetailModal = document.getElementById('closeDetailModal');
const modalTitle = document.getElementById('modalTitle');
const modalTypeBadge = document.getElementById('modalTypeBadge');
const modalAudio = document.getElementById('modalAudio');
const modalAudioSection = document.getElementById('modalAudioSection');
const modalNoAudio = document.getElementById('modalNoAudio');
const audioFileInfo = document.getElementById('audioFileInfo');
const modalConversation = document.getElementById('modalConversation');
const modalConversationSection = document.getElementById('modalConversationSection');

let currentModalData = null;

// Show detail modal
function showDetailModal(rowData) {
    currentModalData = rowData;

    // Set title
    modalTitle.textContent = rowData.ngWord;

    // Set type badge
    const typeDisplayName = getTypeDisplayName(rowData.type);
    if (typeDisplayName) {
        modalTypeBadge.textContent = typeDisplayName;
        modalTypeBadge.style.display = 'block';
    } else {
        modalTypeBadge.style.display = 'none';
    }

    // Handle audio
    if (rowData.audioUrl) {
        modalAudio.src = rowData.audioUrl;

        // Display audio file name
        if (rowData.audioFileName) {
            audioFileInfo.textContent = rowData.audioFileName;
            audioFileInfo.style.display = 'block';
        } else {
            audioFileInfo.style.display = 'none';
        }

        modalAudioSection.style.display = 'block';
        modalNoAudio.style.display = 'none';
    } else {
        modalAudioSection.style.display = 'none';
        modalNoAudio.style.display = 'block';
    }

    // Handle conversation - remove empty lines
    if (rowData.conversation && rowData.conversation.trim()) {
        const cleanedConversation = removeEmptyLines(rowData.conversation);
        modalConversation.innerHTML = highlightNgWord(cleanedConversation, rowData.ngWord);
        modalConversationSection.style.display = 'block';
    } else {
        modalConversationSection.style.display = 'none';
    }

    // Reset verification section
    resetVerificationSection();

    // Show modal
    detailModal.style.display = 'block';
}

// Remove empty lines from text
function removeEmptyLines(text) {
    if (!text) return '';

    return text
        .split('\n')
        .filter(line => line.trim().length > 0)
        .join('\n');
}

// Highlight NG Word in text
function highlightNgWord(text, ngWord) {
    if (!text || !ngWord) return text || '';

    // Escape special regex characters in ngWord
    const escapedNgWord = ngWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Create regex with global flag and case insensitive
    const regex = new RegExp(escapedNgWord, 'gi');

    // Replace all occurrences with highlighted version
    const highlighted = text.replace(regex, match => {
        return `<span class="highlight-ng-word">${match}</span>`;
    });

    return highlighted;
}

// Close modal handlers
closeDetailModal.addEventListener('click', () => {
    detailModal.style.display = 'none';
    modalAudio.pause();
    currentModalData = null;
});

window.addEventListener('click', (event) => {
    if (event.target === detailModal) {
        detailModal.style.display = 'none';
        modalAudio.pause();
        currentModalData = null;
    }
});

// ==========================================
// Text Verification & Comparison Functions
// ==========================================

const toggleVerificationBtn = document.getElementById('toggleVerificationBtn');
const verificationSection = document.getElementById('verificationSection');
const transcribedInput = document.getElementById('transcribedInput');
const compareTextBtn = document.getElementById('compareTextBtn');
const aiCheckBtn = document.getElementById('aiCheckBtn');
const comparisonResult = document.getElementById('comparisonResult');
const aiAnalysisResult = document.getElementById('aiAnalysisResult');
const aiAnalysisContent = document.getElementById('aiAnalysisContent');
const accuracyValue = document.getElementById('accuracyValue');
const originalCompareText = document.getElementById('originalCompareText');
const transcribedCompareText = document.getElementById('transcribedCompareText');
const matchingChars = document.getElementById('matchingChars');
const differentChars = document.getElementById('differentChars');
const totalChars = document.getElementById('totalChars');

let verificationVisible = false;

// Toggle verification section
toggleVerificationBtn.addEventListener('click', () => {
    verificationVisible = !verificationVisible;

    if (verificationVisible) {
        verificationSection.style.display = 'block';
        toggleVerificationBtn.textContent = '🔍 Hide Verification Tool';
    } else {
        verificationSection.style.display = 'none';
        toggleVerificationBtn.textContent = '🔍 Show Verification Tool';
        // Reset form
        transcribedInput.value = '';
        comparisonResult.style.display = 'none';
    }
});

const ignoreFormattingCheckbox = document.getElementById('ignoreFormatting');

// Debug log storage
let debugLogs = [];

// Helper function to add debug log
function addDebugLog(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    debugLogs.push(logEntry);

    if (data !== null) {
        debugLogs.push(JSON.stringify(data, null, 2));
    }

    console.log(message, data || '');
}

// Export debug logs to file
function exportDebugLogs() {
    const blob = new Blob([debugLogs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_debug_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Debug modal elements
const debugModal = document.getElementById('debugModal');
const closeDebugModal = document.getElementById('closeDebugModal');
const debugLogContent = document.getElementById('debugLogContent');
const showDebugBtn = document.getElementById('showDebugBtn');
const copyDebugBtn = document.getElementById('copyDebugBtn');
const downloadDebugBtn = document.getElementById('downloadDebugBtn');

// Show debug log modal
showDebugBtn.addEventListener('click', () => {
    if (debugLogs.length === 0) {
        alert('No debug logs available. Please run comparison first.');
        return;
    }
    debugLogContent.textContent = debugLogs.join('\n');
    debugModal.style.display = 'block';
});

// Close debug modal
closeDebugModal.addEventListener('click', () => {
    debugModal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === debugModal) {
        debugModal.style.display = 'none';
    }
});

// Copy to clipboard
copyDebugBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(debugLogs.join('\n'));
        const originalText = copyDebugBtn.textContent;
        copyDebugBtn.textContent = '✅ Copied!';
        setTimeout(() => {
            copyDebugBtn.textContent = originalText;
        }, 2000);
    } catch (error) {
        alert('Failed to copy to clipboard: ' + error.message);
    }
});

// Download as file
downloadDebugBtn.addEventListener('click', () => {
    exportDebugLogs();
});

// Compare texts
compareTextBtn.addEventListener('click', () => {
    const originalText = currentModalData?.conversation || '';
    const transcribedText = transcribedInput.value.trim();

    if (!transcribedText) {
        alert('Please paste the transcribed text first!');
        return;
    }

    if (!originalText) {
        alert('No original conversation available to compare!');
        return;
    }

    // Clear previous comparison result and debug logs
    comparisonResult.style.display = 'none';
    originalCompareText.innerHTML = '';
    transcribedCompareText.innerHTML = '';
    debugLogs = []; // Clear previous debug logs

    addDebugLog('=== NEW COMPARISON STARTED ===');
    addDebugLog('Original text length:', originalText.length);
    addDebugLog('Transcript text length:', transcribedText.length);

    // Check if ignore formatting is enabled
    const ignoreFormatting = ignoreFormattingCheckbox.checked;

    // Prepare texts based on option
    let textToCompare1 = originalText;
    let textToCompare2 = transcribedText;

    if (ignoreFormatting) {
        // Extract only spoken content (remove speaker labels)
        textToCompare1 = extractSpokenContent(originalText);
    }

    // Perform comparison
    const result = compareTexts(textToCompare1, textToCompare2);

    // Display results
    displayComparisonResults(result, textToCompare1, textToCompare2, ignoreFormatting);
});

// AI Check transcript
aiCheckBtn.addEventListener('click', async () => {
    const originalText = currentModalData?.conversation || '';
    const transcribedText = transcribedInput.value.trim();

    if (!transcribedText) {
        alert('Please paste the transcribed text first!');
        return;
    }

    if (!originalText) {
        alert('No original conversation available to compare!');
        return;
    }

    // Clear previous AI analysis result
    aiAnalysisResult.style.display = 'none';
    aiAnalysisContent.textContent = '';

    // Disable button and show loading
    aiCheckBtn.disabled = true;
    aiCheckBtn.textContent = '⏳ Analyzing...';

    try {
        const analysis = await analyzeTranscriptWithAI(originalText, transcribedText);
        displayAIAnalysis(analysis);
    } catch (error) {
        alert('Error analyzing with AI: ' + error.message);
        console.error('AI Analysis Error:', error);
    } finally {
        aiCheckBtn.disabled = false;
        aiCheckBtn.textContent = '🤖 Check with AI';
    }
});

// Analyze transcript with AI (using OpenAI API)
async function analyzeTranscriptWithAI(originalText, transcribedText) {
    const apiKey = localStorage.getItem('openai_api_key');

    if (!apiKey) {
        throw new Error('OpenAI API key not found. Please set it in the main generator page.');
    }

    const prompt = `You are a Senior Quality Control Engineer specialized in Speech-to-Text (STT) testing.
Your job is to evaluate the ASR Output against the Ground Truth and produce metrics and error details.

INPUTS:
- Ground Truth (reference transcript)
- ASR Output (system transcript)

REQUIREMENTS:

A) NORMALIZATION (apply to BOTH texts BEFORE comparison)
1) Unicode: normalize to NFKC.
2) Case: case-insensitive for Latin scripts.
3) Punctuation: remove/ignore all punctuation (.,!?;:「」『』（）“”„〜…・—- 、。・，；？！等).
4) Whitespace:
   - Collapse all whitespace runs to a single space.
   - Trim leading/trailing spaces.
   - For CJK text, remove optional spaces between contiguous CJK characters (treat differences that are only internal spaces as identical).
5) Fillers / interjections (ignore completely; do NOT count as errors): へぇ〜, へえ, あー, あ〜, えー, ええと, うん, えっ, うわー, うーん, わぁ, あっ, うー, えぇ.
6) Stage directions / non-speech tags (ignore completely; do NOT count as errors):
   - Square-bracket tags like: [laughs], [smiles], [excited], [thinking], [background noise], [crosstalk], [music], [applause].
   - Parenthetical or locale variants: (笑), (ノイズ), (BGM), <noise>, <sfx>, {applause}.
   - Regex for bracketed tags (case-insensitive): "[\$begin:math:text$\\\\[\\\\{<]\\\\s*[a-zA-Zぁ-んァ-ン一-龥ー\\\\s]+[\\$end:math:text$\\]\\}>]".
7) Spacing/capitalization/punctuation-only differences must never produce errors.

B) COMPARISON & ERRORS
- After normalization, compare token-by-token (word-level for spaced scripts; character/subword for CJK if needed).
- Classify only REAL lexical differences as: Substitution, Deletion, Insertion.
- Do NOT include ignored items from A3–A6 in Error Details or S/D/I counts.

C) METRICS
- WER = (S + D + I) / N × 100%.
- Accuracy = (1 - WER).
- Optionally include CER.

D) OUTPUT FORMAT (exact sections)
- WER: X%
- Accuracy: Y%
- Error Details: list only true lexical errors after normalization (no punctuation/whitespace/fillers/tags here).
- Ignored Elements: list unique ignored items (punctuation, whitespace-only diffs, Japanese fillers, bracketed tags), with examples.
- Severity (High/Medium/Low).
- Observations & Suggestions.

Now evaluate the following:

**Ground Truth:**
"""
${originalText}

"""

**ASR Output:**
"""
${transcribedText}

"""

Provide your analysis in Vietnamese language, in clear, structured format with bullet points.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a professional transcript quality analyst.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// Display AI analysis results
function displayAIAnalysis(analysis) {
    aiAnalysisContent.textContent = analysis;
    aiAnalysisResult.style.display = 'block';

    // Scroll to results
    aiAnalysisResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Text comparison algorithm using multiple metrics
function compareTexts(text1, text2) {
    // Normalize texts (remove extra spaces, convert to lowercase for comparison)
    const normalized1 = normalizeText(text1);
    const normalized2 = normalizeText(text2);

    // 1. Character Error Rate (CER) - Character-level accuracy
    const charDistance = levenshteinDistance(normalized1, normalized2);
    const maxCharLength = Math.max(normalized1.length, normalized2.length);
    const cer = maxCharLength === 0 ? 0 : (charDistance / maxCharLength * 100);
    const charAccuracy = Math.max(0, 100 - cer);

    // 2. Word Error Rate (WER) - Word-level accuracy
    const words1 = normalized1.split(/\s+/).filter(w => w.length > 0);
    const words2 = normalized2.split(/\s+/).filter(w => w.length > 0);
    const wordDiff = calculateWordDiff(words1, words2);
    const wordErrors = wordDiff.substitutions + wordDiff.deletions + wordDiff.insertions;
    const totalWords = Math.max(words1.length, words2.length);
    const wer = totalWords === 0 ? 0 : (wordErrors / totalWords * 100);
    const wordAccuracy = Math.max(0, 100 - wer);

    // 3. Sentence-level accuracy (from sentence matching)
    const cleanText1 = cleanTranscript(text1);
    const cleanText2 = cleanTranscript(text2);
    const sentences1 = splitIntoSentences(cleanText1);
    const sentences2 = splitIntoSentences(cleanText2);

    // Count matched sentences (with similarity >= 50%)
    let matchedSentences = 0;
    let totalSimilarity = 0;

    // Use a simple greedy matching for sentence accuracy
    const usedIndices = new Set();
    sentences1.forEach(s1 => {
        let bestSim = 0;
        let bestIdx = -1;

        sentences2.forEach((s2, idx) => {
            if (!usedIndices.has(idx)) {
                const sim = parseFloat(calculateSimilarity(s1, s2));
                if (sim > bestSim) {
                    bestSim = sim;
                    bestIdx = idx;
                }
            }
        });

        if (bestSim >= 50) {
            matchedSentences++;
            totalSimilarity += bestSim;
            if (bestIdx >= 0) usedIndices.add(bestIdx);
        }
    });

    const sentenceAccuracy = sentences1.length === 0 ? 100 :
        (matchedSentences / sentences1.length * 100);
    const avgSentenceSimilarity = matchedSentences === 0 ? 0 :
        (totalSimilarity / matchedSentences);

    // 4. Combined Accuracy Score (weighted average)
    // - Character accuracy: 30% (important for transcription details)
    // - Word accuracy: 40% (most important for meaning)
    // - Sentence accuracy: 30% (important for structure)
    const combinedAccuracy = (
        charAccuracy * 0.3 +
        wordAccuracy * 0.4 +
        sentenceAccuracy * 0.3
    ).toFixed(2);

    return {
        // Main combined score
        accuracy: combinedAccuracy,

        // Individual metrics
        charAccuracy: charAccuracy.toFixed(2),
        wordAccuracy: wordAccuracy.toFixed(2),
        sentenceAccuracy: sentenceAccuracy.toFixed(2),
        avgSentenceSimilarity: avgSentenceSimilarity.toFixed(2),

        // Details
        cer: cer.toFixed(2),
        wer: wer.toFixed(2),

        // Character stats
        charDistance: charDistance,
        text1Length: normalized1.length,
        text2Length: normalized2.length,
        matching: maxCharLength - charDistance,
        different: charDistance,
        total: maxCharLength,

        // Word stats
        wordStats: {
            total: totalWords,
            errors: wordErrors,
            substitutions: wordDiff.substitutions,
            deletions: wordDiff.deletions,
            insertions: wordDiff.insertions
        },

        // Sentence stats
        sentenceStats: {
            originalCount: sentences1.length,
            transcriptCount: sentences2.length,
            matched: matchedSentences,
            unmatched: sentences1.length - matchedSentences
        }
    };
}

// Normalize text for comparison
function normalizeText(text) {
    return text
        // Remove speaker labels (A:, B:, Speaker A:, etc.)
        .replace(/^[AB]:\s*/gim, '')
        .replace(/^Speaker\s+[AB]:\s*/gim, '')
        // Remove special characters and punctuation (keep only alphanumeric and spaces)
        // For Japanese, keep hiragana, katakana, kanji
        .replace(/[、。！？「」『』（）\[\]\(\)]/g, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

// Extract only spoken content from conversation (remove speaker labels)
function extractSpokenContent(text) {
    return text
        .split('\n')
        .map(line => {
            // Remove speaker labels at start of line
            return line.replace(/^[AB]:\s*/i, '')
                      .replace(/^Speaker\s+[AB]:\s*/i, '')
                      .trim();
        })
        .filter(line => line.length > 0)
        .join(' ');
}

// Clean and normalize transcript (remove audio tags, speaker labels) - KEEP punctuation for splitting
function cleanTranscript(text) {
    return text
        // Remove audio/emotion tags like [smiles], [thinking], [excited]
        .replace(/\[.*?\]/g, '')
        // Normalize line breaks - join lines that don't end with sentence punctuation
        .replace(/\n(?![。！？\.!?])/g, ' ')
        // Add space after punctuation if missing
        .replace(/([。！？\.!?])([^\s])/g, '$1 $2')
        // Remove speaker labels (A:, B:, Speaker A:, etc.) - do this AFTER joining lines
        .replace(/[AB]:\s*/g, '')
        .replace(/Speaker\s+[AB]:\s*/g, '')
        // Normalize multiple spaces
        .replace(/\s+/g, ' ')
        .trim();
}

// Remove punctuation from a single sentence (after splitting)
function removePunctuation(text) {
    return text
        .replace(/[。！？\.!?、，,]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Levenshtein distance algorithm
function levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    return matrix[len1][len2];
}

// Display comparison results
function displayComparisonResults(result, originalText, transcribedText, ignoreFormatting = true) {
    // Set accuracy
    accuracyValue.textContent = `${result.accuracy}%`;

    // Color code accuracy badge
    const accuracyBadge = document.getElementById('accuracyBadge');
    if (result.accuracy >= 90) {
        accuracyBadge.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
    } else if (result.accuracy >= 70) {
        accuracyBadge.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    } else {
        accuracyBadge.style.background = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
    }

    // Generate diff and display with highlighting
    // If ignoreFormatting, texts are already cleaned
    const diffResult = generateDiff(originalText, transcribedText, ignoreFormatting);
    originalCompareText.innerHTML = diffResult.originalHtml;
    transcribedCompareText.innerHTML = diffResult.transcribedHtml;

    // Set statistics with detailed metrics
    matchingChars.textContent = `Char: ${result.charAccuracy}% | Word: ${result.wordAccuracy}% | Sentence: ${result.sentenceAccuracy}%`;
    differentChars.textContent = `CER: ${result.cer}% | WER: ${result.wer}% | Matched: ${result.sentenceStats.matched}/${result.sentenceStats.originalCount} sentences`;
    totalChars.textContent = `Chars: ${result.text1Length} vs ${result.text2Length} | Words: ${result.wordStats.total} (S:${result.wordStats.substitutions} D:${result.wordStats.deletions} I:${result.wordStats.insertions})`;

    // Show results
    comparisonResult.style.display = 'block';

    // Scroll to results
    comparisonResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Split text into sentences by punctuation marks, then remove punctuation
function splitIntoSentences(text) {
    if (!text || !text.trim()) return [];

    // Split by Japanese and English sentence endings
    // 。！？ for Japanese, .!? for English
    const parts = text.split(/([。！？\.!?]+)/);
    const sentences = [];

    let i = 0;
    while (i < parts.length) {
        const current = parts[i].trim();

        // Skip empty parts
        if (!current) {
            i++;
            continue;
        }

        // Check if current part is punctuation only
        const isPunctuation = /^[。！？\.!?]+$/.test(current);

        if (isPunctuation) {
            // This is leftover punctuation without preceding text, skip it
            i++;
            continue;
        }

        // This is text, combine with following punctuation if exists
        const nextPart = parts[i + 1];
        const hasPunctuation = nextPart && /^[。！？\.!?]+$/.test(nextPart.trim());

        if (hasPunctuation) {
            // Combine text + punctuation, then remove punctuation for display
            const fullSentence = current + nextPart;
            sentences.push(removePunctuation(fullSentence));
            i += 2; // Skip both text and punctuation
        } else {
            // No punctuation after this text
            sentences.push(removePunctuation(current));
            i++;
        }
    }

    return sentences.length > 0 ? sentences : [removePunctuation(text)];
}

// Generate visual diff with highlighting (sentence-by-sentence)
function generateDiff(text1, text2, alreadyCleaned = true) {
    // Clean both texts to remove speaker labels and emotion tags
    const cleanText1 = cleanTranscript(text1);
    const cleanText2 = cleanTranscript(text2);

    addDebugLog('=== GENERATE DIFF DEBUG ===');
    addDebugLog('Original cleaned:', cleanText1);
    addDebugLog('Transcript cleaned:', cleanText2);

    // Split texts into sentences
    const sentences1 = splitIntoSentences(cleanText1);
    const sentences2 = splitIntoSentences(cleanText2);

    addDebugLog('Original sentences:', sentences1);
    addDebugLog('Transcript sentences:', sentences2);
    addDebugLog('Original count: ' + sentences1.length);
    addDebugLog('Transcript count: ' + sentences2.length);

    // Calculate sentence-level diff
    const diff = calculateSentenceDiff(sentences1, sentences2);

    addDebugLog('Matched: ' + diff.filter(d => d.type === 'equal').length);
    addDebugLog('Deleted: ' + diff.filter(d => d.type === 'delete').length);
    addDebugLog('Inserted: ' + diff.filter(d => d.type === 'insert').length);

    // Build rows with side-by-side comparison
    let rows = [];

    diff.forEach((item, index) => {
        const cleanedValue = escapeHtml(item.value);
        const similarity = item.similarity || 0;

        if (item.type === 'equal') {
            // Matched sentences - show on same row
            let badgeClass = 'similarity-badge';
            let badgeColor = '';

            if (similarity >= 90) {
                badgeColor = 'style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);"';
            } else if (similarity >= 70) {
                badgeColor = 'style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);"';
            } else {
                badgeColor = 'style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);"';
            }

            const similarityBadge = `<span class="${badgeClass}" ${badgeColor}>${similarity}%</span>`;

            const cleanedMatchedValue = item.matchedValue ? escapeHtml(item.matchedValue) : cleanedValue;

            rows.push({
                original: `<div class="sentence-equal">${cleanedValue} ${similarityBadge}</div>`,
                transcript: `<div class="sentence-equal">${cleanedMatchedValue} ${similarityBadge}</div>`
            });
        } else if (item.type === 'delete') {
            // Only in original - empty on transcript side
            rows.push({
                original: `<div class="sentence-removed">${cleanedValue}</div>`,
                transcript: `<div class="sentence-empty"></div>`
            });
        } else if (item.type === 'insert') {
            // Only in transcript - empty on original side
            rows.push({
                original: `<div class="sentence-empty"></div>`,
                transcript: `<div class="sentence-added">${cleanedValue}</div>`
            });
        }
    });

    // Build HTML with rows
    let originalHtml = '';
    let transcribedHtml = '';

    rows.forEach(row => {
        originalHtml += row.original;
        transcribedHtml += row.transcript;
    });

    return {
        originalHtml: originalHtml,
        transcribedHtml: transcribedHtml
    };
}

// Calculate similarity between two sentences (0-100%)
function calculateSimilarity(str1, str2) {
    const norm1 = str1.replace(/\s+/g, '').toLowerCase();
    const norm2 = str2.replace(/\s+/g, '').toLowerCase();

    const maxLen = Math.max(norm1.length, norm2.length);
    if (maxLen === 0) return 100;

    const distance = levenshteinDistance(norm1, norm2);
    return ((1 - distance / maxLen) * 100).toFixed(1);
}

// Find best matching sentence from arr2 for a sentence in arr1
function findBestMatch(sentence, candidates) {
    let bestMatch = null;
    let bestSimilarity = 0;
    let bestIndex = -1;

    candidates.forEach((candidate, index) => {
        const similarity = parseFloat(calculateSimilarity(sentence, candidate));
        if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestMatch = candidate;
            bestIndex = index;
        }
    });

    return { match: bestMatch, similarity: bestSimilarity, index: bestIndex };
}

// Calculate sentence-level diff with similarity matching
function calculateSentenceDiff(arr1, arr2) {
    const diff = [];
    const usedIndices = new Set();
    const SIMILARITY_THRESHOLD = 50; // Consider as match if >= 50% similar (lowered for better matching)

    addDebugLog('=== CALCULATING SENTENCE DIFF ===');

    // For each sentence in original, try to find best match in transcript
    arr1.forEach((sentence1, origIndex) => {
        const availableCandidates = arr2.filter((_, idx) => !usedIndices.has(idx));

        if (availableCandidates.length === 0) {
            addDebugLog(`[${origIndex}] "${sentence1}" - No candidates available, marking as DELETED`);
            // No more candidates - mark as deleted
            diff.push({
                type: 'delete',
                value: sentence1,
                similarity: 0,
                origIndex: origIndex,
                transcriptIndex: -1
            });
            return;
        }

        // Find best match ONLY from available candidates
        const { match, similarity, index } = findBestMatch(sentence1, availableCandidates);

        addDebugLog(`[${origIndex}] "${sentence1}" -> Best match: "${match}" (${similarity}%)`);

        if (similarity >= SIMILARITY_THRESHOLD) {
            // Found a good match - find its actual index in arr2
            const actualIndex = arr2.findIndex(s => s === match && !usedIndices.has(arr2.indexOf(s)));
            usedIndices.add(actualIndex);

            addDebugLog(`  ✓ MATCHED at transcript index ${actualIndex}`);

            diff.push({
                type: 'equal',
                value: sentence1,
                matchedValue: match,
                similarity: similarity,
                origIndex: origIndex,
                transcriptIndex: actualIndex
            });
        } else {
            addDebugLog(`  ✗ Similarity too low (${similarity}% < ${SIMILARITY_THRESHOLD}%), marking as DELETED`);
            // No good match - mark as deleted
            diff.push({
                type: 'delete',
                value: sentence1,
                similarity: 0,
                origIndex: origIndex,
                transcriptIndex: -1
            });
        }
    });

    // Add remaining unmatched sentences from transcript as insertions
    arr2.forEach((sentence2, index) => {
        if (!usedIndices.has(index)) {
            addDebugLog(`Transcript[${index}] "${sentence2}" - Not matched, marking as INSERTED`);
            diff.push({
                type: 'insert',
                value: sentence2,
                similarity: 0,
                origIndex: -1,
                transcriptIndex: index
            });
        }
    });

    addDebugLog('=== ORDERING RESULTS ===');

    // Simple strategy: Sort by original index, maintaining relative order
    // - Items with same origIndex sort by type: equal > delete
    // - Items with origIndex -1 (inserts) are placed based on their transcript position
    const finalDiff = diff.sort((a, b) => {
        // Both have original index - sort by original position
        if (a.origIndex >= 0 && b.origIndex >= 0) {
            if (a.origIndex !== b.origIndex) {
                return a.origIndex - b.origIndex;
            }
            // Same original position - put matches before deletes
            if (a.type === 'equal' && b.type === 'delete') return -1;
            if (a.type === 'delete' && b.type === 'equal') return 1;
            return 0;
        }

        // Both are inserts - sort by transcript position
        if (a.origIndex === -1 && b.origIndex === -1) {
            return a.transcriptIndex - b.transcriptIndex;
        }

        // One is insert - need to find where to place it
        if (a.origIndex === -1) {
            // a is insert - find appropriate position based on surrounding matches
            // Place insert at the position of the next match in transcript
            const nextMatch = diff.find(d =>
                d.type === 'equal' &&
                d.transcriptIndex > a.transcriptIndex
            );
            if (nextMatch && nextMatch.origIndex <= b.origIndex) {
                return -1; // Insert comes before b
            }
            return 1; // Insert comes after b
        } else {
            // b is insert
            const nextMatch = diff.find(d =>
                d.type === 'equal' &&
                d.transcriptIndex > b.transcriptIndex
            );
            if (nextMatch && nextMatch.origIndex <= a.origIndex) {
                return 1; // Insert comes before a
            }
            return -1; // Insert comes after a
        }
    });

    addDebugLog('=== FINAL DIFF ORDER ===');
    finalDiff.forEach((item, idx) => {
        const type = item.type === 'equal' ? '✓' : item.type === 'insert' ? '+' : '-';
        const value = item.value.substring(0, 50) + (item.value.length > 50 ? '...' : '');
        const sim = item.similarity ? ` [${item.similarity}%]` : '';
        addDebugLog(`${idx}: [${type}] "${value}"${sim} (origIdx: ${item.origIndex}, transIdx: ${item.transcriptIndex})`);
    });

    return finalDiff;
}

// Calculate word-level diff
function calculateWordDiff(arr1, arr2) {
    const len1 = arr1.length;
    const len2 = arr2.length;
    const matrix = [];

    // Build LCS matrix
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [];
        for (let j = 0; j <= len2; j++) {
            if (i === 0 || j === 0) {
                matrix[i][j] = 0;
            } else if (arr1[i - 1] === arr2[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1] + 1;
            } else {
                matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
            }
        }
    }

    // Backtrack to build diff
    const diff = [];
    let i = len1;
    let j = len2;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && arr1[i - 1] === arr2[j - 1]) {
            // Equal
            diff.unshift({ type: 'equal', value: arr1[i - 1] });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
            // Insert
            diff.unshift({ type: 'insert', value: arr2[j - 1] });
            j--;
        } else if (i > 0 && (j === 0 || matrix[i][j - 1] < matrix[i - 1][j])) {
            // Delete
            diff.unshift({ type: 'delete', value: arr1[i - 1] });
            i--;
        }
    }

    // Count error types for WER calculation
    let substitutions = 0;
    let deletions = 0;
    let insertions = 0;

    // Identify substitutions as consecutive delete+insert pairs
    let idx = 0;
    while (idx < diff.length) {
        if (diff[idx].type === 'delete') {
            // Check if next operation is insert (this is a substitution)
            if (idx + 1 < diff.length && diff[idx + 1].type === 'insert') {
                substitutions++;
                idx += 2; // Skip both delete and insert
            } else {
                deletions++;
                idx++;
            }
        } else if (diff[idx].type === 'insert') {
            insertions++;
            idx++;
        } else {
            idx++;
        }
    }

    return {
        diff,
        substitutions,
        deletions,
        insertions
    };
}

// Escape HTML special characters
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Reset verification section when modal opens
function resetVerificationSection() {
    verificationVisible = false;
    verificationSection.style.display = 'none';
    toggleVerificationBtn.textContent = '🔍 Show Verification Tool';
    transcribedInput.value = '';
    comparisonResult.style.display = 'none';
}
