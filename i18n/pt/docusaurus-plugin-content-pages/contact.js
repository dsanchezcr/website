import React, { useState } from 'react';
import Layout from '@theme/Layout';

export default function Contact() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
  
    const handleSubmit = async (e) => {
      e.preventDefault();
  
      const data = {
        name: name,
        email: email,
        message: message
      };
  
      try {
        const response = await fetch("api/SendEmailFunction", {
          method: "POST",
          body: JSON.stringify(data),
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        // Display a success message to the user, or do whatever you want here
        const result = await response.json();
        console.log(result);  
        setName('');
        setEmail('');
        setMessage('');
      } catch (error) {
        // Display an error message to the user, or do whatever you want here
        console.error("There was an error submitting the form", error);
      }      
    };

  return (
    <Layout title="Contato" description="Página de contato">        
        <form onSubmit={handleSubmit}>
        <br />        
        <label>Sinta-se à vontade para entrar em contato se tiver alguma dúvida ou sugestão.</label>
        <br />
            <label>
                Nome:
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <br />
            <label>
                Email:
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <br />
            <label>
                Mensagem:
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>
            <br />
            <button type="submit" className='button button--secondary button--lg'>Enviar</button>
            <br />
            <label>Obrigado.</label>
        </form>
    </Layout>
  );
}