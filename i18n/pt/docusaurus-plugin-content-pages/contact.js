import React, { useState } from 'react';
import Layout from '@theme/Layout';
import { config } from '../../../src/config/environment';
import { useLocation } from '@docusaurus/router';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';

function ContactForm() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const location = useLocation();
    const { executeRecaptcha } = useGoogleReCaptcha();
    
    // Extract language from URL path
    const getLanguage = () => {
        const pathname = location.pathname;
        if (pathname.startsWith('/es/')) return 'es';
        if (pathname.startsWith('/pt/')) return 'pt';
        return 'en'; // default
    };

    var myVar;

    function loadForm() {
      myVar = setTimeout(showForm, 5000);
    }

    function showDiv() {
      document.getElementById("loader").style.display = "none";
      document.getElementById("emailForm").style.display = "none";
      document.getElementById("myDiv").style.display = "block";
    }

    function showForm() {
      document.getElementById("loader").style.display = "none";
      document.getElementById("emailForm").style.display = "block";
      document.getElementById("myDiv").style.display = "none";
    }

    function showLoader() {
      document.getElementById("loader").style.display = "block";
      document.getElementById("emailForm").style.display = "none";
      document.getElementById("myDiv").style.display = "none";
    }
    
    const handleSubmit = async (e) => {
      e.preventDefault();

      if (!executeRecaptcha) {
        console.log('Execute recaptcha not yet available');
        return;
      }

      try {
        // Get reCAPTCHA token
        const token = await executeRecaptcha('contact_form');
  
        const requestData = {
          name: name,
          email: email,
          message: message,
          language: getLanguage(),
          recaptchaToken: token
        };
  
        showLoader();
        const apiEndpoint = config.getApiEndpoint();
        console.log("Using API endpoint:", apiEndpoint);
        console.log("Sending data:", requestData);
        const response = await fetch(`${apiEndpoint}/api/contact`, {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });
        console.log("Response status:", response.status);

        const contentType = response.headers.get("Content-Type");
        let responseData;
        if (contentType && contentType.includes("application/json")) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }
        console.log("Response data:", responseData);

        if (!response.ok) {          
          document.getElementById("myDiv").style.display = "block";
          document.getElementById("myDiv").innerText = "Ocorreu um erro ao enviar o formulário. Por favor, tente novamente.";
          throw new Error("Network response was not ok");
        }
        showDiv();
        setName('');
        setEmail('');
        setMessage('');
      } catch (error) {
        console.error("Ocorreu um erro ao enviar o formulário", error);
        document.getElementById("myDiv").style.display = "block";
        document.getElementById("myDiv").innerText = "Ocorreu um erro ao enviar o formulário. Por favor, tente novamente.";
      }      
    };

  return (
    <Layout title="Contato" description="Página de contato">
        <div id="loader"></div>
        <div id="myDiv" className="animate-bottom">
          <br />
          <h2>Correo enviado!</h2>
          <p>Intentaré responderte lo antes posible.</p>
        </div>        
        <form onSubmit={handleSubmit}>
        <br />        
        <label>Sinta-se à vontade para entrar em contato se tiver alguma dúvida.</label>
        <br />
            <label>
                Nome:
                <input type="text" value={name} required onChange={(e) => setName(e.target.value)} />
            </label>
            <br />
            <label>
                Email:
                <input type="email" value={email} required onChange={(e) => setEmail(e.target.value)} />
            </label>
            <br />
            <label>
                Mensagem:
                <textarea value={message} required onChange={(e) => setMessage(e.target.value)} />
            </label>
            <br />
            <button type="submit" className='button button--secondary button--lg'>Enviar</button>
            <br />
            <label>Obrigado.</label>
        </form>
    </Layout>
  );
}

export default function Contact() {
  return (
    <GoogleReCaptchaProvider reCaptchaKey={config.recaptchaSiteKey}>
      <ContactForm />
    </GoogleReCaptchaProvider>
  );
}