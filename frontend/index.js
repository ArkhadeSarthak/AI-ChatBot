fetch("http://127.0.0.1:8000")
    .then(res => res.json())
    .then(res => {
        document.getElementById("greet").innerHTML += ".!"
    })


function formatText(text) {
    return text
        // escape HTML (prevents broken UI / security issues)
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")

        // bold **text**
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")

        // bullet points (* or - at start of line)
        .replace(/^\s*[\*-]\s+/gm, "• ")

        // add line break before numbered points
        .replace(/(\d+\.\s)/g, "<br>$1")

        .replace(/\*(.*?)\*/g, "<i>$1</i>")

        // convert new lines
        .replace(/\n/g, "<br>");

}


function addMessage(text, type) {
    const chatbox = document.getElementById("chatbox");

    // wrapper
    const wrapper = document.createElement("div");
    wrapper.classList.add("message-wrapper", type);

    // avatar (ONLY for AI or user if you want)
    const avatar = document.createElement("div");
    avatar.classList.add("message-avatar");

    avatar.innerHTML = type === "ai"
        ? ` <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <circle cx="8" cy="16" r="1.5" fill="currentColor"/>
                <circle cx="16" cy="16" r="1.5" fill="currentColor"/>
                <path d="M9 6v5M15 6v5M12 2v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="12" cy="2" r="1" fill="currentColor"/>
           </svg>`
        : ` <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M6 20v-2a6 6 0 0112 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
           </svg>`;

    // bubble
    const bubble = document.createElement("div");
    bubble.classList.add("message-bubble");

    const p = document.createElement("p");
    p.innerHTML = formatText(text);

    // time
    const time = document.createElement("time");
    time.classList.add("message-time");

    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    time.innerText = formattedTime;
    time.setAttribute("datetime", formattedTime);

    // build structure
    bubble.appendChild(p);
    bubble.appendChild(time);

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);

    chatbox.appendChild(wrapper);

    // auto scroll
    chatbox.scrollTop = chatbox.scrollHeight;
}


async function sendMessage() {
    const messageInput = document.getElementById("msg");
    const message = messageInput.value.trim();

    if (!message) return; // prevent empty messages

    // 1. SHOW USER MESSAGE FIRST
    addMessage(message, "user");
    saveMessage(message, "user");

    // 2. CLEAR INPUT
    messageInput.value = "";

    // 3. CALL BACKEND
    try {
        const res = await fetch("http://127.0.0.1:8000/chat/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message
            })
        });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (data.error) {
            addMessage(`Error: ${data.error}`, "ai");
            saveMessage(`Error: ${data.error}`, "ai");
        } else {
            // 4. SHOW AI RESPONSE
            addMessage(data.ai_reply, "ai");
            saveMessage(data.ai_reply, "ai");
        }
    } catch (error) {
        console.error("Chat Error:", error);
        addMessage("Sorry, I could not reach the server. Please check your connection or try again later.", "ai");
    }
}

document.getElementById("msg").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});


const input = document.getElementById("msg");

document.addEventListener("keydown", function (e) {
    if (document.activeElement === input) return;

    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (e.key.length === 1) {
        input.focus();
        input.value += e.key;
        e.preventDefault();
    }
});


function saveMessage(message, sender) {
    let chats = JSON.parse(localStorage.getItem("chats")) || [];

    chats.push({
        text: message,
        sender: sender,
        time: new Date().toLocaleTimeString()
    });

    localStorage.setItem("chats", JSON.stringify(chats));
}


function loadChats() {
    let chats = JSON.parse(localStorage.getItem("chats")) || [];

    chats.forEach(chat => {
        addMessage(chat.text, chat.sender);
    });
}

window.onload = loadChats;



// Voice Assistant

let startButton = document.getElementById("startRecordingButton")
let stopButton = document.getElementById("stopRecordingButton")

let mediaRecorder;
let audiochunks = []
let stream;
let audioContext;
let analyser;
let silenceTimer;
let animationId;

const SILENCE_THRESHOLD = 15;
const SILENCE_DURATION = 3000;


