import React, { useState } from 'react';
import Layout from '@theme/Layout';

export default function Contact() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

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
  
    const handleSubmit = async (e) => {
      e.preventDefault();
  
      const params = new URLSearchParams({
        name: name,
        email: email,
        message: message
      });
  
      try {
        showLoader();
        console.log("Sending data:", params.toString());
        const response = await fetch(`https://dsanchezcr.azurewebsites.net/api/SendEmailFunction?${params.toString()}`, {
          method: "POST",
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
          document.getElementById("myDiv").value = "There was an error submitting the form";
          throw new Error("Network response was not ok");
        }
        showDiv();
        setName('');
        setEmail('');
        setMessage('');
      } catch (error) {
        console.error("There was an error submitting the form", error);
        document.getElementById("myDiv").style.display = "block";
        document.getElementById("myDiv").innerText = "There was an error submitting the form. Please try again later.";
      }      
    };

  return (
    <Layout title="Contact" description="Contact Page">
        <div id="loader"></div>
        <div id="myDiv" className="animate-bottom">
          <br />
          <h2>Email sent!</h2>
          <p>I will try to get back to you as soon as possible.</p>
        </div>        
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
            <label>
                Message:
                <textarea value={message} required onChange={(e) => setMessage(e.target.value)} />
            </label>
            <br />
            <button type="submit" className='button button--secondary button--lg'>Submit</button>
            <br />
            <label>Thanks.</label>
        </form>
    </Layout>
  );
}