import React from 'react';
import Layout from '@theme/Layout';
import WeatherWidget from '@site/src/components/WeatherWidget';

export default function Weather() {
  return (
    <Layout
      title="Clima"
      description="Informações meteorológicas em tempo real para Orlando, FL e San José, CR">
      <div className="container margin-vert--lg">
        <div className="row">
          <div className="col col--8 col--offset-2">
            <h1>Informações do Clima</h1>
            <p>
              Mantenha-se atualizado com informações meteorológicas em tempo real para localizações importantes. 
              Exibimos as condições atuais incluindo temperatura, umidade e condições meteorológicas 
              para Orlando, Flórida e San José, Costa Rica. Se você permitir o acesso à localização, 
              também mostraremos o clima da sua localização atual.
            </p>
            <WeatherWidget showUserLocation={true} locations={['orlando', 'sanjose']} />
            
            <div className="margin-top--lg">
              <h2>Sobre os Dados Meteorológicos</h2>
              <p>
                Os dados meteorológicos são obtidos do <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>, 
                uma API meteorológica gratuita e de código aberto que fornece dados meteorológicos precisos. 
                Os dados são armazenados em cache por uma hora para garantir desempenho ideal mantendo a atualidade.
              </p>
              
              <h3>Localizações</h3>
              <ul>
                <li><strong>Orlando, Flórida:</strong> Uma cidade importante no centro da Flórida, conhecida por seus parques temáticos e clima quente.</li>
                <li><strong>San José, Costa Rica:</strong> A capital e maior cidade da Costa Rica, localizada no Vale Central.</li>
                <li><strong>Sua Localização:</strong> Clima para sua localização atual (requer permissão de localização).</li>
              </ul>
              
              <h3>Informações Meteorológicas Exibidas</h3>
              <ul>
                <li><strong>Temperatura:</strong> Temperatura atual em Celsius</li>
                <li><strong>Condição do Clima:</strong> Condições meteorológicas atuais com ícones descritivos</li>
                <li><strong>Umidade:</strong> Porcentagem de umidade relativa</li>
                <li><strong>Última Atualização:</strong> Carimbo de tempo de quando os dados foram obtidos pela última vez</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}