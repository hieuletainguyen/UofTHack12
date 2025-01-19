import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import './HolloMath.css';
import calculateVolume from './utils/calculateVolume';
import calculateSurfaceArea from './utils/calculateSA';
import create2DNet from './utils/create2DNet';
import createShape from './utils/createShape';
import Astronomy from '../Astronomy/index.js';
import Bio from '../Bio/index.js';

// Constants for shapes and educational levels
const SHAPES = [
  'CUBOID',
  'SPHERE',
  'CYLINDER',
  'CONE',
  'PYRAMID'
];

const PREMIUM_SHAPES = [
  'ASTRONOMY', 
  'BIOLOGY',
  // 'MECHANICS',
];

const DIFFICULTY_LEVELS = {
  FREE: 'Free',
  PREMIUM: 'Premium'
};

const PINCH_THRESHOLD = 0.1; // Increased threshold for easier detection

// Add this constant for unfolding animations
const UNFOLDING_DURATION = 1000; // 1 second for unfolding animation

const HoloMath = () => {
  // Refs
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const currentObjectRef = useRef(null);
  const previousHandPositionRef = useRef({ x: null, y: null });
  const lastPinchStateRef = useRef(false);
  const pinchStartXRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const draggedFaceRef = useRef(null);
  const canvasRef = useRef(null);
  // State
  const [currentShape, setCurrentShape] = useState(SHAPES[0]);
  const [currentPremiumShape, setCurrentPremiumShape] = useState(PREMIUM_SHAPES[0]);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isButtonHighlighted, setIsButtonHighlighted] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(DIFFICULTY_LEVELS.FREE);
  const [isPinching, setIsPinching] = useState(false);
  const [isUnfolded, setIsUnfolded] = useState(false);
  const [isUnfoldButtonHighlighted, setIsUnfoldButtonHighlighted] = useState(false);
  const [shapeDimensions, setShapeDimensions] = useState({
    length: 1,
    width: 1,
    height: 1,
    radius: 1,
    baseLength: 1,
    baseWidth: 1
  });
  const [scale, setScale] = useState(1);
  const [volume, setVolume] = useState(0);
  const [surfaceArea, setSurfaceArea] = useState(0);
  const [isHandDragging, setIsHandDragging] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentState, setCurrentState] = useState({
    dimensions: shapeDimensions,
    scale: scale,
    unfolded: isUnfolded,
    shape: currentShape
  });

  // for the speech assistant
  const [isListening, setIsListening] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [responseText, setResponseText] = useState('');
  const recognitionRef = useRef(null);
  const triggerPhrase = 'hey kid'; // Trigger phrase
  // ==============================

  // ============================== for testing the speech assistant ==
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
        speakResponse('Yes Boss');
        setIsActivated(true);
      } else if (isActivated  && lastTranscript !== triggerPhrase) {
        // Process recognized text only after activation
        setRecognizedText(lastTranscript);
        console.log("sending to backend the last transcript", lastTranscript);
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
        speakResponse(data.speak);
        handleSpeechResponse(data.response);
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
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voices[0]; // Use the first available voice
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

  // Add this useEffect to monitor isListening changes
  useEffect(() => {
    console.log("isListening changed to:", isListening);
    
    // Start or stop speech recognition based on isListening state
    if (isListening) {
      recognitionRef.current?.start();
    } else {
      recognitionRef.current?.stop();
    }
  }, [isListening]);

  // Update the handleStartSpeech function
  const handleStartSpeech = () => {
    setIsListening(prevState => {
      const newState = !prevState;
      console.log("Toggling isListening to:", newState);
      return newState;
    });
  };

  // ============================== for testing the speech assistant ==
  // Add this function to draw the hand skeleton
  
  function drawHand (landmarks, isLeft) {
    const ctx = canvasRef.current.getContext('2d');
    const { width, height } = canvasRef.current;

    // Draw points
    landmarks.forEach((point) => {
      ctx.beginPath();
      ctx.arc(
        point.x * width,
        point.y * height,
        4,
        0,
        3 * Math.PI
      );
      ctx.fillStyle = isLeft ? '#00FF00' : '#FF0000';  // Green for left, red for right
      ctx.fill();
    });

    // Draw connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],           // thumb
      [0, 5], [5, 6], [6, 7], [7, 8],           // index finger
      [0, 9], [9, 10], [10, 11], [11, 12],      // middle finger
      [0, 13], [13, 14], [14, 15], [15, 16],    // ring finger
      [0, 17], [17, 18], [18, 19], [19, 20],    // pinky
      [0, 5], [5, 9], [9, 13], [13, 17]         // palm
    ];

    connections.forEach(([i, j]) => {
      ctx.beginPath();
      ctx.moveTo(landmarks[i].x * width, landmarks[i].y * height);
      ctx.lineTo(landmarks[j].x * width, landmarks[j].y * height);
      ctx.strokeStyle = isLeft ? '#00FF00' : '#FF0000';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  // Handle hand gestures
  const handleHandGestures = (results) => {
    // Clear the canvas first
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) {
      previousHandPositionRef.current = { x: null, y: null };
      setIsPinching(false);
      lastPinchStateRef.current = false;
      setIsHandDragging(false);
      draggedFaceRef.current = null;
      return;
    }

    const sortedHands = results.multiHandLandmarks.map((landmarks, index) => ({
      landmarks,
      isLeft: results.multiHandedness[index].label === 'Left'
    })).sort((a, b) => a.isLeft ? -1 : 1);

    // Draw hands
    sortedHands.forEach(({ landmarks, isLeft }) => {
      if (canvasRef.current) {
        drawHand(landmarks, isLeft);
      }
      const indexFinger = landmarks[8];
      const x = (1 - indexFinger.x) * window.innerWidth;
      const y = indexFinger.y * window.innerHeight;

      if (isLeft) {
        setCursorPosition({ x, y });

        // Convert cursor position to normalized device coordinates for raycasting
        const rect = rendererRef.current.domElement.getBoundingClientRect();
        mouseRef.current.x = ((x - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((y - rect.top) / rect.height) * 2 + 1;

        // Regular pinch gesture handling for buttons and dragging
        const thumbTip = landmarks[4];
        const pinchDistance = Math.sqrt(
          Math.pow(thumbTip.x - indexFinger.x, 2) +
          Math.pow(thumbTip.y - indexFinger.y, 2)
        );
        const isPinchGesture = pinchDistance < PINCH_THRESHOLD;
        setIsPinching(isPinchGesture);

        // Handle dragging when unfolded
        if (isUnfolded) {
          raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
          const intersects = raycasterRef.current.intersectObjects(currentObjectRef.current.children);

          if (isPinchGesture) {
            if (!isHandDragging && intersects.length > 0) {
              setIsHandDragging(true);
              draggedFaceRef.current = intersects[0].object;
            }
          } else {
            setIsHandDragging(false);
            draggedFaceRef.current = null;
          }

          // Move the dragged face
          if (isHandDragging && draggedFaceRef.current) {
            const planeNormal = new THREE.Vector3(0, 0, 1);
            const plane = new THREE.Plane(planeNormal);
            const intersection = new THREE.Vector3();
            raycasterRef.current.ray.intersectPlane(plane, intersection);
            
            draggedFaceRef.current.position.x = intersection.x;
            draggedFaceRef.current.position.y = intersection.y;
          }
        }

        // Handle button interactions
        const handleInteraction = (element, onPinch) => {
          if (!element) return;
          const rect = element.getBoundingClientRect();
          const isOverElement = x >= rect.left && x <= rect.right && 
                                y >= rect.top && y <= rect.bottom;

          if (isOverElement) {
            element.classList.add('highlighted');
            console.log("Button is hovered");
            if (isPinchGesture && !lastPinchStateRef.current) {
              onPinch();
            }
          } else {
            element.classList.remove('highlighted');
          }
        };

        // Handle shape buttons
        const shapeButtons = document.querySelectorAll('.shape-button');
        shapeButtons.forEach(button => {
          handleInteraction(button, () => {
            const shape = button.getAttribute('data-shape');
            setCurrentShape(shape);
            setShapeDimensions({
              length: 1,
              width: 1,
              height: 1,
              radius: 1,
              baseLength: 1,
              baseWidth: 1
            });
            setIsUnfolded(false);
            setCurrentState({
              dimensions: {
                length: 1,
                width: 1,
                height: 1,
                radius: 1,
                baseLength: 1,
                baseWidth: 1
              },
              scale: scale,
              unfolded: false,
              shape: shape
            });
          });
        });

        // Handle dimension buttons
        const dimensionButtons = document.querySelectorAll('.dimension-button');
        dimensionButtons.forEach(button => {
          handleInteraction(button, () => {
            const dimension = button.getAttribute('data-dimension');
            const value = parseFloat(button.getAttribute('data-value'));
            setShapeDimensions(prev => ({
              ...prev,
              [dimension]: value
            }));
          });
        });

        // Handle unfold button
        const unfoldButton = document.getElementById('unfold-button');
        handleInteraction(unfoldButton, () => {
          setIsUnfolded(prev => !prev);
          setCurrentState({
            ...currentState,
            unfolded: !isUnfolded,
          });
        });

        // Handle zoom buttons
        const zoomInButton = document.getElementById('zoom-in-button');
        handleInteraction(zoomInButton, () => {
          handleZoom('in');
        });

        const zoomOutButton = document.getElementById('zoom-out-button');
        handleInteraction(zoomOutButton, () => {
          handleZoom('out');
        });

        const startSpeechButton = document.getElementById('start-speech');
        handleInteraction(startSpeechButton, () => {
          handleStartSpeech();
        });

        lastPinchStateRef.current = isPinchGesture;
      } else {
        // left hand only handles rotation
        if (currentObjectRef.current) {
          const prev = previousHandPositionRef.current;
          if (prev.x !== null) {
            const deltaX = (x - prev.x) * 0.01;
            const deltaY = (y - prev.y) * 0.01;
            currentObjectRef.current.rotation.y += deltaX;
            currentObjectRef.current.rotation.x += deltaY;
          }
          previousHandPositionRef.current = { x, y };
        }
      }
    });
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x1a1a1a);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;
    camera.position.z = 5;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Create initial shape
    if (currentLevel === 'Free') {
      const shape = createShape(currentShape, shapeDimensions, scale, currentShape);
      scene.add(shape);
      currentObjectRef.current = shape;
    }

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Window resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Add mouse event listeners
    const container = containerRef.current;

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Hand tracking setup
  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults(handleHandGestures);

    if (videoRef.current) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await hands.send({ image: videoRef.current });
        },
        width: 640,
        height: 480
      });
      camera.start().catch(error => {
        console.error('Error starting camera:', error);
      });
    }
  }, []);

  // Update shape when changed
  useEffect(() => {
    if (sceneRef.current && currentObjectRef.current && currentLevel === 'Free') {
      sceneRef.current.remove(currentObjectRef.current);
      const newShape = isUnfolded 
        ? create2DNet(currentShape, shapeDimensions, scale)
        : createShape(currentShape, shapeDimensions, scale);
      if (newShape) {
        sceneRef.current.add(newShape);
        currentObjectRef.current = newShape;
      }
    }
  }, [currentShape, shapeDimensions, scale, isUnfolded]);

  // Add effect to update volume when dimensions or shape changes
  useEffect(() => {
    const newVolume = calculateVolume(currentShape, shapeDimensions);
    const newSurfaceArea = calculateSurfaceArea(currentShape, shapeDimensions);
    setVolume(newVolume * Math.pow(scale, 3));
    setSurfaceArea(newSurfaceArea * Math.pow(scale, 2));
  }, [currentShape, shapeDimensions, scale]);

  // Add this function to handle button clicks
  const handleDimensionButtonClick = (dimension, value) => {
    setShapeDimensions(prev => ({
      ...prev,
      [dimension]: value
    }));
  };

  // Add zoom functions
  const handleZoom = (direction) => {
    if (direction === 'in') {
      // Check if we can still zoom in
      if (zoomLevel <= 2.0) {  // Use 2.0 instead of 2.1 for cleaner steps
        const newZoom = zoomLevel + 0.5;
        const roundedZoom = Math.round(newZoom * 10) / 10;
        setZoomLevel(roundedZoom);
        setScale(roundedZoom);
        setCurrentState({
          ...currentState,
          scale: roundedZoom
        });
      }
    } else {
      // Check if we can still zoom out
      if (zoomLevel >= 0.5) {
        const newZoom = zoomLevel - 0.5;
        const roundedZoom = Math.round(newZoom * 10) / 10;
        setZoomLevel(roundedZoom);
        setScale(roundedZoom);
        setCurrentState({
          ...currentState,
          scale: roundedZoom
        });
      }
    }
  };

  // Add this function to handle the speech response
  const handleSpeechResponse = (response) => {
    console.log('Speech response:', response);
    
    // Update shape dimensions based on response
    if (response?.dimensions) {
      const { length, width, height, radius, baseLength, baseWidth } = response.dimensions;
      setShapeDimensions(prev => ({
        ...prev,
        ...(length && { length }),
        ...(width && { width }),
        ...(height && { height }),
        ...(radius && { radius }),
        ...(baseLength && { baseLength }),
        ...(baseWidth && { baseWidth })
      }));
    }

    // Update scale if provided
    if (response.scale) {
      const newScale = parseFloat(response.scale);
      if (!isNaN(newScale) && newScale >= 0.5 && newScale <= 2.0) {
        setScale(newScale);
        setZoomLevel(newScale);
      }
    }

    // Update unfold state if provided
    if (response.unfold !== undefined) {
      setIsUnfolded(response.unfold);
    }

    // Update shape type if provided
    if (response.shape && SHAPES.includes(response.shape.toUpperCase())) {
      setCurrentShape(response.shape.toUpperCase());
    }

    setCurrentState(response);
  };

  return (
    <div className="holomath-container">
      {/* Hand cursor */}
      <div 
        className={`hand-cursor ${isButtonHighlighted ? 'over-button' : ''} ${isPinching ? 'pinching' : ''}`}
        style={{
          left: `${cursorPosition.x}px`,
          top: `${cursorPosition.y}px`,
          display: cursorPosition.x === 0 && cursorPosition.y === 0 ? 'none' : 'block'
        }}
      />

      {/* Shape change button */}
      <div className="shape-buttons">
        {currentLevel === 'Free' && SHAPES.map(shape => (
          <div 
            key={shape}
            className={`shape-button ${currentShape === shape ? 'active' : ''}`}
            data-shape={shape}
            onClick={() => {
              setCurrentShape(shape);
              // Reset dimensions when changing shapes
              setShapeDimensions({
                length: 1,
                width: 1,
                height: 1,
                radius: 1,
                baseLength: 1,
                baseWidth: 1
              });
              setIsUnfolded(false);
            }}
          >
            {shape.charAt(0) + shape.slice(1).toLowerCase()}
          </div>
        ))}

        { currentLevel === "Premium" && 
          PREMIUM_SHAPES.map(shape => (
            <div 
              key={shape}
              className="shape-button"
              data-shape={shape}
              onClick={() => {
                setCurrentPremiumShape(shape);
              }}
            >
              {shape.charAt(0) + shape.slice(1).toLowerCase()}
            </div>
          ))
        }
      </div>

      {currentLevel === 'Free' && 
      <div className="button-container">
        <div 
          id="unfold-button"
          className={`unfold-button ${isUnfoldButtonHighlighted ? 'highlighted' : ''}`}
        >
          {isUnfolded ? 'Fold Shape' : 'Unfold Shape'}
        </div>
        
        <div 
          id="zoom-in-button"
          className="zoom-button"
          // onClick={() => handleZoom('in')}
        >
          🔍+
        </div>
        
        <div 
          id="zoom-out-button"
          className="zoom-button"
          // onClick={() => handleZoom('out')}
        >
          🔍-
        </div>

        <div 
          id="start-speech"
          className={`start-speech ${isListening ? 'active' : ''}`}
          onClick={handleStartSpeech}
        >
          {isListening ? 'Voice Control (ON)' : 'Voice Control (OFF)'}
        </div>
      </div>
      }

      {/* Level selector */}
      <div className="level-selector">
        <select 
          value={currentLevel}
          onChange={(e) => setCurrentLevel(e.target.value)}
        >
          {Object.values(DIFFICULTY_LEVELS).map(level => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
      </div>

      {/* Controls guide */}
      <div className="controls-guide">
        <div className="left-hand">
          <h4>Left Hand</h4>
          <p>1. Point at buttons</p>
          <p>2. Pinch to interact</p>
        </div>
        <div className="right-hand">
          <h4>Right Hand</h4>
          <p>1. Move to rotate object</p>
        </div>
      </div>

      {currentLevel === 'Free' && 
      <div className="dimension-controls">
         <h4>Dimensions</h4>
        {currentShape === 'CUBOID' && (
          <>
            <div className="dimension-buttons">
              <label>Length:</label>
              <div className="button-group">
                {[1, 2, 3, 4, 5].map(value => (
                  <div
                    key={value}
                    className={`dimension-button ${shapeDimensions.length === value ? 'active' : ''}`}
                    data-dimension="length"
                    data-value={value}
                    onClick={() => handleDimensionButtonClick('length', value)}
                  >
                    {value}
                  </div>
                ))}
              </div>
            </div>
            <div className="dimension-buttons">
              <label>Width:</label>
              <div className="button-group">
                {[1, 2, 3, 4, 5].map(value => (
                  <div
                    key={value}
                    className={`dimension-button ${shapeDimensions.width === value ? 'active' : ''}`}
                    data-dimension="width"
                    data-value={value}
                    onClick={() => handleDimensionButtonClick('width', value)}
                  >
                    {value}
                  </div>
                ))}
              </div>
            </div>
            <div className="dimension-buttons">
              <label>Height:</label>
              <div className="button-group">
                {[1, 2, 3, 4, 5].map(value => (
                  <div
                    key={value}
                    className={`dimension-button ${shapeDimensions.height === value ? 'active' : ''}`}
                    data-dimension="height"
                    data-value={value}
                    onClick={() => handleDimensionButtonClick('height', value)}
                  >
                    {value}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        
        {currentShape === 'PYRAMID' && (
          <>
            <div className="dimension-buttons">
              <label>Base Length:</label>
              <div className="button-group">
                {[1, 2, 3, 4, 5].map(value => (
                  <div
                    key={value}
                    className={`dimension-button ${shapeDimensions.baseLength === value ? 'active' : ''}`}
                    data-dimension="baseLength"
                    data-value={value}
                    onClick={() => handleDimensionButtonClick('baseLength', value)}
                  >
                    {value}
                  </div>
                ))}
              </div>
            </div>
            <div className="dimension-buttons">
              <label>Base Width:</label>
              <div className="button-group">
                {[1, 2, 3, 4, 5].map(value => (
                  <div
                    key={value}
                    className={`dimension-button ${shapeDimensions.baseWidth === value ? 'active' : ''}`}
                    data-dimension="baseWidth"
                    data-value={value}
                    onClick={() => handleDimensionButtonClick('baseWidth', value)}
                  >
                    {value}
                  </div>
                ))}
              </div>
            </div>
            <div className="dimension-buttons">
              <label>Height:</label>
              <div className="button-group">
                {[1, 2, 3, 4, 5].map(value => (
                  <div
                    key={value}
                    className={`dimension-button ${shapeDimensions.height === value ? 'active' : ''}`}
                    data-dimension="height"
                    data-value={value}
                    onClick={() => handleDimensionButtonClick('height', value)}
                  >
                    {value}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        
        {(currentShape === 'CYLINDER' || currentShape === 'CONE') && (
          <>
            <div className="dimension-buttons">
              <label>Height:</label>
              <div className="button-group">
                {[1, 2, 3, 4, 5].map(value => (
                  <div
                    key={value}
                    className={`dimension-button ${shapeDimensions.height === value ? 'active' : ''}`}
                    data-dimension="height"
                    data-value={value}
                    onClick={() => handleDimensionButtonClick('height', value)}
                  >
                    {value}
                  </div>
                ))}
              </div>
            </div>
            <div className="dimension-buttons">
              <label>Radius:</label>
              <div className="button-group">
                {[1, 2, 3, 4, 5].map(value => (
                  <div
                    key={value}
                    className={`dimension-button ${shapeDimensions.radius === value ? 'active' : ''}`}
                    data-dimension="radius"
                    data-value={value}
                    onClick={() => handleDimensionButtonClick('radius', value)}
                  >
                    {value}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        
        {currentShape === 'SPHERE' && (
          <div className="dimension-buttons">
            <label>Radius:</label>
            <div className="button-group">
              {[1, 2, 3, 4, 5].map(value => (
                <div
                  key={value}
                  className={`dimension-button ${shapeDimensions.radius === value ? 'active' : ''}`}
                  data-dimension="radius"
                  data-value={value}
                  onClick={() => handleDimensionButtonClick('radius', value)}
                >
                  {value}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="scale-control">
          <label>Scale: </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={scale}
            onChange={(e) => {
              const newValue = parseFloat(e.target.value);
              setScale(newValue);
              setZoomLevel(newValue);
            }}
          />
          <span>{scale.toFixed(1)}x</span>
        </div>

        {currentLevel === 'Free' && 

          <div className="volume-display">
            <p className={!isUnfolded ? 'highlighted' : ''}>
              Volume: {volume.toFixed(2)} cubic units
            </p>
            <p className={isUnfolded ? 'highlighted' : ''}>
              Surface Area: {surfaceArea.toFixed(2)} square units
            </p>
          </div>
        }
      </div>
      }

      {/* For the camera feed + hand overlay */}
      <div ref={containerRef} className="canvas-container">
        <video
          ref={videoRef}
          className="camera-feed"
          autoPlay
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="hand-overlay"
          width={640}
          height={480}
        />
      </div>
      {currentLevel === 'Premium' && currentPremiumShape === 'ASTRONOMY' && (
        <div className="astronomy-container">
          <Astronomy />
        </div>
      )}
      {currentLevel === 'Premium' && currentPremiumShape === 'BIOLOGY' && (
        <div className="bio-container">
          <Bio />
        </div>
      )}
    </div>
  );
};

export default HoloMath;