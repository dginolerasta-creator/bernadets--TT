
'use client';

import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { useAuth } from '../../components/AuthProvider';

interface Poule {
  id: string;
  nom: string;
  division: 'PR' | 'D1' | 'D2' | 'D3';
  equipes: Equipe[];
}

interface Equipe {
  id: string;
  club: string;
  numero: number;
  nom_complet: string;
}

interface Club {
  id: number;
  nom: string;
}

export default function PoulesPage() {
  const { user, profile, isClient } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [clubs, setClubs] = useState<Club[]>([]);
  const [poules, setPoules] = useState<Poule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void; onCancel: () => void } | null>(null);
  const [showAddPoule, setShowAddPoule] = useState(false);
  const [newPoule, setNewPoule] = useState({ nom: '', division: 'PR' as 'PR' | 'D1' | 'D2' | 'D3' });
  const [showAddEquipe, setShowAddEquipe] = useState<string | null>(null);
  const [newEquipe, setNewEquipe] = useState({ club: '', numero: 1 });
  const [showClubDropdown, setShowClubDropdown] = useState(false);
  const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);

  const divisions = [
    { code: 'PR', nom: 'Pré-Régionale', couleur: 'bg-purple-500' },
    { code: 'D1', nom: 'Départementale 1', couleur: 'bg-blue-500' },
    { code: 'D2', nom: 'Départementale 2', couleur: 'bg-green-500' },
    { code: 'D3', nom: 'Départementale 3', couleur: 'bg-orange-500' }
  ];

  const loadClubs = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/clubs-management`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ action: 'get_clubs' })
      });

      const data = await response.json();
      if (data.success) {
        setClubs(data.clubs.map((club: any) => ({ id: club.id, nom: club.nom })));
      }
    } catch (err) {
      console.error('Erreur lors du chargement des clubs:', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/poules-management`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ action: 'get_data' })
      });

      const data = await response.json();

      if (data.success) {
        setPoules(data.poules);
      } else {
        setError('Erreur lors du chargement des poules');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des poules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isClient && profile) {
      loadClubs();
      loadData();
    }
  }, [isClient, profile]);

  const poulesTriees = [...poules].sort((a, b) => {
    const ordre = ['PR', 'D1', 'D2', 'D3'];
    return ordre.indexOf(a.division) - ordre.indexOf(b.division);
  });

  const handleAddPoule = async () => {
    if (!isAdmin) {
      showNotification('Seul l\'administrateur peut créer des poules !', 'error');
      return;
    }
    if (newPoule.nom.trim()) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/poules-management`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ 
            action: 'add_poule', 
            poule: newPoule
          })
        });

        const data = await response.json();

        if (data.success) {
          await loadData();
          setNewPoule({ nom: '', division: 'PR' });
          setShowAddPoule(false);
          showNotification('Poule créée avec succès', 'success');
        } else {
          showNotification('Erreur lors de la création', 'error');
        }
      } catch (err) {
        console.error('Erreur:', err);
        showNotification('Erreur lors de la création', 'error');
      }
    }
  };

  const handleDeletePoule = async (id: string) => {
    if (!isAdmin) {
      showNotification('Seul l\'administrateur peut supprimer des poules !', 'error');
      return;
    }

    const executeDelete = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/poules-management`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ 
            action: 'delete_poule', 
            poule_id: id
          })
        });

        const data = await response.json();

        if (data.success) {
          setPoules(poules.filter(p => p.id !== id));
          showNotification('Poule supprimée avec succès', 'success');
        } else {
          showNotification('Erreur lors de la suppression', 'error');
        }
      } catch (err) {
        console.error('Erreur:', err);
        showNotification('Erreur lors de la suppression', 'error');
      }
    };

    showConfirm('Êtes-vous sûr de vouloir supprimer cette poule et toutes ses équipes ?', executeDelete);
  };

  const handleAddEquipe = async (pouleId: string) => {
    if (!isAdmin) {
      showNotification('Seul l\'administrateur peut ajouter des équipes !', 'error');
      return;
    }
    if (newEquipe.club && newEquipe.numero > 0) {
      const poule = poules.find(p => p.id === pouleId);
      if (poule && poule.equipes.length >= 9) {
        showNotification('Une poule ne peut contenir que 9 équipes maximum.', 'error');
        return;
      }

      const nomComplet = `${newEquipe.club} ${newEquipe.numero}`;

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/poules-management`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ 
            action: 'add_equipe',
            poule_id: pouleId,
            equipe: {
              club: newEquipe.club,
              numero: newEquipe.numero,
              nom_complet: nomComplet
            }
          })
        });

        const data = await response.json();

        if (data.success) {
          await loadData();
          setNewEquipe({ club: '', numero: 1 });
          setShowAddEquipe(null);
          setShowClubDropdown(false);
          showNotification('Équipe ajoutée avec succès', 'success');
        } else {
          showNotification('Erreur lors de l\'ajout', 'error');
        }
      } catch (err) {
        console.error('Erreur:', err);
        showNotification('Erreur lors de l\'ajout', 'error');
      }
    }
  };

  const handleDeleteEquipe = async (pouleId: string, equipeId: string) => {
    if (!isAdmin) {
      showNotification('Seul l\'administrateur peut supprimer des équipes !', 'error');
      return;
    }

    const executeDelete = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/poules-management`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ 
            action: 'delete_equipe', 
            equipe_id: equipeId
          })
        });

        const data = await response.json();

        if (data.success) {
          setPoules(poules.map(p =>
            p.id === pouleId
              ? { ...p, equipes: p.equipes.filter(e => e.id !== equipeId) }
              : p
          ));
          showNotification('Équipe supprimée avec succès', 'success');
        } else {
          showNotification('Erreur lors de la suppression', 'error');
        }
      } catch (err) {
        console.error('Erreur:', err);
        showNotification('Erreur lors de la suppression', 'error');
      }
    };

    showConfirm('Êtes-vous sûr de vouloir supprimer cette équipe de la poule ?', executeDelete);
  };

  const selectClub = (clubNom: string) => {
    if (!isAdmin) return;
    setNewEquipe({ ...newEquipe, club: clubNom });
    setShowClubDropdown(false);
  };

  const selectDivision = (divisionCode: 'PR' | 'D1' | 'D2' | 'D3') => {
    if (!isAdmin) return;
    setNewPoule({ ...newPoule, division: divisionCode });
    setShowDivisionDropdown(false);
  };

  const getDivisionInfo = (code: string) => {
    return divisions.find(d => d.code === code);
  };

  const bernadetsFirst = clubs.filter(c => c.nom === 'Bernadets TT');
  const autresClubs = clubs.filter(c => c.nom !== 'Bernadets TT').sort((a, b) => a.nom.localeCompare(b.nom));
  const clubsOrdonnes = [...bernadetsFirst, ...autresClubs];

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmDialog({
      message,
      onConfirm: () => {
        setConfirmDialog(null);
        onConfirm();
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-500">Chargement...</div>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-500">Chargement des poules...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col justify-center items-center h-64">
            <div className="text-lg text-red-500 mb-4">{error}</div>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer whitespace-nowrap"
            >
              Réessayer
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Notification */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all ${
          notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
          notification.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
          'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
          <div className="flex items-center">
            <i className={`mr-2 ${
              notification.type === 'success' ? 'ri-check-circle-line' :
              notification.type === 'error' ? 'ri-error-warning-line' :
              'ri-information-line'
            }`}></i>
            {notification.message}
          </div>
        </div>
      )}

      {/* Dialog de confirmation */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <i className="ri-question-line text-yellow-500 text-xl mr-3"></i>
              <h3 className="text-lg font-medium text-gray-900">Confirmation</h3>
            </div>
            <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={confirmDialog.onCancel}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer whitespace-nowrap"
              >
                Annuler
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer whitespace-nowrap"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Poules</h1>
          {isAdmin && (
            <button
              onClick={() => setShowAddPoule(!showAddPoule)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              <i className="ri-add-line mr-2"></i>
              Ajouter une poule
            </button>
          )}
        </div>

        {showAddPoule && isAdmin && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Nouvelle poule</h3>
            <div className="flex space-x-4">
              <input
                type="text"
                placeholder="Nom de la poule (ex: Poule A)"
                value={newPoule.nom}
                onChange={(e) => setNewPoule({ ...newPoule, nom: e.target.value })}
                className="flex-1 border rounded px-3 py-2 text-base"
              />

              <div className="relative">
                <button
                  onClick={() => setShowDivisionDropdown(!showDivisionDropdown)}
                  className="border rounded px-3 py-2 text-base bg-white pr-8 cursor-pointer whitespace-nowrap"
                >
                  {getDivisionInfo(newPoule.division)?.nom || 'Sélectionner division'}
                </button>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 transform -translate-y-1/2"></i>

                {showDivisionDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                    {divisions.map((division) => (
                      <button
                        key={division.code}
                        onClick={() => selectDivision(division.code as 'PR' | 'D1' | 'D2' | 'D3')}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 cursor-pointer flex items-center text-base"
                      >
                        <div className={`w-3 h-3 rounded-full ${division.couleur} mr-2`}></div>
                        {division.nom}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleAddPoule}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer whitespace-nowrap"
              >
                Ajouter
              </button>
              <button
                onClick={() => setShowAddPoule(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 cursor-pointer whitespace-nowrap"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {poulesTriees.map((poule) => {
            const divisionInfo = getDivisionInfo(poule.division);
            return (
              <div key={poule.id} className="bg-white rounded-lg shadow-md h-fit">
                {/* En-tête de la poule */}
                <div className={`${divisionInfo?.couleur} text-white p-4 rounded-t-lg`}>
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-semibold">{poule.nom}</h2>
                    <div className="flex space-x-1">
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => setShowAddEquipe(showAddEquipe === poule.id ? null : poule.id)}
                            className="w-8 h-8 flex items-center justify-center bg-white bg-opacity-20 rounded hover:bg-opacity-30 cursor-pointer"
                          >
                            <i className="ri-add-line"></i>
                          </button>
                          <button
                            onClick={() => handleDeletePoule(poule.id)}
                            className="w-8 h-8 flex items-center justify-center bg-white bg-opacity-20 rounded hover:bg-opacity-30 cursor-pointer"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-sm opacity-90">{divisionInfo?.nom}</div>
                </div>

                {/* Formulaire d'ajout d'équipe */}
                {showAddEquipe === poule.id && isAdmin && (
                  <div className="p-4 bg-gray-50 border-b">
                    <h4 className="font-semibold mb-3 text-base">Nouvelle équipe</h4>
                    <div className="space-y-2">
                      <div className="relative">
                        <button
                          onClick={() => setShowClubDropdown(!showClubDropdown)}
                          className="w-full border rounded px-3 py-2 text-left bg-white text-base pr-8 cursor-pointer"
                        >
                          {newEquipe.club || 'Club'}
                        </button>
                        <i className="ri-arrow-down-s-line absolute right-2 top-1/2 transform -translate-y-1/2"></i>

                        {showClubDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                            {clubsOrdonnes.map((club) => (
                              <button
                                key={club.id}
                                onClick={() => selectClub(club.nom)}
                                className="w-full px-3 py-2 text-left hover:bg-gray-100 cursor-pointer text-base"
                              >
                                {club.nom}
                                {club.nom === 'Bernadets TT' && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                                    Notre club
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="N°"
                          value={newEquipe.numero}
                          onChange={(e) => setNewEquipe({ ...newEquipe, numero: parseInt(e.target.value) || 1 })}
                          className="w-16 border rounded px-2 py-2 text-base"
                        />

                        <button
                          onClick={() => handleAddEquipe(poule.id)}
                          className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 cursor-pointer whitespace-nowrap text-base"
                        >
                          <i className="ri-check-line"></i>
                        </button>
                        <button
                          onClick={() => setShowAddEquipe(null)}
                          className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 cursor-pointer whitespace-nowrap text-base"
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </div>

                      {newEquipe.club && (
                        <div className="text-sm text-gray-600">
                          Aperçu: {newEquipe.club} {newEquipe.numero}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Liste des équipes */}
                <div className="p-4">
                  {poule.equipes.length === 0 ? (
                    <p className="text-gray-500 italic text-base text-center py-4">Aucune équipe</p>
                  ) : (
                    <div className="space-y-2">
                      {poule.equipes.map((equipe, index) => (
                        <div key={equipe.id} className="flex items-center justify-between bg-gray-50 rounded p-2">
                          <div className="flex items-center">
                            <div className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-600 rounded-full mr-2 text-xs font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-base">{equipe.nom_complet}</div>
                            </div>
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteEquipe(poule.id, equipe.id)}
                              className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200 cursor-pointer"
                            >
                              <i className="ri-close-line text-xs"></i>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {poules.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-full mx-auto mb-4">
              <i className="ri-trophy-line text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune poule créée</h3>
            <p className="text-gray-500 mb-4 text-base">Commencez par créer votre première poule de championnat.</p>
            {isAdmin && (
              <button
                onClick={() => setShowAddPoule(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer whitespace-nowrap"
              >
                Créer une poule
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
