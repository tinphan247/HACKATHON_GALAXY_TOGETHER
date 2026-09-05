import React, { useState } from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { StatusBar } from '../components/common/StatusBar';
import { HomeHeader } from '../components/home/HomeHeader';
import { PromotionCarousel, type BannerItem } from '../components/home/PromotionCarousel';
import { MovieTabs, type MovieCategoryTab } from '../components/home/MovieTabs';
import { MovieCard, type Movie } from '../components/home/MovieCard';
import { TogetherPopupModal } from '../components/home/TogetherPopupModal';
import { CitySelectorModal } from '../components/home/CitySelectorModal';
import { BottomNav } from '../components/common/BottomNav';

// Realistic Banners matching Image 2
const PROMO_BANNERS: BannerItem[] = [
  {
    id: 'b-danphuong',
    image: '/banners/banner_dan_phuong.jpg',
    title: 'Khai trương Galaxy Cinema Vincom Đan Phượng',
    subtitle: 'Hàng ngàn quà tặng: Miễn phí 01 lượt chụp Photobooth, 01 Pepsi, 01 Vé xem phim...',
    action: 'Xem ngay',
  },
  {
    id: 'b-together',
    image: '/banners/banner_together.jpg',
    title: 'Galaxy Together - Đặt vé nhóm cùng nhau',
    subtitle: 'Mỗi người chọn ghế & combo riêng, tự thanh toán không lo ứng tiền',
    action: 'Khám phá ngay',
    deeplink: 'screen-showtimes',
  },
];

// Realistic Now Showing Movies matching Image 2
const NOW_SHOWING_MOVIES: Movie[] = [
  {
    id: 'mv-hope',
    title: 'Hope Vùng Tử Địa',
    poster: '/posters/poster_hope.jpg',
    rating: 9.7,
    ageRating: 'T16',
    category: 'now_showing',
  },
  {
    id: 'mv-holinh',
    title: 'Hộ Linh Tráng Sĩ - Bí Ẩn Mộ Vua Đinh',
    poster: '/posters/poster_holinhtrangsi.jpg',
    rating: 8.2,
    ageRating: 'T13',
    category: 'now_showing',
  },
  {
    id: 'mv-01',
    title: 'Quý Tử Vượt Giàu',
    poster: '/posters/poster_quytuvuotgiau.jpg',
    rating: 8.4,
    ageRating: 'K',
    category: 'now_showing',
  },
  {
    id: 'mv-chiikawa',
    title: 'Chiikawa: Bí Mật Đảo Phú Sĩ',
    poster: '/posters/poster_chiikawa.jpg',
    rating: 9.0,
    ageRating: 'P',
    category: 'now_showing',
  },
];

// Upcoming Movies
const UPCOMING_MOVIES: Movie[] = [
  {
    id: 'mv-conan',
    title: 'Thám Tử Lừng Danh Conan: Ngôi Sao 5 Cánh',
    poster: '/posters/poster_conan.jpg',
    rating: 9.5,
    ageRating: 'K',
    releaseDate: '25/09',
    category: 'upcoming',
  },
  {
    id: 'mv-holinh-special',
    title: 'Hộ Linh Tráng Sĩ: Bản Đặc Biệt',
    poster: '/posters/poster_holinhtrangsi.jpg',
    rating: 8.8,
    ageRating: 'T16',
    releaseDate: '02/10',
    category: 'upcoming',
  },
];

export const HomeScreen: React.FC = () => {
  const { goTo, startSoloBooking } = useGroupSession();
  const [activeTab, setActiveTab] = useState<MovieCategoryTab>('now_showing');
  const [currentCity, setCurrentCity] = useState<string>('TP Hồ Chí Minh');
  const [isCityModalOpen, setIsCityModalOpen] = useState<boolean>(false);
  const [isTogetherPopupOpen, setIsTogetherPopupOpen] = useState<boolean>(true);

  // Handle movie card click
  const handleSelectMovie = (movie: Movie) => {
    startSoloBooking({
      movieId: movie.id,
      movieTitle: movie.title,
    });
    goTo('screen-showtimes');
  };

  // Handle banner click
  const handleBannerClick = (banner: BannerItem) => {
    startSoloBooking();
    if (banner.deeplink) {
      goTo(banner.deeplink as any);
    } else {
      goTo('screen-showtimes');
    }
  };

  return (
    <div className="screen production-home-screen">
      {/* 1. Status Bar */}
      <StatusBar />

      {/* 2. Top Header (Logo + City Selector + Bell) */}
      <HomeHeader
        currentCity={currentCity}
        onOpenCitySelector={() => setIsCityModalOpen(true)}
        notificationCount={2}
      />

      {/* 3. Scrollable Main Content */}
      <main className="body production-home-body">
        {/* Hero Promotion Carousel with peek effect & pagination dots */}
        <PromotionCarousel
          banners={PROMO_BANNERS}
          onBannerClick={handleBannerClick}
        />

        {/* Movie Tabs (Đang chiếu / Sắp chiếu + City link) */}
        <MovieTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentCity={currentCity}
          onOpenCitySelector={() => setIsCityModalOpen(true)}
        />

        {/* Movies Grid */}
        {activeTab === 'now_showing' ? (
          <div className="home-movies-container">
            <div className="production-movie-grid">
              {NOW_SHOWING_MOVIES.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onSelect={handleSelectMovie}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="home-movies-container">
            <div className="production-movie-grid">
              {UPCOMING_MOVIES.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onSelect={handleSelectMovie}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 4. Fixed Production Bottom Navigation */}
      <BottomNav
        activeTab="home"
        onTabSelect={(tab) => {
          if (tab === 'cinemas') goTo('screen-cinemas');
          else if (tab === 'cinetag') goTo('screen-cinetag');
          else if (tab === 'movies') goTo('screen-movies');
          else if (tab === 'account') goTo('screen-account');
        }}
      />

      {/* 5. City Selection Bottom Sheet */}
      <CitySelectorModal
        isOpen={isCityModalOpen}
        selectedCity={currentCity}
        onSelectCity={(city) => setCurrentCity(city)}
        onClose={() => setIsCityModalOpen(false)}
      />

      {/* 6. Galaxy Together Welcome Promotion Popup Modal */}
      <TogetherPopupModal
        isOpen={isTogetherPopupOpen}
        onClose={() => setIsTogetherPopupOpen(false)}
        onExplore={() => {
          setIsTogetherPopupOpen(false);
          goTo('screen-showtimes');
        }}
      />
    </div>
  );
};
