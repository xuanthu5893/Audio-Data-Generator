// Cấu hình
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-dialogue";

// Hàm tạo prompt động
function buildPrompt(userMessage) {
  return `You are a professional affiliate writer and an expert in creating Japanese sales conversations.  
Please create a Japanese dialogue script introducing an AI avatar automation system called "AI Avatar Vortex" under the following conditions.

【Conditions】
- The entire conversation must be written in **Japanese**.  
- There are two characters:
  - A: Male affiliate marketer  
  - B: Female potential customer  
- The conversation must have **40 total lines**, alternating between A and B.  
- The conversation must include the following message exactly as written:  
  「${userMessage}」  
- Tone: Bright, natural, emotionally expressive, and conversational — suitable for affiliate sales use.  
- Avoid exaggerated, misleading, or illegal expressions (e.g., “guaranteed,” “absolutely,” “will definitely make money,” etc.).  
- Each line must be **within 100 Japanese characters**.  
- The dialogue is intended for **voice generation with ElevenLabs** and **audio/noise detection testing**.  
- Include inline **audio tags** and **Japanese interjections** placed *naturally inside sentences*, not just at the beginning or end.  

【Frequency and Distribution Rules】
To ensure balanced data for model testing:
- ~30% of all lines should include **audio tags** (nonverbal/emotional/environmental).  
- ~20% of all lines should include **Japanese interjections or exclamations** such as:  
  「えっ！？」「すごい！」「まじで？」「へぇ〜」「うわぁ」「なるほど！」「えーっと」「おおっ！」  
- ~50% of lines should be **neutral dialogue without tags or interjections**, maintaining smooth flow.  
- Tags and interjections can appear in the **same line** occasionally, but avoid overuse.  
- When tags appear, embed them **inside** the sentence (inline), not at the end.

【Audio Tag Examples】
Use a mix of emotional, behavioral, and ambient tags:
- Emotional/vocal: [laughs], [starts laughing], [laughs harder], [chuckles], [snorts], [giggles], [sighs], [gasps], [whispers], [excited], [hesitates], [clears throat], [stammers]  
- Physical/ambient: [swallows], [breathes], [background noise], [typing], [chair creaks], [door opens], [paper rustle], [footsteps], [phone rings]  
- Pauses/reactions: [pause], [thinking], [relieved], [nervous], [shocked], [smiles]

【Important Example】
Here is an English example showing proper inline tag placement and expressive flow:  
Okay [laughs] so I asked my friend to tell me the most unfunny joke he knows, like I wanted something so dead inside it circles back to being hilarious, right? [swallows]  
And he just goes, totally serious "Why did the chicken cross the road?"— [laughing] I'm already bracing myself—and then he hit me with it [snorts]  
"To get to the other side." [starts laughing] Brooo—BROOO I don't know WHY that sent me!! [laughs harder] Like the chicken had NO PLOT, no twist, just raw determination!! [laughs hard]

→ Follow this inline tagging style in the Japanese dialogue output.

【Output Format】
Please output in the following format, written in **Japanese**:

A: （A’s dialogue — may include inline tags and interjections）  
B: （B’s dialogue — may include inline tags and interjections）

【Additional Notes】
- A = Male affiliate marketer  
- B = Female potential customer  
- Use the audio tags to simulate vocal emotion or background noise, and interjections to make the speech feel realistic.  
- Keep the tone friendly, upbeat, and believable.  
- Ensure tag distribution matches the frequency rules above (approx. 30% tags, 20% interjections, 50% neutral).  
- Audio tags should always be enclosed in square brackets, and interjections should remain in natural Japanese text.  
- This dataset will be used for training and evaluating models that detect emotional or nonverbal sounds.`;
}

// Lấy các elements
const inputText = document.getElementById("inputText");
const generateBtn = document.getElementById("generateBtn");
const loading = document.getElementById("loading");
const loadingText = document.getElementById("loadingText");
const result = document.getElementById("result");
const conversationOutput = document.getElementById("conversationOutput");
const copyBtn = document.getElementById("copyBtn");
const convertToAudioBtn = document.getElementById("convertToAudioBtn");
const audioPlayer = document.getElementById("audioPlayer");
const audioElement = document.getElementById("audioElement");
const audioSpeedSelect = document.getElementById("audioSpeed");
const downloadAudioBtn = document.getElementById("downloadAudioBtn");

// Settings Modal
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeModal = document.querySelector(".close");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const openaiApiKeyInput = document.getElementById("openaiApiKey");
const openaiModelSelect = document.getElementById("openaiModel");
const elevenlabsApiKeyInput = document.getElementById("elevenlabsApiKey");

