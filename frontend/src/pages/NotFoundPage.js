import React from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-aviro-dark flex flex-col items-center justify-center text-center p-8">
      <div className="text-7xl mb-6 animate-float">🏍️</div>
      <h1 className="font-display font-bold text-5xl text-aviro-orange mb-3">404</h1>
      <p className="text-xl font-semibold mb-2">Looks like you took a wrong turn!</p>
      <p className="text-aviro-muted text-sm mb-8 max-w-xs">This route doesn't exist on AVIRO. Let's get you back on track.</p>
      <Link to="/" className="btn-primary">Go Home 🏠</Link>
    </div>
  );
}
export default NotFoundPage;
