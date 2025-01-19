// import React from "react";
// import roundcubeBlackMatte1 from "./roundcube-black-matte-1.png";
// import "./style.css";

// export function App () {
//     return (
//         <div className="image">
//             <img
//                 className="roundcube-black1"
//                 alt="Roundcube black"
//                 src={roundcubeBlackMatte1}
//             />
//         </div>
//     );
// };

import React from "react";
import image from "./roundcube-black-matte-1.png";
import "./style.css";

export function App ()  {
    return (
        <div className="image">
            <img className="img" alt="Image" src={image} />
        </div>
    );
};


