
import PropTypes from "prop-types";
import React from "react";
// import "./style.css";

export const Roundcube = ({ color, className }) => {
  return <div className={`roundcube ${className}`} />;
};

Roundcube.propTypes = {
  color: PropTypes.oneOf(["black-matte"]),
};
