
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { useRouter, usePathname } from 'next/navigation';

export default function Header() {
  const { user, profile, logout, isClient } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isClient && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, router, pathname, isClient]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!isClient) {
    return (
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-2xl font-cursive text-blue-600" style={{ fontFamily: 'Brush Script MT, cursive' }}>
              Bernadets TT
            </div>
            <div className="text-base text-gray-500" suppressHydrationWarning={true}>Chargement...</div>
          </div>
        </div>
      </header>
    );
  }

  if (!user) {
    return null;
  }

  const navItems = [
    { name: 'Présences', href: '/presences', icon: 'ri-calendar-check-line' },
    { name: 'Rencontres', href: '/rencontres', icon: 'ri-trophy-line' },
    { name: 'Joueurs', href: '/joueurs', icon: 'ri-user-line' },
    { name: 'Poules', href: '/poules', icon: 'ri-trophy-line' },
    { name: 'Clubs', href: '/clubs', icon: 'ri-building-line' }
  ];

  const getRoleDisplay = () => {
    switch (profile?.role) {
      case 'admin':
        return { text: 'Administrateur', color: 'bg-red-100 text-red-800' };
      case 'joueur':
        return { text: 'Joueur', color: 'bg-blue-100 text-blue-800' };
      case 'guest':
        return { text: 'Visiteur', color: 'bg-gray-100 text-gray-800' };
      default:
        return { text: 'Utilisateur', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const roleInfo = getRoleDisplay();

  const getDisplayName = () => {
    if (profile?.role === 'admin') {
      return 'Compositeur';
    }
    return `${profile?.prenom} ${profile?.nom}`;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/presences" className="flex items-center">
            <img 
              src="https://i.postimg.cc/8PC22QmC/logo.png" 
              alt="Logo Bernadets TT" 
              className="w-16 h-16 mr-3 object-contain"
            />
            <div className="text-2xl text-blue-600" style={{ fontFamily: 'Brush Script MT, cursive' }}>
              Bernadets TT
            </div>
          </Link>

          <nav className="hidden md:flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center text-base transition-colors ${
                  pathname === item.href 
                    ? 'text-blue-600' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <i className={`${item.icon} mr-2`}></i>
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-3 text-gray-700">
              <div className="text-right">
                <div className="text-base font-medium">{getDisplayName()}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 text-base text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              title="Déconnexion"
            >
              <i className="ri-logout-circle-line mr-1"></i>
              Déconnexion
            </button>
          </div>

          <div className="md:hidden">
            <div className="flex items-center space-x-1">
              <div className="text-xs font-medium text-gray-700 truncate max-w-[80px)">
                <div>{profile?.prenom}</div>
                <div>{profile?.nom}</div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center p-1 text-base text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                title="Déconnexion"
              >
                <i className="ri-logout-circle-line text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden bg-white border-t border-gray-100">
        <div className="px-2 py-2">
          <div className="flex justify-between space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center px-2 py-1 text-sm transition-colors cursor-pointer flex-1 text-center ${
                  pathname === item.href 
                    ? 'text-blue-600' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <i className={`${item.icon} text-lg mb-1`}></i>
                <span className="whitespace-nowrap">{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
