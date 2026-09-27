import { useEffect, useRef, useState } from 'react';
import { alerts, prices, submissions, summaryCards, trends } from '../data/dashboard';
import './DashboardPage.css';

const iconPaths = {
    home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
    tag: 'M3 3h8l10 10-8 8L3 11ZM7 7h.01',
    trend: 'M3 3v18h18M6 15l5-6 4 3 6-8',
    file: 'M14 3H5v18h14V8ZM14 3v5h5M8 12h8M8 16h6',
    bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4',
    bars: 'M4 13h3v8H4ZM10 8h3v13h-3ZM16 3h3v18h-3Z',
    settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z',
    search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM15 15l6 6',
    pin: 'M12 22s7-8 7-13A7 7 0 0 0 5 9c0 5 7 13 7 13ZM12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
    menu: 'M3 6h18M3 12h18M3 18h18',
    plus: 'M12 5v14M5 12h14', close: 'M6 6l12 12M6 18 18 6',
    map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16M15 5v16',
    rice: 'M3 12h18c-1 7-4 9-9 9s-8-2-9-9ZM5 12l2-5 3 1 2-5 3 4 3-1 2 6M9 10h.01M14 9h.01',
    potato: 'M4 7C7 1 16 3 19 8s3 11-3 13S2 17 3 12ZM8 8h.01M15 11h.01M9 16h.01',
    fish: 'M3 12s5-7 11-5l5 5-5 5c-6 2-11-5-11-5ZM19 12l3-5v10ZM12 10h.01M8 8l2-4M8 16l2 4',
    up: 'M12 20V4M5 11l7-7 7 7', down: 'M12 4v16M5 13l7 7 7-7',
};
function Icon({ name, ...props }) {
    return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={iconPaths[name] || iconPaths.file} /></svg>;
}
function TrendChart({ range }) {
    const series = trends.map(series => ({ ...series, values: range === 'week' ? series.values.slice(-7) : series.values }));
    const point = (value, i, count) => `${42 + i * 440 / (count - 1)},${206 - value / 1600 * 180}`;
    return <>
        <div className="dash-legend">{series.map(s => <span key={s.item}><i style={{ background: s.color }} />{s.item} (kg)</span>)}</div>
        <svg className="dash-trend-chart" viewBox="0 0 510 245" role="img" aria-label={`Mock rice, potato and hilsa prices in taka per kilogram over the last ${range === 'week' ? '7' : '30'} days`}>
            <defs><linearGradient id="hilsa-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#60b8ff" stopOpacity=".24" /><stop offset="1" stopColor="#60b8ff" stopOpacity=".02" /></linearGradient></defs>
            {[0, 400, 800, 1200, 1600].map(v => <g key={v}><line x1="42" x2="482" y1={206 - v / 1600 * 180} y2={206 - v / 1600 * 180} stroke="#e8eef4" /><text x="32" y={210 - v / 1600 * 180} textAnchor="end">{v.toLocaleString()}</text></g>)}
            {[0, 1, 2, 3, 4, 5, 6].map(i => <line key={i} x1={42 + i * 440 / 6} x2={42 + i * 440 / 6} y1="26" y2="206" stroke="#e8eef4" />)}
            <polygon points={`42,206 ${series[2].values.map((v, i) => point(v, i, series[2].values.length)).join(' ')} 482,206`} fill="url(#hilsa-fill)" />
            {series.map(s => <g key={s.item}><polyline points={s.values.map((v, i) => point(v, i, s.values.length)).join(' ')} stroke={s.color} strokeWidth="2.5" fill="none" />{s.values.map((v, i) => <circle key={i} cx={42 + i * 440 / (s.values.length - 1)} cy={206 - v / 1600 * 180} r="3" fill={s.color}><title>{s.item}: ৳ {v} / kg</title></circle>)}</g>)}
            {(range === 'week' ? ['May 14', 'May 15', 'May 16', 'May 17', 'May 18', 'May 19', 'May 20'] : ['Apr 20', 'Apr 25', 'Apr 30', 'May 5', 'May 10', 'May 15', 'May 20']).map((label, i) => <text key={label} x={42 + i * 440 / 6} y="232" textAnchor="middle">{label}</text>)}
        </svg>
    </>;
}
function PriceForm({ onSubmit, onClose }) {
    const dialog = useRef(null);
    const [error, setError] = useState('');
    useEffect(() => { dialog.current.showModal(); }, []);
    function submit(event) {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.currentTarget));
        if (Object.values(values).some(value => !value.trim()) || !Number.isFinite(Number(values.price)) || Number(values.price) <= 0) {
            setError('Complete all fields and enter a price greater than zero.');
            return;
        }
        onSubmit({ ...values, item: values.item.trim(), area: values.area.trim(), market: values.market.trim(), price: Number(values.price) });
    }
    return <dialog ref={dialog} className="dash-modal" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="price-title">
        <form onSubmit={submit}>
            <div className="dash-card-heading"><h2 id="price-title">Contribute a Price</h2><button type="button" className="dash-icon-button" onClick={onClose} aria-label="Close price form"><Icon name="close" /></button></div>
            <p>Share a price from your local bazar. Every update helps.</p>
            <label>Item name<input name="item" placeholder="e.g. Rice" required autoFocus maxLength="80" /></label>
            <div className="dash-form-row"><label>Price (৳)<input name="price" type="number" min="0.01" step="0.01" placeholder="62" required /></label><label>Unit<select name="unit" required defaultValue="kg"><option value="kg">kg</option><option value="litre">litre</option><option value="piece">piece</option><option value="dozen">dozen</option></select></label></div>
            <label>Area / Location<input name="area" placeholder="e.g. Dhanmondi, Dhaka" required maxLength="120" /></label>
            <label>Market / Bazar name<input name="market" placeholder="e.g. Karwan Bazar" required maxLength="120" /></label>
            {error && <p className="dash-form-error" role="alert">{error}</p>}
            <p className="dash-form-note">Demo only. Your submission stays in this session and will appear as pending.</p>
            <div className="dash-modal-actions"><button className="dash-secondary" type="button" onClick={onClose}>Cancel</button><button className="dash-primary" type="submit">Submit Price</button></div>
        </form>
    </dialog>;
}

function DashboardPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [rows, setRows] = useState(submissions);
    const [search, setSearch] = useState('');
    const [area, setArea] = useState('all');
    const [date, setDate] = useState('');
    const [range, setRange] = useState('month');
    const [message, setMessage] = useState('');
    const addButton = useRef(null);
    const sidebar = useRef(null);
    const menuButton = useRef(null);
    useEffect(() => {
        if (!sidebarOpen) return;
        sidebar.current.querySelector('button').focus();
        function onKey(event) {
            if (event.key === 'Escape') { setSidebarOpen(false); menuButton.current.focus(); }
            if (event.key === 'Tab') {
                const buttons = [...sidebar.current.querySelectorAll('button:not(:disabled)')].filter(button => button.getClientRects().length);
                const first = buttons[0], last = buttons.at(-1);
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [sidebarOpen]);
    const filteredRows = rows.filter(row => row.item.toLowerCase().includes(search.trim().toLowerCase()) && (area === 'all' || row.area.toLowerCase().includes(area.toLowerCase())) && (!date || row.date === date));
    function openForm() { setSidebarOpen(false); setFormOpen(true); }
    function closeForm() { setFormOpen(false); addButton.current?.focus(); }
    function addPrice(values) {
        const now = new Date();
        const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        setRows(current => [{ ...values, id: crypto.randomUUID(), date: localDate, time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), status: 'Pending' }, ...current]);
        setSearch(''); setArea('all'); setDate('');
        setMessage('Price submitted! Your update is now in Recent Price Submissions, pending verification.');
        closeForm();
    }
    return <div className="dashboard">
        {sidebarOpen && <div className="dash-sidebar-backdrop" onClick={() => { setSidebarOpen(false); menuButton.current.focus(); }} />}
        <aside ref={sidebar} id="dashboard-sidebar" className={`dash-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
            <button className="dash-sidebar-close dash-icon-button" onClick={() => { setSidebarOpen(false); menuButton.current.focus(); }} aria-label="Close navigation"><Icon name="close" /></button>
            <div className="dash-brand"><svg width="36" height="40" viewBox="0 0 40 44" aria-hidden="true"><path d="M6 32C1 10 20 8 33 3c3 22-5 33-23 31L4 42l3-15L25 12Z" fill="#10d6a0" /></svg><div><strong>Bazer<span>Lens</span><sup>™</sup></strong><small>People’s Data for Fairer Prices</small></div></div>
            <nav aria-label="Main navigation">{[['Dashboard', 'home'], ['Prices', 'tag'], ['Trends', 'trend'], ['Submissions', 'file'], ['Alerts', 'bell'], ['Analytics', 'bars'], ['Settings', 'settings']].map(([label, icon], index) => <button key={label} className={index === 0 ? 'active' : ''} aria-current={index === 0 ? 'page' : undefined} disabled={index !== 0} title={index !== 0 ? `${label} — coming soon` : undefined} onClick={() => setSidebarOpen(false)}><Icon name={icon} /><span>{label}</span>{label === 'Alerts' && <b>3</b>}</button>)}</nav>
            <div className="dash-info-card"><div className="dash-info-art"><Icon name="rice" width="64" height="64" /><span>GROWING A FAIRER FUTURE</span></div><h2>A fairer bazar<br />for a brighter<br />Bangladesh</h2><p>Real prices. Real people.<br />Real change.</p><button className="dash-primary" onClick={openForm}><Icon name="plus" />Contribute Price</button></div>
        </aside>
        <div className="dash-main">
            <header className="dash-topbar">
                <button ref={menuButton} className="dash-menu dash-icon-button" aria-label="Open navigation" aria-expanded={sidebarOpen} aria-controls="dashboard-sidebar" onClick={() => setSidebarOpen(true)}><Icon name="menu" /></button>
                <label className="dash-search"><Icon name="search" /><input aria-label="Search submissions by item" placeholder="Search for an item (e.g. rice, potato, hilsa)" value={search} onChange={event => setSearch(event.target.value)} /></label>
                <label className="dash-area-select"><Icon name="pin" /><select aria-label="Filter submissions by area" value={area} onChange={event => setArea(event.target.value)}><option value="all">Bangladesh (All Areas)</option>{prices.map(p => <option key={p.area}>{p.area}</option>)}</select></label>
                <input className="dash-date" type="date" aria-label="Filter submissions by date" value={date} onChange={event => setDate(event.target.value)} />
                <button className="dash-notifications dash-icon-button" aria-label="View 3 price alerts" onClick={() => document.getElementById('price-alerts').scrollIntoView({ behavior: 'smooth', block: 'center' })}><Icon name="bell" /><i /></button>
                <div className="dash-profile"><span className="dash-avatar">TA</span><div><strong>Tanvir Ahmed</strong><small>Community Contributor</small></div></div>
            </header>
            <main className="dash-content">
                <div className="dash-heading"><div><h1>Dashboard</h1><p>Live bazar prices from real people, across Bangladesh.</p></div><div className="dash-heading-note">Together for<br />a more transparent<br />Bangladesh<span /></div></div>
                <div className="dash-summary">{summaryCards.map((card, i) => <article className="dash-card dash-stat" key={card.label}><span className={`dash-stat-icon ${card.tone}`}><Icon name={card.icon} width="34" height="34" /></span><div><h2>{card.label}</h2><div className="dash-stat-value"><strong>{i === 0 ? (2483 + rows.length - submissions.length).toLocaleString() : card.value}{card.unit && <small> {card.unit}</small>}</strong><span className={card.tone === 'amber' ? 'dash-increase' : ''}>↑ {card.change}%</span></div><p>vs. previous month</p></div></article>)}</div>
                <div className="dash-charts">
                    <section className="dash-card dash-trends"><div className="dash-card-heading"><h2><Icon name="trend" />Price Trends Over Time</h2><select aria-label="Trend chart period" value={range} onChange={event => setRange(event.target.value)}><option value="month">Last 30 Days</option><option value="week">Last 7 Days</option></select></div><TrendChart range={range} /></section>
                    <section className="dash-card dash-area-chart"><div className="dash-card-heading"><h2><Icon name="bars" />Average Price by Area</h2><span className="dash-chip">Rice (kg)</span></div><svg viewBox="0 0 370 270" role="img" aria-label="Average rice prices in taka per kilogram: Dhaka 68, Chattogram 62, Sylhet 58, Khulna 65, Rajshahi 60, Barishal 56"><defs><linearGradient id="bar-fill" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#4cbb8e" /><stop offset="1" stopColor="#2d9c76" /></linearGradient></defs>{[0, 20, 40, 60, 80, 100].map(v => <g key={v}><line x1="32" x2="362" y1={224 - v * 2} y2={224 - v * 2} stroke="#e8eef4" /><text x="23" y={228 - v * 2} textAnchor="end">{v === 100 ? '৳ 100' : v}</text></g>)}{prices.map((p, i) => <g key={p.area}><rect x={42 + i * 54} y={224 - p.price * 2} width="35" height={p.price * 2} rx="3" fill="url(#bar-fill)" /><text className="dash-bar-value" x={59 + i * 54} y={216 - p.price * 2} textAnchor="middle">{p.price}</text><text className="dash-bar-label" x={59 + i * 54} y="246" textAnchor="middle">{p.area}</text></g>)}</svg></section>
                    <section className="dash-card dash-market"><div className="dash-card-heading"><h2><Icon name="map" />Market Areas in Bangladesh</h2></div><svg viewBox="0 0 310 292" role="img" aria-label="Illustrative Bangladesh market area visualization, showing mock average rice prices"><path d="m81 18 28 19 20-5 16 23 30-6 12 16 40-6 25 27-21 26-24-1-16 24 3 23 24 17 6 38 22 43-16-9-18-27-17 4-11-20-18 15-13-9-10 18-17-22-7-28-21-12 7-30-19-20 13-26-16-19 9-17-14-23Z" fill="#b6e4b9" stroke="#8bcf9e" strokeWidth="2" /><path d="m109 37 6 47 31 22-5 42 19 34-13 47M69 110l46-26 63 13 43-18M64 171l77-23 52-16M94 221l47-36 43 24" stroke="#dff3df" strokeWidth="3" fill="none" />{prices.map(p => <g key={p.area}><circle cx={p.x} cy={p.y} r="6" fill={p.area === 'Dhaka' ? '#064e3b' : '#059669'} stroke="white" strokeWidth="2" /><rect x={p.x > 190 ? p.x + 8 : p.x - 61} y={p.y - 40} width="78" height="37" rx="7" fill="white" stroke="#e2e8f0" /><text x={p.x > 190 ? p.x + 14 : p.x - 55} y={p.y - 25}>{p.area}</text><text className="dash-map-price" x={p.x > 190 ? p.x + 14 : p.x - 55} y={p.y - 11}>৳ {p.price}</text></g>)}</svg><p className="dash-map-note">Average rice price / kg · Illustrative map</p></section>
                </div>
                <div className="dash-bottom-grid">
                    <section className="dash-card dash-submissions"><div className="dash-card-heading"><h2><Icon name="file" />Recent Price Submissions</h2><button ref={addButton} className="dash-text-button" onClick={openForm}><Icon name="plus" width="16" height="16" />Add Price</button></div><p className="dash-table-note">Mock data · Search, area and date filter this table only.{(search || area !== 'all' || date) && <button className="dash-text-button" onClick={() => { setSearch(''); setArea('all'); setDate(''); }}>Clear filters</button>}</p><p className="dash-success" role="status">{message}</p><div className="dash-table-scroll"><table><thead><tr>{['#', 'Item', 'Price (৳)', 'Unit', 'Area', 'Submitted At', 'Status'].map(heading => <th key={heading} scope="col">{heading}</th>)}</tr></thead><tbody>{filteredRows.map((row, i) => <tr key={row.id}><td>{i + 1}</td><td><span className="dash-table-item"><Icon name={row.item.toLowerCase() === 'hilsa' ? 'fish' : row.item.toLowerCase()} width="22" height="22" /><strong>{row.item}</strong></span></td><td><strong>{row.price.toLocaleString()}</strong></td><td>{row.unit}</td><td>{[row.market, row.area].filter(Boolean).join(', ')}</td><td>{new Date(`${row.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, {row.time}</td><td><span className={`dash-status ${row.status.toLowerCase()}`}>{row.status}</span></td></tr>)}{!filteredRows.length && <tr><td colSpan="7" className="dash-empty">No submissions match your filters.</td></tr>}</tbody></table></div></section>
                    <section id="price-alerts" className="dash-card dash-alerts"><div className="dash-card-heading"><h2><Icon name="bell" />Price Alerts &amp; Notifications</h2><span className="dash-chip">3 alerts</span></div>{alerts.map(alert => <article className={`dash-alert ${alert.tone}`} key={alert.item}><span className={`dash-alert-icon ${alert.tone}`}><Icon name={alert.icon} /></span><div><h3>{alert.title}</h3><p>{alert.description}</p></div><small>{alert.time}</small></article>)}</section>
                </div>
                <footer className="dash-footer">People’s data. Fairer prices. <span>Frontend demo · All prices are mock data</span></footer>
            </main>
        </div>
        {formOpen && <PriceForm onSubmit={addPrice} onClose={closeForm} />}
    </div>;
}
export default DashboardPage;
