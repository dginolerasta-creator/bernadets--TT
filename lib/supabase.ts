'use client';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      joueurs: {
        Row: {
          id: string;
          email: string;
          prenom: string;
          nom: string;
          classement: string | null;
          categorie_age: string;
          telephone: string | null;
          date_naissance: string | null;
          role: 'admin' | 'joueur';
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          prenom: string;
          nom: string;
          classement?: string | null;
          categorie_age?: string;
          telephone?: string | null;
          date_naissance?: string | null;
          role?: 'admin' | 'joueur';
        };
        Update: {
          prenom?: string;
          nom?: string;
          classement?: string | null;
          categorie_age?: string;
          telephone?: string | null;
          date_naissance?: string | null;
        };
      };
      clubs: {
        Row: {
          id: string;
          nom: string;
          contact_nom: string | null;
          telephone: string | null;
          email: string | null;
          adresse: string | null;
          created_at: string;
        };
        Insert: {
          nom: string;
          contact_nom?: string | null;
          telephone?: string | null;
          email?: string | null;
          adresse?: string | null;
        };
      };
      weekends: {
        Row: {
          id: string;
          dates: string;
          debut: string;
          fin: string;
          created_at: string;
        };
        Insert: {
          dates: string;
          debut: string;
          fin: string;
        };
      };
      presences: {
        Row: {
          id: string;
          joueur_id: string;
          weekend_id: string;
          statut: 'présent' | 'absent' | 'indécis';
          created_at: string;
        };
        Insert: {
          joueur_id: string;
          weekend_id: string;
          statut: 'présent' | 'absent' | 'indécis';
        };
        Update: {
          statut: 'présent' | 'absent' | 'indécis';
        };
      };
    };
  };
};