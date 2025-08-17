import uploadOnCloudinary from "../config/cloudinary.js"
import geminiResponse from "../gemini.js"
import User from "../models/user.model.js"
import moment from "moment"

export const getCurrentUser = async (req, res) => {
    try {
        const userId = req.userId
        const user = await User.findById(userId).select("-password")
        if (!user) {
            return res.status(400).json({ message: "user not found" })
        }
        return res.status(200).json(user)
    } catch (error) {
        return res.status(400).json({ message: "get current user error" })
    }
}

export const updateAssistant = async (req, res) => {
    try {
        const { assistantName, imageUrl } = req.body
        let assistantImage;
        if (req.file) {
            assistantImage = await uploadOnCloudinary(req.file.path)
        } else {
            assistantImage = imageUrl
        }

        const user = await User.findByIdAndUpdate(req.userId, {
            assistantName, assistantImage
        }, { new: true }).select("-password")
        return res.status(200).json(user)

    } catch (error) {
        return res.status(400).json({ message: "updateAssistantError user error" })
    }
}

export const askToAssistant = async (req, res) => {
    try {
        const { command } = req.body
        console.log("🎤 Received command:", command); // Debug log

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(400).json({
                type: "error",
                userInput: command,
                response: "User not found"
            });
        }

        user.history.push(command)
        await user.save() // Add await here

        const userName = user.name
        const assistantName = user.assistantName

        console.log("🤖 Calling geminiResponse..."); // Debug log
        const result = await geminiResponse(command, assistantName, userName)
        console.log("📝 Gemini raw response:", result); // Debug log

        // Better JSON parsing with error handling
        const jsonMatch = result.match(/{[\s\S]*}/)
        if (!jsonMatch) {
            console.error("❌ No JSON found in gemini response:", result);
            return res.status(200).json({
                type: "general",
                userInput: command,
                response: "Sorry, I can't understand that command right now."
            })
        }

        let gemResult;
        try {
            gemResult = JSON.parse(jsonMatch[0])
            console.log("✅ Parsed JSON:", gemResult); // Debug log
        } catch (parseError) {
            console.error("❌ JSON parse error:", parseError, "Raw JSON:", jsonMatch[0]);
            return res.status(200).json({
                type: "general",
                userInput: command,
                response: "Sorry, I'm having trouble processing that command."
            })
        }

        const type = gemResult.type

        switch (type) {
            case 'get-date':
                return res.json({
                    type,
                    userInput: gemResult.userInput || command,
                    response: `Current date is ${moment().format("YYYY-MM-DD")}`
                });

            case 'get-time':
                return res.json({
                    type,
                    userInput: gemResult.userInput || command,
                    response: `Current time is ${moment().format("hh:mm A")}`
                });

            case 'get-day':
                return res.json({
                    type,
                    userInput: gemResult.userInput || command,
                    response: `Today is ${moment().format("dddd")}`
                });

            case 'get-month':
                return res.json({
                    type,
                    userInput: gemResult.userInput || command,
                    response: `Current month is ${moment().format("MMMM")}`
                });

            case 'google-search':
            case 'youtube-search':
            case 'youtube-play':
            case 'general':
            case 'calculator-open':
            case 'instagram-open':
            case 'facebook-open':
            case 'weather-show':
                return res.json({
                    type,
                    userInput: gemResult.userInput || command,
                    response: gemResult.response || "Processing your request...",
                });

            default:
                console.log("⚠️ Unknown command type:", type);
                return res.status(200).json({
                    type: "general",
                    userInput: command,
                    response: "I didn't understand that command, but I'm here to help!"
                })
        }

    } catch (error) {
        console.error("❌ askToAssistant error:", error);
        return res.status(200).json({
            type: "error",
            userInput: req.body.command || "",
            response: "Sorry, something went wrong. Please try again."
        })
    }
}