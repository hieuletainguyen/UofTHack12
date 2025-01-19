import React from 'react';
import { Canvas } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

const Model = () => {
    // Point to the GLTF file in the public directory
    const modelUrl = `${process.env.PUBLIC_URL}/scene.gltf`;

    // Load the model using useLoader
    const gltf = useLoader(GLTFLoader, modelUrl);

    // Render the loaded GLTF model
    return <primitive object={gltf.scene} />;
};

const Scene = () => {
  return (
    <Canvas>
      {/* Add some lights */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} />

      {/* Render the model */}
      <Model />

      {/* Enable interaction */}
      <OrbitControls />
    </Canvas>
  );
};

const App1 = () => {
  return (
    <div style={{ height: '100vh' }}>
      {/* Render the 3D scene */}
      <Scene />
    </div>
  );
};

export default App1;
