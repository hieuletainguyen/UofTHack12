import React, { useState } from 'react';
// import HoloMath from './components/HoloMath/index.js';
import HoloMathOrigin from './components/HolloMath';
import './App.css';

function App() {
  const [isStarted, setIsStarted] = useState(false);

  if (!isStarted) {
    return (
      <div className="welcome-screen">
        <h1>Welcome to HoloMath</h1>
        <p>An interactive 3D learning experience for mathematics</p>
        <ul>
          <li>Use hand gestures to manipulate 3D shapes</li>
          <li>Learn geometry, calculus, and more</li>
          <li>Complete challenges and track your progress</li>
          <li>Perfect for students of all levels</li>
        </ul>
        <button onClick={() => setIsStarted(true)} className="start-button">
          Start Learning
        </button>
      </div>
    );
  }

  return (
    <div className="App">
      <HoloMathOrigin />
      {/* <HoloMath /> */}
    </div>
  );
}

export default App;
