import React, { useState, useEffect, useRef } from 'react';

const SpeechAssistant = (props) => {
  const { currentState, onResponse } = props;
  const [isActivated, setIsActivated] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [responseText, setResponseText] = useState('');
  const recognitionRef = useRef(null);
  const triggerPhrase = 'hey kid'; // Trigger phrase

  useEffect(() => {
    // Initialize SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      const lastTranscript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
      console.log('Recognized:', lastTranscript);

      if (!isActivated && lastTranscript === triggerPhrase) {
        // Trigger phrase detected
        speakResponse('Yup?');
        setIsActivated(true);
      } else if (isActivated && lastTranscript !== triggerPhrase) {
        // Process recognized text only after activation
        setRecognizedText(lastTranscript);
        sendToBackend(lastTranscript, currentState);
        setIsActivated(false); // Reset activation after processing a command
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech Recognition Error:', event.error);
    };

    recognitionRef.current = recognition;

    // Start speech recognition
    recognition.start();

    return () => {
      recognition.stop();
    };
  }, [isActivated]);

  const sendToBackend = async (text, state) => {
    try {
      const response = await fetch('http://localhost:9897/api/chat-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userInput: text, currentState: state }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Response from backend:', data);
        setResponseText(data.response);
        speakResponse(data.response);
        handleApiResponse(data);
      } else {
        console.error('Error from backend:', response.statusText);
      }
    } catch (error) {
      console.error('Error connecting to backend:', error);
    }
  };

  const speakResponse = (text) => {
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();

    // Select a specific voice
    const selectedVoice = voices.find(
      (voice) => voice.name === 'Google UK English Male' || voice.lang === 'en-GB'
    );

    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Ensure speech synthesis works after user interaction
    if (synth.speaking) {
      console.warn('SpeechSynthesis is already speaking');
      return;
    }

    synth.speak(utterance);
  };

  const handleUserActivation = () => {
    // Unlock voices after user interaction
    window.speechSynthesis.getVoices(); // Warm-up voices
  };

  useEffect(() => {
    // Attach activation handler
    window.addEventListener('click', handleUserActivation);

    return () => {
      window.removeEventListener('click', handleUserActivation);
    };
  }, []);

  const handleApiResponse = (response) => {
    if (response.success) {
      onResponse(response.data);
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Virtual Assistant</h1>
      <p>Say "{triggerPhrase}" to activate the assistant.</p>
      <p><strong>Recognized Text:</strong> {recognizedText}</p>
      <p><strong>Response:</strong> {responseText}</p>
    </div>
  );
};

export default SpeechAssistant;
