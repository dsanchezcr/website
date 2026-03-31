// Mock for @docusaurus/router
import React from 'react';

export function Redirect({ to }) {
  return React.createElement('div', { 'data-testid': 'redirect', 'data-to': to });
}

export function useHistory() {
  return { push: () => {}, replace: () => {}, goBack: () => {} };
}

export function useLocation() {
  return { pathname: '/', search: '', hash: '' };
}
