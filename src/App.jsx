import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Loader } from "lucide-react";
import { useAuthStore } from "./store/useAuthStore";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import ContactSupportPage from './pages/ContactSupportPage'

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, initialize } = useAuthStore();

  useEffect(() => {
    const initializeAuth = async () => {
      await initialize();
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      await checkAuth();
    };
    initializeAuth();
  }, [initialize, checkAuth]);

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/settings" element={<SettingsPage />}/>
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
        <Route path="/contact" element={<ContactSupportPage/>}/>
      </Routes>
      <Toaster />
    </div>
  );
};

export default App;