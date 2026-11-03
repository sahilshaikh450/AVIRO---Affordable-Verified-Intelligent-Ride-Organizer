import React, { useEffect, useState } from 'react';
import api from '../../services/api';

// Private photos (college ID, number plate, licence) need the login token, which a plain <img src> doesn't send
export default function PrivatePhoto({ url, className, alt }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let objectUrl;
    let cancelled = false;
    setSrc(null);
    api.get(url.replace(/^\/api/, ''), { responseType: 'blob' })
      .then(res => { if (!cancelled) { objectUrl = URL.createObjectURL(res.data); setSrc(objectUrl); } })
      .catch(() => {});
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url]);
  return src ? <img src={src} alt={alt} className={className} /> : null;
}
