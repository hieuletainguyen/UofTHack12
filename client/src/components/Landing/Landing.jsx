import React from "react";
import {useState} from "react";

import "./style.css";



import roundcubeblack from "../../img/roundcube-black-matte-2.png"
import cylinderblackmatte from "../../img/cylinder-black-matte-1.png"
import coneblackmatte from "../../img/cone-black-matte-1.png"
import logo from "../../img/group-4.png"
import stupidsquare from "./../../shape1/roundcube-black-matte-1.png"

<head>
  <style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');
  </style>
</head>

export const Landing = () => {
  const [signIn, setSignIn] = useState(false);

  const handleClick = () => {
    setSignIn(!signIn);
  }
  return (
    <div className="landing">
      <div className="div">
        <div className="overlap">
          <div className="rectangle" />


          <div className="cube">
            <img
              className="roundcube-black"
              src={roundcubeblack}
              alt="Roundcube black"
            />
          </div>
          

          <div className="cylinder">
            <img
              className="cylinder-black-matte"
              alt="Cylinder black matte"
              src={cylinderblackmatte}
            />
          </div>

          <div className="cone">
            <img
              className="cone-black-matte"
              alt="Cone black matte"
              src={coneblackmatte}
            />
          </div>
        </div>

        <div className="sillysquare">
            <img
            className= "roundcube-black1"
            src = {stupidsquare}
            alt= "Square :("
            style={{ width: "150%", height: "150%" }}
            />
          </div>

          <div className="overlap-group-2">
            <div className="text-wrapper-3">HoloMath</div>

            <div className="text-wrapper-4">Welcome to</div>

            <img className="group" alt="Group" src={logo} />
          </div>

        { signIn ?

        <div>
            
          <div className="label">
            <div className="text-wrapper">Email</div>
          </div>

          <div className="label">
            <div className="text-wrapper22">Password</div>
          </div>

          <div className="label">
            <div className="text-wrapper23">Log In</div>
          </div>

          <div className="overlap-group">
            <div className="text-wrapper"></div>
          </div>

          <div className="div-wrapper">
            <div className="text-wrapper-2"></div>
          </div>

        </div>
        :
        <div>
          <div className="overlap-group">
            <div className="text-wrapper">Sign up with Google</div>
          </div>

          <div className="div-wrapper">
            <div className="text-wrapper-2">Continue with email</div>
          </div>


          <p className="already-have-an">
            <span className="span">Already have an account? </span>

            <button onClick={handleClick}
            style={{
              background: "transparent",
              border: "none"
            }}
             ><span className="text-wrapper-5">Sign in</span></button>
          </p>

          <div className="text-wrapper-6">OR</div>

          <div className="text-wrapper-7">Start learning today</div>
        </div>
      }
      </div>
    </div>
  );
};
