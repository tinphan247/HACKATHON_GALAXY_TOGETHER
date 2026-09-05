import React, { useState, useRef, useEffect } from 'react';

export interface BannerItem {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  action?: string;
  deeplink?: string;
}

interface PromotionCarouselProps {
  banners: BannerItem[];
  onBannerClick?: (banner: BannerItem) => void;
}

export const PromotionCarousel: React.FC<PromotionCarouselProps> = ({
  banners,
  onBannerClick,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInteractingRef = useRef(false);

  // Sync active dot on scroll
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    // Each item takes ~88% width with gap
    const itemWidth = clientWidth * 0.88 + 12;
    const index = Math.round(scrollLeft / itemWidth);
    if (index >= 0 && index < banners.length) {
      setActiveIndex(index);
    }
  };

  // Scroll to dot index
  const scrollToSlide = (index: number) => {
    if (!scrollRef.current) return;
    const itemWidth = scrollRef.current.clientWidth * 0.88 + 12;
    scrollRef.current.scrollTo({
      left: index * itemWidth,
      behavior: 'smooth',
    });
    setActiveIndex(index);
  };

  // Auto-play timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (isInteractingRef.current || banners.length <= 1) return;
      const nextIndex = (activeIndex + 1) % banners.length;
      scrollToSlide(nextIndex);
    }, 4500);

    return () => clearInterval(timer);
  }, [activeIndex, banners.length]);

  return (
    <section className="promo-carousel-section">
      <div
        ref={scrollRef}
        className="promo-carousel-track"
        onScroll={handleScroll}
        onTouchStart={() => { isInteractingRef.current = true; }}
        onTouchEnd={() => { isInteractingRef.current = false; }}
        onMouseEnter={() => { isInteractingRef.current = true; }}
        onMouseLeave={() => { isInteractingRef.current = false; }}
      >
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`promo-banner-slide ${index === activeIndex ? 'active' : ''}`}
            onClick={() => onBannerClick?.(banner)}
          >
            <div className="promo-banner-image-wrapper">
              <img
                src={banner.image}
                alt={banner.title}
                className="promo-banner-img"
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Dots */}
      <div className="promo-pagination-dots" role="tablist">
        {banners.map((banner, index) => (
          <button
            key={banner.id}
            type="button"
            className={`promo-dot ${index === activeIndex ? 'active' : ''}`}
            onClick={() => scrollToSlide(index)}
            aria-label={`Slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};
