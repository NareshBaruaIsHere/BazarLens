import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import './pages/DashboardPage.css';
import './styles.css';
import './layouts/Sidebar.css';
import { AuthProvider, ToastProvider } from './contexts/Providers';
import { ProtectedRoute, GuestRoute, HomeRedirect } from './components/Routes';
import AppLayout from './layouts/AppLayout';
import { LoginPage, SignUpPage, ForgotPasswordPage } from './pages/AuthPages';
import { DashboardPage, PricesPage, AnalyticsPage } from './pages/MarketPages';
import SubmissionsPage from './pages/SubmissionsPage';
import AlertsPage from './pages/AlertsPage';
import { ProfilePage, SettingsPage } from './pages/AccountPages';
import { UsersPage, CatalogPage, AdminSettingsPage } from './pages/AdminPages';
import PublicStatisticsPage from './pages/PublicStatisticsPage';
import { PublicPage, ErrorPage } from './pages/PublicPages';
export default function App() { return <BrowserRouter><ToastProvider><AuthProvider><Routes><Route path="/" element={<HomeRedirect/>}/><Route element={<GuestRoute/>}><Route path="/login" element={<LoginPage/>}/><Route path="/signup" element={<SignUpPage/>}/><Route path="/forgot-password" element={<ForgotPasswordPage/>}/></Route>{['about','privacy','terms','help'].map(page => <Route key={page} path={`/${page}`} element={<PublicPage page={page}/>}/>)}<Route path="/statistics" element={<PublicStatisticsPage/>}/><Route path="/access-denied" element={<ErrorPage denied/>}/><Route element={<ProtectedRoute/>}><Route element={<AppLayout/>}><Route path="/dashboard" element={<DashboardPage/>}/><Route path="/prices" element={<PricesPage/>}/><Route path="/submissions" element={<SubmissionsPage/>}/><Route path="/alerts" element={<AlertsPage/>}/><Route path="/analytics" element={<AnalyticsPage/>}/><Route path="/profile" element={<ProfilePage/>}/><Route path="/settings" element={<SettingsPage/>}/></Route></Route><Route element={<ProtectedRoute admin/>}><Route element={<AppLayout admin/>}><Route path="/admin" element={<DashboardPage admin/>}/><Route path="/admin/users" element={<UsersPage/>}/><Route path="/admin/submissions" element={<SubmissionsPage admin/>}/><Route path="/admin/product-review" element={<SubmissionsPage key="flagged" admin flaggedOnly/>}/><Route path="/admin/products" element={<CatalogPage key="products" kind="products"/>}/><Route path="/admin/markets" element={<CatalogPage key="markets" kind="markets"/>}/><Route path="/admin/analytics" element={<AnalyticsPage admin/>}/><Route path="/admin/profile" element={<ProfilePage/>}/><Route path="/admin/settings" element={<AdminSettingsPage/>}/></Route></Route><Route path="*" element={<ErrorPage/>}/></Routes></AuthProvider></ToastProvider></BrowserRouter>; }
