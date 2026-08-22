import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

export const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f4f7fb] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans flex transition-colors duration-200">
      {/* Przycisk otwierania menu na urządzeniach mobilnych */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen(true)}
        className="fixed top-4 left-4 z-40 p-2.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-md border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 lg:hidden transition"
        title="Otwórz menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Lewy pasek boczny (Sidebar) */}
      <Sidebar
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Główny obszar strony z marginesem na szerokość sidebaru na desktopie */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300">
        {/* Główny widok podstrony */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in pt-16 lg:pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

