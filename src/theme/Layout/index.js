import React from 'react';
import OriginalLayout from '@theme-original/Layout';
import NLWebChat from '@site/src/components/NLWebChat';

export default function Layout(props) {
  return (
    <>
      <OriginalLayout {...props} />
      {/* Feature flag check is done inside NLWebChat for consistency with other widgets */}
      <NLWebChat />
    </>
  );
}