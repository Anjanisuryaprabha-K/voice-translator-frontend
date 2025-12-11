import React, { useEffect, useRef, useState } from "react";
import "./App.css";

const LANGS = [
  // Indian Languages
  { code: "en", name: "English", tts: "en-US" },
  { code: "hi", name: "Hindi", tts: "hi-IN" },
  { code: "te", name: "Telugu", tts: "te-IN" },
  { code: "ta", name: "Tamil", tts: "ta-IN" },
  { code: "ml", name: "Malayalam", tts: "ml-IN" },
  { code: "kn", name: "Kannada", tts: "kn-IN" },
  { code: "bn", name: "Bengali", tts: "bn-IN" },
  { code: "gu", name: "Gujarati", tts: "gu-IN" },
  { code: "mr", name: "Marathi", tts: "mr-IN" },
  { code: "pa", name: "Punjabi", tts: "pa-IN" },
  { code: "ur", name: "Urdu", tts: "ur-IN" },

  // Major Asian Languages
  { code: "zh-CN", name: "Chinese (Simplified)", tts: "zh-CN" },
  { code: "zh-TW", name: "Chinese (Traditional)", tts: "zh-TW" },
  { code: "ja", name: "Japanese", tts: "ja-JP" },
  { code: "ko", name: "Korean", tts: "ko-KR" },
  { code: "th", name: "Thai", tts: "th-TH" },
  { code: "vi", name: "Vietnamese", tts: "vi-VN" },

  // Middle East
  { code: "ar", name: "Arabic", tts: "ar-SA" },
  { code: "fa", name: "Persian (Farsi)", tts: "fa-IR" },
  { code: "tr", name: "Turkish", tts: "tr-TR" },

  // Europe
  { code: "fr", name: "French", tts: "fr-FR" },
  { code: "es", name: "Spanish", tts: "es-ES" },
  { code: "de", name: "German", tts: "de-DE" },
  { code: "it", name: "Italian", tts: "it-IT" },
  { code: "pt", name: "Portuguese", tts: "pt-PT" },
  { code: "nl", name: "Dutch", tts: "nl-NL" },
  { code: "pl", name: "Polish", tts: "pl-PL" },
  { code: "sv", name: "Swedish", tts: "sv-SE" },
  { code: "no", name: "Norwegian", tts: "no-NO" },
  { code: "da", name: "Danish", tts: "da-DK" },
  { code: "fi", name: "Finnish", tts: "fi-FI" },
  { code: "ro", name: "Romanian", tts: "ro-RO" },
  { code: "cs", name: "Czech", tts: "cs-CZ" },

  // African
  { code: "sw", name: "Swahili", tts: "sw-KE" },
  { code: "am", name: "Amharic", tts: "am-ET" },

  // Others
  { code: "id", name: "Indonesian", tts: "id-ID" },
  { code: "ms", name: "Malay", tts: "ms-MY" },
  { code: "uk", name: "Ukrainian", tts: "uk-UA" },
  { code: "ru", name: "Russian", tts: "ru-RU" }
];


