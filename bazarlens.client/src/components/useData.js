import { useEffect, useState } from 'react';
export function useData(loader) {
  const [state,setState] = useState({ data: null, loading: true, error: '' });
  const [revision,setRevision] = useState(0);
  useEffect(() => { let active = true; loader().then(data => { if(active) setState({ data, loading: false, error: '' }); }).catch(e => { if(active) setState({ data: null, loading: false, error: e.message }); }); return () => { active = false; }; },[loader,revision]);
  useEffect(() => { const refresh = () => setRevision(v => v+1); window.addEventListener('bazerlens-data',refresh); window.addEventListener('storage',refresh); return () => { window.removeEventListener('bazerlens-data',refresh); window.removeEventListener('storage',refresh); }; },[]);
  return { ...state, reload: () => setRevision(v => v+1) };
}
