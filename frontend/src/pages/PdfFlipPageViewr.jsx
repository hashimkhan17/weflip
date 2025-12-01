import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Copy, Share2 } from "lucide-react";
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemContext';
import backImg from "../assets/backgroundpdf.jpg"
import flipback from "../assets/flipback.jpg"

// Import page flip sounds
import pageFlipSound1 from "../assets/page-flip1.mp3";

export default function FlipbookViewer() {
  const { flipbookId, accessToken } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  
  // Use accessToken from location state or URL params
  const locationState = location.state || {};
  const actualAccessToken = locationState.accessToken || accessToken;
  
  const [flipbookData, setFlipbookData] = useState({
    flipbookId: flipbookId,
    totalPages: locationState.totalPages,
    userData: locationState.userData,
    server: locationState.server,
    accessToken: actualAccessToken
  });
  const [isLoadingData, setIsLoadingData] = useState(!locationState.totalPages);

  const [currentSpread, setCurrentSpread] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [showLinkPanel, setShowLinkPanel] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const [loadingPages, setLoadingPages] = useState({});
  const [pageImages, setPageImages] = useState({});
  
  const canvasRefs = useRef({});
  const audioRefs = useRef({
    flip1: new Audio(pageFlipSound1),
  });

   const API_BASE = import.meta.env.VITE_API_URL;

  // Optimized book dimensions for better fit
  const bookWidth = 320;
  const bookHeight = 450;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Preload and configure audio
  useEffect(() => {
    Object.values(audioRefs.current).forEach(audio => {
      audio.preload = 'auto';
      audio.volume = 0.4;
    });
  }, []);

  const playFlipSound = useCallback(() => {
    const soundKeys = Object.keys(audioRefs.current);
    const randomKey = soundKeys[Math.floor(Math.random() * soundKeys.length)];
    const audio = audioRefs.current[randomKey];
    
    audio.currentTime = 0;
    audio.play().catch(e => console.log('Audio play failed:', e));
  }, []);

  // Use accessToken in loadPDFPageAsImage
  const loadPDFPageAsImage = useCallback(async (pageNumber) => {
    if (pageImages[pageNumber] || loadingPages[pageNumber]) {
      return;
    }

    try {
      setLoadingPages(prev => ({ ...prev, [pageNumber]: true }));

      const response = await fetch(
        `${API_BASE}/api/flipbook/${actualAccessToken}/page/${pageNumber}`
      );

      if (!response.ok) {
        throw new Error(`Failed to load page ${pageNumber}`);
      }

      const pdfBlob = await response.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      const pdfjsLib = await import('pdfjs-dist/build/pdf');
      const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker?url');
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;

      const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
      const page = await pdf.getPage(1);
      
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      setPageImages(prev => ({
        ...prev,
        [pageNumber]: imageUrl
      }));

      URL.revokeObjectURL(pdfUrl);
      pdf.destroy();

    } catch (err) {
      setImageErrors(prev => ({ ...prev, [pageNumber]: true }));
    } finally {
      setLoadingPages(prev => {
        const newState = { ...prev };
        delete newState[pageNumber];
        return newState;
      });
    }
  }, [actualAccessToken, pageImages, loadingPages, API_BASE]);

  // Fetch flipbook data if accessed via direct URL
  useEffect(() => {
    const fetchFlipbookData = async () => {
      if (!actualAccessToken) {
        navigate('/');
        return;
      }

      if (locationState.totalPages) {
        setIsLoadingData(false);
        return;
      }

      try {
        setIsLoadingData(true);
        const response = await fetch(
          `${API_BASE}/api/flipbook/${actualAccessToken}/metadata`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch flipbook data');
        }

        const data = await response.json();
        setFlipbookData({
          flipbookId: data.flipbookId,
          totalPages: data.totalPages,
          userData: data.userData,
          server: data.server,
          accessToken: actualAccessToken
        });
      } catch (err) {
        navigate('/');
      } finally {
        setIsLoadingData(false);
      }
    };

    if (!locationState.totalPages) {
      fetchFlipbookData();
    }
  }, [actualAccessToken, locationState.totalPages, navigate, API_BASE]);

  // Page loading useEffect
  useEffect(() => {
    if (!actualAccessToken || !flipbookData.totalPages) return;

    const leftPageIndex = currentSpread * 2;
    const rightPageIndex = currentSpread * 2 + 1;

    const pagesToLoad = [];
    if (leftPageIndex < flipbookData.totalPages) {
      pagesToLoad.push(leftPageIndex + 1);
    }
    if (rightPageIndex < flipbookData.totalPages) {
      pagesToLoad.push(rightPageIndex + 1);
    }

    pagesToLoad.forEach(page => {
      if (!pageImages[page] && !loadingPages[page]) {
        loadPDFPageAsImage(page);
      }
    });

    const preloadPages = [];
    const nextSpread = currentSpread + 1;
    const prevSpread = currentSpread - 1;

    if (prevSpread >= 0) {
      const prevLeft = prevSpread * 2;
      const prevRight = prevSpread * 2 + 1;
      if (prevLeft < flipbookData.totalPages) preloadPages.push(prevLeft + 1);
      if (prevRight < flipbookData.totalPages) preloadPages.push(prevRight + 1);
    }

    if (nextSpread < Math.ceil(flipbookData.totalPages / 2)) {
      const nextLeft = nextSpread * 2;
      const nextRight = nextSpread * 2 + 1;
      if (nextLeft < flipbookData.totalPages) preloadPages.push(nextLeft + 1);
      if (nextRight < flipbookData.totalPages) preloadPages.push(nextRight + 1);
    }

    const uniquePreloadPages = [...new Set(preloadPages)].filter(
      page => !pageImages[page] && !loadingPages[page]
    );

    uniquePreloadPages.forEach(page => {
      loadPDFPageAsImage(page);
    });
  }, [currentSpread, actualAccessToken, flipbookData.totalPages, pageImages, loadingPages, loadPDFPageAsImage]);

  const backgroundImage = isDarkMode ? backImg : flipback;

  const copyToClipboard = async () => {
    if (flipbookData.server?.flipbookLink) {
      try {
        await navigator.clipboard.writeText(flipbookData.server.flipbookLink);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const shareLink = async () => {
    if (navigator.share && flipbookData.server?.flipbookLink) {
      try {
        await navigator.share({
          title: 'Check out this flipbook',
          text: 'Here is a flipbook I created:',
          url: flipbookData.server.flipbookLink,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      copyToClipboard();
    }
  };

  // Loading state
  if (isLoadingData) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl">Loading flipbook...</h2>
        </div>
      </div>
    );
  }

  const totalPages = locationState.totalPages || flipbookData.totalPages;
  
  if (!actualAccessToken || !totalPages) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
      }`}>
        <div className="text-center">
          <h2 className="text-2xl mb-4">No flipbook data found</h2>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 text-white transition-colors duration-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const leftPageIndex = currentSpread * 2;
  const rightPageIndex = currentSpread * 2 + 1;
  const totalSpreads = Math.ceil(totalPages / 2);

  const nextSpread = () => {
    if (currentSpread < totalSpreads - 1 && !isFlipping) {
      setFlipDirection("next");
      setIsFlipping(true);
      
      setTimeout(() => {
        playFlipSound();
      }, 150);
      
      setTimeout(() => {
        setCurrentSpread((p) => p + 1);
        setIsFlipping(false);
        setFlipDirection("");
      }, 600);
    }
  };

  const prevSpread = () => {
    if (currentSpread > 0 && !isFlipping) {
      setFlipDirection("prev");
      setIsFlipping(true);
      
      setTimeout(() => {
        playFlipSound();
      }, 150);
      
      setTimeout(() => {
        setCurrentSpread((p) => p - 1);
        setIsFlipping(false);
        setFlipDirection("");
      }, 600);
    }
  };

  const goToSpread = (index) => {
    if (index === currentSpread || isFlipping) return;
    setFlipDirection(index > currentSpread ? "next" : "prev");
    setIsFlipping(true);
    
    setTimeout(() => {
      playFlipSound();
    }, 150);
    
    setTimeout(() => {
      setCurrentSpread(index);
      setIsFlipping(false);
      setFlipDirection("");
    }, 600);
  };

  const goBack = () => {
    navigate('/');
  };

  const getPageImage = (pageIndex) => {
    const pageNumber = pageIndex + 1;
    return pageImages[pageNumber] || null;
  };

  const isPageLoading = (pageIndex) => {
    const pageNumber = pageIndex + 1;
    return loadingPages[pageNumber] || false;
  };

  const PageDisplay = ({ pageIndex, className = "" }) => {
    const pageNumber = pageIndex + 1;
    const imageUrl = getPageImage(pageIndex);
    const isLoading = isPageLoading(pageIndex);
    const hasError = imageErrors[pageNumber];

    if (isLoading) {
      return (
        <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${className}`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (hasError) {
      return (
        <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${className}`}>
          <span className="text-gray-500">Failed to load page {pageNumber}</span>
        </div>
      );
    }

    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt={`Page ${pageNumber}`}
          className={`w-full h-full object-contain bg-white ${className}`}
          draggable={false}
          loading="lazy"
        />
      );
    }

    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${className}`}>
        <span className="text-gray-500">Page {pageNumber}</span>
      </div>
    );
  };

  const displayTotalPages = locationState.totalPages || flipbookData.totalPages;
  const displayServer = locationState.server || flipbookData.server;

  return (
    <div 
      className="min-h-screen flex flex-col overflow-hidden transition-all duration-300"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <style>{`
        /* Realistic Book Flip Animations */
        @keyframes flipNextLeft {
          0% { 
            transform: perspective(1200px) rotateY(0deg);
            z-index: 2;
          }
          20% {
            transform: perspective(1200px) rotateY(-15deg);
            z-index: 2;
          }
          50% {
            transform: perspective(1200px) rotateY(-90deg);
            z-index: 4;
            box-shadow: -20px 5px 30px rgba(0,0,0,0.5);
            filter: brightness(0.95);
          }
          80% {
            transform: perspective(1200px) rotateY(-165deg);
            z-index: 4;
            box-shadow: -5px 2px 15px rgba(0,0,0,0.3);
          }
          100% { 
            transform: perspective(1200px) rotateY(-180deg);
            z-index: 1;
            box-shadow: -2px 0 8px rgba(0,0,0,0.2);
            filter: brightness(1);
          }
        }
        
        @keyframes flipNextRight {
          0% { 
            transform: perspective(1200px) rotateY(0deg);
            z-index: 1;
          }
          20% {
            transform: perspective(1200px) rotateY(0deg);
            z-index: 1;
          }
          50% {
            transform: perspective(1200px) rotateY(0deg);
            z-index: 2;
          }
          100% { 
            transform: perspective(1200px) rotateY(0deg);
            z-index: 2;
          }
        }
        
        @keyframes flipPrevRight {
          0% { 
            transform: perspective(1200px) rotateY(0deg);
            z-index: 2;
          }
          20% {
            transform: perspective(1200px) rotateY(15deg);
            z-index: 2;
          }
          50% {
            transform: perspective(1200px) rotateY(90deg);
            z-index: 4;
            box-shadow: 20px 5px 30px rgba(0,0,0,0.5);
            filter: brightness(0.95);
          }
          80% {
            transform: perspective(1200px) rotateY(165deg);
            z-index: 4;
            box-shadow: 5px 2px 15px rgba(0,0,0,0.3);
          }
          100% { 
            transform: perspective(1200px) rotateY(180deg);
            z-index: 1;
            box-shadow: 2px 0 8px rgba(0,0,0,0.2);
            filter: brightness(1);
          }
        }
        
        @keyframes flipPrevLeft {
          0% { 
            transform: perspective(1200px) rotateY(0deg);
            z-index: 1;
          }
          20% {
            transform: perspective(1200px) rotateY(0deg);
            z-index: 1;
          }
          50% {
            transform: perspective(1200px) rotateY(0deg);
            z-index: 2;
          }
          100% { 
            transform: perspective(1200px) rotateY(0deg);
            z-index: 2;
          }
        }

        .flip-next-left {
          animation: flipNextLeft 0.6s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
        }

        .flip-next-right {
          animation: flipNextRight 0.6s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
        }

        .flip-prev-right {
          animation: flipPrevRight 0.6s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
        }

        .flip-prev-left {
          animation: flipPrevLeft 0.6s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
        }

        .page-left {
          transform-origin: right center;
          box-shadow: 
            -3px 0 10px rgba(0,0,0,0.15),
            inset -1px 0 6px rgba(0,0,0,0.08);
          border-radius: 6px 0 0 6px;
        }

        .page-right {
          transform-origin: left center;
          box-shadow: 
            3px 0 10px rgba(0,0,0,0.15),
            inset 1px 0 6px rgba(0,0,0,0.08);
          border-radius: 0 6px 6px 0;
        }

        .book-spine {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 6px;
          background: linear-gradient(to right, 
            rgba(0,0,0,0.4), 
            rgba(0,0,0,0.2), 
            rgba(0,0,0,0.4)
          );
          transform: translateX(-50%);
          z-index: 3;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }

        .page-container {
          transform-style: preserve-3d;
          backface-visibility: hidden;
        }

        .flipbook-content {
          position: relative;
          z-index: 10;
        }

        /* Ensure the flipbook fits without scrolling */
        .flipbook-container {
          max-height: calc(100vh - 120px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        /* Compact header when link panel is hidden */
        .compact-header {
          padding: 0.75rem 1rem;
        }

        /* Book cover effect */
        .book-cover {
          background: linear-gradient(45deg, #8B4513, #A0522D, #CD853F);
          position: relative;
          overflow: hidden;
        }

        .book-cover::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, 
            rgba(255,255,255,0.1) 0%, 
            rgba(255,255,255,0) 20%,
            rgba(0,0,0,0.1) 50%,
            rgba(255,255,255,0.1) 80%,
            rgba(255,255,255,0) 100%);
        }
      `}</style>

      {/* Header - Becomes more compact when link panel is hidden */}
      <div className={`backdrop-blur-sm border-b flipbook-content transition-all duration-300 ${
        showLinkPanel && displayServer?.flipbookLink 
          ? 'px-4 py-3' 
          : 'compact-header px-4 py-2'
      } ${
        isDarkMode 
          ? 'bg-gray-900/80 border-gray-700 text-white' 
          : 'bg-white/80 border-gray-300 text-gray-900'
      }`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-sm">
            {isMobile ? (
              <span>Page {leftPageIndex + 1} / {displayTotalPages}</span>
            ) : (
              <div className="flex items-center gap-3">
                <span className="font-medium">Spread {currentSpread + 1} / {totalSpreads}</span>
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>•</span>
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                  Pages {leftPageIndex + 1}–{Math.min(rightPageIndex + 1, displayTotalPages)}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLinkPanel(!showLinkPanel)}
              className={`px-3 py-1 rounded text-sm transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {showLinkPanel ? 'Hide Link' : 'Show Link'}
            </button>
            
            <button
              onClick={goBack}
              className={`text-sm transition-colors duration-300 ${
                isDarkMode 
                  ? 'text-blue-400 hover:text-blue-300' 
                  : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              New PDF
            </button>
          </div>
        </div>
      </div>

      {/* Flipbook Link Panel */}
      {showLinkPanel && displayServer?.flipbookLink && (
        <div className={`backdrop-blur-sm border-b px-4 py-3 flipbook-content transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-blue-900/30 border-blue-700 text-blue-200' 
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Share2 size={16} />
                Flipbook Access Link
              </h3>
              <button
                onClick={() => setShowLinkPanel(false)}
                className={`text-sm ${
                  isDarkMode ? 'text-blue-400 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                } transition-colors duration-300`}
              >
                ✕
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <div className="flex-1 min-w-0">
                <input 
                  value={displayServer.flipbookLink} 
                  readOnly
                  className={`w-full px-3 py-2 text-sm rounded border truncate transition-colors duration-300 ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={copyToClipboard}
                  className={`flex items-center gap-1 px-3 py-2 rounded text-sm transition-colors duration-300 ${
                    copySuccess
                      ? (isDarkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white')
                      : (isDarkMode 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white')
                  }`}
                >
                  <Copy size={14} />
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
                <button 
                  onClick={shareLink}
                  className={`flex items-center gap-1 px-3 py-2 rounded text-sm transition-colors duration-300 ${
                    isDarkMode 
                      ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                      : 'bg-purple-500 hover:bg-purple-600 text-white'
                  }`}
                >
                  <Share2 size={14} />
                  Share
                </button>
              </div>
            </div>
            
            {displayServer.expiresAt && (
              <p className={`text-xs mt-2 ${
                isDarkMode ? 'text-blue-300' : 'text-blue-600'
              }`}>
                <strong>Expires:</strong> {new Date(displayServer.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Flipbook Area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden flipbook-container">
        {/* Desktop: Two-Page Spread */}
        {!isMobile && (
          <div className="relative flex items-center gap-4">
            <button
              disabled={currentSpread === 0 || isFlipping}
              onClick={prevSpread}
              className={`p-3 backdrop-blur-sm hover:bg-gray-600/80 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full transition-all shadow-lg hover:shadow-xl disabled:hover:shadow-lg flipbook-content ${
                isDarkMode 
                  ? 'bg-gray-800/80 hover:bg-gray-700/80' 
                  : 'bg-gray-700/80 hover:bg-gray-600/80'
              }`}
            >
              <ChevronLeft size={24} />
            </button>

            <div 
              className="relative flipbook-content"
              style={{ 
                perspective: '1200px',
                perspectiveOrigin: 'center center'
              }}
            >
              <div className="relative flex bg-transparent rounded-lg overflow-visible gap-0">
                <div className="book-spine"></div>

                {/* Left Page */}
                <div className="relative" style={{ width: `${bookWidth}px`, height: `${bookHeight}px` }}>
                  {leftPageIndex < displayTotalPages && (
                    <div
                      className={`absolute inset-0 bg-white page-container page-left ${
                        flipDirection === "next" && isFlipping ? "flip-next-left" : 
                        flipDirection === "prev" && isFlipping ? "flip-prev-left" : ""
                      }`}
                    >
                      <PageDisplay pageIndex={leftPageIndex} />
                    </div>
                  )}
                </div>

                {/* Right Page */}
                <div className="relative" style={{ width: `${bookWidth}px`, height: `${bookHeight}px` }}>
                  {rightPageIndex < displayTotalPages && (
                    <div
                      className={`absolute inset-0 bg-white page-container page-right ${
                        flipDirection === "next" && isFlipping ? "flip-next-right" : 
                        flipDirection === "prev" && isFlipping ? "flip-prev-right" : ""
                      }`}
                    >
                      <PageDisplay pageIndex={rightPageIndex} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              disabled={currentSpread >= totalSpreads - 1 || isFlipping}
              onClick={nextSpread}
              className={`p-3 backdrop-blur-sm hover:bg-gray-600/80 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full transition-all shadow-lg hover:shadow-xl disabled:hover:shadow-lg flipbook-content ${
                isDarkMode 
                  ? 'bg-gray-800/80 hover:bg-gray-700/80' 
                  : 'bg-gray-700/80 hover:bg-gray-600/80'
              }`}
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}

        {/* Mobile: Single Page */}
        {isMobile && (
          <div className="relative flex items-center gap-4 w-full max-w-sm flipbook-content">
            <button
              disabled={currentSpread === 0 || isFlipping}
              onClick={prevSpread}
              className={`p-3 backdrop-blur-sm hover:bg-gray-600/80 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full shadow-lg ${
                isDarkMode 
                  ? 'bg-gray-800/80 hover:bg-gray-700/80' 
                  : 'bg-gray-700/80 hover:bg-gray-600/80'
              }`}
            >
              <ChevronLeft size={20} />
            </button>

            <div 
              className="flex-1 flipbook-content"
              style={{ 
                perspective: '1000px',
                perspectiveOrigin: 'center center'
              }}
            >
              <div
                className={`bg-white rounded-lg shadow-2xl overflow-hidden mx-auto page-container ${
                  flipDirection === "next" && isFlipping ? "flip-next-left" : ""
                } ${flipDirection === "prev" && isFlipping ? "flip-prev-right" : ""}`}
                style={{
                  maxWidth: '280px',
                  aspectRatio: '3/4',
                }}
              >
                <PageDisplay pageIndex={leftPageIndex} />
              </div>
            </div>

            <button
              disabled={currentSpread >= totalSpreads - 1 || isFlipping}
              onClick={nextSpread}
              className={`p-3 backdrop-blur-sm hover:bg-gray-600/80 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full shadow-lg ${
                isDarkMode 
                  ? 'bg-gray-800/80 hover:bg-gray-700/80' 
                  : 'bg-gray-700/80 hover:bg-gray-600/80'
              }`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Removed the bottom gray navigation area */}
    </div>
  );
}