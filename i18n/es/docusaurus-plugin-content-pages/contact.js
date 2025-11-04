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
          document.getElementById("myDiv").innerText = "Ha ocurrido un error al enviar el formulario. Por favor, inténtelo de nuevo.";
          throw new Error("Network response was not ok");
        }
        showDiv();
        setName('');
        setEmail('');
        setMessage('');
      } catch (error) {
        console.error("Ha ocurrido un error al enviar el formulario", error);
        document.getElementById("myDiv").style.display = "block";
        document.getElementById("myDiv").innerText = "Ha ocurrido un error al enviar el formulario. Por favor, inténtelo de nuevo.";
      }      
    };

  return (
    <Layout title="Contacto" description="Página de contacto">
        <div id="loader"></div>
        <div id="myDiv" className="animate-bottom">
          <br />
          <h2>Correo enviado!</h2>
          <p>Intentaré responderte lo antes posible.</p>
        </div>        
        <form id="emailForm" onSubmit={handleSubmit}>
        <br />        
        <label>No dude en comunicarse si tiene alguna pregunta o sugerencia.</label>
        <br />
            <label>
                Nombre:
                <input type="text" value={name} required onChange={(e) => setName(e.target.value)} />
            </label>
            <br />
            <label>
                Email:
                <input type="email" value={email} required onChange={(e) => setEmail(e.target.value)} />
            </label>
            <br />
            <label>
                Mensaje:
                <textarea value={message} required onChange={(e) => setMessage(e.target.value)} />
            </label>
            <br />
            <button type="submit" className='button button--secondary button--lg'>Enviar</button>
            <br />
            <label>Gracias.</label>
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