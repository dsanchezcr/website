// Mock for @docusaurus/Translate
import React from 'react';

export default function Translate({ children }) {
  return React.createElement(React.Fragment, null, children);
}

export function translate({ message }) {
  return message;
}
