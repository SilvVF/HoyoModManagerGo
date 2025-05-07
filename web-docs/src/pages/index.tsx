import React, { useState, useEffect, useRef } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

function HomepageHeader() {
  const [currentImage, setCurrentImage] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const images = [
    {
      src: "https://github.com/user-attachments/assets/7a45dbac-7fa9-41ca-9fd0-c740582de09d",
      alt: "HoyoModManager Desktop Screenshot"
    },
    {
      src: "https://github.com/user-attachments/assets/2e18e498-6216-468f-a0a8-4540623bfd8f",
      alt: "HoyoModManager Android Screenshot"
    }
  ];

  const startRotation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setCurrentImage(prev => (prev + 1) % images.length);
    }, 8000);
  };

  useEffect(() => {
    startRotation();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleNav = (direction: 'prev' | 'next') => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    setCurrentImage(prev => {
      if (direction === 'prev') {
        return (prev - 1 + images.length) % images.length;
      }
      return (prev + 1) % images.length;
    });

    startRotation();
  };

  return (
    <header className={styles.heroBanner}>
      <div className={styles.hero__container}>
        <div className={styles.hero__content}>
          <h1 className={styles.hero__title}>HoyoModManager</h1>
          <p className={styles.hero__text}>
            Powerful and intuitive skin mod manager for Hoyo Games and Wuthering Waves
          </p>
          <p className={styles.hero__tagline}>
            Discover, install, and manage game mods with ease – bringing customization to your favorite games
          </p>
          <div className={styles.buttons}>
            <Link
              className="button button--primary button--lg"
              to="/docs/overview">
              Get Started
            </Link>
            <Link
              className="button button--secondary button--lg"
              to="https://github.com/SilvVF/HoyoModManagerGo/releases/">
              Download
            </Link>
          </div>
        </div>
        <div className={styles.hero__image}>
          {images.map((image, index) => (
            <img 
              key={index}
              src={image.src} 
              alt={image.alt}
              className={`${styles.hero__image__img} ${index === currentImage ? styles.active : ''}`}
            />
          ))}
          <button 
            className={`${styles.hero__image__nav} ${styles.prev}`}
            onClick={() => handleNav('prev')}
            aria-label="Previous image"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button 
            className={`${styles.hero__image__nav} ${styles.next}`}
            onClick={() => handleNav('next')}
            aria-label="Next image"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

export default function Home(): React.ReactNode {
  return (
    <Layout
      title="Home"
      description="Skin Mod Manager for Hoyo Games and Wuthering Waves">
      <HomepageHeader />
    </Layout>
  );
} 