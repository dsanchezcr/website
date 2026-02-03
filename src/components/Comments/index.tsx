import React from "react";
import Giscus from "@giscus/react";
import { useColorMode } from "@docusaurus/theme-common";
import { useLocation } from "@docusaurus/router";

export default function Comments(): JSX.Element {
  const { colorMode } = useColorMode();
  const location = useLocation();
  
  // Detect locale from URL path
  const getLocale = (): string => {
    const pathname = location.pathname;
    if (pathname.startsWith('/es/') || pathname === '/es') return 'es';
    if (pathname.startsWith('/pt/') || pathname === '/pt') return 'pt-BR';
    return 'en';
  };

  return (
    <div>
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
        lang={getLocale()}
        loading="lazy"
        crossorigin="anonymous"
        async
        />
    </div>
  );
}