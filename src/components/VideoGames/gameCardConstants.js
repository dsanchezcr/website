const platformColors = {
  xbox: '#107C10',
  pc: '#6A1B9A',
  playstation: '#003087',
  'nintendo-switch': '#E4000F',
  'nintendo-switch-2': '#FF3C28',
  'meta-quest': '#1C1E20',
  'phone-mobile': '#34A853',
};

const platformLabels = {
  xbox: 'Xbox',
  pc: 'PC',
  playstation: 'PlayStation',
  'nintendo-switch': 'Nintendo Switch',
  'nintendo-switch-2': 'Nintendo Switch 2',
  'meta-quest': 'Meta Quest',
  'phone-mobile': 'Phone & Mobile',
};

const statusLabelsByLocale = {
  en: {
    completed: '✅ Completed',
    playing: '🎮 Currently Playing',
    backlog: '📋 Backlog',
    dropped: '❌ Dropped',
  },
  es: {
    completed: '✅ Completado',
    playing: '🎮 Jugando ahora',
    backlog: '📋 Pendientes',
    dropped: '❌ Abandonado',
  },
  pt: {
    completed: '✅ Concluido',
    playing: '🎮 Jogando agora',
    backlog: '📋 Pendentes',
    dropped: '❌ Abandonado',
  },
};

const getLocaleKey = (locale) => {
  if (!locale) return 'en';
  if (locale.startsWith('es')) return 'es';
  if (locale.startsWith('pt')) return 'pt';
  return 'en';
};

export { platformColors, platformLabels, statusLabelsByLocale, getLocaleKey };
