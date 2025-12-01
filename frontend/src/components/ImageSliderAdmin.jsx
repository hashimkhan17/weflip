import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { useTheme } from '../context/ThemContext';

const ImageSliderAdmin = () => {
  const { isDarkMode } = useTheme();
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  
const API_BASE = import.meta.env.VITE_API_URL;
  // Fetch existing images
  const fetchImages = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/imageslider`);
      const data = await res.json();
      if (res.ok) {
        setImages(data.images);
      }
    } catch (err) {
      console.error('Error fetching images:', err);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`${API_BASE}/api/imageslider/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      setSuccess('Image uploaded successfully!');
      fetchImages(); // Refresh the list
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteImage = async (id) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const res = await fetch(`${API_BASE}/api/imageslider/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('Delete failed');
      }

      setSuccess('Image deleted successfully!');
      fetchImages(); // Refresh the list
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={`max-w-4xl mx-auto p-6 min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <h1 className={`text-3xl font-bold mb-6 transition-colors duration-300 ${
        isDarkMode ? 'text-white' : 'text-gray-800'
      }`}>
        Image Slider Admin
      </h1>

      {/* Upload Section */}
      <div className={`rounded-lg shadow-md p-6 mb-6 transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <h2 className={`text-xl font-semibold mb-4 transition-colors duration-300 ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Upload New Image
        </h2>
        
        {error && (
          <div className={`border px-4 py-3 rounded mb-4 transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-red-900/50 border-red-700 text-red-200' 
              : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            {error}
          </div>
        )}
        
        {success && (
          <div className={`border px-4 py-3 rounded mb-4 transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-green-900/50 border-green-700 text-green-200' 
              : 'bg-green-100 border-green-400 text-green-700'
          }`}>
            {success}
          </div>
        )}

        <label className={`
          flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer 
          transition-all duration-300
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          ${isDarkMode 
            ? 'border-gray-600 hover:border-purple-500 bg-gray-700/50' 
            : 'border-gray-300 hover:border-purple-400 bg-gray-50'
          }
        `}>
          <Upload className={`w-12 h-12 mb-4 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <span className={`text-lg mb-2 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Click to upload image
          </span>
          <span className={`text-sm transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            PNG, JPG, JPEG up to 5MB
          </span>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleImageUpload} 
            className="hidden" 
            disabled={isLoading}
          />
        </label>
        
        {isLoading && (
          <div className="text-center mt-4">
            <div className={`inline-block animate-spin rounded-full h-6 w-6 border-b-2 transition-colors duration-300 ${
              isDarkMode ? 'border-purple-400' : 'border-purple-600'
            }`}></div>
            <p className={`mt-2 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Uploading image...
            </p>
          </div>
        )}
      </div>

      {/* Images List */}
      <div className={`rounded-lg shadow-md p-6 transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <h2 className={`text-xl font-semibold mb-4 transition-colors duration-300 ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Current Slider Images ({images.length})
        </h2>
        
        {images.length === 0 ? (
          <div className={`text-center py-8 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <ImageIcon className={`w-16 h-16 mx-auto mb-4 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-600' : 'text-gray-300'
            }`} />
            <p>No images uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <div 
                key={image.id} 
                className={`border rounded-lg overflow-hidden shadow-sm transition-colors duration-300 ${
                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                }`}
              >
                <img 
                  src={image.imageUrl} 
                  alt={image.originalName}
                  className="w-full h-48 object-cover"
                />
                <div className="p-3">
                  <p className={`text-sm truncate transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {image.originalName}
                  </p>
                  <p className={`text-xs transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {new Date(image.createdAt).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className={`mt-2 flex items-center text-sm transition-colors duration-300 ${
                      isDarkMode 
                        ? 'text-red-400 hover:text-red-300' 
                        : 'text-red-600 hover:text-red-800'
                    }`}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageSliderAdmin;