import React from 'react';
import PropTypes from 'prop-types';
import styles from './YouTubeEmbed.module.css';

export default function YouTubeEmbed({ videoId, title }) {
  return (
    <div className={styles.wrapper}>
      <iframe
        className={styles.iframe}
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

YouTubeEmbed.propTypes = {
  videoId: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
};
