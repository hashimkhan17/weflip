import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemContext.jsx';

export default function PDFUploadForm() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    pdfFile: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileSizeWarning, setFileSizeWarning] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    setError('');
  };

  const uploadToBackend = async (file) => {
    setError('');
    setFileSizeWarning('');

    if (!formData.firstname || !formData.lastname || !formData.email || !file) {
      setError('Please fill all fields and select a PDF.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setFileSizeWarning('Warning: Very large PDF detected. Processing may take longer.');
    } else if (file.size > 20 * 1024 * 1024) {
      setFileSizeWarning('Large PDF detected. Processing on server...');
    }

    setIsLoading(true);
    setUploadProgress(0);

    // 🔥 Environment variable (Vite)
    const UPLOAD_BASE = import.meta.env.VITE_API_URL;
    const UPLOAD_URL = `${UPLOAD_BASE}/api/flipbook/register`;

    const fd = new FormData();
    fd.append('firstname', formData.firstname);
    fd.append('lastname', formData.lastname);
    fd.append('email', formData.email);

    // 🔥 Password now read from .env
    fd.append('password', import.meta.env.VITE_DEFAULT_PASSWORD);

    fd.append('pdf', file);

    try {
      console.log('Uploading ',);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(JSON.parse(xhr.responseText).message || 'Upload failed'));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
      });

      xhr.open('POST', UPLOAD_URL);
      xhr.send(fd);

      const payload = await uploadPromise;
     

      if (!payload.flipbookId || !payload.totalPages) {
        throw new Error('Server did not return flipbook data. Please check backend logs.');
      }

      navigate(`/book/${payload.flipbookId}`, {
        state: {
          flipbookId: payload.flipbookId,
          accessToken: payload.accessToken,
          totalPages: payload.totalPages,
          userData: {
            firstname: formData.firstname,
            lastname: formData.lastname,
            email: formData.email
          },
          server: {
            flipbookLink: payload.flipbookLink,
            expiresAt: payload.expiresAt
          }
        }
      });

    } catch (err) {
  
      setError(err.message || 'Upload failed');
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setFormData((p) => ({ ...p, pdfFile: file }));
      setError('');
      uploadToBackend(file);
    } else {
      setError('Please select a valid PDF file.');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-8 w-full max-w-lg">
      {error && (
        <div className={`${
          isDarkMode 
            ? 'bg-red-900/50 border-red-700 text-red-200' 
            : 'bg-red-100 border-red-400 text-red-600'
        } border px-4 py-3 rounded mb-4 transition-colors duration-300`}>
          {error}
        </div>
      )}

      {fileSizeWarning && (
        <div className={`${
          isDarkMode 
            ? 'bg-yellow-900/50 border-yellow-700 text-yellow-200' 
            : 'bg-yellow-100 border-yellow-400 text-yellow-800'
        } border px-4 py-3 rounded mb-4 transition-colors duration-300`}>
          {fileSizeWarning}
        </div>
      )}

      {!isLoading && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <input 
              name="firstname" 
              placeholder="First Name" 
              className={`w-full px-2 py-2 rounded-lg border transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
              }`}
              onChange={handleInputChange} 
              value={formData.firstname} 
              disabled={isLoading} 
            />
            <input 
              name="lastname" 
              placeholder="Last Name" 
              className={`w-full px-2 py-2 rounded-lg border transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
              }`}
              onChange={handleInputChange} 
              value={formData.lastname} 
              disabled={isLoading} 
            />
          </div>

          <div>
            <input 
              name="email" 
              type="email" 
              placeholder="Email" 
              className={`w-full px-2 py-2 rounded-lg border transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
              }`}
              onChange={handleInputChange} 
              value={formData.email} 
              disabled={isLoading} 
            />
          </div>

          <div className="text-center">
            <label className={`
              flex items-center justify-center px-2 py-2 rounded-4xl cursor-pointer 
              transition-all shadow-lg hover:shadow-xl mx-auto w-50 mb-2
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              ${isDarkMode 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white' 
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
              }
            `}>
              <Upload className="w-5 h-5 mr-2" />
              {formData.pdfFile ? formData.pdfFile.name : 'Choose PDF File'}
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={handleFileChange} 
                className="hidden" 
                disabled={isLoading} 
              />
            </label>
            
            {formData.pdfFile && (
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                File size: {formatFileSize(formData.pdfFile.size)}
              </div>
            )}
          </div>

       
        </div>
      )}

      {isLoading && (
        <div className="text-center py-4">
          <div className={`inline-block animate-spin rounded-full h-8 w-8 border-b-2 ${
            isDarkMode ? 'border-purple-400' : 'border-indigo-600'
          }`}></div>
          <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {uploadProgress < 100 
              ? `Uploading... ${uploadProgress}%` 
              : 'Processing PDF on server...'
            }
          </p>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2 max-w-xs mx-auto">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
          {formData.pdfFile && (
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {formatFileSize(formData.pdfFile.size)} PDF
            </p>
          )}
        </div>
      )}
    </div>
  );
}
