//import PropTypes from "prop-types";
import React from "react";
import "./style.css";

export default function App({ text = "Shapes" }) {
    //export default function App() {
    return (
        <div className="component">
            <div className="overlap-group">
                <div className="rectangle" />

                <div className="Shapes">{text}</div>
            </div>
        </div>
    );
};

