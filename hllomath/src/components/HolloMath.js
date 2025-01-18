import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import './HoloMath.css';

// Constants for shapes and educational levels
const SHAPES = [
  'CUBE',
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

  // State
  const [currentShape, setCurrentShape] = useState(SHAPES[0]);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isButtonHighlighted, setIsButtonHighlighted] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(DIFFICULTY_LEVELS.ELEMENTARY);
  const [lastShapeChange, setLastShapeChange] = useState(0);
  const [isPinching, setIsPinching] = useState(false);
  const [isUnfolded, setIsUnfolded] = useState(false);
  const [isUnfoldButtonHighlighted, setIsUnfoldButtonHighlighted] = useState(false);
  const [shapeDimensions, setShapeDimensions] = useState({
    width: 1,
    height: 1,
    radius: 1
  });
  const [scale, setScale] = useState(1);
  const [volume, setVolume] = useState(0);
  const [activeDimensionControl, setActiveDimensionControl] = useState(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  // Add volume calculation function
  const calculateVolume = (shape, dimensions) => {
    switch (shape) {
      case 'CUBE':
        return Math.pow(dimensions.width, 3);
      case 'SPHERE':
        return (4/3) * Math.PI * Math.pow(dimensions.radius, 3);
      case 'CYLINDER':
        return Math.PI * Math.pow(dimensions.radius, 2) * dimensions.height;
      case 'CONE':
        return (1/3) * Math.PI * Math.pow(dimensions.radius, 2) * dimensions.height;
      case 'PYRAMID':
        return (1/3) * Math.pow(dimensions.width, 2) * dimensions.height;
      default:
        return 0;
    }
  };

  // Create 3D shape based on type
  const createShape = (type) => {
    let geometry;
    switch (type) {
      case 'SPHERE':
        geometry = new THREE.SphereGeometry(shapeDimensions.radius, 32, 32);
        break;
      case 'CYLINDER':
        geometry = new THREE.CylinderGeometry(shapeDimensions.radius, shapeDimensions.radius, shapeDimensions.height, 32);
        break;
      case 'CONE':
        geometry = new THREE.ConeGeometry(shapeDimensions.radius, shapeDimensions.height, 32);
        break;
      case 'PYRAMID':
        geometry = new THREE.ConeGeometry(shapeDimensions.width, shapeDimensions.height, 4);
        break;
      default: // 'CUBE'
        geometry = new THREE.BoxGeometry(shapeDimensions.width, shapeDimensions.width, shapeDimensions.width);
    }

    const material = new THREE.MeshPhongMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8,
      wireframe: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(scale, scale, scale);
    addShapeLabel(mesh);
    return mesh;
  };

  // Add label to shape
  const addShapeLabel = (shape) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    
    context.font = 'Bold 32px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText(currentShape, canvas.width/2, canvas.height/2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.y = 2;
    sprite.scale.set(2, 1, 1);
    shape.add(sprite);
  };

  // Add this function to create 2D nets for different shapes
  const create2DNet = (type) => {
    const material = new THREE.MeshPhongMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });

    const group = new THREE.Group();

    switch (type) {
      case 'CUBE':
        // Create cube net (cross shape)
        const cubefaces = [
          { position: [0, 0, 0], rotation: [0, 0, 0] },        // front
          { position: [2, 0, 0], rotation: [0, -Math.PI/2, 0] }, // right
          { position: [-2, 0, 0], rotation: [0, Math.PI/2, 0] }, // left
          { position: [0, 2, 0], rotation: [-Math.PI/2, 0, 0] }, // top
          { position: [0, -2, 0], rotation: [Math.PI/2, 0, 0] }, // bottom
          { position: [4, 0, 0], rotation: [0, Math.PI, 0] }     // back
        ];

        cubefaces.forEach(face => {
          const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            material
          );
          plane.position.set(...face.position);
          plane.rotation.set(...face.rotation);
          group.add(plane);
        });
        break;

      case 'CYLINDER':
        // Create cylinder net (rectangle + two circles)
        const cylinderBody = new THREE.Mesh(
          new THREE.PlaneGeometry(Math.PI * 2, 2),
          material
        );
        group.add(cylinderBody);

        // Add top and bottom circles
        const circleGeometry = new THREE.CircleGeometry(1, 32);
        const topCircle = new THREE.Mesh(circleGeometry, material);
        const bottomCircle = new THREE.Mesh(circleGeometry, material);
        
        topCircle.position.set(0, 2, 0);
        bottomCircle.position.set(0, -2, 0);
        
        group.add(topCircle);
        group.add(bottomCircle);
        break;

      case 'CONE':
        // Create cone net (sector + circle)
        const sectorGeometry = new THREE.CircleGeometry(4, 32, 0, Math.PI * 0.5);
        const sector = new THREE.Mesh(sectorGeometry, material);
        sector.position.set(0, -1, 0);
        
        const baseCircle = new THREE.Mesh(
          new THREE.CircleGeometry(1, 32),
          material
        );
        baseCircle.position.set(0, -3, 0);
        
        group.add(sector);
        group.add(baseCircle);
        break;

      case 'PYRAMID':
        // Create pyramid net (square base + triangular faces)
        const base = new THREE.Mesh(
          new THREE.PlaneGeometry(2, 2),
          material
        );
        base.position.set(0, -2, 0);
        base.rotation.set(-Math.PI/2, 0, 0);
        
        const triangleShape = new THREE.Shape();
        triangleShape.moveTo(-1, 0);
        triangleShape.lineTo(1, 0);
        triangleShape.lineTo(0, 2);
        triangleShape.lineTo(-1, 0);

        // Create four triangular faces
        for (let i = 0; i < 4; i++) {
          const face = new THREE.Mesh(
            new THREE.ShapeGeometry(triangleShape),
            material
          );
          face.position.set(
            Math.sin(i * Math.PI/2) * 2,
            0,
            Math.cos(i * Math.PI/2) * 2
          );
          face.rotation.set(0, i * Math.PI/2, 0);
          group.add(face);
        }
        
        group.add(base);
        break;

      case 'SPHERE':
        // Create a simplified sphere net (like a world map projection)
        const segments = 8;
        const rows = 4;
        
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < segments; j++) {
            const panel = new THREE.Mesh(
              new THREE.PlaneGeometry(
                Math.PI * 2 / segments,
                Math.PI / rows
              ),
              material
            );
            
            panel.position.set(
              j * Math.PI * 2 / segments - Math.PI,
              i * Math.PI / rows - Math.PI/2,
              0
            );
            
            group.add(panel);
          }
        }
        break;

      default:
        return null;
    }

    // Scale the entire group to match original shape size
    group.scale.set(0.5, 0.5, 0.5);
    return group;
  };

  // Handle hand gestures
  const handleHandGestures = (results) => {
    if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) {
      previousHandPositionRef.current = { x: null, y: null };
      setIsPinching(false);
      lastPinchStateRef.current = false;
      setIsDraggingSlider(false);
      setActiveDimensionControl(null);
      return;
    }

    results.multiHandLandmarks.forEach((landmarks, index) => {
      const isLeftHand = results.multiHandedness[index].label === 'Left';
      const indexFinger = landmarks[8];
      const x = indexFinger.x * window.innerWidth;
      const y = indexFinger.y * window.innerHeight;
      const thumbTip = landmarks[4];
      const pinchDistance = Math.sqrt(
        Math.pow(thumbTip.x - indexFinger.x, 2) +
        Math.pow(thumbTip.y - indexFinger.y, 2)
      );
      const isPinching = pinchDistance < PINCH_THRESHOLD;

      if (isLeftHand) {
        setCursorPosition({ x, y });

        // Handle dimension controls
        const dimensionInputs = document.querySelectorAll('.dimension-control');
        let isOverAnyInput = false;

        dimensionInputs.forEach(input => {
          const rect = input.getBoundingClientRect();
          const isOverInput = x >= rect.left && x <= rect.right && 
                            y >= rect.top && y <= rect.bottom;

          if (isOverInput) {
            isOverAnyInput = true;
            input.classList.add('highlighted');
            
            if (isPinching && !isDraggingSlider) {
              const dimensionType = input.getAttribute('data-dimension');
              setActiveDimensionControl(dimensionType);
              setIsDraggingSlider(true);
              pinchStartXRef.current = x; // Store initial pinch position
            }
          } else {
            input.classList.remove('highlighted');
          }
        });

        // Update dimension value while dragging
        if (isDraggingSlider && activeDimensionControl && isPinching) {
          const control = document.querySelector(`[data-dimension="${activeDimensionControl}"]`);
          if (control) {
            const sliderTrack = control.querySelector('.slider-track');
            const trackRect = sliderTrack.getBoundingClientRect();
            
            // Calculate movement delta
            const deltaX = x - pinchStartXRef.current;
            const sensitivity = 0.005; // Adjust this value to control sensitivity
            
            // Update the dimension value based on movement
            setShapeDimensions(prev => {
              const currentValue = prev[activeDimensionControl];
              const newValue = currentValue + deltaX * sensitivity;
              return {
                ...prev,
                [activeDimensionControl]: Math.max(0.1, Math.min(5, newValue))
              };
            });
            
            // Update start position for next frame
            pinchStartXRef.current = x;
          }
        }

        // Release slider if not pinching
        if (!isPinching && isDraggingSlider) {
          setIsDraggingSlider(false);
          setActiveDimensionControl(null);
          pinchStartXRef.current = null;
        }

        // Check for pinch release
        const thumbTip = landmarks[4];
        const pinchDistance = Math.sqrt(
          Math.pow(thumbTip.x - indexFinger.x, 2) +
          Math.pow(thumbTip.y - indexFinger.y, 2)
        );

        if (pinchDistance >= PINCH_THRESHOLD && isDraggingSlider) {
          setIsDraggingSlider(false);
          setActiveDimensionControl(null);
        }

        // Check both buttons
        const shapeButton = document.getElementById('shape-button');
        const unfoldButton = document.getElementById('unfold-button');

        if (shapeButton && unfoldButton) {
          const shapeRect = shapeButton.getBoundingClientRect();
          const unfoldRect = unfoldButton.getBoundingClientRect();

          const isOverShapeButton = x >= shapeRect.left && x <= shapeRect.right && 
                                   y >= shapeRect.top && y <= shapeRect.bottom;
          
          const isOverUnfoldButton = x >= unfoldRect.left && x <= unfoldRect.right && 
                                    y >= unfoldRect.top && y <= unfoldRect.bottom;

          setIsButtonHighlighted(isOverShapeButton);
          setIsUnfoldButtonHighlighted(isOverUnfoldButton);

          // Handle shape button
          if (isOverShapeButton) {
            // Detect pinch gesture
            const thumbTip = landmarks[4];
            const pinchDistance = Math.sqrt(
              Math.pow(thumbTip.x - indexFinger.x, 2) +
              Math.pow(thumbTip.y - indexFinger.y, 2)
            );

            // Check if pinching
            const isPinchGesture = pinchDistance < PINCH_THRESHOLD;
            
            // If we just started pinching (transition from not pinching to pinching)
            if (isPinchGesture && !lastPinchStateRef.current) {
              setCurrentShape(prevShape => {
                const currentIndex = SHAPES.indexOf(prevShape);
                return SHAPES[(currentIndex + 1) % SHAPES.length];
              });
            }

            // Update states
            setIsPinching(isPinchGesture);
            lastPinchStateRef.current = isPinchGesture;
          }

          // Handle unfold button
          if (isOverUnfoldButton) {
            const thumbTip = landmarks[4];
            const pinchDistance = Math.sqrt(
              Math.pow(thumbTip.x - indexFinger.x, 2) +
              Math.pow(thumbTip.y - indexFinger.y, 2)
            );

            const isPinchGesture = pinchDistance < PINCH_THRESHOLD;
            if (isPinchGesture && !lastPinchStateRef.current) {
              setIsUnfolded(prev => !prev);
            }
            lastPinchStateRef.current = isPinchGesture;
          }
        }
      } else {
        // Right hand controls object manipulation
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
    const shape = createShape(currentShape);
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
      const newShape = createShape(currentShape);
      sceneRef.current.add(newShape);
      currentObjectRef.current = newShape;
    }
  }, [currentShape]);

  // Add effect to handle unfolding animation
  useEffect(() => {
    if (currentObjectRef.current) {
      if (isUnfolded) {
        // Hide 3D shape and show 2D net
        const net = create2DNet(currentShape);
        if (net) {
          sceneRef.current.remove(currentObjectRef.current);
          sceneRef.current.add(net);
          currentObjectRef.current = net;
        }
      } else {
        // Show 3D shape
        sceneRef.current.remove(currentObjectRef.current);
        const shape = createShape(currentShape);
        sceneRef.current.add(shape);
        currentObjectRef.current = shape;
      }
    }
  }, [isUnfolded, currentShape]);

  // Add effect to update volume when dimensions or shape changes
  useEffect(() => {
    const newVolume = calculateVolume(currentShape, shapeDimensions);
    setVolume(newVolume * Math.pow(scale, 3));
  }, [currentShape, shapeDimensions, scale]);

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
      <div 
        id="shape-button"
        className={`shape-button ${isButtonHighlighted ? 'highlighted' : ''}`}
      >
        Change Shape
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
          <p>Move to rotate object</p>
        </div>
      </div>

      {/* Move dimension controls to left side */}
      <div className="dimension-controls">
        <h4>Dimensions</h4>
        {currentShape === 'CUBE' && (
          <div 
            className="dimension-control"
            data-dimension="width"
          >
            <label>Width: {shapeDimensions.width.toFixed(1)}</label>
            <div className="slider-track">
              <div 
                className="slider-fill" 
                style={{width: `${(shapeDimensions.width / 5) * 100}%`}}
              />
            </div>
          </div>
        )}
        {(currentShape === 'CYLINDER' || currentShape === 'CONE' || currentShape === 'PYRAMID') && (
          <>
            <div 
              className="dimension-control"
              data-dimension="height"
            >
              <label>Height: {shapeDimensions.height.toFixed(1)}</label>
              <div className="slider-track">
                <div 
                  className="slider-fill" 
                  style={{width: `${(shapeDimensions.height / 5) * 100}%`}}
                />
              </div>
            </div>
            {currentShape !== 'PYRAMID' && (
              <div 
                className="dimension-control"
                data-dimension="radius"
              >
                <label>Radius: {shapeDimensions.radius.toFixed(1)}</label>
                <div className="slider-track">
                  <div 
                    className="slider-fill" 
                    style={{width: `${(shapeDimensions.radius / 5) * 100}%`}}
                  />
                </div>
              </div>
            )}
          </>
        )}
        {currentShape === 'SPHERE' && (
          <div 
            className="dimension-control"
            data-dimension="radius"
          >
            <label>Radius: {shapeDimensions.radius.toFixed(1)}</label>
            <div className="slider-track">
              <div 
                className="slider-fill" 
                style={{width: `${(shapeDimensions.radius / 5) * 100}%`}}
              />
            </div>
          </div>
        )}
      </div>

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
        <p>Volume: {volume.toFixed(2)} cubic units</p>
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

export default HoloMath;
