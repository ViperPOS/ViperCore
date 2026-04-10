import { useState, useEffect } from 'react';

export default function App() {
  const [message, setMessage] = useState('React + Vite + Electron loaded successfully!');

  useEffect(() => {
    // Test IPC communication (when set up)
    console.log('App mounted - ready for pages');
  }, []);

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Lassi Corner POS</h1>
        <p className="text-xl text-slate-300">{message}</p>
        <p className="text-sm text-slate-500 mt-4">React + Vite + Electron</p>
      </div>
    </div>
  );
}