// Voice Selection (in main UI)
const voiceSelectA = document.getElementById("voiceSelectA");
const voiceSelectB = document.getElementById("voiceSelectB");

// Variables to store audio data
let currentAudioBlob = null;

// Lưu và load settings từ localStorage
window.addEventListener("load", () => {
  const settings = loadSettings();
  if (settings.openaiApiKey) {
    openaiApiKeyInput.value = settings.openaiApiKey;
  }
  if (settings.openaiModel) {
    openaiModelSelect.value = settings.openaiModel;
  }
  if (settings.elevenlabsApiKey) {
    elevenlabsApiKeyInput.value = settings.elevenlabsApiKey;
  }
  // Set default voices (ElevenLabs premade voices)
  voiceSelectA.value = "pNInz6obpgDQGcFmaJgB"; // Adam - Deep Male for A
  voiceSelectB.value = "EXAVITQu4vr4xnSDxMaL"; // Bella - Soft Female for B
});

function loadSettings() {
  return {
    openaiApiKey: localStorage.getItem("openai_api_key") || "",
    openaiModel: localStorage.getItem("openai_model") || "gpt-4o-mini",
    elevenlabsApiKey: localStorage.getItem("elevenlabs_api_key") || "",
  };
}

function saveSettings() {
  localStorage.setItem("openai_api_key", openaiApiKeyInput.value);
  localStorage.setItem("openai_model", openaiModelSelect.value);
  localStorage.setItem("elevenlabs_api_key", elevenlabsApiKeyInput.value);
}

// Settings Modal handlers
settingsBtn.addEventListener("click", () => {
  settingsModal.style.display = "block";
});

closeModal.addEventListener("click", () => {
  settingsModal.style.display = "none";
});

window.addEventListener("click", (event) => {
  if (event.target === settingsModal) {
    settingsModal.style.display = "none";
  }
});

saveSettingsBtn.addEventListener("click", () => {
  saveSettings();
  settingsModal.style.display = "none";
  alert("Settings saved successfully!");
});

// Handle Generate button click
generateBtn.addEventListener("click", async () => {
  const text = inputText.value.trim();
  const settings = loadSettings();

  // Validation
  if (!text) {
    alert("Please enter a required message!");
    return;
  }

  if (!settings.openaiApiKey) {
    alert("Please configure OpenAI API Key in Settings!");
    settingsModal.style.display = "block";
    return;
  }

  // Show loading
  generateBtn.disabled = true;
  loading.style.display = "block";
  loadingText.textContent = "Generating conversation...";
  result.style.display = "none";
  audioPlayer.style.display = "none";

  try {
    // Call OpenAI API with dynamic prompt
    const conversation = await generateConversation(
      text,
      settings.openaiApiKey,
      settings.openaiModel
    );

    // Display result
    conversationOutput.textContent = conversation;
    result.style.display = "block";
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred: " + error.message);
  } finally {
    // Hide loading
    loading.style.display = "none";
    generateBtn.disabled = false;
  }
});

// Hàm gọi OpenAI API
async function generateConversation(
  userMessage,
  apiKey,
  model = "gpt-4o-mini"
) {
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "system",
          content:
            "あなたはプロのアフィリエイトライターであり、日本語のセールス会話を作成する専門家です。",
        },
        {
          role: "user",
          content: buildPrompt(userMessage),
        },
      ],
      temperature: 0.7,
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

// Handle copy result
copyBtn.addEventListener("click", () => {
  const text = conversationOutput.textContent;
  navigator.clipboard
    .writeText(text)
    .then(() => {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = "✅ Copied!";
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    })
    .catch((err) => {
      alert("Cannot copy: " + err.message);
    });
});

// Handle Convert to Audio - Use selected voices directly
convertToAudioBtn.addEventListener("click", async () => {
  const conversation = conversationOutput.textContent;
  const settings = loadSettings();

  if (!settings.elevenlabsApiKey) {
    alert("Please configure ElevenLabs API Key in Settings!");
    settingsModal.style.display = "block";
    return;
  }

  // Get selected voices from UI
  const selectedVoiceA = voiceSelectA.value;
  const selectedVoiceB = voiceSelectB.value;

  // Parse conversation with selected voices
  const dialogueInputs = parseConversation(
    conversation,
    selectedVoiceA,
    selectedVoiceB
  );

  if (dialogueInputs.length === 0) {
    alert(
      'Cannot parse conversation. Please check format: "A: text" or "B: text"'
    );
    return;
  }

  // Show loading
  convertToAudioBtn.disabled = true;
  loading.style.display = "block";
  loadingText.textContent = "Generating audio...";
  audioPlayer.style.display = "none";

  try {
    // Call ElevenLabs API
    const audioBlob = await convertToAudio(
      dialogueInputs,
      settings.elevenlabsApiKey
    );

    // Save audio blob
    currentAudioBlob = audioBlob;

    // Display audio player
    const audioUrl = URL.createObjectURL(audioBlob);
    audioElement.src = audioUrl;
    audioPlayer.style.display = "block";

    // Scroll to audio player
    audioPlayer.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred while generating audio: " + error.message);
  } finally {
    loading.style.display = "none";
    convertToAudioBtn.disabled = false;
  }
});

