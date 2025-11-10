// DOM Elements
const text1 = document.getElementById('text1');
const text2 = document.getElementById('text2');
const count1 = document.getElementById('count1');
const count2 = document.getElementById('count2');
const clearText1Btn = document.getElementById('clearText1');
const clearText2Btn = document.getElementById('clearText2');
const compareBtn = document.getElementById('compareBtn');
const swapBtn = document.getElementById('swapBtn');
const exportBtn = document.getElementById('exportBtn');
const copyDiffBtn = document.getElementById('copyDiffBtn');

// Options
const ignoreCaseCheckbox = document.getElementById('ignoreCase');
const ignoreWhitespaceCheckbox = document.getElementById('ignoreWhitespace');
const ignorePunctuationCheckbox = document.getElementById('ignorePunctuation');
const ignoreLineBreaksCheckbox = document.getElementById('ignoreLineBreaks');

// Results
const resultsSection = document.getElementById('resultsSection');
const similarityPercent = document.getElementById('similarityPercent');
const diffCount = document.getElementById('diffCount');
const addedCount = document.getElementById('addedCount');
const removedCount = document.getElementById('removedCount');
const modifiedCount = document.getElementById('modifiedCount');
const diff1 = document.getElementById('diff1');
const diff2 = document.getElementById('diff2');

// Character count update
text1.addEventListener('input', () => {
    count1.textContent = text1.value.length;
});

text2.addEventListener('input', () => {
    count2.textContent = text2.value.length;
});

// Clear buttons
clearText1Btn.addEventListener('click', () => {
    text1.value = '';
    count1.textContent = '0';
});

clearText2Btn.addEventListener('click', () => {
    text2.value = '';
    count2.textContent = '0';
});

// Swap texts
swapBtn.addEventListener('click', () => {
    const temp = text1.value;
    text1.value = text2.value;
    text2.value = temp;
    count1.textContent = text1.value.length;
    count2.textContent = text2.value.length;
});

// Compare button
compareBtn.addEventListener('click', () => {
    const txt1 = text1.value;
    const txt2 = text2.value;

    if (!txt1 && !txt2) {
        alert('Please enter text in both fields to compare!');
        return;
    }

    performComparison(txt1, txt2);
});

// Normalize text based on options
function normalizeText(text) {
    let normalized = text;

    if (ignorePunctuationCheckbox.checked) {
        normalized = normalized.replace(/[.,!?;:「」『』（）""„〜…・—\-、。・，；？！]/g, '');
    }

    if (ignoreLineBreaksCheckbox.checked) {
        normalized = normalized.replace(/\n/g, ' ');
    }

    if (ignoreWhitespaceCheckbox.checked) {
        normalized = normalized.replace(/\s+/g, ' ').trim();
    }

    if (ignoreCaseCheckbox.checked) {
        normalized = normalized.toLowerCase();
    }

    return normalized;
}

// Myers diff algorithm (character-level, like text-compare.com)
function myersDiff(text1, text2) {
    const n = text1.length;
    const m = text2.length;
    const max = n + m;
    const v = {};
    const trace = [];

    v[1] = 0;

    for (let d = 0; d <= max; d++) {
        trace.push({...v});

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
                return backtrack(text1, text2, trace, d);
            }
        }
    }

    return [];
}

function backtrack(text1, text2, trace, d) {
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
            diff.unshift({ type: 'same', char1: text1[x - 1], char2: text2[y - 1] });
            x--;
            y--;
        }

        if (d_step > 0) {
            if (x === prev_x) {
                diff.unshift({ type: 'added', char2: text2[y - 1] });
                y--;
            } else {
                diff.unshift({ type: 'removed', char1: text1[x - 1] });
                x--;
            }
        }
    }

    return diff;
}

// Group character diffs into chunks for better display
function groupDiffs(charDiffs) {
    const chunks = [];
    let currentChunk = { type: '', text1: '', text2: '' };

    charDiffs.forEach(diff => {
        if (diff.type !== currentChunk.type) {
            if (currentChunk.type !== '') {
                chunks.push(currentChunk);
            }
            currentChunk = { type: diff.type, text1: '', text2: '' };
        }

        if (diff.type === 'same') {
            currentChunk.text1 += diff.char1;
            currentChunk.text2 += diff.char2;
        } else if (diff.type === 'removed') {
            currentChunk.text1 += diff.char1;
        } else if (diff.type === 'added') {
            currentChunk.text2 += diff.char2;
        }
    });

    if (currentChunk.type !== '') {
        chunks.push(currentChunk);
    }

    return chunks;
}

