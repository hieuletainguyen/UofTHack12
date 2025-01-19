import React from 'react';
import { Canvas } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useLoader } from '@react-three/fiber';

const Model = () => {
    const modelUrl = `${process.env.PUBLIC_URL}/scene.gltf`;
    const gltf = useLoader(GLTFLoader, modelUrl);
    return <primitive object={gltf.scene} />;
};

const Scene = () => {
  return (  
    <Canvas>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Model />
    </Canvas>
  );
};

const App1 = () => {
  return (
    <div style={{ height: '100vh' }}>
      <Scene />
      {/* <Model /> */}
    </div>
  );
};

export default App1;
