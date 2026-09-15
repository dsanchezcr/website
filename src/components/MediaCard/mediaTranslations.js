export const mediaTranslations = {
  en: {
    myRating: 'My', loading: 'Loading content...', empty: 'No titles to display yet.',
    error: 'Failed to load content. Please try again later.',
    invalidType: 'Invalid content type. Expected movies or series.',
    untitled: 'Untitled', noPoster: 'Poster unavailable', credits: 'Data and image credits',
    attribution: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
  },
  es: {
    myRating: 'Mi nota', loading: 'Cargando contenido...', empty: 'Aún no hay títulos para mostrar.',
    error: 'No se pudo cargar el contenido. Inténtalo de nuevo más tarde.',
    invalidType: 'Tipo de contenido no válido. Se esperaba movies o series.',
    untitled: 'Sin título', noPoster: 'Póster no disponible', credits: 'Créditos de datos e imágenes',
    attribution: 'Este producto utiliza la API de TMDB, pero no está avalado ni certificado por TMDB.',
  },
  pt: {
    myRating: 'Minha nota', loading: 'Carregando conteúdo...', empty: 'Ainda não há títulos para exibir.',
    error: 'Não foi possível carregar o conteúdo. Tente novamente mais tarde.',
    invalidType: 'Tipo de conteúdo inválido. Esperava-se movies ou series.',
    untitled: 'Sem título', noPoster: 'Pôster indisponível', credits: 'Créditos de dados e imagens',
    attribution: 'Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.',
  },
};

export const resolveMediaText = (value, locale) => {
  if (typeof value === 'string') return value;
  return value?.[locale] || value?.en || '';
};
