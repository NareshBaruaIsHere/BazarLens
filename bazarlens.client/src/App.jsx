import { useState } from 'react';
import './App.css';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';

function App() {
    const [currentPage, setCurrentPage] = useState('login');

    return (
        <div className="app-wrapper">
            {currentPage === 'login' ? (
                <LoginPage onNavigateToSignUp={() => setCurrentPage('signup')} />
            ) : (
                <SignUpPage onNavigateToLogin={() => setCurrentPage('login')} />
            )}
        </div>
    );
}

export default App;
