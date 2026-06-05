import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import LevelTest from './pages/LevelTest';
import Ranking from './pages/Ranking';
import Profile from './pages/Profile';
import Custom from './pages/Custom';
import Typing from './pages/Typing';
import Battle from './pages/Battle';
import RankBattle from './pages/RankBattle';
import Home from './pages/Home';
import Landing from './pages/Landing';
import GoalSetting from './pages/GoalSetting';
import './styles/global.css';

const RootRoute: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/home" replace /> : <Landing />;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <Navbar />
    {children}
  </>
);

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/"          element={<RootRoute />} />
    <Route path="/login"     element={<Login />} />
    <Route path="/register"  element={<Register />} />
    <Route path="/level-test"   element={<LevelTest />} />
    <Route path="/goal-setting" element={<GoalSetting />} />
    <Route path="/ranking"   element={<Layout><Ranking /></Layout>} />
    <Route path="/profile"   element={<Layout><Profile /></Layout>} />
    <Route path="/custom"    element={<Layout><Custom /></Layout>} />
    <Route path="/typing"    element={<Layout><Typing /></Layout>} />
    <Route path="/battle"      element={<Layout><Battle /></Layout>} />
    <Route path="/real-battle" element={<Layout><RankBattle /></Layout>} />
    <Route path="/home"        element={<Layout><Home /></Layout>} />
  </Routes>
);

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
