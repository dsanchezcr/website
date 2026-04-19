import React, { useState } from 'react';
import Layout from '@theme/Layout';
import SecretTerminal from '@site/src/components/EasterEggs/SecretTerminal';
import easterEggConfig from '@site/src/components/EasterEggs/easterEggConfig';
import {Redirect} from '@docusaurus/router';

export default function TerminalPage() {
  const [show, setShow] = useState(true);

  const handleClose = () => {
    setShow(false);
  };

  if (!easterEggConfig.secretTerminal) {
    return <Redirect to="/" />;
  }

  if (!show) {
    return <Redirect to="/" />;
  }

  return (
    <Layout title="Terminal" noFooter>
      <SecretTerminal onClose={handleClose} />
    </Layout>
  );
}
