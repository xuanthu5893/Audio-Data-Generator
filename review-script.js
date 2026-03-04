// Get DOM elements
const csvInput = document.getElementById("csvInput");
const audioFilesInput = document.getElementById("audioFilesInput");
const audioFolderInput = document.getElementById("audioFolderInput");
const csvStatus = document.getElementById("csvStatus");
const audioStatus = document.getElementById("audioStatus");
const loadDataBtn = document.getElementById("loadDataBtn");
const dataDisplay = document.getElementById("dataDisplay");
const reviewTableBody = document.getElementById("reviewTableBody");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const totalCount = document.getElementById("totalCount");
const audioCount = document.getElementById("audioCount");
const noAudioCount = document.getElementById("noAudioCount");

// Store uploaded files and data
let csvFile = null;
let audioFiles = [];
let csvData = [];
let audioFileMap = new Map();
let displayedData = [];

// Type mapping
const typeMapping = {
  ng_hype: "Hype",
  ng_legal: "Legal Violation",
  ng_prohibited: "Prohibited Words",
  ng_scam: "Scam",
  ng_misunderstand: "Misunderstanding",
  ng_threaten: "Threaten",
};

// Get display name for type
function getTypeDisplayName(type) {
  if (!type || !type.trim()) return "";
  return typeMapping[type.trim()] || type.trim();
}

// Handle CSV file selection
csvInput.addEventListener("change", (e) => {
  csvFile = e.target.files[0];
  if (csvFile) {
    csvStatus.textContent = `✅ ${csvFile.name}`;
    csvStatus.style.color = "#28a745";
    checkIfReadyToLoad();
  } else {
    csvStatus.textContent = "No file selected";
    csvStatus.style.color = "#666";
  }
});

// Handle audio files selection (individual files)
audioFilesInput.addEventListener("change", (e) => {
  const selectedFiles = Array.from(e.target.files).filter((file) =>
    file.type.startsWith("audio/")
  );
  audioFiles = selectedFiles;

  if (audioFiles.length > 0) {
    audioStatus.textContent = `✅ ${audioFiles.length} file(s) selected`;
    audioStatus.style.color = "#28a745";
    checkIfReadyToLoad();
  } else {
    audioStatus.textContent = "No files selected";
    audioStatus.style.color = "#666";
  }
});

// Handle audio folder selection
audioFolderInput.addEventListener("change", (e) => {
  const selectedFiles = Array.from(e.target.files).filter((file) =>
    file.type.startsWith("audio/")
  );
  audioFiles = selectedFiles;

  if (audioFiles.length > 0) {
    audioStatus.textContent = `✅ ${audioFiles.length} file(s) from folder`;
    audioStatus.style.color = "#28a745";
    checkIfReadyToLoad();
  } else {
    audioStatus.textContent = "No audio files found in folder";
    audioStatus.style.color = "#dc3545";
  }
});

// Check if ready to load
function checkIfReadyToLoad() {
  if (csvFile || audioFiles.length > 0) {
    loadDataBtn.style.display = "block";
  } else {
    loadDataBtn.style.display = "none";
  }
}

// Parse CSV file with proper handling of multi-line fields
async function parseCSV(file) {
  const text = await file.text();
  const result = [];

  // Parse CSV properly handling quotes and newlines
  const rows = parseCSVText(text);

  if (rows.length < 2) {
    throw new Error("CSV file is empty or has no data rows");
  }

  // Parse header
  const headers = rows[0].map((h) => h.trim());

  // Find column indices (case-insensitive)
  const ngWordIndex = headers.findIndex(
    (h) => h.toLowerCase().includes("ng") && h.toLowerCase().includes("word")
  );
  const sentenceIndex = headers.findIndex((h) =>
    h.toLowerCase().includes("sentence")
  );
  const conversationIndex = headers.findIndex((h) =>
    h.toLowerCase().includes("conversation")
  );
  const typeIndex = headers.findIndex((h) => h.toLowerCase().includes("type"));

  // Parse data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

    result.push({
      ngWord:
        ngWordIndex >= 0
          ? row[ngWordIndex]?.trim() || ""
          : row[0]?.trim() || "",
      sentence:
        sentenceIndex >= 0
          ? row[sentenceIndex]?.trim() || ""
          : row[1]?.trim() || "",
      conversation:
        conversationIndex >= 0
          ? row[conversationIndex]?.trim() || ""
          : row[2]?.trim() || "",
      type: typeIndex >= 0 ? row[typeIndex]?.trim() || "" : "",
    });
  }

  return result;
}

