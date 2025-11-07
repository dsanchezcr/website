import React from 'react';
import Layout from '@theme/Layout';
import WeatherWidget from '@site/src/components/WeatherWidget';

export default function Weather() {
  return (
    <Layout
      title="Clima"
      description="Información meteorológica en tiempo real para Orlando, FL y San José, CR">
      <div className="container margin-vert--lg">
        <div className="row">
          <div className="col col--8 col--offset-2">
            <h1>Información del Clima</h1>
            <p>
              Mantente actualizado con información meteorológica en tiempo real para ubicaciones clave. 
              Mostramos las condiciones actuales incluyendo temperatura, humedad y condiciones meteorológicas 
              para Orlando, Florida y San José, Costa Rica. Si permites el acceso a la ubicación, 
              también mostraremos el clima de tu ubicación actual.
            </p>
            <WeatherWidget showUserLocation={true} locations={['orlando', 'sanjose']} />
            
            <div className="margin-top--lg">
              <h2>Acerca de los Datos Meteorológicos</h2>
              <p>
                Los datos meteorológicos provienen de <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>, 
                una API meteorológica gratuita y de código abierto que proporciona datos meteorológicos precisos. 
                Los datos se almacenan en caché durante una hora para garantizar un rendimiento óptimo manteniendo la frescura.
              </p>
              
              <h3>Ubicaciones</h3>
              <ul>
                <li><strong>Orlando, Florida:</strong> Una ciudad importante en el centro de Florida, conocida por sus parques temáticos y clima cálido.</li>
                <li><strong>San José, Costa Rica:</strong> La capital y ciudad más grande de Costa Rica, ubicada en el Valle Central.</li>
                <li><strong>Su Ubicación:</strong> Clima para su ubicación actual (requiere permiso de ubicación).</li>
              </ul>
              
              <h3>Información Meteorológica Mostrada</h3>
              <ul>
                <li><strong>Temperatura:</strong> Temperatura actual en Celsius</li>
                <li><strong>Condición del Clima:</strong> Condiciones meteorológicas actuales con iconos descriptivos</li>
                <li><strong>Humedad:</strong> Porcentaje de humedad relativa</li>
                <li><strong>Última Actualización:</strong> Marca de tiempo de cuándo se obtuvieron los datos por última vez</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}