function App() {
  const [inputText, setInputText] = useState("");
  const [translated, setTranslated] = useState("");
  const [target, setTarget] = useState("hi");
  const [listening, setListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false); // live voice-to-voice mode
  const [inputLang, setInputLang] = useState("en");
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("vt_history") || "[]");
    } catch {
      return [];
    }
  });
  const recognitionRef = useRef(null);
  const continuousRef = useRef(false);
  const backendUrl = process.env.REACT_APP_API || "http://localhost:5000";

  useEffect(() => {
    // Initialize SpeechRecognition (not all browsers support it)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = LANGS.find(l => l.code === inputLang)?.tts || "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      const txt = e.results[0][0].transcript;
      setInputText(txt);
      // translate immediately if voiceMode or normal flow
      translateAndMaybeSpeak(txt);
    };

    rec.onend = () => {
      // If continuous live mode is on, restart recognition
      if (continuousRef.current) {
        try { rec.start(); } catch {}
      } else {
        setListening(false);
      }
    };

    rec.onerror = (e) => {
      console.error("Recognition error", e);
      setListening(false);
    };

    recognitionRef.current = rec;
    // cleanup
    return () => {
      try { rec.onresult = null; rec.onend = null; rec.onerror = null; } catch {}
    };
    // eslint-disable-next-line
  }, []);

  // Save history to localStorage when history changes
  useEffect(() => {
    localStorage.setItem("vt_history", JSON.stringify(history));
  }, [history]);

  const startListening = (continuous = false) => {
    const rec = recognitionRef.current;
    if (!rec) return alert("SpeechRecognition not supported in this browser");
    continuousRef.current = continuous;
    setListening(true);
    rec.start();
  };

  const stopListening = () => {
    continuousRef.current = false;
    const rec = recognitionRef.current;
    if (!rec) return;
    try { rec.stop(); } catch {}
    setListening(false);
  };

  const translateText = async (txt) => {
    if (!txt) return "";
    try {
      const res = await fetch(`${backendUrl}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: txt, target }),
      });
      const data = await res.json();
      return data.translatedText || "";
    } catch (err) {
      console.error("translate error", err);
      return "";
    }
  };

  const translateAndMaybeSpeak = async (txt, autoSpeak = true) => {
    const tr = await translateText(txt);
    setTranslated(tr);
    // push to history
    const entry = { id: Date.now(), src: txt, target, translated: tr, at: new Date().toISOString() };
    setHistory((h) => [entry, ...h].slice(0, 200));
    if (autoSpeak) speakText(tr);
    return tr;
  };

  const speakText = (txt) => {
    if (!txt) return;
    const utter = new SpeechSynthesisUtterance(txt);
    const langObj = LANGS.find((l) => l.code === target);
    utter.lang = langObj?.tts || target;
    // choose a voice close to language if available
    const voices = window.speechSynthesis.getVoices();
    const matching = voices.find((v) => v.lang && v.lang.startsWith((utter.lang || "").split("-")[0]));
    if (matching) utter.voice = matching;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const handleTranslateClick = async () => {
    await translateAndMaybeSpeak(inputText, true);
  };

  const toggleVoiceMode = () => {
    if (voiceMode) {
      // turn off
      continuousRef.current = false;
      stopListening();
      setVoiceMode(false);
    } else {
      setVoiceMode(true);
      startListening(true);
    }
  };

  const copyToClipboard = (txt) => {
    navigator.clipboard.writeText(txt);
    alert("Copied!");
  };

  const downloadHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "translation_history.json";
    link.click();
  };

  const clearHistory = () => {
    if (!window.confirm("Clear history?")) return;
    setHistory([]);
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1>Voice Translator</h1>
        <div className="controls">
          <button className="btn" onClick={() => startListening(false)} disabled={listening}>🎤 Speak once</button>
          <button className="btn secondary" onClick={() => stopListening()} disabled={!listening}>⛔ Stop</button>
          <button className={`btn ${voiceMode ? "active" : ""}`} onClick={toggleVoiceMode}>
            🔁 {voiceMode ? "Live: ON" : "Live: OFF"}
          </button>
        </div>
      </header>

      <main className="main">
        <section className="panel">
          <div className="row">
            <textarea
              className="input"
              placeholder="Type or speak...."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <div className="side">
              <label>Input Language:</label>
<select
  value={inputLang}
  onChange={(e) => setInputLang(e.target.value)}
>
  {LANGS.map((l) => (
    <option key={l.code} value={l.code}>
      {l.name}
    </option>
  ))}
</select>

<label>Translate To:</label>
<select
  value={target}
  onChange={(e) => setTarget(e.target.value)}
>
  {LANGS.map((l) => (
    <option key={l.code} value={l.code}>
      {l.name}
    </option>
  ))}
</select>



              <button className="btn primary" onClick={handleTranslateClick}>Translate & Speak</button>

              <div className="translatedBox">
                <label>Translated</label>
                <div className="translatedText">{translated}</div>
                <div className="small-actions">
                  <button onClick={() => speakText(translated)}>🔊 Listen</button>
                  <button onClick={() => copyToClipboard(translated)}>📋 Copy</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel history">
          <div className="historyHeader">
            <h3>History</h3>
            <div>
              <button onClick={downloadHistory}>💾 Export</button>
              <button onClick={clearHistory}>🗑 Clear</button>
            </div>
          </div>

          <ul>
            {history.length === 0 && <li className="empty">No history yet</li>}
            {history.map((h) => (
              <li key={h.id} className="histItem">
                <div className="histTexts">
                  <div className="src">{h.src}</div>
                  <div className="tgt">{h.translated}</div>
                </div>
                <div className="histActions">
                  <button onClick={() => speakText(h.translated)}>🔊</button>
                  <button onClick={() => copyToClipboard(h.translated)}>📋</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="footer">Made for Hackathon • Runs in browser • Backend: {backendUrl}</footer>
    </div>
  );
}

export default App;
