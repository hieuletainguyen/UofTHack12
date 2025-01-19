import { Landing } from "./components/Landing/Landing";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Tutorial from "./components/Tutorial/index.js";
import HoloMath from "./components/holloMath/HolloMath.js";

export default function App () {
    return (
        <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/tutorial" element={<Tutorial />} />
        <Route path="/holomath" element={<HoloMath />} />
      </Routes>
    </Router>
    )
}

// import { Landing } from "./components/Landing";

// export default function App () {
//     return (
//         <div>
//             <Landing />
//         </div>
//     )
// }