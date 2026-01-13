const API_BASE = "http://localhost:3000/api";

document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const elements = {
        themeToggle: document.getElementById('themeToggle'),
        tabs: document.querySelectorAll('.tab'),
        views: {
            create: document.getElementById('view-create'),
            history: document.getElementById('view-history')
        },
        controls: {
            tone: document.getElementById('toneSelect'),
            format: document.getElementById('formatSelect'),
            emoji: document.getElementById('emojiSlider'),
            emojiVal: document.getElementById('emojiVal'),
            trends: document.getElementById('trends'),
            prompt: document.getElementById('prompt'),
            voice: document.getElementById('voiceBtn'),
            counter: document.getElementById('charCounter')
        },
        buttons: {
            generate: document.getElementById('generateBtn'),
            hook: document.getElementById('hookBtn'),
            hashtags: document.getElementById('hashtagsBtn'),
            post: document.getElementById('postBtn'),
            copy: document.getElementById('copyBtn'),
            refine: document.querySelectorAll('.refine-btn'),
            clearHistory: document.getElementById('clearHistory')
        },
        result: {
            preview: document.getElementById('preview'),
            text: document.getElementById('resultText'),
            image: document.getElementById('resultImage'),
            score: document.getElementById('readabilityScore')
        },
        historyList: document.getElementById('historyList'),
        connectionBox: document.getElementById('connectionBox')
    };

    // State
    let isLinkedIn = false;
    let pageContext = "";
    let speechRec = null;

    // --- 1. Theme & UI Logic ---
    function initTheme() {
        const dark = localStorage.getItem('theme') === 'dark';
        if (dark) document.documentElement.setAttribute('data-theme', 'dark');
        elements.themeToggle.innerText = dark ? '☀️' : '🌙';
    }

    elements.themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            elements.themeToggle.innerText = '🌙';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            elements.themeToggle.innerText = '☀️';
        }
    });

    // Tab Switching
    elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            elements.tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.getAttribute('data-tab');
            elements.views.create.classList.add('hidden');
            elements.views.history.classList.add('hidden');
            elements.views[target].classList.remove('hidden');

            if (target === 'history') loadHistory();
        });
    });

    // Emoji Slider Text
    elements.controls.emoji.addEventListener('input', (e) => {
        const vals = ['None', 'Minimal', 'Balanced', 'Heavy'];
        elements.controls.emojiVal.innerText = vals[e.target.value] || 'Balanced';
    });

    // --- 2. Voice Input ---
    if ('webkitSpeechRecognition' in window) {
        speechRec = new webkitSpeechRecognition();
        speechRec.continuous = false;
        speechRec.interimResults = false;

        speechRec.onstart = () => elements.controls.voice.classList.add('listening');
        speechRec.onend = () => elements.controls.voice.classList.remove('listening');
        speechRec.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            elements.controls.prompt.value += (elements.controls.prompt.value ? ' ' : '') + transcript;
        };

        elements.controls.voice.addEventListener('click', () => {
            speechRec.start();
        });
    } else {
        elements.controls.voice.style.display = 'none';
        console.warn("Speech API not supported");
    }

    // --- 3. Core Generation Logic ---
    async function generate(type = 'full', refineAction = null) {
        const { tone, format, emoji, prompt, trends } = elements.controls;

        let promptText = prompt.value;
        const topic = trends.value;

        // Custom Prompts based on Type
        let apiPrompt = promptText;
        if (type === 'hook') apiPrompt = `Generate 3 viral opening hooks for a LinkedIn post about: ${promptText || topic}`;
        if (type === 'hashtags') apiPrompt = `Generate a set of high-reach, niche-specific hashtags for: ${promptText || topic}`;

        // Refine Actions
        if (refineAction) {
            const currentContent = elements.result.text.innerText;
            if (!currentContent) return alert("Nothing to refine!");
            apiPrompt = `Original context: ${currentContent}. \nTask: Re-write this to be ${refineAction}. Keep the core message but align with the requested style via Refine Action.`;
        }

        // Context Construction
        const context = {
            topic,
            prompt: apiPrompt,
            context: pageContext,
            config: {
                tone: tone.value,
                format: format.value,
                emojiDensity: emoji.value // 0-3
            }
        };

        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/generate-post`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(context)
            });

            if (!res.ok) throw new Error("Generation Failed");
            const data = await res.json();

            showResult(data.post);
            saveToHistory(data.post, topic || promptText || "Generated Post");

            // Auto-Generate Image if Full Post
            if (type === 'full' && !refineAction) generateImage(data.post);

        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    }

    async function generateImage(text) {
        try {
            const res = await fetch(`${API_BASE}/generate-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ post: text })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.imageUrl) {
                    elements.result.image.src = data.imageUrl;
                    elements.result.image.style.display = 'block';
                }
            }
        } catch (e) {
            console.warn("Image gen failed", e);
        }
    }

    // --- 4. Helper Functions ---
    function showResult(text) {
        elements.result.text.innerText = text;
        elements.result.preview.style.display = 'block';
        elements.result.preview.scrollIntoView({ behavior: 'smooth' });

        // Readability Score (Basic Metric)
        const wordCount = text.split(' ').length;
        const sentenceCount = text.split('.').length;
        const score = 4.71 * (text.length / wordCount) + 0.5 * (wordCount / sentenceCount) - 21.43;
        // Ari readable index approximation
        const grade = Math.max(1, Math.min(14, Math.round(score)));

        const scoreEl = elements.result.score;
        scoreEl.innerText = `Grade ${grade} (${grade <= 8 ? 'Great' : 'Complex'})`;
        scoreEl.className = 'score-indicator ' + (grade <= 8 ? 'score-good' : 'score-bad');
    }

    function setLoading(isLoading) {
        const btn = elements.buttons.generate;
        if (isLoading) {
            btn.disabled = true;
            btn.innerHTML = '<div class="loader"></div> Thinking...';
        } else {
            btn.disabled = false;
            btn.innerHTML = '<span>✨ Generate Post</span>';
        }
    }

    // --- 5. History Logic ---
    function saveToHistory(text, title) {
        chrome.storage.local.get(['history'], (result) => {
            const history = result.history || [];
            history.unshift({
                id: Date.now(),
                title: title.substring(0, 30) + "...",
                text,
                date: new Date().toLocaleDateString()
            });
            if (history.length > 10) history.pop(); // Keep last 10
            chrome.storage.local.set({ history });
        });
    }

    function loadHistory() {
        chrome.storage.local.get(['history'], (result) => {
            const history = result.history || [];
            elements.historyList.innerHTML = '';

            if (history.length === 0) {
                elements.historyList.innerHTML = '<div class="card" style="text-align:center;">No history found</div>';
                return;
            }

            history.forEach(item => {
                const el = document.createElement('div');
                el.className = 'card';
                el.style.cursor = 'pointer';
                el.innerHTML = `
                    <div style="font-weight:700; font-size:0.9rem;">${item.title}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">${item.date}</div>
                    <div style="font-size:0.8rem; margin-top:8px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${item.text}</div>
                `;
                el.addEventListener('click', () => {
                    elements.result.text.innerText = item.text;
                    elements.result.preview.style.display = 'block';
                    elements.tabs[0].click(); // Switch to Create tab
                    elements.result.preview.scrollIntoView();
                });
                elements.historyList.appendChild(el);
            });
        });
    }

    elements.buttons.clearHistory.addEventListener('click', () => {
        chrome.storage.local.set({ history: [] }, loadHistory);
    });


    // --- 6. Event Listeners ---
    elements.buttons.generate.addEventListener('click', () => generate('full'));
    elements.buttons.hook.addEventListener('click', () => generate('hook'));
    elements.buttons.hashtags.addEventListener('click', () => generate('hashtags'));

    elements.buttons.refine.forEach(btn => {
        btn.addEventListener('click', () => generate('full', btn.getAttribute('data-action')));
    });

    // Copy Logic
    elements.buttons.copy.addEventListener('click', async () => {
        await navigator.clipboard.writeText(elements.result.text.innerText);
        elements.buttons.copy.innerText = '✅ Copied';
        setTimeout(() => elements.buttons.copy.innerText = '📋 Copy', 2000);
    });

    // Post to LinkedIn Logic (Existing)
    elements.buttons.post.addEventListener('click', () => {
        const text = elements.result.text.innerText;
        if (!text) return alert("No content to post!");

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]?.url?.includes("linkedin.com")) return alert("Open LinkedIn first!");

            elements.buttons.post.disabled = true;
            elements.buttons.post.innerHTML = 'Posting...';

            chrome.tabs.sendMessage(tabs[0].id, { action: "injectPost", text }, (res) => {
                elements.buttons.post.disabled = false;
                elements.buttons.post.innerText = '🚀 Post to LinkedIn';
                if (!res || !res.status) alert("Could not inject. Try manually starting a post first.");
            });
        });
    });

    // Connection Check (Existing)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url?.includes("linkedin.com")) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "getPageContext" }, (res) => {
                if (!chrome.runtime.lastError) {
                    isLinkedIn = true;
                    elements.connectionBox.innerText = "Connected";
                    elements.connectionBox.classList.add('connected');
                    if (res?.context) pageContext = res.context;
                }
            });
        }
    });

    // Fetch Trends (Existing)
    try {
        const res = await fetch(`${API_BASE}/trends`);
        if (res.ok) {
            const trends = await res.json();
            elements.controls.trends.innerHTML = '<option value="">Select a trending topic...</option>';
            trends.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.textContent = t;
                elements.controls.trends.appendChild(opt);
            });
        }
    } catch (e) { console.error("Trends error", e); }

    // Initialize
    initTheme();
});
