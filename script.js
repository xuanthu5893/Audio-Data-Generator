// Cấu hình
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-dialogue';

// Hàm tạo prompt động
function buildPrompt(userMessage) {
    return `You are a professional affiliate writer and an expert in creating Japanese sales conversations.  
Please create a Japanese dialogue script introducing an AI avatar automation system called "AI Avatar Vortex" under the following conditions.

【Conditions】
- The entire conversation must be written in **Japanese**.  
- There are two characters:
  - A: Male affiliate marketer  
  - B: Female potential customer  
- The conversation must have **20 total lines**, alternating between A and B.  
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
const inputText = document.getElementById('inputText');
const generateBtn = document.getElementById('generateBtn');
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loadingText');
const result = document.getElementById('result');
const conversationOutput = document.getElementById('conversationOutput');
const copyBtn = document.getElementById('copyBtn');
const convertToAudioBtn = document.getElementById('convertToAudioBtn');
const audioPlayer = document.getElementById('audioPlayer');
const audioElement = document.getElementById('audioElement');
const audioSpeedSelect = document.getElementById('audioSpeed');
const downloadAudioBtn = document.getElementById('downloadAudioBtn');

// Settings Modal
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModal = document.querySelector('.close');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const openaiApiKeyInput = document.getElementById('openaiApiKey');
const openaiModelSelect = document.getElementById('openaiModel');
const elevenlabsApiKeyInput = document.getElementById('elevenlabsApiKey');

// Voice Selection (in main UI)
const voiceSelectA = document.getElementById('voiceSelectA');
const voiceSelectB = document.getElementById('voiceSelectB');

// Variables to store audio data
let currentAudioBlob = null;

// Lưu và load settings từ localStorage
window.addEventListener('load', () => {
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
    voiceSelectA.value = 'pNInz6obpgDQGcFmaJgB'; // Adam - Deep Male for A
    voiceSelectB.value = 'EXAVITQu4vr4xnSDxMaL'; // Bella - Soft Female for B
});

function loadSettings() {
    return {
        openaiApiKey: localStorage.getItem('openai_api_key') || '',
        openaiModel: localStorage.getItem('openai_model') || 'gpt-4o-mini',
        elevenlabsApiKey: localStorage.getItem('elevenlabs_api_key') || ''
    };
}

function saveSettings() {
    localStorage.setItem('openai_api_key', openaiApiKeyInput.value);
    localStorage.setItem('openai_model', openaiModelSelect.value);
    localStorage.setItem('elevenlabs_api_key', elevenlabsApiKeyInput.value);
}

// Settings Modal handlers
settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'block';
});

closeModal.addEventListener('click', () => {
    settingsModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
        settingsModal.style.display = 'none';
    }
});

saveSettingsBtn.addEventListener('click', () => {
    saveSettings();
    settingsModal.style.display = 'none';
    alert('Settings saved successfully!');
});

// Handle Generate button click
generateBtn.addEventListener('click', async () => {
    const text = inputText.value.trim();
    const settings = loadSettings();

    // Validation
    if (!text) {
        alert('Please enter a required message!');
        return;
    }

    if (!settings.openaiApiKey) {
        alert('Please configure OpenAI API Key in Settings!');
        settingsModal.style.display = 'block';
        return;
    }

    // Show loading
    generateBtn.disabled = true;
    loading.style.display = 'block';
    loadingText.textContent = 'Generating conversation...';
    result.style.display = 'none';
    audioPlayer.style.display = 'none';

    try {
        // Call OpenAI API with dynamic prompt
        const conversation = await generateConversation(text, settings.openaiApiKey, settings.openaiModel);

        // Display result
        conversationOutput.textContent = conversation;
        result.style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred: ' + error.message);
    } finally {
        // Hide loading
        loading.style.display = 'none';
        generateBtn.disabled = false;
    }
});

// Hàm gọi OpenAI API
async function generateConversation(userMessage, apiKey, model = 'gpt-4o-mini') {
    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: 'system',
                    content: 'あなたはプロのアフィリエイトライターであり、日本語のセールス会話を作成する専門家です。'
                },
                {
                    role: 'user',
                    content: buildPrompt(userMessage)
                }
            ],
            temperature: 0.7,
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

// Handle copy result
copyBtn.addEventListener('click', () => {
    const text = conversationOutput.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        alert('Cannot copy: ' + err.message);
    });
});

// Handle Convert to Audio - Use selected voices directly
convertToAudioBtn.addEventListener('click', async () => {
    const conversation = conversationOutput.textContent;
    const settings = loadSettings();

    if (!settings.elevenlabsApiKey) {
        alert('Please configure ElevenLabs API Key in Settings!');
        settingsModal.style.display = 'block';
        return;
    }

    // Get selected voices from UI
    const selectedVoiceA = voiceSelectA.value;
    const selectedVoiceB = voiceSelectB.value;

    // Parse conversation with selected voices
    const dialogueInputs = parseConversation(conversation, selectedVoiceA, selectedVoiceB);

    if (dialogueInputs.length === 0) {
        alert('Cannot parse conversation. Please check format: "A: text" or "B: text"');
        return;
    }

    // Show loading
    convertToAudioBtn.disabled = true;
    loading.style.display = 'block';
    loadingText.textContent = 'Generating audio...';
    audioPlayer.style.display = 'none';

    try {
        // Call ElevenLabs API
        const audioBlob = await convertToAudio(dialogueInputs, settings.elevenlabsApiKey);

        // Save audio blob
        currentAudioBlob = audioBlob;

        // Display audio player
        const audioUrl = URL.createObjectURL(audioBlob);
        audioElement.src = audioUrl;
        audioPlayer.style.display = 'block';

        // Scroll to audio player
        audioPlayer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while generating audio: ' + error.message);
    } finally {
        loading.style.display = 'none';
        convertToAudioBtn.disabled = false;
    }
});

// Parse conversation from text to ElevenLabs format
function parseConversation(conversation, voiceId1, voiceId2) {
    const lines = conversation.split('\n').filter(line => line.trim());
    const inputs = [];

    for (const line of lines) {
        // Find pattern "A: text" or "B: text"
        const match = line.match(/^(?:Speaker\s+)?([AB]):\s*(.+)$/i);
        if (match) {
            const speaker = match[1].toUpperCase();
            const text = match[2].trim();

            if (text) {
                inputs.push({
                    voice_id: speaker === 'A' ? voiceId1 : voiceId2,
                    text: text
                });
            }
        }
    }

    return inputs;
}

// Function to call ElevenLabs API
async function convertToAudio(inputs, apiKey) {
    const response = await fetch(ELEVENLABS_API_URL, {
        method: 'POST',
        headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            inputs: inputs
        })
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
downloadAudioBtn.addEventListener('click', () => {
    if (!currentAudioBlob) {
        alert('No audio to download!');
        return;
    }

    const url = URL.createObjectURL(currentAudioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation_${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Handle audio playback speed change
audioSpeedSelect.addEventListener('change', (e) => {
    const speed = parseFloat(e.target.value);
    audioElement.playbackRate = speed;
});

// Reset speed when new audio is loaded
audioElement.addEventListener('loadedmetadata', () => {
    const speed = parseFloat(audioSpeedSelect.value);
    audioElement.playbackRate = speed;
});

// Allow Enter key in textarea (Shift+Enter for new line)
inputText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        generateBtn.click();
    }
});

// ==========================================
// CSV Batch Processing Functions
// ==========================================

// CSV elements
const csvFileInput = document.getElementById('csvFileInput');
const csvFileName = document.getElementById('csvFileName');
const processCsvBtn = document.getElementById('processCsvBtn');
const csvProgress = document.getElementById('csvProgress');
const progressBarFill = document.getElementById('progressBarFill');
const csvProgressText = document.getElementById('csvProgressText');
const csvResults = document.getElementById('csvResults');
const resultsTableBody = document.getElementById('resultsTableBody');
const downloadAllCsvBtn = document.getElementById('downloadAllCsvBtn');
const downloadAllAudioBtn = document.getElementById('downloadAllAudioBtn');

// Array to store all voice IDs for random selection
const availableVoiceIds = [
    'pNInz6obpgDQGcFmaJgB', // Adam - Deep Male
    'TxGEqnHWrfWFTfGW9XjX', // Josh - Young Male
    'VR6AewLTigWG4xSOukaG', // Arnold - Crisp Male
    'ErXwobaYiN019PkySvjV', // Antoni - Well Rounded Male
    'EXAVITQu4vr4xnSDxMaL', // Bella - Soft Female
    'ThT5KcBeYPX3keUQqHPh'  // Dorothy - Pleasant Female
];

// Store processed results
let processedResults = [];

// Handle CSV file selection
csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        csvFileName.textContent = file.name;
        processCsvBtn.style.display = 'block';
    } else {
        csvFileName.textContent = 'No file selected';
        processCsvBtn.style.display = 'none';
    }
});

// Parse CSV file
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    const result = [];

    // Skip header row (assume first row is header)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV parser (handles basic cases)
        // For more complex CSV with quotes and commas inside fields,
        // you might need a more robust parser
        const parts = line.split(',').map(part => part.trim());

        if (parts.length >= 2) {
            result.push({
                ngWord: parts[0],
                sentence: parts[1]
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
processCsvBtn.addEventListener('click', async () => {
    const file = csvFileInput.files[0];
    if (!file) {
        alert('Please select a CSV file!');
        return;
    }

    const settings = loadSettings();
    if (!settings.openaiApiKey) {
        alert('Please configure OpenAI API Key in Settings!');
        settingsModal.style.display = 'block';
        return;
    }

    if (!settings.elevenlabsApiKey) {
        alert('Please configure ElevenLabs API Key in Settings!');
        settingsModal.style.display = 'block';
        return;
    }

    try {
        // Read CSV file
        const csvText = await file.text();
        const csvData = parseCSV(csvText);

        if (csvData.length === 0) {
            alert('No valid data found in CSV file!');
            return;
        }

        // Reset results
        processedResults = [];
        resultsTableBody.innerHTML = '';
        csvResults.style.display = 'none';

        // Show progress
        processCsvBtn.disabled = true;
        csvProgress.style.display = 'block';
        progressBarFill.style.width = '0%';
        csvProgressText.textContent = `Processing: 0/${csvData.length}`;

        // Process each row
        for (let i = 0; i < csvData.length; i++) {
            const row = csvData[i];

            try {
                // Update progress
                csvProgressText.textContent = `Processing: ${i + 1}/${csvData.length} - ${row.ngWord}`;

                // Generate conversation
                const conversation = await generateConversation(row.sentence, settings.openaiApiKey, settings.openaiModel);

                // Random select voices for A and B
                const voiceA = getRandomVoiceId();
                const voiceB = getRandomVoiceId();

                // Parse conversation for audio generation
                const dialogueInputs = parseConversation(conversation, voiceA, voiceB);

                // Generate audio
                const audioBlob = await convertToAudio(dialogueInputs, settings.elevenlabsApiKey);

                // Store result
                processedResults.push({
                    ngWord: row.ngWord,
                    sentence: row.sentence,
                    conversation: conversation,
                    audioBlob: audioBlob,
                    voiceA: voiceA,
                    voiceB: voiceB
                });

                // Update progress bar
                const progress = ((i + 1) / csvData.length) * 100;
                progressBarFill.style.width = `${progress}%`;

                // Add result to table immediately
                addResultToTable(processedResults[processedResults.length - 1]);

                // Show results table
                csvResults.style.display = 'block';

            } catch (error) {
                console.error(`Error processing row ${i + 1}:`, error);

                // Store error result
                processedResults.push({
                    ngWord: row.ngWord,
                    sentence: row.sentence,
                    conversation: `Error: ${error.message}`,
                    audioBlob: null,
                    error: true
                });

                // Add error to table
                addResultToTable(processedResults[processedResults.length - 1]);
                csvResults.style.display = 'block';
            }
        }

        // Complete
        csvProgressText.textContent = `Completed: ${csvData.length}/${csvData.length}`;
        alert('CSV processing completed!');

    } catch (error) {
        console.error('Error processing CSV:', error);
        alert('Error processing CSV file: ' + error.message);
    } finally {
        processCsvBtn.disabled = false;
    }
});

// Add result to table
function addResultToTable(result) {
    const row = document.createElement('tr');

    // NG Word cell
    const ngWordCell = document.createElement('td');
    ngWordCell.textContent = result.ngWord;
    row.appendChild(ngWordCell);

    // Conversation cell
    const conversationCell = document.createElement('td');
    const conversationDiv = document.createElement('div');
    conversationDiv.className = 'conversation-cell';
    conversationDiv.textContent = result.conversation;
    conversationCell.appendChild(conversationDiv);
    row.appendChild(conversationCell);

    // Audio cell
    const audioCell = document.createElement('td');
    const audioCellDiv = document.createElement('div');
    audioCellDiv.className = 'audio-cell';

    if (result.audioBlob && !result.error) {
        // Create audio player
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = URL.createObjectURL(result.audioBlob);
        audioCellDiv.appendChild(audio);

        // Create download button
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-audio-btn-small';
        downloadBtn.textContent = 'Download';
        downloadBtn.addEventListener('click', () => {
            downloadSingleAudio(result.audioBlob, result.ngWord);
        });
        audioCellDiv.appendChild(downloadBtn);
    } else {
        const errorText = document.createElement('span');
        errorText.className = 'status-error';
        errorText.textContent = 'Failed to generate audio';
        audioCellDiv.appendChild(errorText);
    }

    audioCell.appendChild(audioCellDiv);
    row.appendChild(audioCell);

    resultsTableBody.appendChild(row);
}

// Download single audio
function downloadSingleAudio(audioBlob, ngWord) {
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ngWord}_${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Download all results as CSV
downloadAllCsvBtn.addEventListener('click', () => {
    if (processedResults.length === 0) {
        alert('No results to download!');
        return;
    }

    let csvContent = 'NG Word,Sentence,Conversation,Status\n';

    processedResults.forEach(result => {
        const conversation = result.conversation.replace(/"/g, '""'); // Escape quotes
        const status = result.error ? 'Error' : 'Success';
        csvContent += `"${result.ngWord}","${result.sentence}","${conversation}","${status}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Download all audio as ZIP (Note: This requires JSZip library)
// For now, we'll download them one by one
downloadAllAudioBtn.addEventListener('click', async () => {
    if (processedResults.length === 0) {
        alert('No results to download!');
        return;
    }

    const audioResults = processedResults.filter(r => r.audioBlob && !r.error);

    if (audioResults.length === 0) {
        alert('No audio files to download!');
        return;
    }

    // Simple approach: download each file with a delay
    if (confirm(`This will download ${audioResults.length} audio files one by one. Continue?`)) {
        for (let i = 0; i < audioResults.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 500)); // Delay between downloads
            downloadSingleAudio(audioResults[i].audioBlob, audioResults[i].ngWord);
        }
    }
});
