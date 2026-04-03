import React from 'react';
import styles from './YouTubeEmbed.module.css';

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export default function YouTubeEmbed({ videoId, title }) {
  if (!YOUTUBE_ID_PATTERN.test(videoId)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`YouTubeEmbed: invalid videoId "${videoId}"`);
    }
    return null;
  }
  const normalizedTitle = typeof title === 'string' ? title.trim() : '';
  const iframeTitle = normalizedTitle || `YouTube video ${videoId}`;
  if (!normalizedTitle && process.env.NODE_ENV === 'development') {
    console.warn(`YouTubeEmbed: missing or empty title for videoId "${videoId}", falling back to "${iframeTitle}"`);
  }
  return (
    <div className={styles.wrapper}>
      <iframe
        className={styles.iframe}
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={iframeTitle}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
