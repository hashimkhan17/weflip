import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  BarChart3, 
  Eye, 
  Calendar, 
  UserCheck, 
  Edit, 
  Trash2, 
  LogOut,
  Search,
  AlertCircle,
  Image
} from 'lucide-react';
import { useTheme } from '../context/ThemContext';

const AdminPanel = () => {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [flipbooks, setFlipbooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminExists, setAdminExists] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Check if admin is registered
  useEffect(() => {
    checkAdminExists();
  }, []);

  // Check if already authenticated on component mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      // Try to fetch dashboard data to verify token
      verifyTokenByFetchingData(token);
    }
  }, []);

  const verifyTokenByFetchingData = async (token) => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/stats`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsAuthenticated(true);
        setError('');
        // Now fetch the actual data
        fetchData();
      } else {
        throw new Error('Token invalid');
      }
    } catch (error) {
      console.error('Token verification error:', error);
      localStorage.removeItem('adminToken');
      setIsAuthenticated(false);
    }
  };

  const checkAdminExists = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/auth/check`);
      const data = await response.json();
      setAdminExists(data.adminExists);
    } catch (error) {
      console.error('Check admin error:', error);
      setError('Failed to connect to server');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/admin/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      alert('Admin registered successfully! Please login.');
      setAdminExists(true);
      setAuthForm({ email: '', password: '' });
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      localStorage.setItem('adminToken', data.token);
      setIsAuthenticated(true);
      setError('');
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setAuthForm({ email: '', password: '' });
    setFlipbooks([]);
    setUsers([]);
    setStats({});
  };

  const fetchData = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setError('No authentication token');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      let endpoint = '';
      if (activeTab === 'dashboard') endpoint = 'stats';
      else if (activeTab === 'flipbooks') endpoint = 'flipbooks';
      else if (activeTab === 'users') endpoint = 'users';
      
      const response = await fetch(`${API_BASE}/api/admin/${endpoint}`, { 
        method: 'GET',
        headers 
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please login again.');
        }
        throw new Error('Failed to fetch data');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message);
      }

      if (activeTab === 'dashboard') setStats(data.stats || {});
      if (activeTab === 'flipbooks') setFlipbooks(data.flipbooks || []);
      if (activeTab === 'users') setUsers(data.users || []);
      
    } catch (error) {
      console.error('Fetch error:', error);
      setError(error.message);
      if (error.message.includes('token') || error.message.includes('Session')) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [activeTab, isAuthenticated]);

  const handleFlipbookAction = async (flipbookId, action, days = null) => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setError('No authentication token');
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/admin/flipbook/${flipbookId}`,
        {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ action, days })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Action failed');
      }
      
      alert(data.message);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Action error:', error);
      alert(error.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const filteredFlipbooks = flipbooks.filter(fb =>
    fb.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fb.originalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fb.user?.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fb.user?.lastname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Navigation to Image Slider Admin
  const navigateToImageSlider = () => {
    // You can use window.location or React Router based on your setup
    window.location.href = '/admin/image-slider';
    // Or if using React Router:
    // navigate('/admin/image-slider');
  };

  // Auth Screens
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
      }`}>
        <div className={`max-w-md w-full rounded-lg shadow-md p-6 transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        }`}>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">
              {!adminExists ? 'Setup Admin Account' : 'Admin Login'}
            </h2>
            <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {!adminExists 
                ? 'Create your admin account to get started' 
                : 'Enter your credentials to access the admin panel'
              }
            </p>
          </div>

          {error && (
            <div className={`mb-4 p-3 rounded flex items-center transition-colors duration-300 ${
              isDarkMode 
                ? 'bg-red-900/50 border-red-700 text-red-200' 
                : 'bg-red-100 border-red-400 text-red-700'
            } border`}>
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}
          
          <form onSubmit={!adminExists ? handleRegister : handleLogin} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Email
              </label>
              <input
                type="email"
                required
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors duration-300 ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500'
                }`}
                value={authForm.email}
                onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                placeholder="admin@example.com"
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Password
              </label>
              <input
                type="password"
                required
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors duration-300 ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500'
                }`}
                value={authForm.password}
                onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-300"
            >
              {loading 
                ? (!adminExists ? 'Registering...' : 'Logging in...') 
                : (!adminExists ? 'Register Admin' : 'Login')
              }
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin Panel
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
    }`}>
      <header className={`shadow-sm border-b transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className={`text-2xl font-bold transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Admin Panel
            </h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={navigateToImageSlider}
                className={`flex items-center text-sm px-3 py-2 rounded-md transition-colors duration-300 ${
                  isDarkMode 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-purple-500 hover:bg-purple-600 text-white'
                }`}
              >
                <Image className="w-4 h-4 mr-2" />
                Image Slider
              </button>
              <button
                onClick={handleLogout}
                className={`flex items-center text-sm transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className={`mb-6 p-4 rounded flex items-center border transition-colors duration-300 ${
            isDarkMode
              ? 'bg-red-900/50 border-red-700 text-red-200'
              : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className={`rounded-lg shadow-sm mb-6 transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
              { id: 'flipbooks', name: 'Flipbooks', icon: FileText },
              { id: 'users', name: 'Users', icon: Users }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-300 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : isDarkMode
                    ? 'border-transparent text-gray-400 hover:text-gray-200'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className={`inline-block animate-spin rounded-full h-8 w-8 border-b-2 ${
              isDarkMode ? 'border-blue-400' : 'border-blue-600'
            }`}></div>
            <p className={`mt-2 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Loading...
            </p>
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'blue' },
                { label: 'Total Flipbooks', value: stats.totalFlipbooks, icon: FileText, color: 'green' },
                { label: 'Active Flipbooks', value: stats.activeFlipbooks, icon: BarChart3, color: 'purple' },
                { label: 'Paid Accounts', value: stats.paidFlipbooks, icon: Users, color: 'yellow' }
              ].map((stat) => (
                <div key={stat.label} className={`rounded-lg shadow-sm p-6 transition-colors duration-300 ${
                  isDarkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <div className="flex items-center">
                    <div className={`p-3 rounded-full ${
                      isDarkMode 
                        ? `bg-${stat.color}-900/30` 
                        : `bg-${stat.color}-100`
                    }`}>
                      <stat.icon className={`w-6 h-6 ${
                        isDarkMode 
                          ? `text-${stat.color}-400` 
                          : `text-${stat.color}-600`
                      }`} />
                    </div>
                    <div className="ml-4">
                      <p className={`text-sm font-medium transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {stat.label}
                      </p>
                      <p className={`text-2xl font-semibold transition-colors duration-300 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {stat.value || 0}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          
          </div>
        )}

        {/* Flipbooks Content */}
        {!loading && activeTab === 'flipbooks' && (
          <div className={`rounded-lg shadow-sm transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className={`p-6 border-b transition-colors duration-300 ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex justify-between items-center">
                <h2 className={`text-lg font-semibold transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  All Flipbooks ({flipbooks.length})
                </h2>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className={`w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-400'
                    }`} />
                    <input
                      type="text"
                      placeholder="Search flipbooks..."
                      className={`pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={navigateToImageSlider}
                    className={`flex items-center text-sm px-3 py-2 rounded-md transition-colors duration-300 ${
                      isDarkMode 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                    }`}
                  >
                    <Image className="w-4 h-4 mr-2" />
                    Image Slider
                  </button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y transition-colors duration-300">
                <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    {['User', 'File', 'Status', 'Expires', 'Actions'].map((header) => (
                      <th
                        key={header}
                        className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-500'
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y transition-colors duration-300 ${
                  isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'
                }`}>
                  {filteredFlipbooks.map((flipbook) => (
                    <tr key={flipbook.id} className={`transition-colors duration-300 ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}>
                      <td className="px-6 py-4">
                        <div className={`text-sm font-medium transition-colors duration-300 ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {flipbook.user?.firstname} {flipbook.user?.lastname}
                        </div>
                        <div className={`text-sm transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {flipbook.user?.email}
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm transition-colors duration-300 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {flipbook.originalName}
                        <div className={`text-xs transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          Accesses: {flipbook.accessCount || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors duration-300 ${
                          flipbook.isActive
                            ? flipbook.isPaid 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {flipbook.isActive ? (flipbook.isPaid ? 'Paid' : 'Trial') : 'Inactive'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-sm transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {formatDate(flipbook.expiresAt)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium space-x-2">
                        <button
                          onClick={() => window.open(flipbook.flipbookLink, '_blank')}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-300"
                          title="View Flipbook"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleFlipbookAction(flipbook.id, 'extend', 30)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors duration-300"
                          title="Extend 30 days"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleFlipbookAction(flipbook.id, 'make_permanent')}
                          className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 transition-colors duration-300"
                          title="Make Permanent"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleFlipbookAction(flipbook.id, flipbook.isActive ? 'deactivate' : 'activate')}
                          className={`transition-colors duration-300 ${
                            flipbook.isActive 
                              ? "text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                              : "text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          }`}
                          title={flipbook.isActive ? "Deactivate" : "Activate"}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this flipbook permanently?')) {
                              handleFlipbookAction(flipbook.id, 'delete');
                            }
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-300"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredFlipbooks.length === 0 && (
                <div className={`text-center py-8 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  No flipbooks found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Content */}
        {!loading && activeTab === 'users' && (
          <div className={`rounded-lg shadow-sm transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className={`p-6 border-b transition-colors duration-300 ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h2 className={`text-lg font-semibold transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                All Users ({users.length})
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y transition-colors duration-300">
                <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    {['Name', 'Email', 'Flipbooks', 'Joined'].map((header) => (
                      <th
                        key={header}
                        className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-500'
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y transition-colors duration-300 ${
                  isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'
                }`}>
                  {users.map((user) => (
                    <tr key={user.id} className={`transition-colors duration-300 ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}>
                      <td className={`px-6 py-4 text-sm font-medium transition-colors duration-300 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {user.firstname} {user.lastname}
                      </td>
                      <td className={`px-6 py-4 text-sm transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {user.email}
                      </td>
                      <td className={`px-6 py-4 text-sm transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {user.flipbookCount}
                      </td>
                      <td className={`px-6 py-4 text-sm transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className={`text-center py-8 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  No users found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;