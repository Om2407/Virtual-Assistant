import axios from "axios";
import React, { createContext, useEffect, useState, useCallback, useMemo, useRef } from "react";

export const userDataContext = createContext();

function UserContext({ children }) {
  const serverUrl = "http://localhost:8000";

  // Core state
  const [userData, setUserData] = useState(null);
  const [frontendImage, setFrontendImage] = useState(null);
  const [backendImage, setBackendImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refs for optimization
  const requestCacheRef = useRef(new Map());
  const speechQueueRef = useRef([]);
  const isSpeakingRef = useRef(false);
  const tabCooldownRef = useRef(new Map());

  // Optimized axios instance
  const apiClient = useMemo(() => {
    const client = axios.create({
      baseURL: serverUrl,
      withCredentials: true,
      timeout: 12000,
      headers: { 'Content-Type': 'application/json' }
    });

    // Request interceptor with retry logic
    client.interceptors.request.use(config => {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
      config.retryCount = config.retryCount || 0;
      return config;
    });

    // Response interceptor with smart retry
    client.interceptors.response.use(
      response => {
        console.log(`✅ [${response.status}] ${response.config.url}`);
        return response;
      },
      async error => {
        const config = error.config;
        const shouldRetry = config && 
          config.retryCount < 2 && 
          (!error.response || error.response.status >= 500);

        if (shouldRetry) {
          config.retryCount += 1;
          console.log(`🔄 Retry ${config.retryCount}/2: ${config.url}`);
          await new Promise(resolve => setTimeout(resolve, config.retryCount * 800));
          return client(config);
        }
        
        console.error(`❌ [${error.response?.status || 'Network'}] ${config?.url}`);
        return Promise.reject(error);
      }
    );

    return client;
  }, [serverUrl]);

  // Optimized tab management
  const canOpenTab = useCallback((key, cooldownMs = 2000) => {
    const now = Date.now();
    const lastOpen = tabCooldownRef.current.get(key);
    
    if (lastOpen && (now - lastOpen) < cooldownMs) {
      console.log(`🛑 Tab cooldown active: ${key}`);
      return false;
    }
    
    tabCooldownRef.current.set(key, now);
    // Cleanup old entries
    if (tabCooldownRef.current.size > 20) {
      const entries = [...tabCooldownRef.current.entries()];
      const expired = entries.filter(([_, time]) => now - time > 10000);
      expired.forEach(([key]) => tabCooldownRef.current.delete(key));
    }
    
    return true;
  }, []);

  // Enhanced speech queue
  const speak = useCallback((text, priority = false) => {
    if (!text || typeof text !== 'string') return;
    
    console.log("🔊 Queuing speech:", text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    
    if (priority) {
      speechQueueRef.current.unshift(text);
    } else {
      speechQueueRef.current.push(text);
    }
    
    processSpeechQueue();
  }, []);

  const processSpeechQueue = useCallback(async () => {
    if (isSpeakingRef.current || speechQueueRef.current.length === 0) return;
    
    isSpeakingRef.current = true;
    const text = speechQueueRef.current.shift();

    try {
      if (!('speechSynthesis' in window)) {
        throw new Error("Speech not supported");
      }
      
      speechSynthesis.cancel();
      
      await new Promise((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        utterance.lang = 'en-US';
        utterance.onend = resolve;
        utterance.onerror = reject;
        speechSynthesis.speak(utterance);
      });
    } catch (error) {
      console.warn("🔇 Speech error:", error.message);
    } finally {
      isSpeakingRef.current = false;
      // Process next in queue
      if (speechQueueRef.current.length > 0) {
        setTimeout(processSpeechQueue, 100);
      }
    }
  }, []);

  // Optimized command handlers with nested structure
  const commandHandlers = useMemo(() => ({
    // Open commands
    open: {
      youtube: () => {
        if (!canOpenTab('youtube')) return "YouTube is already opening";
        window.open('https://www.youtube.com', '_blank', 'noopener,noreferrer');
        return "Opening YouTube";
      },
      
      facebook: () => {
        if (!canOpenTab('facebook')) return "Facebook is already opening";
        window.open('https://www.facebook.com', '_blank', 'noopener,noreferrer');
        return "Opening Facebook";
      },
      
      instagram: () => {
        if (!canOpenTab('instagram')) return "Instagram is already opening";
        window.open('https://www.instagram.com', '_blank', 'noopener,noreferrer');
        return "Opening Instagram";
      },
      
      linkedin: () => {
        if (!canOpenTab('linkedin')) return "LinkedIn is already opening";
        window.open('https://www.linkedin.com', '_blank', 'noopener,noreferrer');
        return "Opening LinkedIn";
      },
      
      twitter: () => {
        if (!canOpenTab('twitter')) return "Twitter is already opening";
        window.open('https://www.twitter.com', '_blank', 'noopener,noreferrer');
        return "Opening Twitter";
      },
      
      whatsapp: () => {
        if (!canOpenTab('whatsapp')) return "WhatsApp is already opening";
        window.open('https://web.whatsapp.com', '_blank', 'noopener,noreferrer');
        return "Opening WhatsApp Web";
      },
      
      google: () => {
        if (!canOpenTab('google')) return "Google is already opening";
        window.open('https://www.google.com', '_blank', 'noopener,noreferrer');
        return "Opening Google";
      },
      
      calculator: () => {
        if (!canOpenTab('calculator')) return "Calculator is already opening";
        
        // Try native calculator first on Windows
        if (navigator.platform.toLowerCase().includes('win')) {
          try {
            window.location.href = 'ms-calculator:';
            setTimeout(() => {
              window.open('https://www.google.com/search?q=calculator', '_blank');
            }, 500);
            return "Opening Calculator";
          } catch (e) {
            // Fallback to web calculator
          }
        }
        
        window.open('https://www.google.com/search?q=calculator', '_blank', 'noopener,noreferrer');
        return "Opening Calculator";
      }
    },

    // Search commands
    search: (query, platform = 'google') => {
      if (!query?.trim()) throw new Error("Search query is required");
      
      const platforms = {
        google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`
      };
      
      const url = platforms[platform] || platforms.google;
      const tabKey = `search-${platform}`;
      
      if (!canOpenTab(tabKey, 1000)) {
        return `Already searching for "${query}"`;
      }
      
      window.open(url, '_blank', 'noopener,noreferrer');
      return `Searching ${platform} for "${query}"`;
    },

    // YouTube specific actions
    youtube: {
      search: (query) => {
        if (!query?.trim()) throw new Error("Search query is required");
        if (!canOpenTab('youtube-search', 1500)) {
          return `Already searching YouTube for "${query}"`;
        }
        window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_blank');
        return `Searching YouTube for "${query}"`;
      },
      
      play: (song) => {
        if (!song?.trim()) throw new Error("Song name is required");
        if (!canOpenTab('youtube-play', 1500)) {
          return `Already playing "${song}"`;
        }
        window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(song)}`, '_blank');
        return `Playing "${song}" on YouTube`;
      }
    },

    // Utility commands
    weather: () => {
      if (!canOpenTab('weather')) return "Weather is already loading";
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude: lat, longitude: lon } = position.coords;
            window.open(`https://weather.com/weather/today/l/${lat},${lon}`, '_blank');
          },
          () => window.open('https://weather.com', '_blank'),
          { timeout: 3000 }
        );
      } else {
        window.open('https://weather.com', '_blank');
      }
      
      return "Getting weather information";
    },

    // Time & Date commands
    time: () => {
      const time = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return `Current time is ${time}`;
    },

    date: () => {
      const date = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      return `Today is ${date}`;
    },

    day: () => {
      const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      return `Today is ${day}`;
    },

    month: () => {
      const month = new Date().toLocaleDateString('en-US', { month: 'long' });
      return `Current month is ${month}`;
    },

    // Fallback commands
    help: () => {
      return "I can open apps, search the web, play music, show weather, tell time and more. Just ask naturally!";
    },

    general: (response) => response || "How can I help you?",
    
    error: (response) => response || "Sorry, something went wrong."
    
  }), [canOpenTab]);

  // Smart command preprocessing
  const preprocessCommand = useCallback((command) => {
    if (!command || typeof command !== 'string') return '';
    
    let processed = command.trim().toLowerCase();
    
    // Remove assistant name variations
    if (userData?.assistantName) {
      const name = userData.assistantName.toLowerCase();
      const namePatterns = [
        new RegExp(`^(hey|hi|hello)\\s+${name}[,\\s]*`, 'gi'),
        new RegExp(`^${name}[,\\s]*`, 'gi'),
        new RegExp(`[,\\s]+${name}$`, 'gi')
      ];
      namePatterns.forEach(pattern => {
        processed = processed.replace(pattern, '').trim();
      });
    }

    // Hindi to English mapping
    const hindiMap = new Map([
      ['खोलो', 'open'],
      ['बजाओ', 'play'],
      ['खोजो', 'search'],
      ['दिखाओ', 'show'],
      ['बताओ', 'tell'],
      ['समय', 'time'],
      ['तारीख', 'date'],
      ['मौसम', 'weather']
    ]);

    // Apply Hindi mappings
    hindiMap.forEach((english, hindi) => {
      processed = processed.replace(new RegExp(`\\b${hindi}\\b`, 'g'), english);
    });

    // Clean up filler words
    processed = processed.replace(/\b(करो|please|कर|do|the|a|an)\b/g, '').replace(/\s+/g, ' ').trim();

    console.log(`📝 Preprocessed: "${command}" → "${processed}"`);
    return processed;
  }, [userData?.assistantName]);

  //self
  const [loading, setLoading] = useState(true);

