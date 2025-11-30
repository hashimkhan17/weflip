import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from './context/ThemContext';
import HomePage from "./pages/HomePage";
import FlipbookViewer from "./pages/PdfFlipPageViewr";
import Navbar from "./components/Header";
import AdminPanel from "./pages/AdminPanel";
import ImageSliderAdmin from './components/ImageSliderAdmin';

export default function App() {
  return (
    <ThemeProvider>
      
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
         <BrowserRouter>
        <Navbar/>
       
          <Routes>
            {/* Home / Upload page */}
            <Route path="/" element={<HomePage/>} />

            {/* CHANGED: Flipbook viewer with ID parameter */}
            <Route path="/book/:flipbookId" element={<FlipbookViewer/>} />
            
            {/* ADD THIS: Support for old URL format */}
            <Route path="/flipbook/view/:accessToken" element={<FlipbookViewer/>} />
           
            <Route path="/admin/slider" element={<ImageSliderAdmin />} />
            <Route path="/admin" element={<AdminPanel/>}/>
            <Route path="/admin/image-slider" element={<ImageSliderAdmin />} />
          </Routes>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}



