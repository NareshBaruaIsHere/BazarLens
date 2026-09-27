import { useState } from 'react';
import './App.css';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';

function App() {
    const [currentPage, setCurrentPage] = useState('login');

    return (
        <div className="app-wrapper">
            {currentPage === 'login' ? (
                <LoginPage onNavigateToSignUp={() => setCurrentPage('signup')} onLogin={() => setCurrentPage('dashboard')} />
            ) : currentPage === 'signup' ? (
                <SignUpPage onNavigateToLogin={() => setCurrentPage('login')} />
            ) : (
                <DashboardPage />
            )}
        </div>
    );
}

export default App;
