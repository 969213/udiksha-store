import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?q=80&w=1400', // Premium Indian wedding scene / luxury
    title: 'Royal Heritage Velvet Collection',
    subtitle: 'Adorn yourself in pure royalty. Handcrafted velvet sherwanis adorned with premium zari work.',
    badge: 'Royal Wedding Collection',
    category: 'Sherwani'
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=1400', // Saree details
    title: 'Exquisite Banarasi Silk Sarees',
    subtitle: 'Classic silk threads woven together with deep indigo blues and glowing orange accents.',
    badge: 'Royal Sarees',
    category: 'Saree'
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=1400', // Modern ethnic dress
    title: 'Modern Fusion Couture',
    subtitle: 'Perfect blend of western cuts and eastern handloom kurtas and lehenga sets.',
    badge: 'Boutique Exclusive',
    category: 'Lehenga'
  }
];

export default function Hero({ onExploreCategory }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 6000); // changes every 6 seconds
    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
    setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  return (
    <div class="px-4 md:px-8 py-4">
      {/* Outer Banner with custom 32px rounded corner */}
      <div class="relative h-[400px] md:h-[550px] w-full rounded-hero overflow-hidden shadow-xl shadow-brand-blue/5">
        
        {/* Carousel Slides */}
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            class={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {/* Dark gradient overlay for text readability */}
            <div class="absolute inset-0 bg-gradient-to-r from-brand-blue/80 via-brand-blue/40 to-transparent z-10" />
            
            <img
              src={slide.image}
              alt={slide.title}
              class="h-full w-full object-cover object-center scale-105 transform transition-transform duration-[6000ms]"
            />

            {/* Slide Content */}
            <div class="absolute inset-0 flex flex-col justify-center px-8 md:px-16 z-20 max-w-2xl text-white">
              
              {/* Badge */}
              <div class="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-brand-orange text-[10px] md:text-xs font-extrabold uppercase tracking-widest mb-4 border border-brand-orange-light/20 shadow-md">
                <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                {slide.badge}
              </div>

              {/* Cross-faded Heading */}
              <h1 class="font-serif-brand text-3xl md:text-6xl font-bold leading-tight tracking-wide drop-shadow-md mb-3 text-white">
                {slide.title}
              </h1>

              {/* Subtitle */}
              <p class="text-sm md:text-lg text-slate-100 font-light max-w-lg mb-8 drop-shadow-sm leading-relaxed">
                {slide.subtitle}
              </p>

              {/* Action Link */}
              <button
                onClick={() => onExploreCategory(slide.category)}
                class="self-start px-6 py-3.5 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-full font-bold text-xs md:text-sm tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-brand-orange/25"
              >
                Explore Collection
              </button>
            </div>
          </div>
        ))}

        {/* Manual Navigation Controls */}
        <button
          onClick={handlePrev}
          class="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full glass-panel text-brand-blue hover:bg-brand-blue hover:text-white transition-all duration-200 active:scale-90"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
        <button
          onClick={handleNext}
          class="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full glass-panel text-brand-blue hover:bg-brand-blue hover:text-white transition-all duration-200 active:scale-90"
        >
          <ChevronRight class="w-5 h-5" />
        </button>

        {/* Carousel Indicators (Dots) */}
        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              class={`h-2.5 rounded-full transition-all duration-300 ${
                index === current ? 'w-8 bg-brand-orange' : 'w-2.5 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
