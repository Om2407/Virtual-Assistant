import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { userDataContext } from '../context/userContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import aiImg from "../assets/ai.gif";
import { CgMenuRight } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";
import userImg from "../assets/user.gif";

function Home() {
  const { userData, serverUrl, setUserData, getGeminiResponse } = useContext(userDataContext);
  const navigate = useNavigate();
  
  // State management
  const [listening, setListening] = useState(false);
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const [ham, setHam] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  
  // Refs for speech and recognition
  const isSpeakingRef = useRef(false);
  const recognitionRef = useRef(null);
  const isRecognizingRef = useRef(false);
  const isMountedRef = useRef(true);
  const retryTimeoutRef = useRef(null);
  
  const synth = window.speechSynthesis;

  // Logout handler
  const handleLogOut = useCallback(async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, { withCredentials: true });
      setUserData(null);
      navigate("/signin");
    } catch (error) {
      console.error("Logout error:", error);
      setUserData(null);
      navigate("/signin");
    }
  }, [serverUrl, setUserData, navigate]);

  // Enhanced speech function with better error handling
  const speak = useCallback((text) => {
    if (!text || typeof text !== 'string') {
      console.warn("Invalid text for speech:", text);
      return;
    }

    try {
      // Cancel any ongoing speech
      synth.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; // Changed to English for better compatibility
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      // Try to get a good voice
      const voices = synth.getVoices();
      const preferredVoice = voices.find(v => 
        v.lang.includes('en') && v.name.includes('Google')
      ) || voices.find(v => v.lang.includes('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      isSpeakingRef.current = true;
      setAiText(text); // Show what's being spoken
      
      utterance.onstart = () => {
        console.log("🔊 Started speaking:", text.substring(0, 50) + "...");
      };
      
      utterance.onend = () => {
        console.log("✅ Finished speaking");
        isSpeakingRef.current = false;
        setAiText("");
        
        // Restart recognition after a short delay
        setTimeout(() => {
          if (isMountedRef.current) {
            startRecognition();
          }
        }, 1000);
      };
      
      utterance.onerror = (error) => {
        console.error("Speech synthesis error:", error);
        isSpeakingRef.current = false;
        setAiText("");
        setTimeout(() => {
          if (isMountedRef.current) {
            startRecognition();
          }
        }, 1000);
      };
      
      synth.speak(utterance);
      
    } catch (error) {
      console.error("Error in speak function:", error);
      isSpeakingRef.current = false;
      setAiText("");
    }
  }, [synth]);

  // Start speech recognition
  const startRecognition = useCallback(() => {
    if (!isMountedRef.current || 
        isSpeakingRef.current || 
        isRecognizingRef.current || 
        !recognitionRef.current) {
      return;
    }

    try {
      console.log("🎤 Starting recognition...");
      recognitionRef.current.start();
    } catch (error) {
      if (error.name !== "InvalidStateError") {
        console.error("Recognition start error:", error);
      }
    }
  }, []);

  // Enhanced command handler with better response processing
  const handleCommand = useCallback(async (data) => {
    console.log("🎯 Processing command data:", data);
    
    if (!data) {
      console.error("❌ No data received in handleCommand");
      speak("Sorry, I couldn't process that command.");
      return;
    }

    // Handle different response formats
    let responseText = "";
    let commandType = "";
    let userInput = "";

    if (typeof data === 'string') {
      // Direct string response
      responseText = data;
    } else if (data && typeof data === 'object') {
      // Object response
      responseText = data.response || data.message || "";
      commandType = data.type || "";
      userInput = data.userInput || data.query || "";
    }

    // If no response text, generate from type
    if (!responseText && commandType) {
      switch (commandType) {
        case 'youtube-open':
          responseText = "Opening YouTube";
          break;
        case 'facebook-open':
          responseText = "Opening Facebook";
          break;
        case 'instagram-open':
          responseText = "Opening Instagram";
          break;
        case 'google-search':
          responseText = `Searching for ${userInput}`;
          break;
        case 'weather-show':
          responseText = "Getting weather information";
          break;
        case 'calculator-open':
          responseText = "Opening calculator";
          break;
        default:
          responseText = "Command executed successfully";
      }
    }

    // Fallback if still no response
    if (!responseText) {
      responseText = "I processed your request";
    }

    console.log("💬 Speaking response:", responseText);
    speak(responseText);

    // Handle specific actions
    try {
      switch (commandType) {
        case 'google-search':
          if (userInput) {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(userInput)}`, '_blank');
          }
          break;
        case 'calculator-open':
          window.open('https://www.google.com/search?q=calculator', '_blank');
          break;
        case 'instagram-open':
          window.open('https://www.instagram.com/', '_blank');
          break;
        case 'facebook-open':
          window.open('https://www.facebook.com/', '_blank');
          break;
        case 'youtube-open':
          window.open('https://www.youtube.com/', '_blank');
          break;
        case 'weather-show':
          window.open('https://www.google.com/search?q=weather', '_blank');
          break;
        case 'youtube-search':
        case 'youtube-play':
          if (userInput) {
            window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(userInput)}`, '_blank');
          }
          break;
        default:
          // No specific action needed
          break;
      }
    } catch (error) {
      console.error("Error executing command action:", error);
    }
  }, [speak]);

  // Setup speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognitionRef.current = recognition;

    // Recognition event handlers
    recognition.onstart = () => {
      console.log("🎤 Recognition started");
      isRecognizingRef.current = true;
      setListening(true);
      setError("");
    };

    recognition.onend = () => {
      console.log("🛑 Recognition ended");
      isRecognizingRef.current = false;
      setListening(false);
      
      // Auto-restart recognition if not speaking and component is mounted
      if (isMountedRef.current && !isSpeakingRef.current) {
        retryTimeoutRef.current = setTimeout(() => {
          startRecognition();
        }, 1000);
      }
    };

    recognition.onerror = (event) => {
      console.warn("🚫 Recognition error:", event.error);
      isRecognizingRef.current = false;
      setListening(false);
      
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError("Microphone access denied. Please enable microphone permissions.");
        return;
      }
      
      if (event.error === 'network') {
        setError("Network error. Please check your internet connection.");
      }
      
      // Restart recognition for recoverable errors
      if (isMountedRef.current && !isSpeakingRef.current && 
          !['not-allowed', 'service-not-allowed'].includes(event.error)) {
        retryTimeoutRef.current = setTimeout(() => {
          startRecognition();
        }, 2000);
      }
    };

    recognition.onresult = async (event) => {
      try {
        const transcript = event.results[event.results.length - 1][0].transcript.trim();
        console.log("📝 Transcript:", transcript);
        
        if (!transcript) return;
        
        // Check if the transcript contains the assistant name
        const assistantName = userData?.assistantName?.toLowerCase() || 'assistant';
        if (!transcript.toLowerCase().includes(assistantName)) {
          console.log("🔇 Assistant name not detected, ignoring");
          return;
        }

        // Stop recognition and start processing
        recognition.stop();
        isRecognizingRef.current = false;
        setListening(false);
        setUserText(transcript);
        setIsProcessing(true);
        setError("");

        console.log("🚀 Processing command:", transcript);
        
        // Get response from Gemini
        const response = await getGeminiResponse(transcript);
        console.log("🤖 Gemini response:", response);
        
        if (response) {
          await handleCommand(response);
        } else {
          console.error("❌ Empty response from getGeminiResponse");
          speak("Sorry, I couldn't understand that command.");
        }

      } catch (error) {
        console.error("💥 Error processing speech:", error);
        speak("Sorry, something went wrong while processing your command.");
        setError("Error processing command");
      } finally {
        setIsProcessing(false);
        setUserText("");
      }
    };

    // Initial greeting and start recognition
    const initializeApp = () => {
      const greeting = `Hello ${userData?.name || 'there'}, I'm ${userData?.assistantName || 'your assistant'}. What can I help you with?`;
      
      // Start recognition after greeting
      setTimeout(() => {
        speak(greeting);
      }, 1000);
    };

    initializeApp();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      synth.cancel();
      setListening(false);
      isRecognizingRef.current = false;
    };
  }, [userData, getGeminiResponse, handleCommand, speak, startRecognition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <div className='relative w-full h-[100vh] bg-gradient-to-t from-black to-[#02023d] flex justify-center items-center flex-col gap-[15px] overflow-hidden'>
      {/* Mobile menu button */}
      <CgMenuRight 
        className='lg:hidden text-white absolute top-[20px] right-[20px] w-[25px] h-[25px] cursor-pointer' 
        onClick={() => setHam(true)}
      />
      
      {/* Mobile hamburger menu */}
      <div className={`absolute lg:hidden top-0 w-full h-full bg-[#00000053] backdrop-blur-lg p-[20px] flex flex-col gap-[20px] items-start z-50 ${ham ? "translate-x-0" : "translate-x-full"} transition-all duration-300`}>
        <RxCross1 
          className='w-[25px] h-[25px] text-white cursor-pointer' 
          onClick={() => setHam(false)}
        />
        <div className='text-white text-lg'>
          <p>Welcome, {userData?.name}!</p>
          <p className='text-sm text-gray-300'>Assistant: {userData?.assistantName}</p>
        </div>
        <button 
          className='text-white border border-white p-[10px] rounded-lg hover:bg-white hover:text-black transition-colors' 
          onClick={handleLogOut}
        >
          Logout
        </button>
      </div>
      
      {/* Desktop layout */}
      <div className='lg:flex w-full max-w-[1200px] justify-around items-center hidden'>
        <div className='flex flex-col items-center gap-[10px]'>
          <img 
            src={userImg} 
            alt="User" 
            className='w-[250px] h-[250px] object-cover rounded-full border-4 border-blue-500' 
          />
          <h2 className='text-white text-[22px] font-semibold'>{userData?.name}</h2>
        </div>
        
        <div className='flex flex-col items-center gap-[10px]'>
          <img 
            src={userData?.assistantImage || aiImg} 
            alt="Assistant" 
            className='w-[250px] h-[250px] object-cover rounded-full border-4 border-blue-500' 
          />
          <h2 className='text-white text-[22px] font-semibold'>{userData?.assistantName}</h2>
        </div>
        
        <button 
          className='min-w-[150px] h-[60px] text-black font-semibold bg-white rounded-full text-[19px] hover:bg-gray-100 transition-colors' 
          onClick={handleLogOut}
        >
          Logout
        </button>
      </div>
      
      {/* Status indicators */}
      <div className='absolute top-4 left-4 flex flex-col gap-2'>
        {listening && (
          <div className='flex items-center gap-2 text-white bg-green-600 px-3 py-2 rounded-full animate-pulse'>
            <span className='w-2 h-2 bg-white rounded-full animate-ping'></span>
            🎤 Listening...
          </div>
        )}
        
        {isProcessing && (
          <div className='flex items-center gap-2 text-white bg-blue-600 px-3 py-2 rounded-full'>
            <div className='w-2 h-2 bg-white rounded-full animate-spin'></div>
            🤔 Processing...
          </div>
        )}
        
        {error && (
          <div className='text-white bg-red-600 px-3 py-2 rounded-full max-w-xs'>
            ❌ {error}
          </div>
        )}
      </div>
      
      {/* Text displays */}
      {userText && (
        <div className='absolute bottom-20 left-4 right-4 text-white bg-blue-600 bg-opacity-90 p-3 rounded-lg max-w-md mx-auto'>
          <strong>You said:</strong> {userText}
        </div>
      )}
      
      {aiText && (
        <div className='absolute bottom-4 left-4 right-4 text-white bg-green-600 bg-opacity-90 p-3 rounded-lg max-w-md mx-auto'>
          <strong>Assistant:</strong> {aiText}
        </div>
      )}
      
      {/* Instructions for mobile */}
      <div className='lg:hidden absolute bottom-4 left-4 right-4 text-center text-white text-sm opacity-75'>
        Say "{userData?.assistantName || 'Assistant'}" followed by your command
      </div>
    </div>
  );
}

export default Home;