// Parse CSV text properly handling quoted fields and newlines
function parseCSVText(text) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
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
    } else if (char === "," && !inQuotes) {
      // Field separator
      currentRow.push(currentField);
      currentField = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      // Row separator (outside quotes)
      if (char === "\r" && nextChar === "\n") {
        i++; // Skip \n in \r\n
      }

      // Add last field and row
      currentRow.push(currentField);

      // Only add non-empty rows
      if (currentRow.some((field) => field.trim())) {
        rows.push(currentRow);
      }

      currentRow = [];
      currentField = "";
    } else {
      // Regular character
      currentField += char;
    }
  }

  // Add last field and row if any
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((field) => field.trim())) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Create audio file map
function createAudioFileMap(files) {
  const map = new Map();

  files.forEach((file) => {
    // Extract base name without extension
    const baseName = file.name.replace(/\.[^/.]+$/, "");

    // Remove timestamp if exists (pattern: _1234567890 or _1761800059761)
    // This handles both short and long timestamps
    const ngWord = baseName.replace(/_\d{10,}$/, "");

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
  const extensions = [".mp3", ".wav", ".ogg", ".m4a", ".aac"];
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
    if (key.includes(".")) continue;

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
    if (
      keyLower.startsWith(normalizedNgWord) ||
      normalizedNgWord.startsWith(keyLower)
    ) {
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
    .replace(/\s+/g, "") // Remove all whitespace
    .normalize("NFKC"); // Normalize Unicode (handles full-width/half-width)
}

// Load and display data
loadDataBtn.addEventListener("click", async () => {
  try {
    loadDataBtn.disabled = true;
    loadDataBtn.textContent = "⏳ Loading...";

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
      csvData = audioFiles.map((file) => ({
        ngWord: file.name.replace(/\.[^/.]+$/, "").replace(/_\d+$/, ""),
        sentence: "",
        conversation: "",
      }));
    }

    // Match CSV data with audio files
    displayedData = csvData.map((row) => {
      const audioFile = findAudioFile(row.ngWord);
      return {
        ...row,
        audioFile: audioFile,
        audioUrl: audioFile ? URL.createObjectURL(audioFile) : null,
        audioFileName: audioFile ? audioFile.name : null,
      };
    });

    // Display data
    displayData(displayedData);
    dataDisplay.style.display = "block";

    // Update stats
    updateStats();

    loadDataBtn.textContent = "✅ Loaded Successfully!";
    setTimeout(() => {
      loadDataBtn.textContent = "🚀 Load & Display Data";
      loadDataBtn.disabled = false;
    }, 2000);
  } catch (error) {
    console.error("Error loading data:", error);
    alert("Error loading data: " + error.message);
    loadDataBtn.textContent = "🚀 Load & Display Data";
    loadDataBtn.disabled = false;
  }
});

// Display data in table (2-column layout)
function displayData(data) {
  reviewTableBody.innerHTML = "";

  if (data.length === 0) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  data.forEach((row, index) => {
    const tr = document.createElement("tr");

    // Index
    const indexTd = document.createElement("td");
    indexTd.textContent = index + 1;
    indexTd.style.textAlign = "center";
    tr.appendChild(indexTd);

    // NG Word with status indicator
    const ngWordTd = document.createElement("td");
    const ngWordContainer = document.createElement("div");
    ngWordContainer.style.display = "flex";
    ngWordContainer.style.alignItems = "center";

    const statusIndicator = document.createElement("span");
    statusIndicator.className =
      "status-indicator " +
      (row.audioUrl ? "status-has-audio" : "status-no-audio");
    ngWordContainer.appendChild(statusIndicator);

    const ngWordText = document.createElement("span");
    ngWordText.textContent = row.ngWord;
    ngWordText.className = "ng-word-cell";
    ngWordContainer.appendChild(ngWordText);

    ngWordTd.appendChild(ngWordContainer);
    tr.appendChild(ngWordTd);

    // Type
    const typeTd = document.createElement("td");
    const typeDisplayName = getTypeDisplayName(row.type);
    if (typeDisplayName) {
      const typeBadge = document.createElement("span");
      typeBadge.className = "type-badge";
      typeBadge.textContent = typeDisplayName;
      typeTd.appendChild(typeBadge);
    }
    tr.appendChild(typeTd);

    // Action Button
    const actionTd = document.createElement("td");
    actionTd.style.textAlign = "center";

    const viewBtn = document.createElement("button");
    viewBtn.className = "view-detail-btn";
    viewBtn.textContent = "👁️ View Detail";
    viewBtn.addEventListener("click", () => {
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
  const withAudio = displayedData.filter((row) => row.audioUrl).length;
  const withoutAudio = total - withAudio;

  totalCount.textContent = total;
  audioCount.textContent = withAudio;
  noAudioCount.textContent = withoutAudio;
}

// Search functionality
searchInput.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase().trim();

  if (!searchTerm) {
    displayData(displayedData);
    return;
  }

  const filtered = displayedData.filter(
    (row) =>
      row.ngWord.toLowerCase().includes(searchTerm) ||
      (row.sentence && row.sentence.toLowerCase().includes(searchTerm)) ||
      (row.conversation && row.conversation.toLowerCase().includes(searchTerm))
  );

  displayData(filtered);
});

// Export CSV
exportCsvBtn.addEventListener("click", () => {
  if (displayedData.length === 0) {
    alert("No data to export!");
    return;
  }

  let csvContent = "NG Word,Sentence,Conversation,Has Audio\n";

  displayedData.forEach((row) => {
    const ngWord = (row.ngWord || "").replace(/"/g, '""');
    const sentence = (row.sentence || "").replace(/"/g, '""');
    const conversation = (row.conversation || "").replace(/"/g, '""');
    const hasAudio = row.audioUrl ? "Yes" : "No";

    csvContent += `"${ngWord}","${sentence}","${conversation}","${hasAudio}"\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
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

const detailModal = document.getElementById("detailModal");
const closeDetailModal = document.getElementById("closeDetailModal");
const modalTitle = document.getElementById("modalTitle");
const modalTypeBadge = document.getElementById("modalTypeBadge");
const modalAudio = document.getElementById("modalAudio");
const modalAudioSection = document.getElementById("modalAudioSection");
const modalNoAudio = document.getElementById("modalNoAudio");
const audioFileInfo = document.getElementById("audioFileInfo");
const modalConversation = document.getElementById("modalConversation");
const modalConversationSection = document.getElementById(
  "modalConversationSection"
);

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
    modalTypeBadge.style.display = "block";
  } else {
    modalTypeBadge.style.display = "none";
  }

  // Handle audio
  if (rowData.audioUrl) {
    modalAudio.src = rowData.audioUrl;

    // Display audio file name
    if (rowData.audioFileName) {
      audioFileInfo.textContent = rowData.audioFileName;
      audioFileInfo.style.display = "block";
    } else {
      audioFileInfo.style.display = "none";
    }

    modalAudioSection.style.display = "block";
    modalNoAudio.style.display = "none";
  } else {
    modalAudioSection.style.display = "none";
    modalNoAudio.style.display = "block";
  }

  // Handle conversation - remove empty lines
  if (rowData.conversation && rowData.conversation.trim()) {
    const cleanedConversation = removeEmptyLines(rowData.conversation);
    modalConversation.innerHTML = highlightNgWord(
      cleanedConversation,
      rowData.ngWord
    );
    modalConversationSection.style.display = "block";
  } else {
    modalConversationSection.style.display = "none";
  }

  // Reset verification section
  resetVerificationSection();

  // Show modal
  detailModal.style.display = "block";
}

// Remove empty lines from text
function removeEmptyLines(text) {
  if (!text) return "";

  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .join("\n");
}

// Highlight NG Word in text
function highlightNgWord(text, ngWord) {
  if (!text || !ngWord) return text || "";

  // Escape special regex characters in ngWord
  const escapedNgWord = ngWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Create regex with global flag and case insensitive
  const regex = new RegExp(escapedNgWord, "gi");

  // Replace all occurrences with highlighted version
  const highlighted = text.replace(regex, (match) => {
    return `<span class="highlight-ng-word">${match}</span>`;
  });

  return highlighted;
}

// Close modal handlers
closeDetailModal.addEventListener("click", () => {
  detailModal.style.display = "none";
  modalAudio.pause();
  currentModalData = null;
});

window.addEventListener("click", (event) => {
  if (event.target === detailModal) {
    detailModal.style.display = "none";
    modalAudio.pause();
    currentModalData = null;
  }
});

// ==========================================
// Text Verification & Comparison Functions
// ==========================================

const toggleVerificationBtn = document.getElementById("toggleVerificationBtn");
const verificationSection = document.getElementById("verificationSection");
const transcribedInput = document.getElementById("transcribedInput");
const compareTextBtn = document.getElementById("compareTextBtn");
const advancedCompareBtn = document.getElementById("advancedCompareBtn");
const aiCheckBtn = document.getElementById("aiCheckBtn");
const comparisonResult = document.getElementById("comparisonResult");
const comparisonResultHeader = document.getElementById("comparisonResultHeader");
const comparisonResultBody = document.getElementById("comparisonResultBody");
const comparisonToggleIcon = document.getElementById("comparisonToggleIcon");
const aiAnalysisResult = document.getElementById("aiAnalysisResult");
const aiAnalysisResultHeader = document.getElementById("aiAnalysisResultHeader");
const aiAnalysisResultBody = document.getElementById("aiAnalysisResultBody");
const aiAnalysisToggleIcon = document.getElementById("aiAnalysisToggleIcon");
const aiAnalysisContent = document.getElementById("aiAnalysisContent");
const accuracyValue = document.getElementById("accuracyValue");
const originalCompareText = document.getElementById("originalCompareText");
const transcribedCompareText = document.getElementById(
  "transcribedCompareText"
);
const matchingChars = document.getElementById("matchingChars");
const differentChars = document.getElementById("differentChars");
const totalChars = document.getElementById("totalChars");

// Advanced Compare Elements (inline)
const advancedComparisonResult = document.getElementById("advancedComparisonResult");
const advancedComparisonResultHeader = document.getElementById("advancedComparisonResultHeader");
const advancedComparisonResultBody = document.getElementById("advancedComparisonResultBody");
const advancedComparisonToggleIcon = document.getElementById("advancedComparisonToggleIcon");
const advIgnoreCaseCheckbox = document.getElementById("advIgnoreCase");
const advIgnoreWhitespaceCheckbox = document.getElementById("advIgnoreWhitespace");
const advIgnorePunctuationCheckbox = document.getElementById("advIgnorePunctuation");
const advIgnoreLineBreaksCheckbox = document.getElementById("advIgnoreLineBreaks");
const advIgnorePatternsTextarea = document.getElementById("advIgnorePatterns");
const saveIgnorePatternsBtn = document.getElementById("saveIgnorePatternsBtn");
const savePatternsFeedback = document.getElementById("savePatternsFeedback");
const advSimilarityPercent = document.getElementById("advSimilarityPercent");
const advDiffCount = document.getElementById("advDiffCount");
const advAddedCount = document.getElementById("advAddedCount");
const advRemovedCount = document.getElementById("advRemovedCount");
const advDiff1 = document.getElementById("advDiff1");
const advDiff2 = document.getElementById("advDiff2");
const advancedExportBtn = document.getElementById("advancedExportBtn");
const advancedCopyBtn = document.getElementById("advancedCopyBtn");

let verificationVisible = false;

// Default ignore patterns
const DEFAULT_IGNORE_PATTERNS = `A:
B:
[thinking]
[smiles]
[laughs]`;

// Load saved ignore patterns or use defaults
function loadIgnorePatterns() {
  const saved = localStorage.getItem("advancedCompare_ignorePatterns");
  if (saved) {
    advIgnorePatternsTextarea.value = saved;
  } else {
    advIgnorePatternsTextarea.value = DEFAULT_IGNORE_PATTERNS;
  }
}

// Save ignore patterns to localStorage
saveIgnorePatternsBtn.addEventListener("click", () => {
  const patterns = advIgnorePatternsTextarea.value;
  localStorage.setItem("advancedCompare_ignorePatterns", patterns);

  // Show feedback
  savePatternsFeedback.style.display = "inline";
  setTimeout(() => {
    savePatternsFeedback.style.display = "none";
  }, 2000);
});

// Load patterns on page load
loadIgnorePatterns();

// Toggle verification section
toggleVerificationBtn.addEventListener("click", () => {
  verificationVisible = !verificationVisible;

  if (verificationVisible) {
    verificationSection.style.display = "block";
    toggleVerificationBtn.textContent = "🔍 Hide Verification Tool";
  } else {
    verificationSection.style.display = "none";
    toggleVerificationBtn.textContent = "🔍 Show Verification Tool";
    // Reset form
    transcribedInput.value = "";
    comparisonResult.style.display = "none";
  }
});

const ignoreFormattingCheckbox = document.getElementById("ignoreFormatting");

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

  console.log(message, data || "");
}

// Export debug logs to file
function exportDebugLogs() {
  const blob = new Blob([debugLogs.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `comparison_debug_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Debug modal elements
const debugModal = document.getElementById("debugModal");
const closeDebugModal = document.getElementById("closeDebugModal");
const debugLogContent = document.getElementById("debugLogContent");
const showDebugBtn = document.getElementById("showDebugBtn");
const copyDebugBtn = document.getElementById("copyDebugBtn");
const downloadDebugBtn = document.getElementById("downloadDebugBtn");

// Show debug log modal
showDebugBtn.addEventListener("click", () => {
  if (debugLogs.length === 0) {
    alert("No debug logs available. Please run comparison first.");
    return;
  }
  debugLogContent.textContent = debugLogs.join("\n");
  debugModal.style.display = "block";
});

// Close debug modal
closeDebugModal.addEventListener("click", () => {
  debugModal.style.display = "none";
});

// Close modal when clicking outside
window.addEventListener("click", (event) => {
  if (event.target === debugModal) {
    debugModal.style.display = "none";
  }
});

// Copy to clipboard
copyDebugBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(debugLogs.join("\n"));
    const originalText = copyDebugBtn.textContent;
    copyDebugBtn.textContent = "✅ Copied!";
    setTimeout(() => {
      copyDebugBtn.textContent = originalText;
    }, 2000);
  } catch (error) {
    alert("Failed to copy to clipboard: " + error.message);
  }
});

// Download as file
downloadDebugBtn.addEventListener("click", () => {
  exportDebugLogs();
});

// Quick Compare texts
compareTextBtn.addEventListener("click", () => {
  const originalText = currentModalData?.conversation || "";
  let transcribedText = transcribedInput.value.trim();

  if (!transcribedText) {
    alert("Please paste the transcribed text first!");
    return;
  }

  if (!originalText) {
    alert("No original conversation available to compare!");
    return;
  }

  // Clear previous comparison result and debug logs
  comparisonResult.style.display = "none";
  originalCompareText.innerHTML = "";
  transcribedCompareText.innerHTML = "";
  debugLogs = []; // Clear previous debug logs

  addDebugLog("=== NEW COMPARISON STARTED ===");
  addDebugLog("Original text length:", originalText.length);
  addDebugLog("Transcript text length:", transcribedText.length);

  // Check if ignore formatting is enabled
  const ignoreFormatting = ignoreFormattingCheckbox.checked;

  // Prepare texts based on option
  let textToCompare1 = originalText;
  let textToCompare2 = transcribedText;

  if (ignoreFormatting) {
    // Extract only spoken content (remove speaker labels) for both
    textToCompare1 = extractSpokenContent(originalText);
    textToCompare2 = extractSpokenContent(transcribedText);
  }

  // Perform comparison
  const result = compareTexts(textToCompare1, textToCompare2);

  // Display results
  displayComparisonResults(
    result,
    textToCompare1,
    textToCompare2,
    ignoreFormatting,
    false
  );
});

aiCheckBtn.addEventListener("click", async () => {
  const originalText = currentModalData?.conversation || "";
  let transcribedText = transcribedInput.value.trim();

  if (!transcribedText) {
    alert("Please paste the transcribed text first!");
    return;
  }

  if (!originalText) {
    alert("No original conversation available to compare!");
    return;
  }

  aiAnalysisResult.style.display = "none";
  aiAnalysisContent.textContent = "";

  aiCheckBtn.disabled = true;
  aiCheckBtn.textContent = "⏳ Analyzing...";

  try {
    const analysis = await analyzeTranscriptWithAI(originalText, transcribedText);
    displayAIAnalysis(analysis, false);
  } catch (error) {
    alert("Error analyzing with AI: " + error.message);
    console.error("AI Analysis Error:", error);
  } finally {
    aiCheckBtn.disabled = false;
    aiCheckBtn.textContent = "🤖 Check with AI";
  }
});

// Analyze transcript with AI (using OpenAI API)
async function analyzeTranscriptWithAI(originalText, transcribedText) {
  const apiKey = localStorage.getItem("openai_api_key");

  if (!apiKey) {
    throw new Error(
      "OpenAI API key not found. Please set it in the main generator page."
    );
  }

  const prompt = `Bạn là chuyên viên kiểm thử chất lượng (QC) cấp cao, chuyên đánh giá độ chính xác của hệ thống nhận dạng giọng nói (Speech-to-Text).
Nhiệm vụ của bạn là so sánh bản gốc (Ground Truth) và bản transcript do hệ thống tạo ra (ASR Output), sau đó chấm điểm chính xác và liệt kê lỗi.

YÊU CẦU:
1. Chuẩn hóa cả hai đoạn trước khi so sánh:
   - Chuẩn Unicode NFKC.
   - Không phân biệt hoa/thường với chữ Latin.
   - Bỏ toàn bộ dấu câu (. , ! ? ：「」『』（）""〜…・— 、。).
   - Gộp nhiều khoảng trắng thành một, xóa khoảng trắng dư.
   - Bỏ các từ cảm thán và filler: へぇ〜, へえ, あー, あ〜, えー, ええと, うん, えっ, うわー, うーん, わぁ, あっ, うー, えぇ, まじ, まじで, おお, おおっ, お.
   - Bỏ các thẻ mô tả hành động: [smiles], [laughs], [thinking], [excited], [background noise], (笑), (BGM), <noise>...
   - Bỏ nhãn người nói như "A:" hoặc "B:".
2. So sánh nội dung thực tế (từ/cụm từ có nghĩa), bỏ qua khác biệt do format, dấu câu hoặc biểu cảm.
3. Tính các chỉ số:
   - **WER (Word Error Rate)** = (S + D + I) / N × 100%.
   - **Accuracy** = 100% - WER.
   - Có thể thêm CER nếu cần.
4. Liệt kê lỗi thực tế (không bao gồm các phần đã bỏ qua ở trên):
   - Substitution (thay từ)
   - Deletion (thiếu từ)
   - Insertion (thêm từ)
5. Viết kết quả bằng tiếng Việt, ngắn gọn, rõ ràng, có cấu trúc như sau:

**Kết quả đánh giá:**
- WER: X%
- Accuracy: Y%
- Lỗi phát hiện:
  - S:
  - D:
  - I:
- Các yếu tố bị bỏ qua: (nêu ví dụ)
- Mức độ nghiêm trọng: Cao / Trung bình / Thấp
- Nhận xét & Gợi ý cải thiện: (1–2 câu)

Hãy thực hiện phân tích dưới đây:

**Bản gốc (Ground Truth):**
"""
${originalText}
"""

**Transcript hệ thống (ASR Output):**
"""
${transcribedText}
"""`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional transcript quality analyst.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "API request failed");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Display AI analysis results
function displayAIAnalysis(analysis, usingPunctuated = false) {
  // Add info banner if using punctuated text
  let content = analysis;
  if (usingPunctuated) {
    content = "ℹ️ Info: Analysis performed on AI-punctuated text (not original textarea input)\n\n" + analysis;
  }

  aiAnalysisContent.textContent = content;
  aiAnalysisResult.style.display = "block";

  // Scroll to results
  aiAnalysisResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Add punctuation to transcribed text using AI
async function addPunctuationWithAI(originalText, transcribedText) {
  const apiKey = localStorage.getItem("openai_api_key");

  if (!apiKey) {
    throw new Error(
      "OpenAI API key not found. Please set it in the main generator page."
    );
  }

  const prompt = `You are a Japanese language expert (JLPT N2 level).

You will be given two dialogues in Japanese:
- Dialogue 1: a correctly punctuated example.
- Dialogue 2: a raw version without punctuation.

Your task:
Add only appropriate Japanese punctuation marks (。！？」、「〜 etc.) and line breaks to Dialogue 2 so that its style and rhythm match Dialogue 1.

STRICT RULES:
1. Do NOT add, remove, or change any words, kana, kanji, romaji, or English text from Dialogue 2.
2. Do NOT insert any new interjections (e.g., えっ, おおっ, うわぁ) or modify existing ones.
3. Do NOT correct spelling errors or unnatural text (e.g., "AIAbvatoorboatex" must remain exactly as is).
4. Only insert punctuation and line breaks where appropriate.
5. Keep every existing word in the same order.
6. Output only the final punctuated Dialogue 2 — no explanations, notes, or formatting outside the dialogue.

Output format:
Return ONLY the punctuated Dialogue 2, using natural Japanese line breaks.

**YOUR INPUT:**

1:
"""
${originalText}
"""

2:
"""
${transcribedText}
"""`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a Japanese language expert (JLPT N2 level).",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "API request failed");
  }

  const data = await response.json();
  const result = data.choices[0].message.content.trim();

  // Validate that only punctuation was added
  const validation = validatePunctuationOnly(transcribedText, result);
  if (!validation.isValid) {
    console.warn(
      "AI modified the text beyond adding punctuation:",
      validation.changes
    );
    // Return result anyway but with warning
    return (
      result +
      "\n\n⚠️ Warning: AI may have modified the text. Changes detected:\n" +
      validation.changes.join("\n")
    );
  }

  return result;
}

// Validate that only punctuation was added (no text changes)
function validatePunctuationOnly(original, punctuated) {
  // Remove all punctuation marks from both texts
  const punctuationRegex = /[。、！？：「」『』（）\s]/g;

  const originalClean = original.replace(punctuationRegex, "");
  const punctuatedClean = punctuated.replace(punctuationRegex, "");

  const isValid = originalClean === punctuatedClean;

  if (!isValid) {
    // Try to find what changed
    const changes = [];

    // Character count difference
    if (originalClean.length !== punctuatedClean.length) {
      changes.push(
        `Character count: ${originalClean.length} → ${punctuatedClean.length}`
      );
    }

    // Find first difference
    let firstDiff = -1;
    for (
      let i = 0;
      i < Math.max(originalClean.length, punctuatedClean.length);
      i++
    ) {
      if (originalClean[i] !== punctuatedClean[i]) {
        firstDiff = i;
        break;
      }
    }

    if (firstDiff !== -1) {
      const contextStart = Math.max(0, firstDiff - 10);
      const contextEnd = Math.min(originalClean.length, firstDiff + 10);
      changes.push(`First difference at position ${firstDiff}:`);
      changes.push(
        `  Original: ...${originalClean.substring(contextStart, contextEnd)}...`
      );
      changes.push(
        `  Modified: ...${punctuatedClean.substring(
          contextStart,
          contextEnd
        )}...`
      );
    }

    return { isValid: false, changes };
  }

  return { isValid: true, changes: [] };
}

// Display punctuated text result
function displayPunctuatedText(text) {
  // Check if there's a warning
  const hasWarning = text.includes("⚠️ Warning:");

  if (hasWarning) {
    // Extract text and warning
    const parts = text.split("\n\n⚠️ Warning:");
    const mainText = parts[0];
    const warningText = "⚠️ Warning:" + parts[1];

    // Store the main text as a data attribute for easy retrieval
    punctuatedText.setAttribute("data-clean-text", mainText);

    punctuatedText.innerHTML = `<div style="white-space: pre-wrap;">${escapeHtml(
      mainText
    )}</div><div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; color: #856404; border-radius: 4px;"><strong>⚠️ Validation Warning</strong><br>${escapeHtml(
      warningText
    )}</div>`;
  } else {
    punctuatedText.removeAttribute("data-clean-text");
    punctuatedText.textContent = text;
  }

  punctuationResult.style.display = "block";

  // Scroll to results
  punctuationResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Normalize for ASR: Unicode NFKC, lowercase (Latin), remove punctuation, collapse whitespace, remove speaker labels, fillers, tags
function normalizeForASR(text) {
  if (!text) return "";
  // Remove speaker labels (A:, B:, Speaker A:, etc.)
  let t = text
    .replace(/^(?:\s*)(?:A|B)\s*:\s*/gim, "")
    .replace(/^Speaker\s+[AB]\s*:\s*/gim, "");
  // Remove bracketed tags, e.g., [smiles], (笑), <noise>, {applause}
  t = t.replace(/[\[\(\{<][^\]\)\}>]+[\]\)\}>]/g, "");
  // Remove Japanese fillers/interjections
  t = t.replace(
    /\b(へぇ〜|へぇ|へえ|あー|あ〜|えー|ええと|うん|えっ|うわー|うーん|わぁ|あっ|うー|えぇ|まじ|まじで|おお|おおっ|お)\b/g,
    ""
  );
  // Remove punctuation (Japanese/English)
  t = t.replace(/[.,!?;:「」『』（）""„〜…・—\-、。・，；？！]/g, "");
  // Unicode normalize (NFKC converts full-width to half-width)
  t = t.normalize("NFKC");
  // Replace full-width spaces (　) with regular spaces
  t = t.replace(/　/g, " ");
  // Collapse all whitespace (including tabs, newlines) to single space
  t = t.replace(/\s+/g, " ").trim();
  // Lowercase for Latin
  t = t.replace(/[A-Za-z]/g, (c) => c.toLowerCase());
  return t;
}

// Text comparison algorithm using multiple metrics
function compareTexts(text1, text2) {
  // Normalize texts for ASR comparison
  const normalized1 = normalizeForASR(text1);
  const normalized2 = normalizeForASR(text2);

  // 1. Character Error Rate (CER) - Character-level accuracy
  // Remove ALL whitespace for pure character comparison
  const normalized1NoSpace = normalized1.replace(/\s+/g, "");
  const normalized2NoSpace = normalized2.replace(/\s+/g, "");

  const charDistance = levenshteinDistance(normalized1NoSpace, normalized2NoSpace);
  const refCharLength = normalized1NoSpace.length;
  const cer = refCharLength === 0 ? 0 : (charDistance / refCharLength) * 100;
  const charAccuracy = Math.max(0, 100 - cer);

  // 2. Word Error Rate (WER) - Word-level accuracy
  const words1 = normalized1.split(/\s+/).filter((w) => w.length > 0);
  const words2 = normalized2.split(/\s+/).filter((w) => w.length > 0);
  const wordDiff = calculateWordDiff(words1, words2);
  const wordErrors =
    wordDiff.substitutions + wordDiff.deletions + wordDiff.insertions;
  const refWords = words1.length;
  const wer = refWords === 0 ? 0 : (wordErrors / refWords) * 100;
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
  sentences1.forEach((s1) => {
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

  const sentenceAccuracy =
    sentences1.length === 0
      ? 100
      : (matchedSentences / sentences1.length) * 100;
  const avgSentenceSimilarity =
    matchedSentences === 0 ? 0 : totalSimilarity / matchedSentences;

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
    matching: refCharLength - charDistance,
    different: charDistance,
    total: refCharLength,

    // Word stats
    wordStats: {
      total: refWords,
      errors: wordErrors,
      substitutions: wordDiff.substitutions,
      deletions: wordDiff.deletions,
      insertions: wordDiff.insertions,
    },

    // Sentence stats
    sentenceStats: {
      originalCount: sentences1.length,
      transcriptCount: sentences2.length,
      matched: matchedSentences,
      unmatched: sentences1.length - matchedSentences,
    },
  };
}

// Normalize text for comparison (legacy, replaced by normalizeForASR in compareTexts)
function normalizeText(text) {
  return (
    text
      // Remove speaker labels (A:, B:, Speaker A:, etc.)
      .replace(/^(?:\s*)(?:A|B)\s*:\s*/gim, "")
      .replace(/^Speaker\s+[AB]\s*:\s*/gim, "")
      // Remove special characters and punctuation (keep only alphanumeric and spaces)
      // For Japanese, keep hiragana, katakana, kanji
      .replace(/[、。！？「」『』（）\[\]\(\)]/g, "")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
  );
}

// Extract only spoken content from conversation (remove speaker labels)
function extractSpokenContent(text) {
  return text
    .split("\n")
    .map((line) => {
      // Remove speaker labels at start of line
      return line
        .replace(/^(?:\s*)(?:A|B)\s*:\s*/i, "")
        .replace(/^Speaker\s+[AB]\s*:\s*/i, "")
        .trim();
    })
    .filter((line) => line.length > 0)
    .join(" ");
}

// Clean and normalize transcript (remove audio tags, speaker labels) - KEEP punctuation for splitting
function cleanTranscript(text) {
  return (
    text
      // Remove audio/emotion tags like [smiles], [thinking], [excited]
      .replace(/\[.*?\]/g, "")
      // Normalize line breaks - join lines that don't end with sentence punctuation
      .replace(/\n(?![。！？\.!?])/g, " ")
      // Add space after punctuation if missing
      .replace(/([。！？\.!?])([^\s])/g, "$1 $2")
      // Remove speaker labels (A:, B:, Speaker A:, etc.) - do this AFTER joining lines
      .replace(/^(?:\s*)(?:A|B)\s*:\s*/gim, "")
      .replace(/^Speaker\s+[AB]\s*:\s*/gim, "")
      // Normalize multiple spaces
      .replace(/\s+/g, " ")
      .trim()
  );
}

// Remove punctuation from a single sentence (after splitting)
function removePunctuation(text) {
  return text
    .replace(/[。！？\.!?、，,]/g, "")
    .replace(/\s+/g, " ")
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
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

// Display comparison results
function displayComparisonResults(
  result,
  originalText,
  transcribedText,
  ignoreFormatting = true,
  usingPunctuated = false
) {
  // Set accuracy
  accuracyValue.textContent = `${result.accuracy}%`;

  // Color code accuracy badge
  const accuracyBadge = document.getElementById("accuracyBadge");
  if (result.accuracy >= 90) {
    accuracyBadge.style.background =
      "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)";
  } else if (result.accuracy >= 70) {
    accuracyBadge.style.background =
      "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)";
  } else {
    accuracyBadge.style.background =
      "linear-gradient(135deg, #fa709a 0%, #fee140 100%)";
  }

  // Add info banner if using punctuated text
  let infoBanner = "";
  if (usingPunctuated) {
    infoBanner = `<div style="margin-bottom: 15px; padding: 10px; background: #e3f2fd; border-left: 4px solid #2196f3; color: #0d47a1; border-radius: 4px; font-size: 14px;"><strong>ℹ️ Info:</strong> Comparing using AI-punctuated text (not original textarea input)</div>`;
  }

  // Generate diff and display with highlighting
  // If ignoreFormatting, texts are already cleaned
  const diffResult = generateDiff(
    originalText,
    transcribedText,
    ignoreFormatting
  );
  originalCompareText.innerHTML = infoBanner + diffResult.originalHtml;
  transcribedCompareText.innerHTML = diffResult.transcribedHtml;

  // Set statistics with detailed metrics
  matchingChars.textContent = `Char: ${result.charAccuracy}% | Word: ${result.wordAccuracy}% | Sentence: ${result.sentenceAccuracy}%`;
  differentChars.textContent = `CER: ${result.cer}% | WER: ${result.wer}% | Matched: ${result.sentenceStats.matched}/${result.sentenceStats.originalCount} sentences`;
  totalChars.textContent = `Chars: ${result.text1Length} vs ${result.text2Length} | Words: ${result.wordStats.total} (S:${result.wordStats.substitutions} D:${result.wordStats.deletions} I:${result.wordStats.insertions})`;

  // Show results
  comparisonResult.style.display = "block";

  // Scroll to results
  comparisonResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

  addDebugLog("=== GENERATE DIFF DEBUG ===");
  addDebugLog("Original cleaned:", cleanText1);
  addDebugLog("Transcript cleaned:", cleanText2);

  // Split texts into sentences
  const sentences1 = splitIntoSentences(cleanText1);
  const sentences2 = splitIntoSentences(cleanText2);

  addDebugLog("Original sentences:", sentences1);
  addDebugLog("Transcript sentences:", sentences2);
  addDebugLog("Original count: " + sentences1.length);
  addDebugLog("Transcript count: " + sentences2.length);

  // Calculate sentence-level diff
  const diff = calculateSentenceDiff(sentences1, sentences2);

  addDebugLog("Matched: " + diff.filter((d) => d.type === "equal").length);
  addDebugLog("Deleted: " + diff.filter((d) => d.type === "delete").length);
  addDebugLog("Inserted: " + diff.filter((d) => d.type === "insert").length);

  // Build rows with side-by-side comparison
  let rows = [];

  diff.forEach((item, index) => {
    const cleanedValue = escapeHtml(item.value);
    const similarity = item.similarity || 0;

    if (item.type === "equal") {
      // Matched sentences - show on same row
      let badgeClass = "similarity-badge";
      let badgeColor = "";

      if (similarity >= 90) {
        badgeColor =
          'style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);"';
      } else if (similarity >= 70) {
        badgeColor =
          'style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);"';
      } else {
        badgeColor =
          'style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);"';
      }

      const similarityBadge = `<span class="${badgeClass}" ${badgeColor}>${similarity}%</span>`;

      const cleanedMatchedValue = item.matchedValue
        ? escapeHtml(item.matchedValue)
        : cleanedValue;

      rows.push({
        original: `<div class="sentence-equal">${cleanedValue} ${similarityBadge}</div>`,
        transcript: `<div class="sentence-equal">${cleanedMatchedValue} ${similarityBadge}</div>`,
      });
    } else if (item.type === "delete") {
      // Only in original - empty on transcript side
      rows.push({
        original: `<div class="sentence-removed">${cleanedValue}</div>`,
        transcript: `<div class="sentence-empty"></div>`,
      });
    } else if (item.type === "insert") {
      // Only in transcript - empty on original side
      rows.push({
        original: `<div class="sentence-empty"></div>`,
        transcript: `<div class="sentence-added">${cleanedValue}</div>`,
      });
    }
  });

  // Build HTML with rows
  let originalHtml = "";
  let transcribedHtml = "";

  rows.forEach((row) => {
    originalHtml += row.original;
    transcribedHtml += row.transcript;
  });

  return {
    originalHtml: originalHtml,
    transcribedHtml: transcribedHtml,
  };
}

// Calculate similarity between two sentences (0-100%)
function calculateSimilarity(str1, str2) {
  // Remove all whitespace and normalize for comparison
  const norm1 = str1.replace(/\s+/g, "").toLowerCase();
  const norm2 = str2.replace(/\s+/g, "").toLowerCase();

  // Use reference (first text) length for consistency with CER calculation
  const refLen = norm1.length;
  if (refLen === 0) return norm2.length === 0 ? 100 : 0;

  const distance = levenshteinDistance(norm1, norm2);
  // Similarity = 100% - Error Rate
  const similarity = Math.max(0, 100 - (distance / refLen * 100));
  return similarity.toFixed(1);
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

  addDebugLog("=== CALCULATING SENTENCE DIFF ===");

  // For each sentence in original, try to find best match in transcript
  arr1.forEach((sentence1, origIndex) => {
    const availableCandidates = arr2.filter((_, idx) => !usedIndices.has(idx));

    if (availableCandidates.length === 0) {
      addDebugLog(
        `[${origIndex}] "${sentence1}" - No candidates available, marking as DELETED`
      );
      // No more candidates - mark as deleted
      diff.push({
        type: "delete",
        value: sentence1,
        similarity: 0,
        origIndex: origIndex,
        transcriptIndex: -1,
      });
      return;
    }

    // Find best match ONLY from available candidates
    const { match, similarity, index } = findBestMatch(
      sentence1,
      availableCandidates
    );

    addDebugLog(
      `[${origIndex}] "${sentence1}" -> Best match: "${match}" (${similarity}%)`
    );

    if (similarity >= SIMILARITY_THRESHOLD) {
      // Found a good match - find its actual index in arr2
      const actualIndex = arr2.findIndex(
        (s) => s === match && !usedIndices.has(arr2.indexOf(s))
      );
      usedIndices.add(actualIndex);

      addDebugLog(`  ✓ MATCHED at transcript index ${actualIndex}`);

      diff.push({
        type: "equal",
        value: sentence1,
        matchedValue: match,
        similarity: similarity,
        origIndex: origIndex,
        transcriptIndex: actualIndex,
      });
    } else {
      addDebugLog(
        `  ✗ Similarity too low (${similarity}% < ${SIMILARITY_THRESHOLD}%), marking as DELETED`
      );
      // No good match - mark as deleted
      diff.push({
        type: "delete",
        value: sentence1,
        similarity: 0,
        origIndex: origIndex,
        transcriptIndex: -1,
      });
    }
  });

  // Add remaining unmatched sentences from transcript as insertions
  arr2.forEach((sentence2, index) => {
    if (!usedIndices.has(index)) {
      addDebugLog(
        `Transcript[${index}] "${sentence2}" - Not matched, marking as INSERTED`
      );
      diff.push({
        type: "insert",
        value: sentence2,
        similarity: 0,
        origIndex: -1,
        transcriptIndex: index,
      });
    }
  });

  addDebugLog("=== ORDERING RESULTS ===");

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
      if (a.type === "equal" && b.type === "delete") return -1;
      if (a.type === "delete" && b.type === "equal") return 1;
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
      const nextMatch = diff.find(
        (d) => d.type === "equal" && d.transcriptIndex > a.transcriptIndex
      );
      if (nextMatch && nextMatch.origIndex <= b.origIndex) {
        return -1; // Insert comes before b
      }
      return 1; // Insert comes after b
    } else {
      // b is insert
      const nextMatch = diff.find(
        (d) => d.type === "equal" && d.transcriptIndex > b.transcriptIndex
      );
      if (nextMatch && nextMatch.origIndex <= a.origIndex) {
        return 1; // Insert comes before a
      }
      return -1; // Insert comes after a
    }
  });

  addDebugLog("=== FINAL DIFF ORDER ===");
  finalDiff.forEach((item, idx) => {
    const type =
      item.type === "equal" ? "✓" : item.type === "insert" ? "+" : "-";
    const value =
      item.value.substring(0, 50) + (item.value.length > 50 ? "..." : "");
    const sim = item.similarity ? ` [${item.similarity}%]` : "";
    addDebugLog(
      `${idx}: [${type}] "${value}"${sim} (origIdx: ${item.origIndex}, transIdx: ${item.transcriptIndex})`
    );
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
      diff.unshift({ type: "equal", value: arr1[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      // Insert
      diff.unshift({ type: "insert", value: arr2[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || matrix[i][j - 1] < matrix[i - 1][j])) {
      // Delete
      diff.unshift({ type: "delete", value: arr1[i - 1] });
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
    if (diff[idx].type === "delete") {
      // Check if next operation is insert (this is a substitution)
      if (idx + 1 < diff.length && diff[idx + 1].type === "insert") {
        substitutions++;
        idx += 2; // Skip both delete and insert
      } else {
        deletions++;
        idx++;
      }
    } else if (diff[idx].type === "insert") {
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
    insertions,
  };
}

// Escape HTML special characters
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Reset verification section when modal opens
function resetVerificationSection() {
  verificationVisible = false;
  verificationSection.style.display = "none";
  toggleVerificationBtn.textContent = "🔍 Show Verification Tool";
  transcribedInput.value = "";
  comparisonResult.style.display = "none";
  advancedComparisonResult.style.display = "none";
  aiAnalysisResult.style.display = "none";
}

// ==========================================
// Advanced Compare Functions (Inline)
// ==========================================

// Toggle show/hide for comparison results
comparisonResultHeader.addEventListener("click", () => {
  const isVisible = comparisonResultBody.style.display !== "none";
  comparisonResultBody.style.display = isVisible ? "none" : "block";
  comparisonToggleIcon.textContent = isVisible ? "▶" : "▼";
});

// Toggle show/hide for AI analysis results
aiAnalysisResultHeader.addEventListener("click", () => {
  const isVisible = aiAnalysisResultBody.style.display !== "none";
  aiAnalysisResultBody.style.display = isVisible ? "none" : "block";
  aiAnalysisToggleIcon.textContent = isVisible ? "▶" : "▼";
});

// Toggle show/hide for advanced comparison results
advancedComparisonResultHeader.addEventListener("click", () => {
  const isVisible = advancedComparisonResultBody.style.display !== "none";
  advancedComparisonResultBody.style.display = isVisible ? "none" : "block";
  advancedComparisonToggleIcon.textContent = isVisible ? "▶" : "▼";
});

// Advanced Compare button - performs comparison directly
advancedCompareBtn.addEventListener("click", () => {
  const originalText = currentModalData?.conversation || "";
  const transcribedText = transcribedInput.value.trim();

  if (!transcribedText) {
    alert("Please paste the transcribed text first!");
    return;
  }

  if (!originalText) {
    alert("No original conversation available to compare!");
    return;
  }

  performAdvancedComparison(originalText, transcribedText);
});

// Normalize text based on advanced compare options
function normalizeAdvancedText(text) {
  let normalized = text;

  // Remove ignore patterns first
  const ignorePatterns = advIgnorePatternsTextarea.value
    .split("\n")
    .map(p => p.trim())
    .filter(p => p.length > 0);

  ignorePatterns.forEach(pattern => {
    // Escape special regex characters except for brackets
    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Create regex with global flag, also match surrounding whitespace
    const regex = new RegExp('\\s*' + escapedPattern + '\\s*', 'g');
    normalized = normalized.replace(regex, ' ');
  });

  if (advIgnorePunctuationCheckbox.checked) {
    normalized = normalized.replace(/[.,!?;:「」『』（）""„〜…・—\-、。・，；？！]/g, "");
  }

  if (advIgnoreLineBreaksCheckbox.checked) {
    normalized = normalized.replace(/\n/g, " ");
  }

  if (advIgnoreWhitespaceCheckbox.checked) {
    normalized = normalized.replace(/\s+/g, " ").trim();
  }

  if (advIgnoreCaseCheckbox.checked) {
    normalized = normalized.toLowerCase();
  }

  return normalized;
}

// Myers diff algorithm for advanced compare
function myersDiffAdvanced(text1, text2) {
  const n = text1.length;
  const m = text2.length;
  const max = n + m;
  const v = {};
  const trace = [];

  v[1] = 0;

  for (let d = 0; d <= max; d++) {
    trace.push({ ...v });

    for (let k = -d; k <= d; k += 2) {
      let x;
      if (k === -d || (k !== d && v[k - 1] < v[k + 1])) {
        x = v[k + 1];
      } else {
        x = v[k - 1] + 1;
      }

      let y = x - k;

      while (x < n && y < m && text1[x] === text2[y]) {
        x++;
        y++;
      }

      v[k] = x;

      if (x >= n && y >= m) {
        return backtrackAdvanced(text1, text2, trace, d);
      }
    }
  }

  return [];
}

function backtrackAdvanced(text1, text2, trace, d) {
  const diff = [];
  let x = text1.length;
  let y = text2.length;

  for (let d_step = d; d_step >= 0; d_step--) {
    const v = trace[d_step];
    const k = x - y;

    let prev_k;
    if (k === -d_step || (k !== d_step && v[k - 1] < v[k + 1])) {
      prev_k = k + 1;
    } else {
      prev_k = k - 1;
    }

    const prev_x = v[prev_k];
    const prev_y = prev_x - prev_k;

    while (x > prev_x && y > prev_y) {
      diff.unshift({ type: "same", char1: text1[x - 1], char2: text2[y - 1] });
      x--;
      y--;
    }

    if (d_step > 0) {
      if (x === prev_x) {
        diff.unshift({ type: "added", char2: text2[y - 1] });
        y--;
      } else {
        diff.unshift({ type: "removed", char1: text1[x - 1] });
        x--;
      }
    }
  }

  return diff;
}

// Group character diffs into chunks for display
function groupDiffsAdvanced(charDiffs) {
  const chunks = [];
  let currentChunk = { type: "", text1: "", text2: "" };

  charDiffs.forEach((diff) => {
    if (diff.type !== currentChunk.type) {
      if (currentChunk.type !== "") {
        chunks.push(currentChunk);
      }
      currentChunk = { type: diff.type, text1: "", text2: "" };
    }

    if (diff.type === "same") {
      currentChunk.text1 += diff.char1;
      currentChunk.text2 += diff.char2;
    } else if (diff.type === "removed") {
      currentChunk.text1 += diff.char1;
    } else if (diff.type === "added") {
      currentChunk.text2 += diff.char2;
    }
  });

  if (currentChunk.type !== "") {
    chunks.push(currentChunk);
  }

  return chunks;
}

// Perform advanced comparison
function performAdvancedComparison(txt1, txt2) {
  // Normalize texts
  const normalized1 = normalizeAdvancedText(txt1);
  const normalized2 = normalizeAdvancedText(txt2);

  // Calculate character-level diff using Myers algorithm
  const charDiffs = myersDiffAdvanced(normalized1, normalized2);

  // Group character diffs into chunks for display
  const chunks = groupDiffsAdvanced(charDiffs);

  // Count stats
  let addedChars = 0,
    removedChars = 0,
    sameChars = 0;
  charDiffs.forEach((diff) => {
    if (diff.type === "added") addedChars++;
    else if (diff.type === "removed") removedChars++;
    else if (diff.type === "same") sameChars++;
  });

  const totalChars = sameChars + addedChars + removedChars;
  const similarity =
    totalChars === 0 ? 100 : Math.round((sameChars / totalChars) * 100);

  // Count chunk-level changes for display
  let addedChunks = 0,
    removedChunks = 0;
  chunks.forEach((chunk) => {
    if (chunk.type === "added") addedChunks++;
    else if (chunk.type === "removed") removedChunks++;
  });

  // Update stats
  advSimilarityPercent.textContent = similarity + "%";
  advDiffCount.textContent = addedChunks + removedChunks;
  advAddedCount.textContent = addedChunks;
  advRemovedCount.textContent = removedChunks;

  // Generate highlighted HTML
  let html1 = "";
  let html2 = "";

  chunks.forEach((chunk) => {
    if (chunk.type === "same") {
      html1 += `<span class="highlight-same">${escapeHtml(chunk.text1)}</span>`;
      html2 += `<span class="highlight-same">${escapeHtml(chunk.text2)}</span>`;
    } else if (chunk.type === "removed") {
      html1 += `<span class="highlight-removed">${escapeHtml(
        chunk.text1
      )}</span>`;
    } else if (chunk.type === "added") {
      html2 += `<span class="highlight-added">${escapeHtml(chunk.text2)}</span>`;
    }
  });

  advDiff1.innerHTML = html1;
  advDiff2.innerHTML = html2;

  // Show results
  advancedComparisonResult.style.display = "block";
  advancedComparisonResult.scrollIntoView({ behavior: "smooth" });
}

// Export advanced comparison report
advancedExportBtn.addEventListener("click", () => {
  const originalText = currentModalData?.conversation || "";
  const transcribedText = transcribedInput.value.trim();

  const report = `Advanced Text Comparison Report
Generated: ${new Date().toLocaleString()}

========================================
STATISTICS
========================================
Similarity: ${advSimilarityPercent.textContent}
Total Differences: ${advDiffCount.textContent}
Added: ${advAddedCount.textContent}
Removed: ${advRemovedCount.textContent}

========================================
TEXT 1 (ORIGINAL CONVERSATION)
========================================
${originalText}

========================================
TEXT 2 (TRANSCRIBED TEXT)
========================================
${transcribedText}

========================================
OPTIONS USED
========================================
Ignore Case: ${advIgnoreCaseCheckbox.checked ? "Yes" : "No"}
Ignore Whitespace: ${advIgnoreWhitespaceCheckbox.checked ? "Yes" : "No"}
Ignore Punctuation: ${advIgnorePunctuationCheckbox.checked ? "Yes" : "No"}
Ignore Line Breaks: ${advIgnoreLineBreaksCheckbox.checked ? "Yes" : "No"}
`;

  // Download as file
  const blob = new Blob([report], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `advanced-comparison-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Copy advanced comparison differences
advancedCopyBtn.addEventListener("click", async () => {
  const diffText = `Advanced Comparison - Differences Found: ${advDiffCount.textContent}
Added: ${advAddedCount.textContent} | Removed: ${advRemovedCount.textContent}
Similarity: ${advSimilarityPercent.textContent}

Original Conversation:
${advDiff1.textContent}

Transcribed Text:
${advDiff2.textContent}
`;

  try {
    await navigator.clipboard.writeText(diffText);
    const originalText = advancedCopyBtn.textContent;
    advancedCopyBtn.textContent = "✅ Copied!";
    setTimeout(() => {
      advancedCopyBtn.textContent = originalText;
    }, 2000);
  } catch (error) {
    alert("Failed to copy to clipboard: " + error.message);
  }
});
