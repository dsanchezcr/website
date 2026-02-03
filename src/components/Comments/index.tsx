import React from "react";
import Giscus from "@giscus/react";
import { useColorMode } from "@docusaurus/theme-common";
import { useLocale } from "@site/src/hooks";

export default function Comments(): JSX.Element {
  const { colorMode } = useColorMode();
  const { locale } = useLocale();
  
  // Map locale to Giscus supported language codes
  const giscusLang = locale === 'pt' ? 'pt-BR' : locale;

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
        lang={giscusLang}
        loading="lazy"
        crossorigin="anonymous"
        async
        />
    </div>
  );
}