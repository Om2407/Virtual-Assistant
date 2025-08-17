import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Customize from "./pages/Customize";
import Customize2 from "./pages/Customize2";
import Home from "./pages/Home";
import { userDataContext } from "./context/userContext";

function App() {
  const { userData, loading } = useContext(userDataContext);

  // Loading state show karein jab tak userData load nhi hua
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          userData ? (
            userData.assistantImage && userData.assistantName ? 
            <Home /> : 
            <Navigate to="/customize" />
          ) : (
            <Navigate to="/signin" />
          )
        } 
      />
      <Route path="/signup" element={!userData ? <SignUp /> : <Navigate to="/" />} />
      <Route path="/signin" element={!userData ? <SignIn /> : <Navigate to="/" />} />
      <Route path="/customize" element={userData ? <Customize /> : <Navigate to="/signin" />} />
      <Route path="/customize2" element={userData ? <Customize2 /> : <Navigate to="/signin" />} />
    </Routes>
  );
}

export default App;