// Perform comparison
function performComparison(txt1, txt2) {
    // Normalize texts
    const normalized1 = normalizeText(txt1);
    const normalized2 = normalizeText(txt2);

    // Calculate character-level diff using Myers algorithm
    const charDiffs = myersDiff(normalized1, normalized2);

    // Group character diffs into chunks for display
    const chunks = groupDiffs(charDiffs);

    // Count stats
    let addedChars = 0, removedChars = 0, sameChars = 0;
    charDiffs.forEach(diff => {
        if (diff.type === 'added') addedChars++;
        else if (diff.type === 'removed') removedChars++;
        else if (diff.type === 'same') sameChars++;
    });

    const totalChars = sameChars + addedChars + removedChars;
    const similarity = totalChars === 0 ? 100 : Math.round((sameChars / totalChars) * 100);

    // Count chunk-level changes for display
    let addedChunks = 0, removedChunks = 0, modifiedChunks = 0;
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk.type === 'added') {
            addedChunks++;
        } else if (chunk.type === 'removed') {
            removedChunks++;
        } else if (chunk.type === 'same') {
            // Check if next chunk is opposite type (indicates modification)
            if (i + 1 < chunks.length) {
                const nextChunk = chunks[i + 1];
                if ((chunk.type === 'removed' && nextChunk.type === 'added') ||
                    (chunk.type === 'added' && nextChunk.type === 'removed')) {
                    modifiedChunks++;
                }
            }
        }
    }

    // Update stats
    similarityPercent.textContent = similarity + '%';
    diffCount.textContent = (addedChunks + removedChunks);
    addedCount.textContent = addedChunks;
    removedCount.textContent = removedChunks;
    modifiedCount.textContent = 0; // Character-level diff doesn't distinguish modified

    // Generate highlighted HTML
    let html1 = '';
    let html2 = '';

    chunks.forEach(chunk => {
        if (chunk.type === 'same') {
            html1 += `<span class="highlight-same">${escapeHtml(chunk.text1)}</span>`;
            html2 += `<span class="highlight-same">${escapeHtml(chunk.text2)}</span>`;
        } else if (chunk.type === 'removed') {
            html1 += `<span class="highlight-removed">${escapeHtml(chunk.text1)}</span>`;
        } else if (chunk.type === 'added') {
            html2 += `<span class="highlight-added">${escapeHtml(chunk.text2)}</span>`;
        }
    });

    diff1.innerHTML = html1;
    diff2.innerHTML = html2;

    // Show results
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export report
exportBtn.addEventListener('click', () => {
    const report = `Text Comparison Report
Generated: ${new Date().toLocaleString()}

========================================
STATISTICS
========================================
Similarity: ${similarityPercent.textContent}
Total Differences: ${diffCount.textContent}
Added: ${addedCount.textContent}
Removed: ${removedCount.textContent}

========================================
TEXT 1 (ORIGINAL)
========================================
${text1.value}

========================================
TEXT 2 (MODIFIED)
========================================
${text2.value}

========================================
OPTIONS USED
========================================
Ignore Case: ${ignoreCaseCheckbox.checked ? 'Yes' : 'No'}
Ignore Whitespace: ${ignoreWhitespaceCheckbox.checked ? 'Yes' : 'No'}
Ignore Punctuation: ${ignorePunctuationCheckbox.checked ? 'Yes' : 'No'}
Ignore Line Breaks: ${ignoreLineBreaksCheckbox.checked ? 'Yes' : 'No'}
`;

    // Download as file
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `text-comparison-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Copy differences
copyDiffBtn.addEventListener('click', async () => {
    const diffText = `Differences Found: ${diffCount.textContent}
Added: ${addedCount.textContent} | Removed: ${removedCount.textContent} | Modified: ${modifiedCount.textContent}
Similarity: ${similarityPercent.textContent}

Text 1:
${diff1.textContent}

Text 2:
${diff2.textContent}
`;

    try {
        await navigator.clipboard.writeText(diffText);
        const originalText = copyDiffBtn.textContent;
        copyDiffBtn.textContent = '✅ Copied!';
        setTimeout(() => {
            copyDiffBtn.textContent = originalText;
        }, 2000);
    } catch (error) {
        alert('Failed to copy to clipboard: ' + error.message);
    }
});
