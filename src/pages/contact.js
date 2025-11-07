import React, { useState } from 'react';
import Layout from '@theme/Layout';
import { config } from '../config/environment';
import { useLocation } from '@docusaurus/router';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';

function ContactForm() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [website, setWebsite] = useState(''); // Honeypot field
    const location = useLocation();
    const { executeRecaptcha } = useGoogleReCaptcha();
    
    // Extract language from URL path
    const getLanguage = () => {
        const pathname = location.pathname;
        if (pathname.startsWith('/es/')) return 'es';
        if (pathname.startsWith('/pt/')) return 'pt';
        return 'en'; // default
    };

    function showDiv() {
      document.getElementById("loader").style.display = "none";
      document.getElementById("emailForm").style.display = "none";
      document.getElementById("myDiv").style.display = "block";
    }

    function showLoader() {
      document.getElementById("loader").style.display = "block";
      document.getElementById("emailForm").style.display = "none";
      document.getElementById("myDiv").style.display = "none";
    }

    function showError(errorMsg) {
      document.getElementById("loader").style.display = "none";
      document.getElementById("emailForm").style.display = "block";
      document.getElementById("errorDiv").style.display = "block";
      document.getElementById("errorDiv").innerText = errorMsg;
    }
    
    const handleSubmit = async (e) => {
      e.preventDefault();

      if (!executeRecaptcha) {
        console.log('reCAPTCHA is not yet available. Please try again.');
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
          recaptchaToken: token,
          website: website // Honeypot field
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
          const errorMessage = responseData?.error || "There was an error submitting the form";
          showError(errorMessage);
          throw new Error(errorMessage);
        }
        showDiv();
        setName('');
        setEmail('');
        setMessage('');
        setWebsite(''); // Reset honeypot
      } catch (error) {
        console.error("There was an error submitting the form", error);
        if (!document.getElementById("errorDiv").style.display || document.getElementById("errorDiv").style.display === "none") {
          showError("There was an error submitting the form. Please try again later.");
        }
      }      
    };

  return (
    <Layout title="Contact" description="Contact Page">
        <div id="loader"></div>
        <div id="myDiv" className="animate-bottom">
          <br />
          <h2>Email verification sent!</h2>
          <p>Please check your email and click the verification link to complete your contact request.</p>
          <p>If you don't see it, please check your spam folder.</p>
        </div>
        <div id="errorDiv" style={{ display: 'none', backgroundColor: '#fee', padding: '10px', margin: '10px 0', borderRadius: '5px', color: '#c00' }}></div>
        <form id="emailForm" onSubmit={handleSubmit}>
        <br />        
        <label>Feel free to reach out if you have any question or suggestion.</label>
        <br />
            <label>
                Name:
                <input type="text" value={name} required onChange={(e) => setName(e.target.value)} />
            </label>
            <br />
            <label>
                Email:
                <input type="email" value={email} required onChange={(e) => setEmail(e.target.value)} />
            </label>
            <br />
            {/* Honeypot field - hidden from real users but visible to bots */}
            <div style={{ position: 'absolute', left: '-9999px' }}>
                <label>
                    Website:
                    <input 
                        type="text" 
                        name="website" 
                        value={website} 
                        onChange={(e) => setWebsite(e.target.value)}
                        tabIndex="-1"
                        autoComplete="off"
                    />
                </label>
            </div>
            <label>
                Message:
                <textarea value={message} required onChange={(e) => setMessage(e.target.value)} />
            </label>
            <br />
            <div className="recaptcha-notice" style={{ 
              fontSize: '12px', 
              color: '#666', 
              marginBottom: '10px',
              textAlign: 'center'
            }}>
              This site is protected by reCAPTCHA and the Google{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> and{' '}
              <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> apply.
            </div>
            <button type="submit" className='button button--secondary button--lg'>Submit</button>
            <br />
            <label>Thanks.</label>
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