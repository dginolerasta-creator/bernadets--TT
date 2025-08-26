"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; 
import Header from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";

interface Joueur {
  id: number;
  nom: string;
  prenom: string;
  equipes?: string[];
}

export default function JoueursPage() {
  const { user } = useAuth();
  const [joueurs, setJoueurs] = useState<Joueur[]>([]);
  const [loading, setLoading] = useState(true);
  const [equipesInput, setEquipesInput] = useState<{ [key: number]: string }>({});

  // Récupération des joueurs depuis Supabase
  useEffect(() => {
    const fetchJoueurs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from<Joueur>("joueurs")
        .select("*")
        .order("nom", { ascending: true });
      if (error) {
        console.error("Erreur récupération joueurs :", error.message);
      } else if (data) {
        setJoueurs(data);
        // Initialisation des inputs avec les équipes existantes
        const initialEquipes: { [key: number]: string } = {};
        data.forEach(j => {
          initialEquipes[j.id] = j.equipes ? j.equipes.join(", ") : "";
        });
        setEquipesInput(initialEquipes);
      }
      setLoading(false);
    };
    fetchJoueurs();
  }, []);

  // Gestion de la modification des équipes dans l'input
  const handleEquipesChange = (id: number, value: string) => {
    setEquipesInput(prev => ({ ...prev, [id]: value }));
  };

  // Enregistrement des modifications dans Supabase
  const handleSave = async (joueur: Joueur) => {
    const equipesArray = equipesInput[joueur.id]
      .split(",")
      .map(e => e.trim())
      .filter(e => e.length > 0);

    const { error } = await supabase
      .from("joueurs")
      .update({ equipes: equipesArray })
      .eq("id", joueur.id);

    if (error) {
      console.error("Erreur mise à jour :", error.message);
      alert("Erreur lors de la mise à jour des équipes");
    } else {
      alert(`Équipes de ${joueur.nom} mises à jour avec succès`);
      // Mise à jour locale pour rester synchro
      setJoueurs(prev =>
        prev.map(j =>
          j.id === joueur.id ? { ...j, equipes: equipesArray } : j
        )
      );
    }
  };

  if (loading) return <p>Chargement...</p>;

  return (
    <div>
      <Header user={user} />
      <h1 className="text-2xl font-bold my-4">Liste des joueurs</h1>
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-4 py-2">Nom</th>
            <th className="border px-4 py-2">Prénom</th>
            <th className="border px-4 py-2">Équipes</th>
            <th className="border px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {joueurs.map(joueur => (
            <tr key={joueur.id} className="border-b">
              <td className="border px-4 py-2">{joueur.nom}</td>
              <td className="border px-4 py-2">{joueur.prenom}</td>
              <td className="border px-4 py-2">
                <input
                  type="text"
                  value={equipesInput[joueur.id] || ""}
                  onChange={e => handleEquipesChange(joueur.id, e.target.value)}
                  className="border px-2 py-1 w-full"
                  placeholder="Ex: Equipe1, Equipe2"
                />
              </td>
              <td className="border px-4 py-2">
                <button
                  onClick={() => handleSave(joueur)}
                  className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
                >
                  Sauvegarder
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