useEffect(() => {
  // Check localStorage or fetch user data
  const checkAuth = async () => {
    try {
      // Your auth check logic
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };
  
  checkAuth();
}, []);

  // Enhanced command execution
  const executeCommand = useCallback(async (input) => {
    try {
      if (!input) throw new Error("No command provided");
      
      let command = typeof input === 'string' ? input : 
                   input.type || input.command || JSON.stringify(input);
      
      const parts = command.toLowerCase().split(' ').filter(Boolean);
      const [action, target, ...rest] = parts;
      const query = rest.join(' ');

      console.log("🎯 Executing:", { action, target, query });

      let result;

      // Handle nested commands
      if (action === 'open' && commandHandlers.open?.[target]) {
        result = commandHandlers.open[target]();
      }
      else if (action === 'search') {
        const searchQuery = query || target;
        const platform = query ? target : 'google';
        result = commandHandlers.search(searchQuery, platform);
      }
      else if (action === 'play') {
        const song = target ? `${target} ${query}`.trim() : query;
        result = commandHandlers.youtube.play(song);
      }
      else if (target === 'youtube' && action === 'search') {
        result = commandHandlers.youtube.search(query);
      }
      else if (commandHandlers[action]) {
        result = typeof commandHandlers[action] === 'function' 
          ? commandHandlers[action](target || query)
          : commandHandlers[action];
      }
      else {
        // Try to parse as response object
        if (typeof input === 'object' && input.response) {
          result = commandHandlers.general(input.response);
        } else {
          result = "I didn't understand that command. Try saying 'help' for assistance.";
        }
      }

      if (result && typeof result === 'string') {
        speak(result);
      }

      return result;

    } catch (error) {
      console.error("💥 Command error:", error);
      const errorMsg = "Sorry, I couldn't process that request.";
      speak(errorMsg, true);
      return errorMsg;
    }
  }, [commandHandlers, speak]);

  // Optimized user fetch
  const fetchCurrentUser = useCallback(async () => {
    try {
      setError(null);
      const response = await apiClient.get('/api/user/current');
      setUserData(response.data);
      return response.data;
    } catch (error) {
      console.error("👤 User fetch error:", error);
      const errorMsg = error.response?.status === 401 
        ? "Please log in to continue" 
        : "Failed to load user data";
      setError(errorMsg);
      throw error;
    }
  }, [apiClient]);

  // Enhanced Gemini response with caching
  const getGeminiResponse = useCallback(async (userCommand) => {
    try {
      if (!userCommand?.trim()) {
        const response = "Yes? How can I help you?";
        speak(response);
        return { type: "general", response };
      }

      const processedCommand = preprocessCommand(userCommand);
      if (!processedCommand) {
        return executeCommand("help");
      }

      // Check cache for recent identical requests
      const cacheKey = processedCommand;
      const now = Date.now();
      const cached = requestCacheRef.current.get(cacheKey);
      
      if (cached && (now - cached.timestamp) < 2000) {
        console.log("💾 Using cached response");
        return cached.response;
      }

      // Handle direct commands that don't need backend
      const directCommands = ['open', 'search', 'play', 'time', 'date', 'day', 'month', 'weather', 'help'];
      const isDirectCommand = directCommands.some(cmd => processedCommand.startsWith(cmd));
      
      if (isDirectCommand) {
        const result = await executeCommand(processedCommand);
        const response = { type: "direct", command: processedCommand, response: result };
        
        // Cache the response
        requestCacheRef.current.set(cacheKey, { timestamp: now, response });
        return response;
      }

      // Backend API call for complex queries
      setIsLoading(true);
      setError(null);

      const apiResponse = await apiClient.post('/api/user/asktoassistant', {
        command: processedCommand,
        timestamp: now
      });

      if (!apiResponse.data) {
        throw new Error("Empty server response");
      }

      const result = apiResponse.data;
      await executeCommand(result);

      // Cache successful response
      requestCacheRef.current.set(cacheKey, { timestamp: now, response: result });
      
      // Cleanup old cache entries
      if (requestCacheRef.current.size > 50) {
        const entries = [...requestCacheRef.current.entries()];
        const old = entries.filter(([_, data]) => now - data.timestamp > 30000);
        old.forEach(([key]) => requestCacheRef.current.delete(key));
      }

      return result;

    } catch (error) {
      console.error("🤖 Gemini error:", error);
      
      let errorMessage = "I'm having trouble right now. Please try again.";
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = "Request timed out. Please check your connection.";
      } else if (error.response?.status === 429) {
        errorMessage = "Too many requests. Please wait a moment.";
      } else if (error.response?.status >= 500) {
        errorMessage = "Server is busy. Please try again in a moment.";
      } else if (error.response?.status === 401) {
        errorMessage = "Please log in to continue.";
      }

      setError(errorMessage);
      speak(errorMessage, true);
      
      return { 
        type: "error", 
        userInput: userCommand, 
        response: errorMessage 
      };
      
    } finally {
      setIsLoading(false);
    }
  }, [preprocessCommand, executeCommand, apiClient, speak]);

  // Initialize
  useEffect(() => {
    fetchCurrentUser().catch(() => {
      console.log("🔒 User not authenticated");
    });
  }, [fetchCurrentUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
      speechQueueRef.current = [];
      isSpeakingRef.current = false;
      requestCacheRef.current.clear();
      tabCooldownRef.current.clear();
    };
  }, []);

  // Optimized context value
  const contextValue = useMemo(() => ({
    // Server
    serverUrl,
    
    // State
    userData,
    setUserData,
    frontendImage,
    setFrontendImage,
    backendImage, 
    setBackendImage,
    selectedImage,
    setSelectedImage,
    isLoading,
    error,
    setError,
    
    // Core functions
    getGeminiResponse,
    executeCommand,
    speak,
    fetchCurrentUser,
    preprocessCommand
    
  }), [
    serverUrl, userData, frontendImage, backendImage, selectedImage,
    isLoading, error, getGeminiResponse, executeCommand, speak,
    fetchCurrentUser, preprocessCommand
  ]);

  return (
    <userDataContext.Provider value={contextValue}>
      {children}
    </userDataContext.Provider>
  );
}

export default UserContext;