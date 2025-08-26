"use client"; // ⚠ Obligatoire pour useState/useEffect

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";

// Définition du type Player selon ta table Supabase
type Player = {
  id: string;
  name: string;
  age?: number;
  team?: string;
};

// Type pour insertion/lecture Supabase
type PlayerInsert = Player;

export default function JoueursPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from<Player, PlayerInsert>("players") // ⚠ deux arguments génériques
        .select("*");

      if (error) {
        console.error("Erreur Supabase:", error.message);
      } else if (data) {
        setPlayers(data);
      }
    };

    fetchPlayers();
  }, []);

  return (
    <div>
      <Header />
      <h1>Liste des joueurs</h1>
      <ul>
        {players.map((player) => (
          <li key={player.id}>
            {player.name} {player.age && `(${player.age} ans)`}
          </li>
        ))}
      </ul>
    </div>
  );
}
