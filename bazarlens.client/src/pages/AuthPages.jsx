import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Field, Check, Form } from '../components/UI';
import AuthShell from '../components/AuthShell';
import { useAuth, useToast } from '../contexts/context';
import { mockApi } from '../services/mockApi';
import { homeForRole } from '../utils/navigation';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  return <AuthShell title="Welcome back" description="Sign in to your BazerLens account">
    <Form submitLabel="Log in" busyLabel="Signing in…" onSave={login} onDone={user => navigate(homeForRole(user.role), { replace: true })}>
      <Field label="Email address" name="email" type="email" placeholder="you@example.com" required autoComplete="username"/>
      <Field label="Password" name="password" type="password" required autoComplete="current-password"/>
      <div className="form-row"><Check label="Remember me" name="remember"/><Link to="/forgot-password">Forgot password?</Link></div>
    </Form>
    <p className="auth-link">Don’t have an account? <Link to="/signup">Sign up</Link></p>
    <p className="auth-link"><Link to="/statistics">Browse public prices</Link></p>
  </AuthShell>;
}

export function SignUpPage() {
  const navigate = useNavigate(), toast = useToast();
  return <AuthShell title="Create an account" description="Join your local price community">
    <Form onSave={mockApi.signup} onDone={() => { toast('Account created. Sign in with your new credentials.'); navigate('/login'); }} submitLabel="Create account">
      <Field label="Full name" name="name" placeholder="Your full name" required maxLength={120} autoComplete="name"/>
      <Field label="Email address" name="email" type="email" placeholder="you@example.com" required autoComplete="email"/>
      <div className="form-grid">
        <Field label="City" name="city" placeholder="Dhaka" required maxLength={120} autoComplete="address-level2"/>
        <Field label="Thana" name="area" placeholder="Dhanmondi" required maxLength={120} autoComplete="address-level3"/>
      </div>
      <Field label="Password (8–128 characters)" name="password" type="password" minLength={8} maxLength={128} required autoComplete="new-password"/>
      <Field label="Confirm password" name="confirmPassword" type="password" minLength={8} maxLength={128} required autoComplete="new-password"/>
      <Check label="I agree to the Terms of Service and Privacy Policy" name="agreeTerms" required/>
      <p className="auth-terms"><Link to="/terms">Terms of Service</Link> · <Link to="/privacy">Privacy Policy</Link></p>
    </Form>
    <p className="auth-link">Already have an account? <Link to="/login">Log in</Link></p>
  </AuthShell>;
}

export function ForgotPasswordPage() {
  const [account, setAccount] = useState(null), navigate = useNavigate();
  return <AuthShell title="Reset demo password">
    <p className="demo-warning">No email will be sent. This demo allows anyone with a demo email address to reset its password.</p>
    {!account ? <Form onSave={mockApi.forgotPassword} onDone={setAccount} submitLabel="Find demo account"><Field label="Email address" name="email" type="email" required/></Form> : <Form initial={account} onSave={mockApi.resetPassword} onDone={() => navigate('/login')} submitLabel="Reset password"><p>Resetting {account.email}</p><Field label="New password" name="password" type="password" required minLength={8} autoComplete="new-password"/><Field label="Confirm password" name="confirmPassword" type="password" required autoComplete="new-password"/></Form>}
    <p className="auth-link"><Link to="/login">Back to sign in</Link></p>
  </AuthShell>;
}
