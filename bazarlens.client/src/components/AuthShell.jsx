import { Link } from 'react-router-dom';
import { AppLogo, Footer } from './UI';
import hero from '../assets/hero.png';
import './AuthShell.css';

// Form-and-image composition adapted from shadcn login-04 / signup-04.
export default function AuthShell({ title, description, children }) {
  return <div className="auth-page">
    <main className="auth-main">
      <div className="auth-content">
        <Link className="auth-brand" to="/statistics" aria-label="BazerLens public prices"><AppLogo/></Link>
        <div className="auth-card">
          <section className="auth-form-panel" aria-labelledby="auth-title">
            <header className="auth-heading"><h1 id="auth-title">{title}</h1><p>{description || 'Local knowledge for a fairer Bangladesh.'}</p></header>
            {children}
          </section>
          <aside className="auth-image-panel" aria-label="Our community">
            <img src={hero} alt=""/>
            <div className="auth-image-copy"><span>PEOPLE’S DATA. FAIRER PRICES.</span><h2>Your daily bazar,<br/>in focus.</h2><p>Join a community making everyday prices more transparent across Bangladesh.</p></div>
          </aside>
        </div>
        <p className="auth-demo-note">Frontend demo: accounts are stored in this browser. Use a demo password only.</p>
      </div>
    </main>
    <Footer/>
  </div>;
}
