
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  role: 'admin' | 'joueur' | 'guest';
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  login: (email: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  isClient: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Récupérer les données du localStorage après l'hydratation
    const savedUser = localStorage.getItem('authUser');
    const savedProfile = localStorage.getItem('authProfile');
    
    if (savedUser && savedProfile) {
      try {
        setUser(JSON.parse(savedUser));
        setProfile(JSON.parse(savedProfile));
      } catch (error) {
        console.error('Erreur lors de la récupération des données locales:', error);
        localStorage.removeItem('authUser');
        localStorage.removeItem('authProfile');
      }
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string) => {
    try {
      if (email === 'compositeur') {
        const adminProfile: Profile = {
          id: 'admin',
          email: 'compositeur',
          prenom: 'Admin',
          nom: 'Compositeur',
          role: 'admin'
        };

        const adminUser = { 
          id: 'admin', 
          email: 'compositeur',
          user_metadata: {},
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString()
        } as User;

        setUser(adminUser);
        setProfile(adminProfile);

        if (typeof window !== 'undefined') {
          localStorage.setItem('authUser', JSON.stringify({
            id: 'admin',
            email: 'compositeur'
          }));
          localStorage.setItem('authProfile', JSON.stringify(adminProfile));
        }

        return;
      }

      // Vérifier si le joueur existe dans la base de données
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/auth`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'login',
          email: email
        }),
      });

      const data = await response.json();

      if (data.success && data.joueur) {
        // Utiliser les vraies données du joueur de la base de données
        const playerProfile: Profile = {
          id: data.joueur.id.toString(),
          email: data.joueur.email,
          prenom: data.joueur.prenom,
          nom: data.joueur.nom,
          role: data.joueur.role || 'joueur' // Utiliser le rôle de la base de données
        };

        const playerUser = {
          id: data.joueur.id.toString(),
          email: data.joueur.email,
          user_metadata: {},
          app_metadata: {},
          aud: 'authenticated', 
          created_at: new Date().toISOString()
        } as User;

        setUser(playerUser);
        setProfile(playerProfile);

        if (typeof window !== 'undefined') {
          localStorage.setItem('authUser', JSON.stringify({
            id: data.joueur.id.toString(),
            email: data.joueur.email
          }));
          localStorage.setItem('authProfile', JSON.stringify(playerProfile));
        }
      } else {
        throw new Error(data.error || 'Joueur non trouvé. Demandez à l\'administrateur de créer votre compte.');
      }

    } catch (error) {
      console.error('Erreur de connexion:', error);
      throw new Error(error.message || 'Erreur lors de la connexion');
    }
  };

  const loginAsGuest = async () => {
    try {
      const guestProfile: Profile = {
        id: 'guest',
        email: 'guest@visiteur.local',
        prenom: 'Visiteur',
        nom: 'Guest',
        role: 'guest'
      };

      const guestUser = { 
        id: 'guest', 
        email: 'guest@visiteur.local',
        user_metadata: {},
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      } as User;

      setUser(guestUser);
      setProfile(guestProfile);

      if (typeof window !== 'undefined') {
        localStorage.setItem('authUser', JSON.stringify({
          id: 'guest',
          email: 'guest@visiteur.local'
        }));
        localStorage.setItem('authProfile', JSON.stringify(guestProfile));
      }

    } catch (error) {
      console.error('Erreur de connexion visiteur:', error);
      throw new Error('Erreur lors de la connexion visiteur');
    }
  };

  const logout = async () => {
    setUser(null);
    setProfile(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authUser');
      localStorage.removeItem('authProfile');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      login,
      loginAsGuest,
      logout,
      loading,
      isClient
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
