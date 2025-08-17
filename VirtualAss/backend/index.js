import express from "express";
import dotenv from "dotenv";
dotenv.config()
import connectDb from "./config/db.js";
import authRouter from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import userRouter from "./routes/user.routes.js";
import geminiResponse from "./gemini.js";

const app = express()

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))

const port = process.env.PORT || 5000

app.use(express.json())
app.use(cookieParser())

app.use((req, res, next) => {
    console.log(`🔥 ${req.method} ${req.url}`);
    console.log("📦 Body:", req.body);
    console.log("🍪 Cookies:", req.cookies);
    next();
});

app.get("/test", (req, res) => {
    res.json({ message: "Server is working!", timestamp: new Date() });
});

app.post("/api/test/command", async (req, res) => {
    try {
        const { command } = req.body;
        console.log("🧪 Test command received:", command);
        
        const result = await geminiResponse(command, "TestAssistant", "TestUser");
        console.log("🧪 Test result:", result);
        
        res.json({
            success: true,
            command,
            result,
            message: "Test successful"
        });
    } catch (error) {
        console.error("🧪 Test error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Routes
app.use("/api/auth", authRouter)
app.use("/api/user", userRouter)

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("💥 Server Error:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
});

// 404 handler - FIXED THIS LINE
app.use((req, res) => {
    console.log("❌ Route not found:", req.url);
    res.status(404).json({ message: "Route not found" });
});

app.listen(port, () => {
    connectDb()
    console.log(`🚀 Server started on port ${port}`)
    console.log(`📱 Test URL: http://localhost:${port}/test`)
    console.log(`🧪 Test Command URL: http://localhost:${port}/api/test/command`)
});