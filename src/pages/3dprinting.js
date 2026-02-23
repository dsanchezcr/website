import React from 'react';
import Layout from '@theme/Layout';
import { useLocale } from '@site/src/hooks';

const translations = {
  en: {
    title: '3D Printing',
    description: 'My 3D printing printers, and recent prints. Bambu Lab P1S with 2 AMS Pro 2 and Flashforge Adventure Pro 3.',
    heroTitle: '🖨️ 3D Printing',
    heroSubtitle: '3D printing blends technology, creativity, and engineering in a way that few hobbies do. Whether prototyping a functional part, printing a fun model, or experimenting with new materials, there\'s always something on the build plate.',
    printersTitle: 'My Printers',
    primaryLabel: '🟠 Primary Printer',
    secondaryLabel: '⚪ Secondary Printer',
    bambu: {
      name: 'Bambu Lab P1S',
      description: 'A fully enclosed, high-speed FDM printer engineered for reliability and multi-material printing. My go-to machine for quality prints, multi-color models, and fun projects.',
      features: [
        'Fully enclosed chamber for consistent print quality',
        'High-speed printing with active vibration compensation',
        'Auto-calibration, first-layer detection, filament runout sensors',
        'Camera for timelapse and remote monitoring',
      ],
      amsTitle: '2 × AMS Pro 2',
      amsDescription: 'Two AMS Pro 2 units give me up to 8 filament spools loaded simultaneously, perfect for multi-color prints without manual swaps.',
    },
    flashforge: {
      name: 'Flashforge Adventure Pro 3',
      description: 'My secondary printer for quick single-filament jobs, rapid prototyping, and running long prints in parallel while the P1S handles multi-color work.',
      features: [
        'Compact, fully enclosed design',
        'Reliable single-filament printing, PLA, PETG',
        'Quiet operation, great for overnight prints',
        'Straightforward slicing via FlashPrint',
      ],
    },
    materialsTitle: 'Materials I Print With',
    materials: [
      { name: 'PLA - PLA+', use: 'My go-to for everyday prints and decorative models' },
      { name: 'PETG', use: 'For functional parts needing a bit more strength and flexibility' },
    ],
    recentTitle: '🖨️ Recent Prints',
    recentSubtitle: 'Here are the latest models I\'ve printed. I\'ll keep this updated as new prints come off the build plate.',
    viewModel: 'View Model',
    prints: [
      {
        title: 'DK Bananza',
        image: '/img/3dprinting/dk-bananza.jpg',
        printer: 'Bambu Lab P1S',
        filament: 'PLA',
        description: 'A fun multi-color Donkey Kong Bananza figure, a great showcase for the AMS Pro 2 multi-filament capability.',
        url: 'https://cults3d.com/en/3d-model/art/donkey-kong-bananza-gom3d-2',
        source: 'Cults3D',
      },
      {
        title: 'Fallout Vault Boy Controller Holder',
        image: '/img/3dprinting/fallout-controller-holder.jpg',
        printer: 'Bambu Lab P1S',
        filament: 'PLA',
        description: 'A Vault Boy controller holder, functional desk art for any Fallout fan with a controller to park.',
        url: 'https://makerworld.com/en/models/2045699-fallout-3-4-vault-boy-controller-holder-101-111',
        source: 'MakerWorld',
      },
      {
        title: 'Chico a Bordo (Custom Sign)',
        image: '/img/3dprinting/chico-a-bordo.jpg',
        printer: 'Bambu Lab P1S',
        filament: 'PLA',
        description: 'A custom "Chico a Bordo" (Baby on Board) sign designed in Tinkercad, a personalized print for the car.',
        url: 'https://www.tinkercad.com/things/detI9b0KvKk-chico-a-bordo',
        source: 'Tinkercad',
      },
    ],
    modelsTitle: 'Find Great Models',
    highlightsLabel: 'Highlights',
  },
  es: {
    title: 'Impresión 3D',
    description: 'Mi configuración de impresión 3D, impresoras y prints recientes, Bambu Lab P1S con 2 AMS Pro 2 y Flashforge Adventure Pro 3.',
    heroTitle: '🖨️ Impresión 3D',
    heroSubtitle: 'La impresión 3D combina tecnología, creatividad e ingeniería de una manera que pocos hobbies logran. Ya sea prototipando una pieza funcional, imprimiendo un modelo divertido o experimentando con nuevos materiales, siempre hay algo en la plataforma de impresión.',
    printersTitle: 'Mis Impresoras',
    primaryLabel: '🟠 Impresora Principal',
    secondaryLabel: '⚪ Impresora Secundaria',
    bambu: {
      name: 'Bambu Lab P1S',
      description: 'Una impresora FDM de alta velocidad completamente cerrada, diseñada para confiabilidad e impresión multimaterial. Mi máquina preferida para prints de calidad, modelos multicolor y proyectos divertidos.',
      features: [
        'Cámara completamente cerrada para una calidad de impresión consistente',
        'Impresión de alta velocidad con compensación activa de vibraciones',
        'Auto-calibración, detección de primera capa, sensores de fin de filamento',
        'Cámara para timelapse y monitoreo remoto',
      ],
      amsTitle: '2 × AMS Pro 2',
      amsDescription: 'Dos unidades AMS Pro 2 me dan hasta 8 bobinas de filamento cargadas simultáneamente, perfecto para prints multicolor sin cambios manuales.',
    },
    flashforge: {
      name: 'Flashforge Adventure Pro 3',
      description: 'Mi impresora secundaria para trabajos rápidos de un solo filamento, prototipado rápido y prints largos en paralelo mientras el P1S hace el trabajo multicolor.',
      features: [
        'Diseño compacto y completamente cerrado',
        'Impresión confiable de un solo filamento, PLA, PETG',
        'Operación silenciosa, ideal para impresiones nocturnas',
        'Laminado sencillo con FlashPrint',
      ],
    },
    materialsTitle: 'Materiales que Uso',
    materials: [
      { name: 'PLA / PLA+', use: 'Mi opción principal para prints cotidianos y modelos decorativos' },
      { name: 'PETG', use: 'Para piezas funcionales que necesitan un poco más de resistencia y flexibilidad' },
    ],
    recentTitle: '🖨️ Prints Recientes',
    recentSubtitle: 'Aquí están los últimos modelos que he imprimido. Actualizaré esta sección a medida que salgan nuevos prints.',
    viewModel: 'Ver Modelo',
    prints: [
      {
        title: 'DK Bananza',
        image: '/img/3dprinting/dk-bananza.jpg',
        printer: 'Bambu Lab P1S',
        filament: 'PLA',
        description: 'Una divertida figura multicolor de Donkey Kong Bananza, un excelente showcase de la capacidad multimaterial del AMS Pro 2.',
        url: 'https://cults3d.com/en/3d-model/art/donkey-kong-bananza-gom3d-2',
        source: 'Cults3D',
      },
      {
        title: 'Soporte de Control Vault Boy (Fallout)',
        image: '/img/3dprinting/fallout-controller-holder.jpg',
        printer: 'Bambu Lab P1S',
        filament: 'PLA',
        description: 'Un soporte de control con el Vault Boy, arte funcional de escritorio para cualquier fan de Fallout.',
        url: 'https://makerworld.com/en/models/2045699-fallout-3-4-vault-boy-controller-holder-101-111',
        source: 'MakerWorld',
      },
      {
        title: 'Chico a Bordo (Señal Personalizada)',
        image: '/img/3dprinting/chico-a-bordo.jpg',
        printer: 'Bambu Lab P1S',
        filament: 'PLA',
        description: 'Una señal personalizada "Chico a Bordo" diseñada en Tinkercad, un print a medida para el auto.',
        url: 'https://www.tinkercad.com/things/detI9b0KvKk-chico-a-bordo',
        source: 'Tinkercad',
      },
    ],
    modelsTitle: 'Encuentra Modelos',
    highlightsLabel: 'Características',
  },
  pt: {
    title: 'Impressão 3D',
    description: 'Minha configuração de impressão 3D, impressoras e prints recentes, Bambu Lab P1S com 2 AMS Pro 2 e Flashforge Adventure Pro 3.',
    heroTitle: '🖨️ Impressão 3D',
    heroSubtitle: 'A impressão 3D combina tecnologia, criatividade e engenharia de uma forma que poucos hobbies conseguem. Seja prototipando uma peça funcional, imprimindo um modelo divertido ou experimentando novos materiais, há sempre algo na plataforma de impressão.',
    printersTitle: 'Minhas Impressoras',
    primaryLabel: '🟠 Impressora Principal',
    secondaryLabel: '⚪ Impressora Secundária',
    bambu: {
      name: 'Bambu Lab P1S',
      description: 'Uma impressora FDM de alta velocidade totalmente fechada, projetada para confiabilidade e impressão multimaterial. Minha máquina preferida para prints de qualidade, modelos multicoloridos e projetos divertidos.',
      features: [
        'Câmara totalmente fechada para qualidade de impressão consistente',
        'Impressão de alta velocidade com compensação ativa de vibração',
        'Auto-calibração, detecção de primeira camada, sensores de fim de filamento',
        'Câmera para timelapse e monitoramento remoto',
      ],
      amsTitle: '2 × AMS Pro 2',
      amsDescription: 'Duas unidades AMS Pro 2 me dão até 8 bobinas de filamento carregadas simultaneamente, perfeito para prints multicoloridos sem trocas manuais.',
    },
    flashforge: {
      name: 'Flashforge Adventure Pro 3',
      description: 'Minha impressora secundária para trabalhos rápidos de filamento único, prototipagem rápida e impressões longas em paralelo enquanto o P1S cuida do trabalho multicolorido.',
      features: [
        'Design compacto e totalmente fechado',
        'Impressão confiável de filamento único, PLA, PETG',
        'Operação silenciosa, ótima para impressões noturnas',
        'Fatiamento simples via FlashPrint',
      ],
    },
    materialsTitle: 'Materiais que Utilizo',
    materials: [
      { name: 'PLA / PLA+', use: 'Minha escolha principal para prints do dia a dia e modelos decorativos' },
      { name: 'PETG', use: 'Para peças funcionais que precisam de mais resistência e flexibilidade' },
    ],
    recentTitle: '🖨️ Prints Recentes',
    recentSubtitle: 'Aqui estão os últimos modelos que imprimi. Manterei esta seção atualizada conforme novos prints saem da plataforma.',
    viewModel: 'Ver Modelo',
    prints: [
      {
        title: 'DK Bananza',
        image: '/img/3dprinting/dk-bananza.jpg',
        printer: 'Bambu Lab P1S',
        filament: 'PLA',
        description: 'Uma divertida figura multicolorida do Donkey Kong Bananza, um ótimo showcase da capacidade multimaterial do AMS Pro 2.',
        url: 'https://cults3d.com/en/3d-model/art/donkey-kong-bananza-gom3d-2',
        source: 'Cults3D',
      },
      {
        title: 'Suporte de Controle Vault Boy (Fallout)',
        image: '/img/3dprinting/fallout-controller-holder.jpg',
        printer: 'Bambu Lab P1S',
        filament: 'PLA',
        description: 'Um suporte de controle com o Vault Boy, arte funcional de mesa para qualquer fã de Fallout.',
        url: 'https://makerworld.com/en/models/2045699-fallout-3-4-vault-boy-controller-holder-101-111',
        source: 'MakerWorld',
      },
      {
        title: 'Chico a Bordo (Placa Personalizada)',
        image: '/img/3dprinting/chico-a-bordo.jpg',
        printer: 'Bambu Lab P1S',
        filament: 'PLA',
        description: 'Uma placa personalizada "Chico a Bordo" projetada no Tinkercad, um print personalizado para o carro.',
        url: 'https://www.tinkercad.com/things/detI9b0KvKk-chico-a-bordo',
        source: 'Tinkercad',
      },
    ],
    modelsTitle: 'Encontre Modelos',
    highlightsLabel: 'Destaques',
  },
};

