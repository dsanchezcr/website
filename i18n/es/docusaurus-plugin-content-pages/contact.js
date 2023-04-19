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
          document.getElementById("myDiv").value = "Ha ocurrido un error al enviar el formulario. Por favor, inténtelo de nuevo.";
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