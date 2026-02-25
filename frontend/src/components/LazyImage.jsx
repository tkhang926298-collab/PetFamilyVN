import React, { useState, useRef, useEffect } from 'react';

/**
 * LazyImage — Only loads when scrolled into viewport.
 * Shows a shimmer placeholder until the image is visible, then loads `src`.
 *
 * @param {string} src - Image URL
 * @param {string} alt - Alt text
 * @param {object} style - Additional inline styles
 * @param {string} className - CSS class
 * @param {string} fallback - Fallback image URL if src fails
 */
export default function LazyImage({ src, alt = '', style = {}, className = '', fallback, ...rest }) {
    const [isVisible, setIsVisible] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' } // Start loading 200px before entering viewport
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const handleError = () => {
        setError(true);
        if (fallback) setLoaded(true);
    };

    const shimmerStyle = {
        background: 'linear-gradient(90deg, #2a2a3e 25%, #3a3a5e 50%, #2a2a3e 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: style.borderRadius || '8px',
        width: style.width || '100%',
        height: style.height || '200px',
        ...style,
    };

    return (
        <div ref={imgRef} style={{ display: 'inline-block', position: 'relative', ...(!loaded ? shimmerStyle : {}) }} className={className}>
            {isVisible && (
                <img
                    src={error && fallback ? fallback : src}
                    alt={alt}
                    onLoad={() => setLoaded(true)}
                    onError={handleError}
                    style={{
                        ...style,
                        opacity: loaded ? 1 : 0,
                        transition: 'opacity 0.3s ease-in',
                        display: 'block',
                    }}
                    {...rest}
                />
            )}
            <style>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>
        </div>
    );
}
