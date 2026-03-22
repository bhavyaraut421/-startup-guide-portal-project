import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const stories = [
  {
    id: 1,
    name: "Sarah Jenkins",
    startup: "EcoPack Solutions",
    role: "Founder & CEO",
    quote: "The startup guide helped me navigate complex environmental regulations and secure my first seed grant. We're now supplying to 50+ local cafes!",
    image: "https://picsum.photos/seed/sarah/400/400?blur=2"
  },
  {
    id: 2,
    name: "David Chen",
    startup: "TechMentor AI",
    role: "Co-founder",
    quote: "Using the AI Idea Generator gave us the pivot we needed. The cost calculator also kept our initial burn rate incredibly low.",
    image: "https://picsum.photos/seed/david/400/400?blur=2"
  },
  {
    id: 3,
    name: "Maya Patel",
    startup: "Artisan Connect",
    role: "Founder",
    quote: "I found the perfect government scheme for women entrepreneurs through this portal. It changed everything for my artisan marketplace.",
    image: "https://picsum.photos/seed/maya/400/400?blur=2"
  }
];

export default function SuccessStoriesCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const nextSlide = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % stories.length);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + stories.length) % stories.length);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
      scale: 0.95,
      filter: "blur(4px)",
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0,
      scale: 0.95,
      filter: "blur(4px)",
    }),
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h2 className="text-sm font-bold tracking-widest text-emerald-600 uppercase mb-3">Success Stories</h2>
        <p className="text-3xl md:text-4xl font-extrabold text-slate-900">See how others turned their ideas into reality.</p>
      </div>

      <div className="relative bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-white to-slate-50/50 pointer-events-none" />
        
        <div className="relative h-[500px] md:h-[350px] flex items-center justify-center overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.4 },
                scale: { duration: 0.4 },
                filter: { duration: 0.3 }
              }}
              className="absolute inset-0 flex flex-col md:flex-row items-center justify-center p-8 md:p-16 gap-10 md:gap-16"
            >
              <div className="flex-shrink-0 relative group">
                <div className="w-36 h-36 md:w-56 md:h-56 rounded-full overflow-hidden border-[6px] border-white shadow-xl transition-transform duration-500 group-hover:scale-105">
                  <img 
                    src={stories[currentIndex].image} 
                    alt={stories[currentIndex].name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 bg-emerald-600 text-white p-4 rounded-full shadow-xl transform transition-transform duration-500 group-hover:rotate-12">
                  <Quote className="w-6 h-6 md:w-8 md:h-8 fill-current" />
                </div>
              </div>
              
              <div className="flex-1 text-center md:text-left max-w-2xl">
                <p className="text-xl md:text-2xl text-slate-800 font-medium leading-relaxed mb-8">
                  "{stories[currentIndex].quote}"
                </p>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <h4 className="text-xl font-bold text-slate-900">{stories[currentIndex].name}</h4>
                  <span className="hidden md:inline text-slate-300">|</span>
                  <p className="text-emerald-600 font-semibold tracking-wide">{stories[currentIndex].role}, {stories[currentIndex].startup}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 md:pl-8 pointer-events-none">
          <button 
            onClick={prevSlide}
            className="pointer-events-auto bg-white/90 backdrop-blur-sm hover:bg-emerald-50 p-3 md:p-4 rounded-full shadow-lg border border-slate-100 text-slate-600 hover:text-emerald-600 transition-all hover:scale-110 active:scale-95 z-10"
            aria-label="Previous story"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-4 md:pr-8 pointer-events-none">
          <button 
            onClick={nextSlide}
            className="pointer-events-auto bg-white/90 backdrop-blur-sm hover:bg-emerald-50 p-3 md:p-4 rounded-full shadow-lg border border-slate-100 text-slate-600 hover:text-emerald-600 transition-all hover:scale-110 active:scale-95 z-10"
            aria-label="Next story"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-10">
          {stories.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'w-8 bg-emerald-600' 
                  : 'w-2.5 bg-slate-300 hover:bg-emerald-400'
              }`}
              aria-label={`Go to story ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
