import './App.css';
import LoginPage from './pages/LoginPage';

function App() {
    return (
        <div className="app-wrapper">
            <LoginPage onNavigateToSignUp={() => {}} />
        </div>
    );
}

export default App;
