import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useLoader } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';

const Tooltip = ({ position, content }) => (
  <mesh position={position}>
    <Html center>
      <div
        style={{
          backgroundColor: 'white',
          color: 'black',
          padding: '5px 10px',
          borderRadius: '5px',
          fontSize: '12px',
          pointerEvents: 'none',
        }}
      >
        {content}
      </div>
    </Html>
  </mesh>
);

const Model = () => {
  // Load the GLTF model
  const modelUrl = `${process.env.PUBLIC_URL}/astronomy/scene.gltf`;
  console.log('Loading model from:', modelUrl);
  
  try {
    const gltf = useLoader(GLTFLoader, modelUrl);
    console.log('Model loaded successfully:', gltf);
    
    return (
      <>
        <primitive object={gltf.scene} />
        <Tooltip position={[1, 0.5, 0]} content="Great Red Spot: A massive storm" />
        <Tooltip position={[-1, -0.5, 0]} content="Io's Tidal Heating" />
      </>
    );
  } catch (error) {
    console.error('Error loading model:', error);
    return null;
  }
};

const Loading = () => {
  // Use the `Html` helper to overlay a loading message
  return (
    <Html center>
      <div style={{ color: 'white', fontSize: '1.5em' }}>Loading...</div>
    </Html>
  );
};

const Scene = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 50 }} // Adjust camera position and field of view
    >
      {/* Add lights */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} />

      {/* Use Suspense to show loading message */}
      <Suspense fallback={<Loading />}>
        <Model />
      </Suspense>

      {/* Add interactive controls and limit zoom */}
      <OrbitControls minDistance={3} maxDistance={5} />
    </Canvas>
  );
};

const Astronomy = () => {
  return (
    <div style={{ width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0 }}>
      <Scene />
    </div>
  );
};

export default Astronomy;