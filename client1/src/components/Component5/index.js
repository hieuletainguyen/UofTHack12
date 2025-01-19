//import PropTypes from "prop-types";
import React from "react";
import "./style.css";

export default function App({ text = "Menu" }) {
    return (
        <div className="component">
            <div className="overlap-group">
                <div className="rectangle" />

                <div className="menu">{text}</div>
            </div>
        </div>
    );
};
