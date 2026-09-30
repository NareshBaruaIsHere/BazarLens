import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/context';
import { LoadingState } from './UI';
export function ProtectedRoute({ admin = false }) { const {user,loading,error,refresh} = useAuth(); if(loading) return <LoadingState/>; if(error) return <div role="alert">{error}<button onClick={refresh}>Retry</button></div>; if(!user) return <Navigate to="/login" replace/>; if(admin && user.role !== 'admin') return <Navigate to="/access-denied" replace/>; return <Outlet/>; }
export function HomeRedirect() { const {user,loading} = useAuth(); if(loading) return <LoadingState/>; return <Navigate to={user ? user.role === 'admin' ? '/admin' : '/dashboard' : '/login'} replace/>; }
export function GuestRoute() { const {user,loading} = useAuth(); return loading ? <LoadingState/> : user ? <HomeRedirect/> : <Outlet/>; }
