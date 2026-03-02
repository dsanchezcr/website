import React from 'react';
import Layout from '@theme/Layout';
import { useLocale } from '@site/src/hooks';
import { MovieCard } from '@site/src/components/Movies';
import moviesData from '@site/src/data/movies.json';

const translations = {
  en: {
    title: 'Movies',
    description: 'A list of the last movies I watched at AMC and my reviews.',
    heroTitle: 'Movies I Watched',
    heroSubtitle: 'A personal log of my most recent AMC visits with ratings and quick reviews.',
    recentTitle: 'Last 10 Movies',
    recentSubtitle: 'Based on my AMC account history. Reviews are curated here.',
    labels: {
      theatre: 'Theatre',
      watchDate: 'Watch date',
      watchTime: 'Showtime',
      rating: 'Rating',
      ratingPending: 'Rating pending',
      review: 'Review:',
      genres: 'Genres',
      format: 'Format',
    },
  },
  es: {
    title: 'Peliculas',
    description: 'Una lista de las ultimas peliculas que vi en AMC y mis resenas.',
    heroTitle: 'Peliculas que vi',
    heroSubtitle: 'Un registro personal de mis visitas recientes a AMC con calificaciones y resenas cortas.',
    recentTitle: 'Ultimas 10 peliculas',
    recentSubtitle: 'Basado en mi historial de AMC. Las resenas se curan aqui.',
    labels: {
      theatre: 'Cine',
      watchDate: 'Fecha',
      watchTime: 'Hora',
      rating: 'Calificacion',
      ratingPending: 'Calificacion pendiente',
      review: 'Resena:',
      genres: 'Generos',
      format: 'Formato',
    },
  },
  pt: {
    title: 'Filmes',
    description: 'Uma lista dos ultimos filmes que assisti na AMC e minhas resenhas.',
    heroTitle: 'Filmes que assisti',
    heroSubtitle: 'Um registro pessoal das minhas visitas recentes a AMC com notas e resenhas curtas.',
    recentTitle: 'Ultimos 10 filmes',
    recentSubtitle: 'Baseado no meu historico da AMC. As resenhas sao curadas aqui.',
    labels: {
      theatre: 'Cinema',
      watchDate: 'Data',
      watchTime: 'Horario',
      rating: 'Nota',
      ratingPending: 'Nota pendente',
      review: 'Resenha:',
      genres: 'Generos',
      format: 'Formato',
    },
  },
};

const localeMap = {
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
};

const getSortValue = (movie) => {
  const time = movie.watchTime ? movie.watchTime : '00:00';
  const date = new Date(`${movie.watchDate}T${time}`);
  const value = date.getTime();
  return Number.isNaN(value) ? 0 : value;
};

const formatDate = (localeKey, watchDate, watchTime) => {
  const locale = localeMap[localeKey] || localeMap.en;
  const time = watchTime ? watchTime : '00:00';
  const date = new Date(`${watchDate}T${time}`);
  if (Number.isNaN(date.getTime())) {
    return { date: watchDate, time: watchTime || '' };
  }

  return {
    date: date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }),
    time: watchTime ? date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }) : '',
  };
};

export default function MoviesPage() {
  const lang = useLocale();
  const t = translations[lang] || translations.en;

  const sortedMovies = [...moviesData].sort((a, b) => getSortValue(b) - getSortValue(a)).slice(0, 10);

  return (
    <Layout title={t.title} description={t.description}>
      <div
        style={{
          background: 'linear-gradient(135deg, #2b3a55 0%, #141b2d 100%)',
          padding: '4rem 2rem',
          textAlign: 'center',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '10%',
            left: '8%',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '12%',
            right: '10%',
            width: '130px',
            height: '130px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            pointerEvents: 'none',
          }}
        />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '2.6rem', fontWeight: '800', marginBottom: '1rem' }}>{t.heroTitle}</h1>
          <p style={{ fontSize: '1.1rem', maxWidth: '680px', margin: '0 auto', opacity: 0.95, lineHeight: 1.7 }}>
            {t.heroSubtitle}
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '3rem 1.5rem', maxWidth: '1100px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '1.9rem', fontWeight: '700' }}>
          {t.recentTitle}
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--ifm-font-color-secondary)', marginBottom: '2rem' }}>
          {t.recentSubtitle}
        </p>

        {sortedMovies.map((movie) => {
          const formatted = formatDate(lang, movie.watchDate, movie.watchTime);
          return (
            <MovieCard
              key={movie.id}
              title={movie.title}
              theatre={movie.theatre}
              theatreLabel={t.labels.theatre}
              watchDateLabel={t.labels.watchDate}
              watchDateValue={formatted.date}
              watchTimeLabel={t.labels.watchTime}
              watchTimeValue={formatted.time}
              ratingLabel={t.labels.rating}
              ratingValue={movie.rating}
              ratingPendingLabel={t.labels.ratingPending}
              review={movie.review}
              reviewLabel={t.labels.review}
              genresLabel={t.labels.genres}
              genres={movie.genres}
              posterUrl={movie.posterUrl}
              externalUrl={movie.externalUrl}
              format={movie.format}
              formatLabel={t.labels.format}
            />
          );
        })}
      </div>
    </Layout>
  );
}
