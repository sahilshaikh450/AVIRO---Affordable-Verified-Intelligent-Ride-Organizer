import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

const REFRESH_MS = 60000;

// Chats the user can use right now: one per confirmed ride they're on.
// Chat opens when the driver confirms and closes when the trip ends, so this is re-checked
// on every page change and once a minute.
export default function useOpenChats() {
  const { pathname } = useLocation();
  const [chats, setChats] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => api.get('/chat/active')
      .then(res => { if (alive) setChats(res.data.data || []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoaded(true); });
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(id); };
  }, [pathname]);

  return { chats, loaded };
}