const cardStyle = {
  background: 'var(--ifm-card-background-color)',
  borderRadius: '16px',
  padding: '2rem',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  border: '1px solid var(--ifm-color-emphasis-200)',
};

const badgeStyle = (color) => ({
  display: 'inline-block',
  padding: '0.3rem 0.85rem',
  borderRadius: '20px',
  fontSize: '0.8rem',
  fontWeight: '600',
  background: color,
  color: '#fff',
  marginBottom: '1rem',
});

function PrintCard({ print, viewModelLabel }) {
  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{
        height: '200px',
        borderRadius: '10px',
        overflow: 'hidden',
        background: 'var(--ifm-color-emphasis-100)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <img
          src={print.image}
          alt={print.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement.innerHTML = '<span style="font-size:3rem">🖨️</span>';
          }}
        />
      </div>
      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{print.title}</h3>
      <p style={{ margin: 0, color: 'var(--ifm-font-color-secondary)', fontSize: '0.9rem', lineHeight: 1.6, flex: 1 }}>
        {print.description}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.82rem', color: 'var(--ifm-font-color-secondary)' }}>
        <span>🖨️ <strong>{print.printer}</strong></span>
        <span>🎨 <strong>{print.filament}</strong></span>
      </div>
      <a
        href={print.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          padding: '0.5rem 1.1rem',
          borderRadius: '20px',
          background: 'var(--ifm-color-primary)',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: '600',
          fontSize: '0.85rem',
          alignSelf: 'flex-start',
        }}
      >
        {viewModelLabel} — {print.source} →
      </a>
    </div>
  );
}

