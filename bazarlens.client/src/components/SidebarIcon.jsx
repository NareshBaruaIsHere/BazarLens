const paths = {
  home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  prices: 'M3 3h8l10 10-8 8L3 11ZM7 7h.01',
  trends: 'M3 3v18h18M6 15l5-6 4 3 6-8',
  submissions: 'M14 3H5v18h14V8ZM14 3v5h5M8 12h8M8 16h6',
  alerts: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4',
  analytics: 'M4 13h3v8H4ZM10 8h3v13h-3ZM16 3h3v18h-3Z',
  settings: 'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  market: 'M12 22s7-8 7-13A7 7 0 0 0 5 9c0 5 7 13 7 13ZM12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'M6 6l12 12M6 18 18 6',
  leaf: 'M5 19C1 7 13 6 21 3c1 12-4 18-13 16ZM3 22 16 9',
};

export default function SidebarIcon({ name, size = 22, className = '' }) {
  return <svg className={`sidebar-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name] || paths.home}/></svg>;
}
