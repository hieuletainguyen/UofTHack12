import React from "react";
import x0001 from "./img/0001.png";
import x0018 from "./img/0018.png";
//import Component1 from "./components/Component1/index";
import Component1 from "./img/Component_1.png";
//import Component2 from "./components/Component2/index";
import Component2 from "./img/Component_2.png";
//import Component5 from "./components/Component5/index";
import Component5 from "./img/Component_5.png";
//import Notebook from "./notebook/index";
import Notebook from "./img/notebook.png";
//import Ruler from "./ruler/index";
import ruler from "./img/ruler.png";
import "./style.css";
//import vector from "./vector/index";
import vector from "./img/Vector.png";

export default function Tutorial() {
    return (
        <div className="tutorial">
          {console.log("HI")}
            <div className="div">
                <div className="overlap">
                    <div className="text-wrapper">HoloMath</div>

                    <img className="vector" alt="Vector" src={vector} />
                    
                </div>

                <p className="p">
                    Transform abstract math into interactive 3D visuals with hand gestures
                    for deeper understanding.
                </p>
                

                {/*<Component1 className="component-1" />*/}
                <img className="comp1-image" alt="Component1" src={Component1} />
                {/*<Component5 className="component-instance" text="Menu" />*/}
                <img className="comp5-image" alt="Component5" src={Component5} />
                {/*<Component2 className="component-1-instance" text="Shapes" />*/}
                <img className="comp2-image" alt="Component2" src={Component2} />
                <div className="text-wrapper-2">PINCH</div>
                <img className="nb-image" alt="Notebook" src={Notebook} />

                <p className="LENGTH-WIDTH-VOLUME">
                    LENGTH, <br />
                    WIDTH, VOLUME, SURFACE AREA
                </p>
                

                <img className="ruler-image" alt="Ruler" src={ruler} />

                <div className="overlap-2">
                    <div className="UNFOLD-SHAPE">
                        UNFOLD
                        <br />
                        SHAPE
                    </div>
                    <img className="nb-image" alt="Notebook" src={Notebook} />

                    <div className="overlap-3">
                        <p className="text-wrapper-3">
                            Turn the 3D shape into their 2D net and obtain the area of each
                            surface.
                        </p>
                        
                        {/*<Notebook className="notebook-instance" />*/}
                        
                        
                    </div>
                </div>

                <div className="text-wrapper-4">LEFT HAND</div>

                <div className="text-wrapper-5">MULTIDIMENSIONAL VISUALIZATION</div>

                <div className="text-wrapper-6">RIGHT HAND</div>

                <div className="overlap-4">
                    <div className="text-wrapper-7">DRAG</div>

                    <p className="drag-to-stretch-or">
                        <span className="span">Drag to </span>

                        <span className="text-wrapper-8">stretch or compress</span>
                    </p>

                    <img className="element" alt="Element" src={x0001} />
                    
                </div>

                <p className="pinch-your-thumb-and">
                    <span className="span">Pinch your thumb and index together to </span>

                    <span className="text-wrapper-8">
                        select a surface or click options
                    </span>
                </p>

                <p className="increase-or-decrease">
                    Increase or decrease the length, width <br />
                    or volume of the current shape and automatically obtain its surface
                    area.
                </p>

                {/* <img className="img" alt="Ruler" src={ruler} /> */}

                <p className="text-wrapper-9">
                    Move your left hand to rotate and view the shape.
                </p>

                <p className="text-wrapper-10">
                    Expand 3D objects into their 2D nets or even explore 4D shapes
                    projected into 3D.
                </p>

                <p className="our-growing-library">
                    <span className="span">Our growing library of shapes include </span>

                    <span className="text-wrapper-8">
                        cuboid, sphere, cylinder, cone, and pyramid.
                    </span>
                </p>

                <p className="text-wrapper-11">
                    Use your right hand to navigate the menu and manipulate the shape.
                </p>
                

                <img className="img" alt="Element" src={x0018} />

            </div>
        </div>
    );
};