async function startRecording() {
    stopButton.style.display = "block"
    startButton.style.display = "none"
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })

        mediaRecorder = new MediaRecorder(stream)
        audiochunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audiochunks.push(event.data)
            }
        };

        mediaRecorder.onstop = async () => {
            cancelAnimationFrame(animationId)

            const audioBlob = new Blob(audiochunks, {
                type: "audio/webm"
            });

            await sendAudioToBackend(audioBlob)

            stream.getTracks().forEach(track => track.stop());

            if (audioContext) {
                audioContext.close()
            }
        };

        mediaRecorder.start()

        monitorSilence();

        console.log("Recording Started");
    }
    catch (error) {
        console.log(error);
    }
}

function stopRecording() {
    stopButton.style.display = "none"
    startButton.style.display = "block"
    if (mediaRecorder && mediaRecorder.state === "recording") {
        clearTimeout(silenceTimer)

        mediaRecorder.stop()

        console.log("Recording Stoped");
    }
}

async function sendAudioToBackend(audioBlob) {
    const formData = new FormData()
    formData.append("audio", audioBlob, "recording.webm");

    try {
        const response = await fetch("http://localhost:8000/voice/", {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            let errorText = "Voice API request failed.";
            try {
                const errJson = await response.json();
                errorText = errJson.detail || errorText;
            } catch (e) {
                try {
                    const text = await response.text();
                    errorText = text || errorText;
                } catch (e2) {}
            }
            console.error("Voice API error:", response.status, errorText);
            
            let displayMsg = "Sorry, the voice assistant service encountered an error.";
            if (errorText.includes("503") || errorText.includes("demand") || errorText.includes("UNAVAILABLE")) {
                displayMsg = "The voice model is currently experiencing high demand. Please try again in a few seconds.";
            } else if (errorText.includes("429") || errorText.includes("quota")) {
                displayMsg = "Voice service quota exceeded. Please check your Gemini API billing/limits.";
            }
            addMessage(displayMsg, "ai");
            saveMessage(displayMsg, "ai");
            return;
        }

        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            const errorData = await response.json();
            console.error("Voice API returned JSON error:", errorData);
            addMessage("Voice assistant error: Received JSON error response.", "ai");
            return;
        }

        // Parse user text and AI response from custom response headers
        const rawUserText = response.headers.get("X-User-Text") || "";
        const rawAiReply = response.headers.get("X-AI-Reply") || "";

        const userText = rawUserText ? decodeURIComponent(rawUserText) : "";
        const aiReply = rawAiReply ? decodeURIComponent(rawAiReply) : "";

        if (userText && userText.trim()) {
            addMessage(userText.trim(), "user");
            saveMessage(userText.trim(), "user");
        }
        if (aiReply && aiReply.trim()) {
            addMessage(aiReply.trim(), "ai");
            saveMessage(aiReply.trim(), "ai");
        }

        const audio = await response.blob()
        const url = URL.createObjectURL(audio)
        const player = new Audio(url)
        player.play().catch(err => {
            console.warn("Autoplay blocked or audio playback failed:", err);
        });
    }
    catch (error) {
        console.error("Backend Error :", error);
        addMessage("Could not connect to the voice service. Please make sure the backend is running.", "ai");
    }
}


function monitorSilence() {
    audioContext = new AudioContext()

    const source = audioContext.createMediaStreamSource(stream)

    analyser = audioContext.createAnalyser();

    analyser.fftSize = 512;

    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    function checkVolume() {
        analyser.getByteFrequencyData(dataArray)

        let volume = dataArray.reduce((a, b) => a + b, 0)

        if (volume > SILENCE_THRESHOLD) {
            clearTimeout(silenceTimer)

            silenceTimer = setTimeout(() => {
                console.log("3 seconds silent detected");

                stopRecording();
            }, SILENCE_DURATION)
        }

        animationId = requestAnimationFrame(checkVolume)
    }

    silenceTimer = setTimeout(() => {
        console.log("No Speech Detected");

        stopRecording();
    }, SILENCE_DURATION)

    checkVolume();
}
