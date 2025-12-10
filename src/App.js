import React, { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [recording, setRecording] = useState(false);
  const [text, setText] = useState("");
  const [translated, setTranslated] = useState("");
  const [targetLang, setTargetLang] = useState("hi");

  let recognition;

  // Speech Recognition
  const startRecording = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Your browser does not support voice recognition.");
      return;
    }

    recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setRecording(true);
      setText("Listening...");
    };

    recognition.onresult = async (event) => {
      const spokenText = event.results[0][0].transcript;
      setText(spokenText);
      translateText(spokenText);
    };

    recognition.onerror = () => {
      setRecording(false);
      alert("Voice recognition error");
    };

    recognition.onend = () => setRecording(false);

    recognition.start();
  };

  // Translation function
  const translateText = async (inputText) => {
    try {
      const response = await axios.post(
        "https://voice-translator-backend-n5yr.onrender.com/translate",
        {
          text: inputText,
          target: targetLang,
        }
      );
      setTranslated(response.data.translatedText);
    } catch (error) {
      console.error(error);
      setTranslated("Translation error!");
    }
  };

  return (
    <div className="App">
      <h1>Voice Translator</h1>

      <button className="recordBtn" onClick={startRecording}>
        {recording ? "Listening..." : "Start Recording"}
      </button>

      <div className="box">
        <h3>Recognized Speech:</h3>
        <p>{text}</p>
      </div>

      <div className="box">
        <h3>Translated Text:</h3>
        <p>{translated}</p>
      </div>

      <div>
        <label>Select Language: </label>
        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
        >
          <option value="hi">Hindi</option>
          <option value="te">Telugu</option>
          <option value="ta">Tamil</option>
          <option value="ml">Malayalam</option>
          <option value="kn">Kannada</option>
          <option value="fr">French</option>
          <option value="es">Spanish</option>
          <option value="de">German</option>
        </select>
      </div>
    </div>
  );
}

export default App;
