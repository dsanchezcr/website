import React, { useState } from 'react';
import Layout from '@theme/Layout';
import SecretTerminal from '@site/src/components/EasterEggs/SecretTerminal';
import easterEggConfig from '@site/src/components/EasterEggs/easterEggConfig';
import {Redirect} from '@docusaurus/router';
import { useLocale } from '@site/src/hooks';

const translations = {
  en: { title: 'Terminal', redirectPath: '/' },
  es: { title: 'Terminal', redirectPath: '/es/' },
  pt: { title: 'Terminal', redirectPath: '/pt/' },
};

export default function TerminalPage() {
  const [show, setShow] = useState(true);
  const lang = useLocale();
  const { title, redirectPath } = translations[lang] || translations.en;

  const handleClose = () => {
    setShow(false);
  };

  if (!easterEggConfig.secretTerminal) {
    return <Redirect to={redirectPath} />;
  }

  if (!show) {
    return <Redirect to={redirectPath} />;
  }

  return (
    <Layout title={title} noFooter>
      <SecretTerminal onClose={handleClose} />
    </Layout>
  );
}
