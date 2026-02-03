import React from 'react';
import OriginalLayout from '@theme-original/Layout';
import NLWebChat from '@site/src/components/NLWebChat';
import { config } from '@site/src/config/environment';

export default function Layout(props) {
  return (
    <>
      <OriginalLayout {...props} />
      {config.features.aiChat && <NLWebChat />}
    </>
  );
}