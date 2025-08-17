import axios from "axios"

const geminiResponse = async (command, assistantName, userName) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY
        const baseUrl = process.env.GEMINI_API_URL
        
        console.log("🎤 Processing command:", command);
        console.log("🔑 API Key exists:", !!apiKey);
        console.log("🌐 Base URL:", baseUrl);
        
        // TEMPORARY: Manual command detection for testing
        const lowerCommand = command.toLowerCase();
        
        if (lowerCommand.includes('time')) {
            return `{
                "type": "get-time",
                "userInput": "${command}",
                "response": "Let me check the current time for you"
            }`;
        }
        
        if (lowerCommand.includes('date')) {
            return `{
                "type": "get-date", 
                "userInput": "${command}",
                "response": "Let me get today's date for you"
            }`;
        }
        
        if (lowerCommand.includes('google') || lowerCommand.includes('search')) {
            const searchTerm = command.replace(/google|search|for|on/gi, '').trim();
            return `{
                "type": "google-search",
                "userInput": "${searchTerm}",
                "response": "Searching Google for ${searchTerm}"
            }`;
        }
        
        if (lowerCommand.includes('youtube')) {
            const searchTerm = command.replace(/youtube|play|on/gi, '').trim();
            return `{
                "type": "youtube-search", 
                "userInput": "${searchTerm}",
                "response": "Searching YouTube for ${searchTerm}"
            }`;
        }
        
        if (lowerCommand.includes('calculator')) {
            return `{
                "type": "calculator-open",
                "userInput": "${command}",
                "response": "Opening calculator for you"
            }`;
        }
        
        if (lowerCommand.includes('instagram')) {
            return `{
                "type": "instagram-open",
                "userInput": "${command}",
                "response": "Opening Instagram for you"
            }`;
        }
        
        if (lowerCommand.includes('weather')) {
            return `{
                "type": "weather-show",
                "userInput": "${command}",
                "response": "Checking weather for you"
            }`;
        }
        
        // If no specific command detected, try Gemini API
        if (!apiKey || !baseUrl) {
            console.error("❌ API credentials missing");
            return `{
                "type": "general",
                "userInput": "${command}",
                "response": "I heard you, but I need API setup to understand better"
            }`;
        }
        
        const apiUrl = `${baseUrl}?key=${apiKey}`;
        console.log("🌟 Complete API URL ready");
        
        const prompt = `You are a virtual assistant named ${assistantName} created by ${userName}. 
You are not Google. You will now behave like a voice-enabled assistant.

Your task is to understand the user's natural language input and respond with a JSON object like this:

{
  "type": "general" | "google-search" | "youtube-search" | "youtube-play" | "get-time" | "get-date" | "get-day" | "get-month"|"calculator-open" | "instagram-open" |"facebook-open" |"weather-show"
  ,
  "userInput": "<original user input>" {only remove your name from userinput if exists} and agar kisi ne google ya youtube pe kuch search karne ko bola hai to userInput me only bo search baala text jaye,

  "response": "<a short spoken response to read out loud to the user>"
}

Instructions:
- "type": determine the intent of the user.
- "userinput": original sentence the user spoke.
- "response": A short voice-friendly reply, e.g., "Sure, playing it now", "Here's what I found", "Today is Tuesday", etc.

Type meanings:
- "general": if it's a factual or informational question. aur agar koi aisa question puchta hai jiska answer tume pata hai usko bhi general ki category me rakho bas short answer dena
- "google-search": if user wants to search something on Google .
- "youtube-search": if user wants to search something on YouTube.
- "youtube-play": if user wants to directly play a video or song.
- "calculator-open": if user wants to  open a calculator .
- "instagram-open": if user wants to  open instagram .
- "facebook-open": if user wants to open facebook.
-"weather-show": if user wants to know weather
- "get-time": if user asks for current time.
- "get-date": if user asks for today's date.
- "get-day": if user asks what day it is.
- "get-month": if user asks for the current month.

Important:
- Use ${userName} agar koi puche tume kisne banaya 
- Only respond with the JSON object, nothing else.
- Make sure response is valid JSON format.

now your userInput- ${command}
`;

        console.log("📤 Sending prompt to Gemini...");
        
        const result = await axios.post(apiUrl, {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        });
        
        console.log("📥 Gemini API response status:", result.status);
        
        const responseText = result.data.candidates[0].content.parts[0].text;
        console.log("🎯 Raw Gemini response:", responseText);
        
        return responseText;
        
    } catch (error) {
        console.error("❌ Gemini API error:", error.message);
        
        if (error.response) {
            console.error("API Error Status:", error.response.status);
            console.error("API Error Data:", error.response.data);
        }
        
        // Return a fallback response in case of error
        return `{
            "type": "general",
            "userInput": "${command}",
            "response": "I heard ${command}, but I'm having trouble processing it right now."
        }`;
    }
}

export default geminiResponse