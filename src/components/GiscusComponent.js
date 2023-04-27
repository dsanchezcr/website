import React from 'react';
import Giscus from "@giscus/react";
import { useColorMode } from '@docusaurus/theme-common';

export default function GiscusComponent() {
  const { colorMode } = useColorMode();

  return (
    <Giscus    
      repo="dsanchezcr/website"
      repoId="R_kgDOH0TdiQ"
      category="General"
      categoryId="DIC_kwDOH0Tdic4CWFKr"  
      mapping="https://github.com/dsanchezcr/website/discussions/6"
      term="Leave a comment or question here! Powered by Giscus."
      strict="0"
      reactionsEnabled="1"
      emitMetadata="1"
      inputPosition="top"
      theme={colorMode}
      lang="en"
      loading="lazy"
      crossorigin="anonymous"
      async
    />
  );
}