import React, { useState, useEffect, useRef } from 'react';

const SpeechAssistant = () => {
  const [isActivated, setIsActivated] = useState(false); // Tracks assistant activation
  const [recognizedText, setRecognizedText] = useState(''); // Holds recognized speech text
  const [responseText, setResponseText] = useState(''); // Holds backend response text
  const recognitionRef = useRef(null); // Reference for SpeechRecognition instance
  const triggerPhrase = 'hey kid'; // Trigger phrase to activate the assistant

  // Initialize and configure speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      const lastTranscript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
      console.log('Recognized:', lastTranscript);

      if (!isActivated && lastTranscript === triggerPhrase) {
        // Activate assistant on trigger phrase
        setIsActivated(true);
        speakResponse('Yes boss, how may I help you?');
      } else if (isActivated) {
        // Process recognized speech after activation
        setRecognizedText(lastTranscript);
        sendToBackend(lastTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech Recognition Error:', event.error);
    };

    recognitionRef.current = recognition;
    recognition.start(); // Start speech recognition

    return () => {
      recognition.stop(); // Stop recognition on component unmount
    };
  }, [isActivated]);

  // Send user input to the backend and handle the response
  const sendToBackend = async (text) => {
    try {
      const response = await fetch('http://localhost:9897/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userInput: text }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Response from backend:', data);
        setResponseText(data.response);
        speakResponse(data.response);
      } else {
        console.error('Error from backend:', response.statusText);
      }
    } catch (error) {
      console.error('Error connecting to backend:', error);
    }
  };

  // Use SpeechSynthesis to speak a response
  const speakResponse = (text) => {
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();

    // Select a specific voice (fallback to any English voice if not found)
    const selectedVoice = voices.find(
      (voice) => voice.name === 'Google UK English Male' || voice.lang === 'en-GB'
    );

    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    if (synth.speaking) {
      console.warn('SpeechSynthesis is already speaking');
      return;
    }

    synth.speak(utterance);
  };

  // Ensure voices are initialized after user interaction
  const handleUserActivation = () => {
    window.speechSynthesis.getVoices(); // Preload voices
  };

  useEffect(() => {
    // Attach click event to warm up voices
    window.addEventListener('click', handleUserActivation);

    return () => {
      window.removeEventListener('click', handleUserActivation);
    };
  }, []);

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <div className="sketchfab-embed-wrapper">
        <iframe
          title="Earth Core"
          frameBorder="0"
          allowFullScreen
          mozallowfullscreen="true"
          webkitallowfullscreen="true"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          src="https://sketchfab.com/models/7bb72849e81f4bfab1a77a059fb422b3/embed"
        ></iframe>
        <p style={{ fontSize: '13px', margin: '5px', color: '#4A4A4A' }}>
          <a
            href="https://sketchfab.com/3d-models/earth-core-7bb72849e81f4bfab1a77a059fb422b3?utm_medium=embed&utm_campaign=share-popup&utm_content=7bb72849e81f4bfab1a77a059fb422b3"
            target="_blank"
            rel="nofollow"
            style={{ fontWeight: 'bold', color: '#1CAAD9' }}
          >
            Earth Core
          </a>{' '}
          by{' '}
          <a
            href="https://sketchfab.com/saVRee?utm_medium=embed&utm_campaign=share-popup&utm_content=7bb72849e81f4bfab1a77a059fb422b3"
            target="_blank"
            rel="nofollow"
            style={{ fontWeight: 'bold', color: '#1CAAD9' }}
          >
            saVRee
          </a>{' '}
          on{' '}
          <a
            href="https://sketchfab.com/?utm_medium=embed&utm_campaign=share-popup&utm_content=7bb72849e81f4bfab1a77a059fb422b3"
            target="_blank"
            rel="nofollow"
            style={{ fontWeight: 'bold', color: '#1CAAD9' }}
          >
            Sketchfab
          </a>
        </p>
      </div>
      <h1>Virtual Assistant</h1>
      <p>Say "{triggerPhrase}" to activate the assistant.</p>
      <p>
        <strong>Recognized Text:</strong> {recognizedText}
      </p>
      <p>
        <strong>Response:</strong> {responseText}
      </p>
    </div>
  );
};

export default SpeechAssistant;
