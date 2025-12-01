import React, { useState, useEffect, useRef } from 'react';
import { ComicStory, ComicPanel } from '../types';
import { ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';

interface ComicCarouselProps {
    comicStory: ComicStory;
    onClose?: () => void;
}

export const ComicCarousel: React.FC<ComicCarouselProps> = ({ comicStory, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [imageLoading, setImageLoading] = useState<boolean[]>(new Array(6).fill(true));
    const carouselRef = useRef<HTMLDivElement>(null);

    const currentPanel = comicStory.panels[currentIndex];
    const totalPanels = comicStory.panels.length;

    // Minimum swipe distance (in px)
    const minSwipeDistance = 50;

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && currentIndex < totalPanels - 1) {
            goToNext();
        }
        if (isRightSwipe && currentIndex > 0) {
            goToPrevious();
        }
    };

    const goToNext = () => {
        if (currentIndex < totalPanels - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const goToPrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleImageLoad = (index: number) => {
        setImageLoading(prev => {
            const newLoading = [...prev];
            newLoading[index] = false;
            return newLoading;
        });
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') goToPrevious();
            if (e.key === 'ArrowRight') goToNext();
            if (e.key === 'Escape' && onClose) onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, onClose]);

    // Preload adjacent images
    useEffect(() => {
        const preloadImage = (url?: string) => {
            if (url) {
                const img = new Image();
                img.src = url;
            }
        };

        // Preload next and previous images
        if (currentIndex < totalPanels - 1) {
            preloadImage(comicStory.panels[currentIndex + 1]?.image_url);
        }
        if (currentIndex > 0) {
            preloadImage(comicStory.panels[currentIndex - 1]?.image_url);
        }
    }, [currentIndex, comicStory.panels, totalPanels]);

    return (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center">
            {/* Close Button */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 md:top-6 md:right-6 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md"
                    aria-label="Close comic"
                >
                    <X className="w-6 h-6" />
                </button>
            )}

            {/* Panel Counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white text-sm font-bold">
                {currentIndex + 1} / {totalPanels}
            </div>

            {/* Main Carousel Container */}
            <div className="w-full h-full flex items-center justify-center px-4 md:px-16">
                <div className="relative w-full max-w-2xl mx-auto">

                    {/* Left Arrow */}
                    <button
                        onClick={goToPrevious}
                        disabled={currentIndex === 0}
                        className={`absolute left-0 md:-left-16 top-1/2 -translate-y-1/2 z-40 p-3 md:p-4 rounded-full transition-all ${currentIndex === 0
                                ? 'opacity-0 cursor-not-allowed'
                                : 'bg-white/10 hover:bg-white/20 backdrop-blur-md text-white opacity-100'
                            }`}
                        aria-label="Previous panel"
                    >
                        <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
                    </button>

                    {/* Panel Display */}
                    <div
                        ref={carouselRef}
                        className="relative w-full aspect-[4/5] bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl overflow-hidden shadow-2xl"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Image */}
                        {currentPanel?.image_url && (
                            <>
                                {imageLoading[currentIndex] && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                                        <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
                                    </div>
                                )}
                                <img
                                    src={currentPanel.image_url}
                                    alt={`Panel ${currentIndex + 1}`}
                                    className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoading[currentIndex] ? 'opacity-0' : 'opacity-100'
                                        }`}
                                    onLoad={() => handleImageLoad(currentIndex)}
                                />
                            </>
                        )}

                        {/* Caption Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6 md:p-8">
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 md:p-6 border border-white/20">
                                <p className="text-white text-base md:text-lg font-serif leading-relaxed">
                                    {currentPanel?.narrative_caption}
                                </p>
                            </div>
                        </div>

                        {/* Progress Dots */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2">
                            {comicStory.panels.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentIndex(index)}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${index === currentIndex
                                            ? 'w-8 bg-white'
                                            : 'w-1.5 bg-white/40 hover:bg-white/60'
                                        }`}
                                    aria-label={`Go to panel ${index + 1}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right Arrow */}
                    <button
                        onClick={goToNext}
                        disabled={currentIndex === totalPanels - 1}
                        className={`absolute right-0 md:-right-16 top-1/2 -translate-y-1/2 z-40 p-3 md:p-4 rounded-full transition-all ${currentIndex === totalPanels - 1
                                ? 'opacity-0 cursor-not-allowed'
                                : 'bg-white/10 hover:bg-white/20 backdrop-blur-md text-white opacity-100'
                            }`}
                        aria-label="Next panel"
                    >
                        <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
                    </button>
                </div>
            </div>

            {/* Swipe Hint (Mobile Only) */}
            {currentIndex === 0 && (
                <div className="md:hidden absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-sm animate-pulse">
                    Swipe to navigate →
                </div>
            )}
        </div>
    );
};

/**
 * Compact Comic Preview Card
 * Shows a thumbnail preview of the comic story
 */
interface ComicPreviewCardProps {
    comicStory: ComicStory;
    onClick: () => void;
}

export const ComicPreviewCard: React.FC<ComicPreviewCardProps> = ({ comicStory, onClick }) => {
    const firstPanel = comicStory.panels[0];

    return (
        <button
            onClick={onClick}
            className="group relative w-full aspect-[4/5] rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
        >
            {/* Thumbnail */}
            {firstPanel?.image_url && (
                <img
                    src={firstPanel.image_url}
                    alt="Comic preview"
                    className="w-full h-full object-cover"
                />
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                        <p className="text-white text-sm font-bold mb-1">Comic Story</p>
                        <p className="text-white/80 text-xs">{comicStory.panels.length} panels • {comicStory.tone}</p>
                    </div>
                </div>
            </div>

            {/* Badge */}
            <div className="absolute top-4 right-4 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white text-xs font-bold shadow-lg">
                COMIC
            </div>
        </button>
    );
};