// Parse conversation from text to ElevenLabs format
// Supports formats:
//   A: text / B: text
//   🧑‍💼営業: text / 👤顧客: text  (with optional 「」 and ✅)
function parseConversation(conversation, voiceId1, voiceId2) {
  const lines = conversation.split("\n").filter((line) => line.trim());
  const inputs = [];

  for (const line of lines) {
    let speaker = null;
    let text = null;

    // Format: A: text or B: text
    const abMatch = line.match(/^(?:Speaker\s+)?([AB]):\s*(.+)$/i);
    if (abMatch) {
      speaker = abMatch[1].toUpperCase();
      text = abMatch[2].trim();
    }

    // Format: 🧑‍💼営業: text or 👤顧客: text
    if (!speaker) {
      const emojiMatch = line.match(/^(🧑‍💼営業|👤顧客)[:：]\s*(.+)$/);
      if (emojiMatch) {
        speaker = emojiMatch[1] === "🧑‍💼営業" ? "A" : "B";
        text = emojiMatch[2].trim();
      }
    }

    if (speaker && text) {
      // Strip 「」 Japanese brackets and trailing ✅
      text = text
        .replace(/^「/, "")
        .replace(/」\s*✅?\s*$/, "")
        .replace(/✅\s*$/, "")
        .trim();

      if (text) {
        inputs.push({
          voice_id: speaker === "A" ? voiceId1 : voiceId2,
          text: text,
        });
      }
    }
  }

  return inputs;
}

