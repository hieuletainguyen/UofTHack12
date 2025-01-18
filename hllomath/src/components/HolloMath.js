import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import './HoloMath.css';

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
    length: 1,
    width: 1,
    height: 1,
    radius: 1,
    baseLength: 1,
    baseWidth: 1
  });
  const [scale, setScale] = useState(1);
  const [volume, setVolume] = useState(0);
  const [activeDimensionControl, setActiveDimensionControl] = useState(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [initialDimensionValue, setInitialDimensionValue] = useState(null);
  const [surfaceArea, setSurfaceArea] = useState(0);

  // Add volume calculation function
  const calculateVolume = (shape, dimensions) => {
    switch (shape) {
      case 'CUBOID':
        return dimensions.length * dimensions.width * dimensions.height;
      case 'SPHERE':
        return (4/3) * Math.PI * Math.pow(dimensions.radius, 3);
      case 'CYLINDER':
        return Math.PI * Math.pow(dimensions.radius, 2) * dimensions.height;
      case 'CONE':
        return (1/3) * Math.PI * Math.pow(dimensions.radius, 2) * dimensions.height;
      case 'PYRAMID':
        return (1/3) * dimensions.baseLength * dimensions.baseWidth * dimensions.height;
      default:
        return 0;
    }
  };

  // Add surface area calculation function
  const calculateSurfaceArea = (shape, dimensions) => {
    switch (shape) {
      case 'CUBOID':
        return 2 * (
          dimensions.length * dimensions.width +
          dimensions.length * dimensions.height +
          dimensions.width * dimensions.height
        );
      case 'SPHERE':
        return 4 * Math.PI * Math.pow(dimensions.radius, 2);
      case 'CYLINDER':
        return 2 * Math.PI * dimensions.radius * dimensions.height + // lateral surface
               2 * Math.PI * Math.pow(dimensions.radius, 2);        // top and bottom circles
      case 'CONE':
        const coneSlantHeight = Math.sqrt(
          Math.pow(dimensions.height, 2) + Math.pow(dimensions.radius, 2)
        );
        return Math.PI * dimensions.radius * coneSlantHeight + // lateral surface
               Math.PI * Math.pow(dimensions.radius, 2);   // base circle
      case 'PYRAMID':
        const halfBaseLength = dimensions.baseLength / 2;
        const halfBaseWidth = dimensions.baseWidth / 2;
        const slantHeightLength = Math.sqrt(
          Math.pow(dimensions.height, 2) + Math.pow(halfBaseLength, 2)
        );
        const slantHeightWidth = Math.sqrt(
          Math.pow(dimensions.height, 2) + Math.pow(halfBaseWidth, 2)
        );
        return dimensions.baseLength * dimensions.baseWidth + // base area
               dimensions.baseLength * slantHeightWidth +    // front and back triangles
               dimensions.baseWidth * slantHeightLength;     // left and right triangles
      default:
        return 0;
    }
  };

  // Create 3D shape based on type
  const createShape = (type) => {
    let geometry;
    switch (type) {
      case 'CUBOID':
        geometry = new THREE.BoxGeometry(
          shapeDimensions.length,
          shapeDimensions.height,
          shapeDimensions.width
        );
        break;
      case 'SPHERE':
        geometry = new THREE.SphereGeometry(shapeDimensions.radius, 32, 32);
        break;
      case 'CYLINDER':
        geometry = new THREE.CylinderGeometry(
          shapeDimensions.radius,  // top radius
          shapeDimensions.radius,  // bottom radius (same for cylinder)
          shapeDimensions.height,  // height
          32  // segments
        );
        break;
      case 'CONE':
        geometry = new THREE.ConeGeometry(
          shapeDimensions.radius, 
          shapeDimensions.height, 
          32
        );
        break;
      case 'PYRAMID':
        // Create a custom pyramid geometry with rectangular base
        const halfLength = shapeDimensions.baseLength / 2;
        const halfWidth = shapeDimensions.baseWidth / 2;
        const height = shapeDimensions.height;

        const vertices = new Float32Array([
          // Base vertices
          -halfLength, 0, -halfWidth,  // 0
          halfLength, 0, -halfWidth,   // 1
          halfLength, 0, halfWidth,    // 2
          -halfLength, 0, halfWidth,   // 3
          0, height, 0                 // 4 (apex)
        ].flat());

        const indices = new Uint16Array([
          // Base
          0, 1, 2,
          0, 2, 3,
          // Sides
          0, 4, 1,
          1, 4, 2,
          2, 4, 3,
          3, 4, 0
        ]);

        geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        geometry.computeVertexNormals();
        break;
      default:
        return null;
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

    // Function to create area label
    const createAreaLabel = (area, position) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 512; // Increased canvas size
      canvas.height = 256;
      
      // Clear background (no gray background)
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Bigger, bolder text
      context.font = 'Bold 90px Arial'; // Increased font size
      context.fillStyle = '#4CAF50'; // Green color to match theme
      context.strokeStyle = 'white'; // White outline for better visibility
      context.lineWidth = 4;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      
      const text = `Area: ${area.toFixed(1)}`;
      context.strokeText(text, canvas.width/2, canvas.height/2);
      context.fillText(text, canvas.width/2, canvas.height/2);
      
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture,
        sizeAttenuation: false,
        transparent: true
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.set(...position);
      sprite.scale.set(0.25, 0.125, 1); // Bigger sprite size
      
      // Make sprite always face camera
      sprite.onBeforeRender = function(renderer, scene, camera) {
        sprite.quaternion.copy(camera.quaternion);
      };
      
      return sprite;
    };

    switch (type) {
      case 'CUBOID':
        const faces = [
          { position: [0, 0, 0], rotation: [0, 0, 0] },        // front
          { position: [2, 0, 0], rotation: [0, -Math.PI/2, 0] }, // right
          { position: [-2, 0, 0], rotation: [0, Math.PI/2, 0] }, // left
          { position: [0, 2, 0], rotation: [-Math.PI/2, 0, 0] }, // top
          { position: [0, -2, 0], rotation: [Math.PI/2, 0, 0] }, // bottom
          { position: [4, 0, 0], rotation: [0, Math.PI, 0] }     // back
        ];

        // Calculate face area
        const faceArea = shapeDimensions.length * shapeDimensions.height;

        faces.forEach(face => {
          const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(shapeDimensions.length, shapeDimensions.height),
            material
          );
          plane.position.set(...face.position);
          plane.rotation.set(...face.rotation);
          group.add(plane);

          // Add area label slightly in front of each face
          const labelPos = [...face.position];
          labelPos[2] += 0.01; // Move label much closer to surface
          const areaLabel = createAreaLabel(faceArea, labelPos);
          group.add(areaLabel);
        });
        break;

      case 'CYLINDER':
        // Calculate areas
        const lateralArea = 2 * Math.PI * shapeDimensions.radius * shapeDimensions.height;
        const circleArea = Math.PI * Math.pow(shapeDimensions.radius, 2);

        // Create cylinder net (rectangle + two circles)
        const cylinderBody = new THREE.Mesh(
          new THREE.PlaneGeometry(
            2 * Math.PI * shapeDimensions.radius,
            shapeDimensions.height
          ),
          material
        );
        group.add(cylinderBody);
        group.add(createAreaLabel(lateralArea, [0, 0, 0.01]));

        // Add top and bottom circles with labels
        const circleGeometry = new THREE.CircleGeometry(shapeDimensions.radius, 32);
        const topCircle = new THREE.Mesh(circleGeometry, material);
        const bottomCircle = new THREE.Mesh(circleGeometry, material);
        
        const spacing = shapeDimensions.radius + 0.5; // Add spacing based on radius
        topCircle.position.set(0, shapeDimensions.height + spacing, 0);
        bottomCircle.position.set(0, -spacing, 0);
        
        group.add(topCircle);
        group.add(bottomCircle);
        
        group.add(createAreaLabel(circleArea, [0, shapeDimensions.height + spacing, 0.01]));
        group.add(createAreaLabel(circleArea, [0, -spacing, 0.01]));
        break;

      case 'CONE':
        const coneSlantHeight = Math.sqrt(
          Math.pow(shapeDimensions.height, 2) + Math.pow(shapeDimensions.radius, 2)
        );
        const arcLength = 2 * Math.PI * shapeDimensions.radius;
        const sectorAngle = (arcLength / coneSlantHeight) * (180 / Math.PI);
        
        // Create cone net (sector + circle)
        const sectorGeometry = new THREE.CircleGeometry(
          coneSlantHeight,
          32,
          0,
          sectorAngle * (Math.PI / 180)
        );
        const sector = new THREE.Mesh(sectorGeometry, material);
        sector.position.set(0, 0, 0);
        
        const baseCircle = new THREE.Mesh(
          new THREE.CircleGeometry(shapeDimensions.radius, 32),
          material
        );
        baseCircle.position.set(0, -(coneSlantHeight + shapeDimensions.radius), 0);
        
        group.add(sector);
        group.add(baseCircle);
        
        // Add area labels
        const coneLateralArea = Math.PI * shapeDimensions.radius * coneSlantHeight;
        const coneBaseArea = Math.PI * Math.pow(shapeDimensions.radius, 2);
        
        group.add(createAreaLabel(coneLateralArea, [0, 0, 0.1]));
        group.add(createAreaLabel(coneBaseArea, [0, -(coneSlantHeight + shapeDimensions.radius), 0.1]));
        break;

      case 'PYRAMID':
        // Calculate areas
        const pyramidBaseArea = shapeDimensions.baseLength * shapeDimensions.baseWidth;
        const pyramidFrontBackArea = shapeDimensions.baseLength * Math.sqrt(
          Math.pow(shapeDimensions.height, 2) + Math.pow(shapeDimensions.baseWidth/2, 2)
        );
        const pyramidSideArea = shapeDimensions.baseWidth * Math.sqrt(
          Math.pow(shapeDimensions.height, 2) + Math.pow(shapeDimensions.baseLength/2, 2)
        );

        // Create pyramid net (square base + triangular faces)
        const base = new THREE.Mesh(
          new THREE.PlaneGeometry(shapeDimensions.baseLength, shapeDimensions.baseWidth),
          material
        );
        base.position.set(0, -2, 0);
        base.rotation.set(-Math.PI/2, 0, 0);
        
        const triangleShape = new THREE.Shape();
        triangleShape.moveTo(-shapeDimensions.baseLength/2, 0);
        triangleShape.lineTo(shapeDimensions.baseLength/2, 0);
        triangleShape.lineTo(0, shapeDimensions.height);
        triangleShape.lineTo(-shapeDimensions.baseLength/2, 0);

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
        group.add(createAreaLabel(pyramidBaseArea, [0, -2, 0.1]));
        group.add(createAreaLabel(pyramidFrontBackArea, [2, 0, 0.1]));
        group.add(createAreaLabel(pyramidSideArea, [-2, 0, 0.1]));
        break;

      case 'SPHERE':
        // Calculate areas
        const sphereArea = 4 * Math.PI * Math.pow(shapeDimensions.radius, 2);

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
        group.add(createAreaLabel(sphereArea, [0, 0, 0.1]));
        break;

      default:
        return null;
    }

    group.scale.set(0.5, 0.5, 0.5);
    return group;
  };

  // Handle hand gestures
  const handleHandGestures = (results) => {
    if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) {
      previousHandPositionRef.current = { x: null, y: null };
      setIsPinching(false);
      lastPinchStateRef.current = false;
      return;
    }

    // Sort hands to ensure consistent left/right hand detection
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

        // Check for pinch gesture
        const thumbTip = landmarks[4];
        const pinchDistance = Math.sqrt(
          Math.pow(thumbTip.x - indexFinger.x, 2) +
          Math.pow(thumbTip.y - indexFinger.y, 2)
        );
        const isPinchGesture = pinchDistance < PINCH_THRESHOLD;
        setIsPinching(isPinchGesture);

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
  }, [currentShape, shapeDimensions]);

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

export default HoloMath;
