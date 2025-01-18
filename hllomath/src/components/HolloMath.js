import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import './HolloMath.css';
import calculateVolume from '../utils/calculateVolume';
import calculateSurfaceArea from '../utils/calculateSA';
import create2DNet from '../utils/create2DNet';
import createShape from '../utils/createShape';

// Constants for shapes and educational levels
const SHAPES = [
  'CUBOID',
  'SPHERE',
  'CYLINDER',
  'CONE',
  'PYRAMID'
];

const DIFFICULTY_LEVELS = {
  ELEMENTARY: 'Elementary',
  MIDDLE_SCHOOL: 'Middle School',
  HIGH_SCHOOL: 'High School',
  UNIVERSITY: 'University'
};

const PINCH_THRESHOLD = 0.1; // Increased threshold for easier detection

// Add this constant for unfolding animations
const UNFOLDING_DURATION = 1000; // 1 second for unfolding animation

// Add this constant for palm scaling
const PALM_SCALE = {
  MIN_DISTANCE: 0.1,  // Minimum palm spread
  MAX_DISTANCE: 0.4,  // Maximum palm spread
  MIN_SCALE: 0.1,     // Minimum scale value
  MAX_SCALE: 2.0      // Maximum scale value
};

const HoloMathOrigin = () => {
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

  // State
  const [currentShape, setCurrentShape] = useState(SHAPES[0]);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isButtonHighlighted, setIsButtonHighlighted] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(DIFFICULTY_LEVELS.ELEMENTARY);
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

  // Handle hand gestures
  const handleHandGestures = (results) => {
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

    sortedHands.forEach(({ landmarks, isLeft }) => {
      const indexFinger = landmarks[8];
      const x = (1 - indexFinger.x) * window.innerWidth;
      const y = indexFinger.y * window.innerHeight;

      if (isLeft) {
        setCursorPosition({ x, y });

        // Convert cursor position to normalized device coordinates for raycasting
        const rect = rendererRef.current.domElement.getBoundingClientRect();
        mouseRef.current.x = ((x - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((y - rect.top) / rect.height) * 2 + 1;

        // Check for pinch gesture
        const thumbTip = landmarks[4];
        const pinchDistance = Math.sqrt(
          Math.pow(thumbTip.x - indexFinger.x, 2) +
          Math.pow(thumbTip.y - indexFinger.y, 2)
        );
        const isPinchGesture = pinchDistance < PINCH_THRESHOLD;
        setIsPinching(isPinchGesture);

        // Handle dragging of unfolded shapes
        if (isUnfolded) {
          raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
          const intersects = raycasterRef.current.intersectObjects(currentObjectRef.current.children);

          if (isPinchGesture) {
            if (!isHandDragging && intersects.length > 0) {
              // Start dragging
              setIsHandDragging(true);
              draggedFaceRef.current = intersects[0].object;
            }
          } else {
            // Stop dragging when pinch is released
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

        // Handle all interactive elements
        const handleInteraction = (element, onPinch) => {
          if (!element) return;
          const rect = element.getBoundingClientRect();
          const isOverElement = x >= rect.left && x <= rect.right && 
                              y >= rect.top && y <= rect.bottom;

          if (isOverElement) {
            element.classList.add('highlighted');
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
        });

        lastPinchStateRef.current = isPinchGesture;
      } else {
        // Right hand controls rotation
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
    const shape = createShape(currentShape, shapeDimensions, scale, currentShape);
    scene.add(shape);
    currentObjectRef.current = shape;

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
    if (sceneRef.current && currentObjectRef.current) {
      sceneRef.current.remove(currentObjectRef.current);
      const newShape = createShape(currentShape, shapeDimensions, scale, currentShape);
      sceneRef.current.add(newShape);
      currentObjectRef.current = newShape;
    }
  }, [currentShape, shapeDimensions]);

  // Add effect to handle unfolding animation
  useEffect(() => {
    if (currentObjectRef.current) {
      if (isUnfolded) {
        // Hide 3D shape and show 2D net
        const net = create2DNet(currentShape, shapeDimensions, scale);
        if (net) {
          sceneRef.current.remove(currentObjectRef.current);
          sceneRef.current.add(net);
          currentObjectRef.current = net;
        }
      } else {
        // Show 3D shape
        sceneRef.current.remove(currentObjectRef.current);
        const shape = createShape(currentShape, shapeDimensions, scale, currentShape);
        sceneRef.current.add(shape);
        currentObjectRef.current = shape;
      }
    }
  }, [isUnfolded, currentShape]);

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
        {SHAPES.map(shape => (
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
      </div>

      {/* Unfold button */}
      <div 
        id="unfold-button"
        className={`unfold-button ${isUnfoldButtonHighlighted ? 'highlighted' : ''}`}
      >
        {isUnfolded ? 'Fold Shape' : 'Unfold Shape'}
      </div>

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
          <p>1. Point at button</p>
          <p>2. Pinch thumb & index to change shape</p>
        </div>
        <div className="right-hand">
          <h4>Right Hand</h4>
          <p>1. Move to rotate object</p>
          <p>2. Open/close palm to scale</p>
        </div>
      </div>

      {/* Dimension control buttons */}
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

        {/* Add scale control */}
        <div className="scale-control">
          <label>Scale: </label>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
          />
          <span>{scale.toFixed(1)}x</span>
        </div>

        {/* Display volume */}
        <div className="volume-display">
          <p className={!isUnfolded ? 'highlighted' : ''}>
            Volume: {volume.toFixed(2)} cubic units
          </p>
          <p className={isUnfolded ? 'highlighted' : ''}>
            Surface Area: {surfaceArea.toFixed(2)} square units
          </p>
        </div>
      </div>

      {/* Three.js container */}
      <div ref={containerRef} className="canvas-container">
        <video
          ref={videoRef}
          className="camera-feed"
          autoPlay
          playsInline
        />
      </div>
    </div>
  );
};

export default HoloMathOrigin;