export default function PrintingPage() {
  const lang = useLocale();
  const t = translations[lang] || translations.en;

  return (
    <Layout title={t.title} description={t.description}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--ifm-color-primary) 0%, var(--ifm-color-primary-darker) 100%)',
        padding: '4rem 2rem',
        textAlign: 'center',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div aria-hidden="true" style={{ position: 'absolute', top: '15%', left: '8%', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div aria-hidden="true" style={{ position: 'absolute', bottom: '10%', right: '12%', width: '130px', height: '130px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '2.75rem', fontWeight: '800', marginBottom: '1rem', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
            {t.heroTitle}
          </h1>
          <p style={{ fontSize: '1.15rem', maxWidth: '640px', margin: '0 auto', opacity: 0.95, lineHeight: 1.7 }}>
            {t.heroSubtitle}
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '3rem 1.5rem', maxWidth: '1100px' }}>

        {/* Printers */}
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.8rem', fontWeight: '700' }}>
          {t.printersTitle}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>

          {/* Bambu Lab P1S */}
          <div style={cardStyle}>
            <span style={badgeStyle('#e05c00')}>{t.primaryLabel}</span>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem' }}>
              <a href="https://bambulab.com/en/p1" target="_blank" rel="noopener noreferrer">{t.bambu.name}</a>
            </h3>
            <p style={{ color: 'var(--ifm-font-color-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              {t.bambu.description}
            </p>
            <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ifm-color-primary)' }}>{t.highlightsLabel}</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem', color: 'var(--ifm-font-color-secondary)', fontSize: '0.9rem' }}>
              {t.bambu.features.map((f) => <li key={f} style={{ marginBottom: '0.3rem' }}>{f}</li>)}
            </ul>
            <div style={{ marginTop: '1.25rem', background: 'var(--ifm-color-emphasis-100)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
              <strong style={{ fontSize: '0.95rem', color: 'var(--ifm-font-color-base)' }}>{t.bambu.amsTitle}</strong>
              <p style={{ fontSize: '0.88rem', color: 'var(--ifm-font-color-secondary)', margin: '0.5rem 0 0', lineHeight: 1.5 }}>
                {t.bambu.amsDescription}
              </p>
            </div>
          </div>

          {/* Flashforge Adventure Pro 3 */}
          <div style={cardStyle}>
            <span style={badgeStyle('#555')}>{t.secondaryLabel}</span>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem' }}>{t.flashforge.name}</h3>
            <p style={{ color: 'var(--ifm-font-color-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              {t.flashforge.description}
            </p>
            <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ifm-color-primary)' }}>{t.highlightsLabel}</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem', color: 'var(--ifm-font-color-secondary)', fontSize: '0.9rem' }}>
              {t.flashforge.features.map((f) => <li key={f} style={{ marginBottom: '0.3rem' }}>{f}</li>)}
            </ul>
          </div>
        </div>

        {/* Materials */}
        <div style={{ ...cardStyle, marginBottom: '3rem' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem' }}>{t.materialsTitle}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {t.materials.map((m) => (
              <div key={m.name} style={{ background: 'var(--ifm-color-emphasis-100)', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                <div style={{ fontWeight: '700', marginBottom: '0.3rem' }}>{m.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--ifm-font-color-secondary)', lineHeight: 1.5 }}>{m.use}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Prints */}
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '1.8rem', fontWeight: '700' }}>
          {t.recentTitle}
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--ifm-font-color-secondary)', marginBottom: '2rem' }}>
          {t.recentSubtitle}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
          {t.prints.map((print) => (
            <PrintCard key={print.title} print={print} viewModelLabel={t.viewModel} />
          ))}
        </div>

        {/* Model Sources */}
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 1.25rem 0' }}>{t.modelsTitle}</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { label: '🔶 MakerWorld', url: 'https://makerworld.com' },
              { label: '🔵 Printables', url: 'https://www.printables.com' },
              { label: '🟠 Thingiverse', url: 'https://www.thingiverse.com' },
              { label: '🔴 Cults3D', url: 'https://cults3d.com' },
            ].map(({ label, url }) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '25px',
                background: 'var(--ifm-color-emphasis-100)',
                color: 'var(--ifm-font-color-base)',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.95rem',
                border: '1px solid var(--ifm-color-emphasis-300)',
              }}>{label}</a>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
}
