import React, { useState } from 'react';
import Layout from '@theme/Layout';

export default function Contact() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

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
  
      const data = {
        name: name,
        email: email,
        message: message
      };
  
      try {
        showLoader();
        const response = await fetch("https://dsanchezcr.azurewebsites.net/api/SendEmailFunction", {
          method: "POST",
          body: JSON.stringify(data),
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {          
          document.getElementById("myDiv").style.display = "block";
          document.getElementById("myDiv").value = "There was an error submitting the form";
          throw new Error("Network response was not ok");
        }
        showDiv();
        setName('');
        setEmail('');
        setMessage('');
        loadForm();
      } catch (error) {
        console.error("There was an error submitting the form", error);
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