// Function to call ElevenLabs API
async function convertToAudio(inputs, apiKey) {
  const response = await fetch(ELEVENLABS_API_URL, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: inputs,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API Error: ${response.status} - ${errorText}`);
  }

  // Response is audio blob
  const audioBlob = await response.blob();
  return audioBlob;
}

// Download audio
downloadAudioBtn.addEventListener("click", () => {
  if (!currentAudioBlob) {
    alert("No audio to download!");
    return;
  }

  const url = URL.createObjectURL(currentAudioBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `conversation_${Date.now()}.mp3`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Handle audio playback speed change
audioSpeedSelect.addEventListener("change", (e) => {
  const speed = parseFloat(e.target.value);
  audioElement.playbackRate = speed;
});

// Reset speed when new audio is loaded
audioElement.addEventListener("loadedmetadata", () => {
  const speed = parseFloat(audioSpeedSelect.value);
  audioElement.playbackRate = speed;
});

// Allow Enter key in textarea (Shift+Enter for new line)
inputText.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    generateBtn.click();
  }
});

// ==========================================
// Gen Audio from Existing Conversation
// ==========================================

const existingConversationInput = document.getElementById("existingConversationInput");
const genAudioFromConversationBtn = document.getElementById("genAudioFromConversationBtn");
const existingVoiceSelectA = document.getElementById("existingVoiceSelectA");
const existingVoiceSelectB = document.getElementById("existingVoiceSelectB");
const existingConvLoading = document.getElementById("existingConvLoading");
const existingConvAudioPlayer = document.getElementById("existingConvAudioPlayer");
const existingConvAudioElement = document.getElementById("existingConvAudioElement");
const existingConvAudioSpeed = document.getElementById("existingConvAudioSpeed");
const existingConvDownloadBtn = document.getElementById("existingConvDownloadBtn");

let existingConvAudioBlob = null;

genAudioFromConversationBtn.addEventListener("click", async () => {
  const conversation = existingConversationInput.value.trim();
  const settings = loadSettings();

  if (!conversation) {
    alert("Please paste a conversation first!");
    return;
  }

  if (!settings.elevenlabsApiKey) {
    alert("Please configure ElevenLabs API Key in Settings!");
    settingsModal.style.display = "block";
    return;
  }

  const voiceA = existingVoiceSelectA.value;
  const voiceB = existingVoiceSelectB.value;
  const dialogueInputs = parseConversation(conversation, voiceA, voiceB);

  if (dialogueInputs.length === 0) {
    alert('Cannot parse conversation. Please check format:\n• A: text / B: text\n• 🧑‍💼営業: text / 👤顧客: text');
    return;
  }

  genAudioFromConversationBtn.disabled = true;
  existingConvLoading.style.display = "block";
  existingConvAudioPlayer.style.display = "none";

  try {
    const audioBlob = await convertToAudio(dialogueInputs, settings.elevenlabsApiKey);
    existingConvAudioBlob = audioBlob;

    existingConvAudioElement.src = URL.createObjectURL(audioBlob);
    existingConvAudioPlayer.style.display = "block";
    existingConvAudioPlayer.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred while generating audio: " + error.message);
  } finally {
    existingConvLoading.style.display = "none";
    genAudioFromConversationBtn.disabled = false;
  }
});

existingConvAudioSpeed.addEventListener("change", (e) => {
  existingConvAudioElement.playbackRate = parseFloat(e.target.value);
});

existingConvAudioElement.addEventListener("loadedmetadata", () => {
  existingConvAudioElement.playbackRate = parseFloat(existingConvAudioSpeed.value);
});

existingConvDownloadBtn.addEventListener("click", () => {
  if (!existingConvAudioBlob) {
    alert("No audio to download!");
    return;
  }
  const url = URL.createObjectURL(existingConvAudioBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `conversation_${Date.now()}.mp3`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// ==========================================
// CSV Batch Processing Functions
// ==========================================

// CSV elements
const csvFileInput = document.getElementById("csvFileInput");
const csvFileName = document.getElementById("csvFileName");
const processCsvBtn = document.getElementById("processCsvBtn");
const csvProgress = document.getElementById("csvProgress");
const progressBarFill = document.getElementById("progressBarFill");
const csvProgressText = document.getElementById("csvProgressText");
const csvResults = document.getElementById("csvResults");
const resultsTableBody = document.getElementById("resultsTableBody");
const downloadAllCsvBtn = document.getElementById("downloadAllCsvBtn");
const downloadAllAudioBtn = document.getElementById("downloadAllAudioBtn");

// Array to store all voice IDs for random selection
const availableVoiceIds = [
  "pNInz6obpgDQGcFmaJgB", // Adam - Deep Male
  "TxGEqnHWrfWFTfGW9XjX", // Josh - Young Male
  "VR6AewLTigWG4xSOukaG", // Arnold - Crisp Male
  "ErXwobaYiN019PkySvjV", // Antoni - Well Rounded Male
  "EXAVITQu4vr4xnSDxMaL", // Bella - Soft Female
  "ThT5KcBeYPX3keUQqHPh", // Dorothy - Pleasant Female
];

// Store processed results
let processedResults = [];

// Handle CSV file selection
csvFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    csvFileName.textContent = file.name;
    processCsvBtn.style.display = "block";
  } else {
    csvFileName.textContent = "No file selected";
    processCsvBtn.style.display = "none";
  }
});

// Parse CSV file
function parseCSV(csvText) {
  const lines = csvText.split("\n").filter((line) => line.trim());
  const result = [];

  // Skip header row (assume first row is header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parser (handles basic cases)
    // For more complex CSV with quotes and commas inside fields,
    // you might need a more robust parser
    const parts = line.split(",").map((part) => part.trim());

    if (parts.length >= 2) {
      result.push({
        ngWord: parts[0],
        sentence: parts[1],
      });
    }
  }

  return result;
}

// Get random voice ID
function getRandomVoiceId() {
  const randomIndex = Math.floor(Math.random() * availableVoiceIds.length);
  return availableVoiceIds[randomIndex];
}

// Process CSV and generate audio for each row
processCsvBtn.addEventListener("click", async () => {
  const file = csvFileInput.files[0];
  if (!file) {
    alert("Please select a CSV file!");
    return;
  }

  const settings = loadSettings();
  if (!settings.openaiApiKey) {
    alert("Please configure OpenAI API Key in Settings!");
    settingsModal.style.display = "block";
    return;
  }

  if (!settings.elevenlabsApiKey) {
    alert("Please configure ElevenLabs API Key in Settings!");
    settingsModal.style.display = "block";
    return;
  }

  try {
    // Read CSV file
    const csvText = await file.text();
    const csvData = parseCSV(csvText);

    if (csvData.length === 0) {
      alert("No valid data found in CSV file!");
      return;
    }

    // Reset results
    processedResults = [];
    resultsTableBody.innerHTML = "";
    csvResults.style.display = "none";

    // Show progress
    processCsvBtn.disabled = true;
    csvProgress.style.display = "block";
    progressBarFill.style.width = "0%";
    csvProgressText.textContent = `Processing: 0/${csvData.length}`;

    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];

      try {
        // Update progress
        csvProgressText.textContent = `Processing: ${i + 1}/${
          csvData.length
        } - ${row.ngWord}`;

        // Generate conversation
        const conversation = await generateConversation(
          row.sentence,
          settings.openaiApiKey,
          settings.openaiModel
        );

        // Random select voices for A and B
        const voiceA = getRandomVoiceId();
        const voiceB = getRandomVoiceId();

        // Parse conversation for audio generation
        const dialogueInputs = parseConversation(conversation, voiceA, voiceB);

        // Generate audio
        const audioBlob = await convertToAudio(
          dialogueInputs,
          settings.elevenlabsApiKey
        );

        // Store result
        processedResults.push({
          ngWord: row.ngWord,
          sentence: row.sentence,
          conversation: conversation,
          audioBlob: audioBlob,
          voiceA: voiceA,
          voiceB: voiceB,
        });

        // Update progress bar
        const progress = ((i + 1) / csvData.length) * 100;
        progressBarFill.style.width = `${progress}%`;

        // Add result to table immediately
        addResultToTable(processedResults[processedResults.length - 1]);

        // Show results table
        csvResults.style.display = "block";
      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error);

        // Store error result
        processedResults.push({
          ngWord: row.ngWord,
          sentence: row.sentence,
          conversation: `Error: ${error.message}`,
          audioBlob: null,
          error: true,
        });

        // Add error to table
        addResultToTable(processedResults[processedResults.length - 1]);
        csvResults.style.display = "block";
      }
    }

    // Complete
    csvProgressText.textContent = `Completed: ${csvData.length}/${csvData.length}`;
    alert("CSV processing completed!");
  } catch (error) {
    console.error("Error processing CSV:", error);
    alert("Error processing CSV file: " + error.message);
  } finally {
    processCsvBtn.disabled = false;
  }
});

// Add result to table
function addResultToTable(result) {
  const row = document.createElement("tr");

  // NG Word cell
  const ngWordCell = document.createElement("td");
  ngWordCell.textContent = result.ngWord;
  row.appendChild(ngWordCell);

  // Conversation cell
  const conversationCell = document.createElement("td");
  const conversationDiv = document.createElement("div");
  conversationDiv.className = "conversation-cell";
  conversationDiv.textContent = result.conversation;
  conversationCell.appendChild(conversationDiv);
  row.appendChild(conversationCell);

  // Audio cell
  const audioCell = document.createElement("td");
  const audioCellDiv = document.createElement("div");
  audioCellDiv.className = "audio-cell";

  if (result.audioBlob && !result.error) {
    // Create audio player
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = URL.createObjectURL(result.audioBlob);
    audioCellDiv.appendChild(audio);

    // Create download button
    const downloadBtn = document.createElement("button");
    downloadBtn.className = "download-audio-btn-small";
    downloadBtn.textContent = "Download";
    downloadBtn.addEventListener("click", () => {
      downloadSingleAudio(result.audioBlob, result.ngWord);
    });
    audioCellDiv.appendChild(downloadBtn);
  } else {
    const errorText = document.createElement("span");
    errorText.className = "status-error";
    errorText.textContent = "Failed to generate audio";
    audioCellDiv.appendChild(errorText);
  }

  audioCell.appendChild(audioCellDiv);
  row.appendChild(audioCell);

  resultsTableBody.appendChild(row);
}

// Download single audio
function downloadSingleAudio(audioBlob, ngWord) {
  const url = URL.createObjectURL(audioBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ngWord}_${Date.now()}.mp3`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download all results as CSV
downloadAllCsvBtn.addEventListener("click", () => {
  if (processedResults.length === 0) {
    alert("No results to download!");
    return;
  }

  let csvContent = "NG Word,Sentence,Conversation,Status\n";

  processedResults.forEach((result) => {
    const conversation = result.conversation.replace(/"/g, '""'); // Escape quotes
    const status = result.error ? "Error" : "Success";
    csvContent += `"${result.ngWord}","${result.sentence}","${conversation}","${status}"\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `results_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Download all audio as ZIP (Note: This requires JSZip library)
// For now, we'll download them one by one
downloadAllAudioBtn.addEventListener("click", async () => {
  if (processedResults.length === 0) {
    alert("No results to download!");
    return;
  }

  const audioResults = processedResults.filter((r) => r.audioBlob && !r.error);

  if (audioResults.length === 0) {
    alert("No audio files to download!");
    return;
  }

  // Simple approach: download each file with a delay
  if (
    confirm(
      `This will download ${audioResults.length} audio files one by one. Continue?`
    )
  ) {
    for (let i = 0; i < audioResults.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Delay between downloads
      downloadSingleAudio(audioResults[i].audioBlob, audioResults[i].ngWord);
    }
  }
});

// ==========================================
// Batch Import Conversations
// ==========================================

const batchConvCsvInput = document.getElementById("batchConvCsvInput");
const batchConvCsvName = document.getElementById("batchConvCsvName");
const batchConvTableWrap = document.getElementById("batchConvTableWrap");
const batchGenAllBtn = document.getElementById("batchGenAllBtn");
const batchDownloadAllBtn = document.getElementById("batchDownloadAllBtn");
const batchConvProgress = document.getElementById("batchConvProgress");
const batchProgressFill = document.getElementById("batchProgressFill");
const batchProgressText = document.getElementById("batchProgressText");
const batchConvTableBody = document.getElementById("batchConvTableBody");

// { id, content, voiceA, voiceB, audioBlob }
let batchConvRows = [];

const voiceOptions = [
  { value: "pNInz6obpgDQGcFmaJgB", label: "Adam (Male)" },
  { value: "TxGEqnHWrfWFTfGW9XjX", label: "Josh (Male)" },
  { value: "VR6AewLTigWG4xSOukaG", label: "Arnold (Male)" },
  { value: "ErXwobaYiN019PkySvjV", label: "Antoni (Male)" },
  { value: "EXAVITQu4vr4xnSDxMaL", label: "Bella (Female)" },
  { value: "ThT5KcBeYPX3keUQqHPh", label: "Dorothy (Female)" },
];

// Robust CSV parser that handles quoted multi-line fields
function parseCSVFull(csvText) {
  const results = [];
  let i = 0;
  const n = csvText.length;

  // Skip header line
  while (i < n && csvText[i] !== "\n") i++;
  i++; // past \n

  while (i < n) {
    const fields = [];

    // Parse one row
    while (true) {
      let field = "";

      if (i < n && csvText[i] === '"') {
        i++; // skip opening quote
        while (i < n) {
          if (csvText[i] === '"') {
            if (i + 1 < n && csvText[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i++; // skip closing quote
              break;
            }
          } else {
            field += csvText[i++];
          }
        }
      } else {
        // Unquoted field — stop at comma or newline
        while (i < n && csvText[i] !== "," && csvText[i] !== "\n" && csvText[i] !== "\r") {
          field += csvText[i++];
        }
      }

      fields.push(field.trim());

      if (i >= n || csvText[i] === "\n" || csvText[i] === "\r") {
        if (i < n && csvText[i] === "\r") i++;
        if (i < n && csvText[i] === "\n") i++;
        break;
      }
      if (csvText[i] === ",") i++;
    }

    if (fields.length >= 2 && (fields[0] || fields[1])) {
      results.push({ id: fields[0], content: fields[1] });
    }
  }

  return results;
}

function createVoiceSelectEl(id, selectedValue) {
  const select = document.createElement("select");
  select.id = id;
  select.className = "voice-select";
  select.style.cssText = "font-size:12px;padding:4px;width:100%;";
  voiceOptions.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    if (opt.value === selectedValue) option.selected = true;
    select.appendChild(option);
  });
  return select;
}

function renderBatchAudioCell(cell, row, index) {
  cell.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "audio-cell";

  if (row.audioBlob) {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = URL.createObjectURL(row.audioBlob);
    audio.style.width = "100%";
    wrap.appendChild(audio);

    const dlBtn = document.createElement("button");
    dlBtn.className = "download-audio-btn-small";
    dlBtn.textContent = "⬇️ Download";
    dlBtn.addEventListener("click", () => downloadSingleAudio(row.audioBlob, row.id));
    wrap.appendChild(dlBtn);

    const regenBtn = document.createElement("button");
    regenBtn.className = "download-audio-btn-small";
    regenBtn.textContent = "🔄 Regen";
    regenBtn.style.marginLeft = "4px";
    regenBtn.addEventListener("click", async () => {
      batchConvRows[index].audioBlob = null;
      renderBatchAudioCell(cell, batchConvRows[index], index);
      await generateBatchRowAudio(index);
    });
    wrap.appendChild(regenBtn);
  } else {
    const genBtn = document.createElement("button");
    genBtn.className = "download-audio-btn-small";
    genBtn.textContent = "🎵 Generate";
    genBtn.id = `batch-gen-btn-${index}`;
    genBtn.addEventListener("click", () => generateBatchRowAudio(index));
    wrap.appendChild(genBtn);
  }

  cell.appendChild(wrap);
}

function renderBatchTable() {
  batchConvTableBody.innerHTML = "";

  batchConvRows.forEach((row, index) => {
    const tr = document.createElement("tr");

    // ID
    const idCell = document.createElement("td");
    idCell.textContent = row.id;
    idCell.style.fontWeight = "bold";
    tr.appendChild(idCell);

    // Content
    const contentCell = document.createElement("td");
    const contentDiv = document.createElement("div");
    contentDiv.className = "conversation-cell";
    contentDiv.textContent = row.content;
    contentCell.appendChild(contentDiv);
    tr.appendChild(contentCell);

    // Voice A
    const voiceACell = document.createElement("td");
    const voiceASelect = createVoiceSelectEl(`batchVoiceA-${index}`, row.voiceA);
    voiceASelect.addEventListener("change", (e) => {
      batchConvRows[index].voiceA = e.target.value;
    });
    voiceACell.appendChild(voiceASelect);
    tr.appendChild(voiceACell);

    // Voice B
    const voiceBCell = document.createElement("td");
    const voiceBSelect = createVoiceSelectEl(`batchVoiceB-${index}`, row.voiceB);
    voiceBSelect.addEventListener("change", (e) => {
      batchConvRows[index].voiceB = e.target.value;
    });
    voiceBCell.appendChild(voiceBSelect);
    tr.appendChild(voiceBCell);

    // Audio
    const audioCell = document.createElement("td");
    audioCell.id = `batch-audio-cell-${index}`;
    renderBatchAudioCell(audioCell, row, index);
    tr.appendChild(audioCell);

    batchConvTableBody.appendChild(tr);
  });
}

async function generateBatchRowAudio(index) {
  const row = batchConvRows[index];
  const settings = loadSettings();
  const cell = document.getElementById(`batch-audio-cell-${index}`);
  const btn = document.getElementById(`batch-gen-btn-${index}`);

  if (!settings.elevenlabsApiKey) {
    alert("Please configure ElevenLabs API Key in Settings!");
    settingsModal.style.display = "block";
    return;
  }

  const dialogueInputs = parseConversation(row.content, row.voiceA, row.voiceB);
  if (dialogueInputs.length === 0) {
    alert(`Row ${row.id}: Cannot parse conversation content.`);
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = "⏳..."; }

  try {
    const audioBlob = await convertToAudio(dialogueInputs, settings.elevenlabsApiKey);
    batchConvRows[index].audioBlob = audioBlob;
    if (cell) renderBatchAudioCell(cell, batchConvRows[index], index);
  } catch (error) {
    if (btn) { btn.disabled = false; btn.textContent = "🎵 Generate"; }
    alert(`Error for row ${row.id}: ${error.message}`);
  }
}

batchConvCsvInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  batchConvCsvName.textContent = file.name;

  const csvText = await file.text();
  const parsed = parseCSVFull(csvText);

  if (parsed.length === 0) {
    alert("No valid data found in CSV! Expected columns: ID, Content");
    return;
  }

  batchConvRows = parsed.map((row) => ({
    ...row,
    voiceA: getRandomVoiceId(),
    voiceB: getRandomVoiceId(),
    audioBlob: null,
  }));

  renderBatchTable();
  batchConvTableWrap.style.display = "block";
});

batchGenAllBtn.addEventListener("click", async () => {
  const settings = loadSettings();
  if (!settings.elevenlabsApiKey) {
    alert("Please configure ElevenLabs API Key in Settings!");
    settingsModal.style.display = "block";
    return;
  }

  const pending = batchConvRows
    .map((row, idx) => ({ row, idx }))
    .filter(({ row }) => !row.audioBlob);

  if (pending.length === 0) {
    alert("All rows already have audio generated!");
    return;
  }

  batchGenAllBtn.disabled = true;
  batchConvProgress.style.display = "block";
  batchProgressFill.style.width = "0%";

  for (let i = 0; i < pending.length; i++) {
    const { row, idx } = pending[i];
    batchProgressText.textContent = `Generating: ${i + 1}/${pending.length} (ID: ${row.id})`;

    const dialogueInputs = parseConversation(row.content, row.voiceA, row.voiceB);
    if (dialogueInputs.length > 0) {
      try {
        const audioBlob = await convertToAudio(dialogueInputs, settings.elevenlabsApiKey);
        batchConvRows[idx].audioBlob = audioBlob;
        const cell = document.getElementById(`batch-audio-cell-${idx}`);
        if (cell) renderBatchAudioCell(cell, batchConvRows[idx], idx);
      } catch (error) {
        console.error(`Error for row ${row.id}:`, error);
      }
    }

    batchProgressFill.style.width = `${((i + 1) / pending.length) * 100}%`;
  }

  batchProgressText.textContent = `Done: ${pending.length}/${pending.length}`;
  batchGenAllBtn.disabled = false;
  alert("All audio generated!");
});

batchDownloadAllBtn.addEventListener("click", async () => {
  const audioRows = batchConvRows.filter((r) => r.audioBlob);
  if (audioRows.length === 0) {
    alert("No audio to download. Please generate audio first!");
    return;
  }
  if (confirm(`Download ${audioRows.length} audio files one by one?`)) {
    for (const row of audioRows) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      downloadSingleAudio(row.audioBlob, row.id);
    }
  }
});

// ==========================================
// Review — Import CSV + Audio Files
// ==========================================

const importReviewCsvInput = document.getElementById("importReviewCsvInput");
const importReviewCsvName = document.getElementById("importReviewCsvName");
const importReviewAudioInput = document.getElementById("importReviewAudioInput");
const importReviewAudioName = document.getElementById("importReviewAudioName");
const importReviewLoadBtn = document.getElementById("importReviewLoadBtn");
const importReviewTableWrap = document.getElementById("importReviewTableWrap");
const importReviewMatchSummary = document.getElementById("importReviewMatchSummary");
const importReviewTableBody = document.getElementById("importReviewTableBody");

let importReviewAudioMap = new Map(); // id -> File

importReviewCsvInput.addEventListener("change", (e) => {
  if (e.target.files[0]) {
    importReviewCsvName.textContent = e.target.files[0].name;
    checkImportReviewReady();
  }
});

importReviewAudioInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  importReviewAudioName.textContent = `${files.length} file(s) selected`;

  importReviewAudioMap = new Map();
  files.forEach((file) => {
    // Extract ID from filename: "001.mp3" → "001", "001_label.mp3" → "001"
    const nameNoExt = file.name.replace(/\.[^.]+$/, "");
    const id = nameNoExt.split("_")[0].trim();
    importReviewAudioMap.set(id, file);
  });

  checkImportReviewReady();
});

function checkImportReviewReady() {
  if (importReviewCsvInput.files.length > 0 && importReviewAudioInput.files.length > 0) {
    importReviewLoadBtn.style.display = "block";
  }
}

importReviewLoadBtn.addEventListener("click", async () => {
  const csvFile = importReviewCsvInput.files[0];
  const csvText = await csvFile.text();
  const parsed = parseCSVFull(csvText);

  if (parsed.length === 0) {
    alert("No valid data in CSV! Expected columns: ID, Content");
    return;
  }

  importReviewTableBody.innerHTML = "";
  let matchedCount = 0;

  parsed.forEach((row) => {
    const tr = document.createElement("tr");

    // ID
    const idCell = document.createElement("td");
    idCell.textContent = row.id;
    idCell.style.fontWeight = "bold";
    tr.appendChild(idCell);

    // Content
    const contentCell = document.createElement("td");
    const contentDiv = document.createElement("div");
    contentDiv.className = "conversation-cell";
    contentDiv.textContent = row.content;
    contentCell.appendChild(contentDiv);
    tr.appendChild(contentCell);

    // Audio
    const audioCell = document.createElement("td");
    const audioCellDiv = document.createElement("div");
    audioCellDiv.className = "audio-cell";

    const audioFile = importReviewAudioMap.get(row.id);
    if (audioFile) {
      matchedCount++;
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = URL.createObjectURL(audioFile);
      audio.style.width = "100%";
      audioCellDiv.appendChild(audio);

      const dlBtn = document.createElement("button");
      dlBtn.className = "download-audio-btn-small";
      dlBtn.textContent = "⬇️ Download";
      dlBtn.addEventListener("click", () => {
        const url = URL.createObjectURL(audioFile);
        const a = document.createElement("a");
        a.href = url;
        a.download = audioFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
      audioCellDiv.appendChild(dlBtn);
    } else {
      const noMatch = document.createElement("span");
      noMatch.className = "status-error";
      noMatch.textContent = "No audio matched";
      audioCellDiv.appendChild(noMatch);
    }

    audioCell.appendChild(audioCellDiv);
    tr.appendChild(audioCell);
    importReviewTableBody.appendChild(tr);
  });

  importReviewMatchSummary.textContent = `Matched: ${matchedCount}/${parsed.length} rows`;
  importReviewTableWrap.style.display = "block";
  importReviewTableWrap.scrollIntoView({ behavior: "smooth", block: "start" });
});
