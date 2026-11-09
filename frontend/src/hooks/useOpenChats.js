import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

const REFRESH_MS = 60000;

export default function useOpenChats() {
  const { pathname } = useLocation();
  const [chats, setChats] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .get('/chat/active')
        .then((res) => {
          if (alive) setChats(res.data.data || []);
        })
        .catch(() => {})
        .finally(() => {
          if (alive) setLoaded(true);
        });
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pathname]);

  return { chats, loaded };
}
