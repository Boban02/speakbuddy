// English Learner Application
(function () {
    let lessonsData = [];
    let currentLesson = 0;
    let quizQuestions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let chatHistory = [];
    let recognition = null;
    let isRecording = false;

    const SYSTEM_PROMPT = `You are a friendly English language tutor named Buddy. Your job is to help the user practice conversational English. 
- Keep responses short (2-3 sentences max).
- If the user makes a grammar or vocabulary mistake, gently correct them.
- Suggest better ways to phrase things.
- Ask follow-up questions to keep the conversation going.
- Adjust your level based on the user's proficiency.
- Be encouraging and positive.
- If the user writes in another language, respond in English and help them translate.`;

    document.addEventListener('DOMContentLoaded', () => {
        setupNavigation();
        loadLessonsData();
        loadProgress();
        setupChat();
        setupSettings();
    });

    // Navigation
    function setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.dataset.section;
                showSection(section);
            });
        });
    }

    function showSection(sectionId) {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
        document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');

        if (sectionId === 'progress') {
            renderProgress();
        }
    }

    // Chat with AI Tutor
    function setupChat() {
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-button');
        const micBtn = document.getElementById('mic-button');

        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        // Speech recognition setup
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            let silenceTimer = null;
            let fullTranscript = '';

            recognition.onstart = () => {
                startRecording();
                fullTranscript = '';
                input.placeholder = '🔴 Listening... click 🎤 when done';
            };

            recognition.onresult = (event) => {
                let interim = '';
                fullTranscript = '';
                for (let i = 0; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        fullTranscript += event.results[i][0].transcript + ' ';
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }
                input.value = fullTranscript + interim;

                // Reset silence timer - auto-send after 3 seconds of silence
                if (silenceTimer) clearTimeout(silenceTimer);
                silenceTimer = setTimeout(() => {
                    if (isRecording && fullTranscript.trim()) {
                        recognition.stop();
                    }
                }, 3000);
            };

            recognition.onerror = (event) => {
                if (silenceTimer) clearTimeout(silenceTimer);
                stopRecording();
                if (event.error === 'not-allowed') {
                    addMessage('assistant', '⚠️ Microphone access was denied. Please allow microphone permission in your browser and try again.');
                } else if (event.error === 'no-speech') {
                    addMessage('assistant', "I didn't hear anything. Try clicking 🎤 and speaking clearly.");
                } else if (event.error !== 'aborted') {
                    addMessage('assistant', '⚠️ Speech recognition error: ' + event.error + '. Try typing your message instead.');
                }
                input.placeholder = 'Type or speak your message...';
            };

            recognition.onend = () => {
                if (silenceTimer) clearTimeout(silenceTimer);
                stopRecording();
                input.placeholder = 'Type or speak your message...';
                // Auto-send if there's text
                if (input.value.trim()) {
                    sendMessage();
                }
            };

            micBtn.addEventListener('click', toggleRecording);
        } else {
            micBtn.title = 'Speech recognition not supported in this browser. Use Chrome or Edge.';
            micBtn.addEventListener('click', () => {
                addMessage('assistant', '⚠️ Speech recognition is only supported in Chrome and Edge browsers. Please type your message instead.');
            });
        }

        // Initial greeting
        addMessage('assistant', "Hi! I'm Buddy, your English tutor. Let's practice speaking English together! You can type or click the 🎤 button to speak. What would you like to talk about?");
    }

    async function toggleRecording() {
        if (isRecording) {
            recognition.stop();
        } else {
            // Request mic permission explicitly first
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                recognition.start();
            } catch (err) {
                addMessage('assistant', '⚠️ Microphone access denied. Please click the lock icon in your browser address bar and allow microphone access.');
            }
        }
    }

    function startRecording() {
        isRecording = true;
        document.getElementById('mic-button').classList.add('recording');
    }

    function stopRecording() {
        isRecording = false;
        document.getElementById('mic-button').classList.remove('recording');
    }

    function sendMessage() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;

        addMessage('user', text);
        input.value = '';

        chatHistory.push({ role: 'user', parts: [{ text: text }] });
        getAIResponse();
    }

    function addMessage(role, text) {
        const container = document.getElementById('chat-messages');
        const msg = document.createElement('div');
        msg.className = `message ${role}`;
        msg.textContent = text;
        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
    }

    function showTypingIndicator() {
        const container = document.getElementById('chat-messages');
        const indicator = document.createElement('div');
        indicator.className = 'message typing';
        indicator.id = 'typing-indicator';
        indicator.textContent = 'Buddy is typing...';
        container.appendChild(indicator);
        container.scrollTop = container.scrollHeight;
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }

    async function getAIResponse(retryCount) {
        retryCount = retryCount || 0;
        showTypingIndicator();

        const provider = (typeof CONFIG !== 'undefined' && CONFIG.PROVIDER) || 'gemini';

        try {
            let reply;
            if (provider === 'groq') {
                reply = await callGroq(retryCount);
            } else {
                reply = await callGemini(retryCount);
            }

            if (reply) {
                removeTypingIndicator();
                chatHistory.push({ role: 'model', parts: [{ text: reply }] });
                addMessage('assistant', reply);
                speakText(reply);
            }
        } catch (error) {
            removeTypingIndicator();
            addMessage('assistant', '⚠️ Connection error: ' + error.message);
        }
    }

    function getGroqKey() {
        // User's own key takes priority, then fall back to default
        return localStorage.getItem('userGroqKey') || CONFIG.GROQ_API_KEY;
    }

    async function callGroq(retryCount) {
        const apiKey = getGroqKey();
        if (!apiKey || apiKey === 'YOUR_GROQ_API_KEY_HERE') {
            removeTypingIndicator();
            addMessage('assistant', '⚠️ No API key available. Go to ⚙️ Settings and add your free Groq key.');
            return null;
        }

        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...chatHistory.map(m => ({
                role: m.role === 'model' ? 'assistant' : 'user',
                content: m.parts[0].text
            }))
        ];

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: messages,
                temperature: 0.7,
                max_tokens: 200
            })
        });

        if (response.status === 429) {
            if (retryCount < 3) {
                removeTypingIndicator();
                const waitSeconds = (retryCount + 1) * 3;
                addMessage('assistant', `⏳ Rate limited. Retrying in ${waitSeconds}s...`);
                await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
                document.getElementById('chat-messages').lastChild.remove();
                return callGroq(retryCount + 1);
            }
            removeTypingIndicator();
            addMessage('assistant', '⚠️ Rate limit reached. Wait a moment or go to ⚙️ Settings to add your own free Groq key for higher limits.');
            return null;
        }

        const data = await response.json();
        if (!response.ok) {
            removeTypingIndicator();
            addMessage('assistant', '⚠️ API error: ' + (data.error?.message || response.statusText));
            return null;
        }

        return data.choices[0].message.content;
    }

    async function callGemini(retryCount) {
        const apiKey = CONFIG.GOOGLE_API_KEY;
        if (!apiKey) {
            removeTypingIndicator();
            addMessage('assistant', '⚠️ Google API key not configured in config.js');
            return null;
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const body = {
            contents: [
                { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: "Hi! I'm Buddy, your English tutor. I'm ready to help you practice!" }] },
                ...chatHistory
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 200
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (response.status === 429) {
            if (retryCount < 3) {
                removeTypingIndicator();
                const waitSeconds = (retryCount + 1) * 5;
                addMessage('assistant', `⏳ Rate limited. Retrying in ${waitSeconds}s...`);
                await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
                document.getElementById('chat-messages').lastChild.remove();
                return callGemini(retryCount + 1);
            }
            removeTypingIndicator();
            addMessage('assistant', '⚠️ Rate limit reached. Please wait a moment and try again.');
            return null;
        }

        const data = await response.json();
        if (!response.ok) {
            removeTypingIndicator();
            addMessage('assistant', '⚠️ API error: ' + (data.error?.message || response.statusText));
            return null;
        }

        if (data.candidates && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        }
        removeTypingIndicator();
        addMessage('assistant', 'Sorry, I had trouble responding. Please try again.');
        return null;
    }

    // Text-to-speech for AI responses
    function speakText(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            // Auto-start listening after Buddy finishes speaking
            utterance.onend = () => {
                if (recognition && !isRecording) {
                    setTimeout(() => {
                        toggleRecording();
                    }, 500);
                }
            };
            speechSynthesis.speak(utterance);
        } else {
            // No TTS available, still auto-listen after a short delay
            if (recognition && !isRecording) {
                setTimeout(() => {
                    toggleRecording();
                }, 1000);
            }
        }
    }

    // Settings
    function setupSettings() {
        const saveBtn = document.getElementById('save-api-key');
        const clearBtn = document.getElementById('clear-api-key');
        const input = document.getElementById('user-api-key');
        const status = document.getElementById('key-status');

        // Show current status
        if (localStorage.getItem('userGroqKey')) {
            status.textContent = '✓ Using your personal API key';
            input.placeholder = '••••••••••••••••';
        }

        saveBtn.addEventListener('click', () => {
            const key = input.value.trim();
            if (key && key.startsWith('gsk_')) {
                localStorage.setItem('userGroqKey', key);
                status.textContent = '✓ Key saved! Using your personal key now.';
                status.style.color = '#4CAF50';
                input.value = '';
                input.placeholder = '••••••••••••••••';
            } else {
                status.textContent = '✗ Invalid key. Should start with gsk_';
                status.style.color = '#f44336';
            }
        });

        clearBtn.addEventListener('click', () => {
            localStorage.removeItem('userGroqKey');
            status.textContent = 'Switched back to default key.';
            status.style.color = '#555';
            input.placeholder = 'gsk_...';
        });
    }

    // Data loading
    function loadLessonsData() {
        fetch('data/lessons.json')
            .then(response => response.json())
            .then(data => {
                lessonsData = data.lessons;
                renderLessonTabs();
                renderVocabulary(0);
            })
            .catch(error => {
                console.error('Error loading lessons:', error);
            });
    }

    // Vocabulary
    function renderLessonTabs() {
        const container = document.getElementById('lesson-select');
        container.innerHTML = '';
        lessonsData.forEach((lesson, index) => {
            const tab = document.createElement('button');
            tab.className = 'lesson-tab' + (index === 0 ? ' active' : '');
            tab.textContent = lesson.title;
            tab.addEventListener('click', () => {
                document.querySelectorAll('.lesson-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentLesson = index;
                renderVocabulary(index);
            });
            container.appendChild(tab);
        });
    }

    function renderVocabulary(lessonIndex) {
        const container = document.getElementById('vocabulary-list');
        const vocab = lessonsData[lessonIndex].vocabulary;
        container.innerHTML = '';
        vocab.forEach(item => {
            const card = document.createElement('div');
            card.className = 'vocab-card';
            card.innerHTML = `
                <div class="word">${item.word}</div>
                <div class="definition">${item.definition}</div>
            `;
            container.appendChild(card);
        });
    }

    // Quiz
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'start-quiz') {
            startQuiz();
        }
        if (e.target && e.target.id === 'restart-quiz') {
            resetQuiz();
        }
    });

    function startQuiz() {
        quizQuestions = [];
        lessonsData.forEach(lesson => {
            quizQuestions = quizQuestions.concat(lesson.quiz);
        });
        currentQuestionIndex = 0;
        score = 0;

        document.getElementById('quiz-intro').style.display = 'none';
        document.getElementById('quiz-results').style.display = 'none';
        document.getElementById('quiz-active').style.display = 'block';
        renderQuestion();
    }

    function renderQuestion() {
        if (currentQuestionIndex >= quizQuestions.length) {
            showResults();
            return;
        }

        const q = quizQuestions[currentQuestionIndex];
        document.getElementById('quiz-step').textContent =
            `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;
        document.getElementById('question').textContent = q.question;

        const optionsContainer = document.getElementById('options');
        optionsContainer.innerHTML = '';
        q.options.forEach(option => {
            const btn = document.createElement('button');
            btn.textContent = option;
            btn.addEventListener('click', () => selectAnswer(btn, option, q.answer));
            optionsContainer.appendChild(btn);
        });
    }

    function selectAnswer(btn, selected, correct) {
        const buttons = document.querySelectorAll('#options button');
        buttons.forEach(b => {
            b.disabled = true;
            if (b.textContent === correct) {
                b.classList.add('correct');
            }
        });

        if (selected === correct) {
            score++;
            btn.classList.add('correct');
        } else {
            btn.classList.add('wrong');
        }

        setTimeout(() => {
            currentQuestionIndex++;
            renderQuestion();
        }, 1000);
    }

    function showResults() {
        document.getElementById('quiz-active').style.display = 'none';
        const resultsDiv = document.getElementById('quiz-results');
        resultsDiv.style.display = 'block';

        const percentage = Math.round((score / quizQuestions.length) * 100);
        resultsDiv.innerHTML = `
            <h3>Quiz Complete!</h3>
            <div class="score-display">${percentage}%</div>
            <p>You got ${score} out of ${quizQuestions.length} correct</p>
            <button id="restart-quiz" class="button">Try Again</button>
        `;

        saveQuizResult(score, quizQuestions.length);
    }

    function resetQuiz() {
        document.getElementById('quiz-results').style.display = 'none';
        document.getElementById('quiz-intro').style.display = 'block';
    }

    // Progress
    function saveQuizResult(score, total) {
        const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
        history.push({
            date: new Date().toISOString(),
            score: score,
            total: total
        });
        localStorage.setItem('quizHistory', JSON.stringify(history));
    }

    function loadProgress() {
        renderProgress();
    }

    function renderProgress() {
        const container = document.getElementById('progress-tracker');
        const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');

        if (history.length === 0) {
            container.innerHTML = `
                <p style="text-align:center; color:#777;">No quiz attempts yet. Take a quiz to track your progress!</p>
            `;
            return;
        }

        const totalAttempts = history.length;
        const avgScore = Math.round(
            history.reduce((sum, h) => sum + (h.score / h.total) * 100, 0) / totalAttempts
        );
        const bestScore = Math.round(
            Math.max(...history.map(h => (h.score / h.total) * 100))
        );

        container.innerHTML = `
            <div class="progress-item">
                <span class="progress-label">Total Quizzes Taken</span>
                <span class="progress-value">${totalAttempts}</span>
            </div>
            <div class="progress-item">
                <span class="progress-label">Average Score</span>
                <span class="progress-value">${avgScore}%</span>
            </div>
            <div class="progress-item">
                <div style="width:100%">
                    <div style="display:flex; justify-content:space-between;">
                        <span class="progress-label">Best Score</span>
                        <span class="progress-value">${bestScore}%</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width:${bestScore}%"></div>
                    </div>
                </div>
            </div>
            <div class="progress-item">
                <span class="progress-label">Last Attempt</span>
                <span class="progress-value">${new Date(history[history.length - 1].date).toLocaleDateString()}</span>
            </div>
        `;
    }
})();