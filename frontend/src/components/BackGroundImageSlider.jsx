import React, { useState, useEffect } from 'react';
import backgroundImg1 from '../assets/backgroundpdf.jpg'
import backgroundImg2 from '../assets/flipback.jpg'


const ImageSlider = () => {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

const API_BASE = import.meta.env.VITE_API_URL;

  // Fetch images from backend
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/imageslider`);
        const data = await res.json();
        if (res.ok && data.images) {
          setImages(data.images);
        }
      } catch (err) {
        console.error('Error fetching slider images:', err);
        // Fallback to default images if API fails
        setImages([
         backgroundImg1,
         backgroundImg2
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [API_BASE]);

  // Auto slide every 5 seconds
  useEffect(() => {
    if (images.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">No slider images available</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Slider Images */}
      {images.map((image, index) => (
        <div
          key={image.id || index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={typeof image === 'string' ? image : image.imageUrl}
            alt={`Slide ${index + 1}`}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
      
      {/* Navigation Dots */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentIndex ? 'bg-white' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageSlider;