import express from "express";
import { 
    askToAssistant, 
    getCurrentUser, 
    updateAssistant 
} from "../controllers/user.controllers.js";
import isAuth from "../middlewares/isAuth.js";
import upload from "../middlewares/multer.js";

const userRouter = express.Router();

// Error handling wrapper for async routes
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Input validation middleware (optional - add if needed)
const validateUpdateData = (req, res, next) => {
    // Add validation logic here if needed
    next();
};

// Routes with proper error handling
userRouter.get("/current", isAuth, asyncHandler(getCurrentUser));

userRouter.post(
    "/update", 
    isAuth, 
    upload.single("assistantImage"), 
    validateUpdateData,
    asyncHandler(updateAssistant)
);

userRouter.post(
    "/asktoassistant", 
    isAuth, 
    asyncHandler(askToAssistant)
);

// Health check route (optional)
userRouter.get("/health", (req, res) => {
    res.status(200).json({ status: "User routes are working" });
});

export default userRouter;