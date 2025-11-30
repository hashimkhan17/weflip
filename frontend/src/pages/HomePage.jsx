import React from 'react';
import ImageSlider from '../components/BackGroundImageSlider.jsx';
import PDFUploadForm from '../components/pdfflipBook.jsx';


const HomePage = () => {
  return (
    <div className="relative h-screen">
      {/* Background Slider */}
      <div className="absolute inset-0 z-0">
        <ImageSlider />
      </div>
      
      {/* Form on Left Side */}
      <div className="relative z-10 h-[70%] flex items-center">
        <div className="ml-12">
      <PDFUploadForm/>
        </div>
      </div>
    </div>
  );
};

export default HomePage;