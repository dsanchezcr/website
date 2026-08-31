import React from 'react';

const TRANSLATIONS = {
  en: {
    previous: 'Previous',
    next: 'Next',
    pageOf: (current, total) => `Page ${current} of ${total}`,
  },
  es: {
    previous: 'Anterior',
    next: 'Siguiente',
    pageOf: (current, total) => `Página ${current} de ${total}`,
  },
  pt: {
    previous: 'Anterior',
    next: 'Próximo',
    pageOf: (current, total) => `Página ${current} de ${total}`,
  },
};

const Pagination = ({ currentPage, totalPages, onPageChange, locale = 'en' }) => {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  const lang = (locale || 'en').split('-')[0];
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  return (
    <nav
      aria-label={t.pageOf(currentPage, totalPages)}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        margin: '2rem 0',
      }}
    >
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label={t.previous}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
          opacity: currentPage <= 1 ? 0.5 : 1,
        }}
      >
        {t.previous}
      </button>

      <span style={{ fontWeight: 600, color: 'var(--ifm-font-color-base)' }}>
        {t.pageOf(currentPage, totalPages)}
      </span>

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label={t.next}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
          opacity: currentPage >= totalPages ? 0.5 : 1,
        }}
      >
        {t.next}
      </button>
    </nav>
  );
};

export default Pagination;
