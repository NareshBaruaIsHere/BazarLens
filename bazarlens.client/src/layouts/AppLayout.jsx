import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useToast } from '../contexts/context';
import { api } from '../services/api';
import { useData } from '../components/useData';
import { AppLogo, Footer, Modal, EmptyState } from '../components/UI';
import SidebarIcon from '../components/SidebarIcon';
const mobileQuery = '(max-width: 1024px)';
const subscribeViewport = listener => {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
};
const mobileSnapshot = () => window.matchMedia(mobileQuery).matches;
const serverSnapshot = () => false;
const userLinks = [['Dashboard','/dashboard','home'],['Prices','/prices','prices'],['Submissions','/submissions','submissions'],['Alerts','/alerts','alerts'],['Analytics','/analytics','analytics'],['Settings','/settings','settings']];
const agentLinks = [['Price submissions','/submissions','submissions'],['Profile','/profile','user'],['Settings','/settings','settings']];
const adminLinks = [['Overview','/admin','home'],['Users','/admin/users','user'],['Submissions','/admin/submissions','submissions'],['Product review','/admin/product-review','submissions'],['Products','/admin/products','prices'],['Markets','/admin/markets','market'],['Analytics','/admin/analytics','analytics'],['Profile','/admin/profile','user'],['Settings','/admin/settings','settings']];
export default function AppLayout({admin = false}) {
  const {user,logout} = useAuth(), toast = useToast(), navigate = useNavigate(), location = useLocation();
  const [drawerLocation,setDrawerLocation] = useState(null), [notice,setNotice] = useState(false), [profile,setProfile] = useState(false), [busy,setBusy] = useState(false);
  const sidebar = useRef(null), menu = useRef(null);
  const mobile = useSyncExternalStore(subscribeViewport, mobileSnapshot, serverSnapshot);
  const open = mobile && drawerLocation === location.key;
  const setOpen = value => setDrawerLocation(value ? location.key : null);
  useEffect(() => {
    const query = window.matchMedia(mobileQuery);
    const reset = () => setDrawerLocation(null);
    query.addEventListener('change', reset);
    return () => query.removeEventListener('change', reset);
  }, []);
  const prefs = useData(api.getSettings), notifications = useData(api.getNotifications);
  useEffect(() => { document.title = `BazerLens · ${location.pathname.split('/').at(-1) || 'Dashboard'}`; },[location.pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = requestAnimationFrame(() => sidebar.current?.querySelector('button').focus());
    const key = event => {
      if (event.key === 'Escape') { event.preventDefault(); setDrawerLocation(null); }
      if (event.key !== 'Tab') return;
      const nodes = [...sidebar.current.querySelectorAll('a[href],button:not(:disabled)')].filter(node => node.getClientRects().length);
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', key);
      if (previous?.isConnected && previous.getClientRects().length) previous.focus();
    };
  }, [open]);
  async function signOut() { setBusy(true); try { await logout(); navigate('/login'); } catch(e) { toast(e.message,'error'); } finally { setBusy(false); } }
  const initials = user.name.split(' ').map(s => s[0]).slice(0,2).join('');
  return <div className={`dashboard ${admin ? 'admin-dashboard' : ''} ${prefs.data?.compactTables ? 'compact' : ''}`}><a inert={open || undefined} className="skip-link" href="#main-content">Skip to content</a>{open && <button className="dash-sidebar-backdrop" tabIndex={-1} aria-label="Close navigation" onClick={() => setOpen(false)}/>}
    <aside ref={sidebar} id="navigation" role={open ? 'dialog' : undefined} aria-modal={open || undefined} inert={mobile && !open || undefined} className={`dash-sidebar ${open ? 'is-open' : ''}`} aria-label={admin ? 'Administration' : 'Main navigation'}><div className="dash-sidebar-header"><button className="dash-sidebar-close dash-icon-button" aria-label="Close navigation" onClick={() => setOpen(false)}><SidebarIcon name="close"/></button><AppLogo/>{admin && <div className="admin-label">ADMINISTRATION</div>}</div><div className="dash-sidebar-scroll"><nav aria-label="Pages">{(admin ? adminLinks : user.role === 'agent' ? agentLinks : userLinks).map(([label,to,icon]) => <NavLink key={to} to={to} end onClick={() => setOpen(false)}><SidebarIcon name={icon}/><span>{label}</span></NavLink>)}</nav><div className="dash-info-card"><div className="dash-info-art"><SidebarIcon name="leaf" size={48}/><span>GROWING A FAIRER FUTURE</span></div><h2>A fairer bazar<br/>for Bangladesh</h2><p>Real prices. Real people.<br/>Real change.</p><Link className="dash-primary" to={admin ? '/admin/submissions' : '/submissions?create=1'} onClick={() => setOpen(false)}>{admin ? 'Review submissions' : '+ Contribute Price'}</Link></div></div><button className="sidebar-logout" disabled={busy} onClick={signOut}>{busy ? 'Signing out…' : 'Logout'}</button></aside>
    <div className="dash-main" inert={open || undefined}><header className="dash-topbar"><button ref={menu} className="dash-menu dash-icon-button" aria-label="Open navigation" aria-expanded={open} aria-controls="navigation" onClick={() => setOpen(true)}><SidebarIcon name="menu"/></button><div className="topbar-title">{admin ? 'Community administration' : 'Your daily bazar, in focus'}<small>Bangladesh · Community prices</small></div>{user.role !== 'agent' && <button className="dash-secondary" aria-label="View notifications" onClick={() => setNotice(true)}>Notifications {notifications.data?.length ? `(${notifications.data.length})` : ''}</button>}<button className="dash-profile profile-button" onClick={() => setProfile(true)} aria-label="Open profile menu"><span className="dash-avatar"><span>{initials}</span>{user.avatarUrl ? <img src={user.avatarUrl} alt="" onError={e => { e.currentTarget.style.display='none'; }}/>: null}</span><div><strong>{user.name}</strong><small>{user.role}</small></div></button></header><main id="main-content" className="dash-content"><Outlet/></main><Footer/></div>
    {profile && <Modal title={user.name} onClose={() => setProfile(false)}><p>{user.email} · {user.role}</p><div className="action-row"><Link className="dash-primary" to={admin ? '/admin/profile' : '/profile'} onClick={() => setProfile(false)}>Edit profile</Link>{user.role === 'admin' && <Link to={admin ? '/dashboard' : '/admin'} onClick={() => setProfile(false)}>{admin ? 'User dashboard' : 'Admin panel'}</Link>}<button disabled={busy} onClick={signOut}>Logout</button></div></Modal>}
    {notice && <Modal title="Price notifications" onClose={() => setNotice(false)}>{notifications.error ? <p role="alert">{notifications.error}</p> : !prefs.data?.inAppNotifications ? <p>In-app notifications are turned off in Settings.</p> : notifications.data?.length ? notifications.data.map(n => <article className="notification" key={n.id}><p>{n.message}</p>{n.emailPreview && <small>Email preview enabled — demo only; no email is sent.</small>}</article>) : <EmptyState message="No enabled alert currently matches a price."/>}<Link to="/alerts" onClick={() => setNotice(false)}>Manage alerts</Link></Modal>}
  </div>;
}

