
'use client';

import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { useAuth } from '../../components/AuthProvider';

interface Weekend {
  id: string;
  dates: string;
  debut: Date;
  fin: Date;
  equipes: number[];
}

interface Joueur {
  id: string;
  nom: string;
  prenom: string;
  classement: string;
  equipes: number[];
  role?: string;
}

interface Presence {
  joueur_id: string;
  weekend_id: string;
  statut: 'présent' | 'absent' | 'indécis';
}

export default function PresencesPage() {
  const { user, profile, isClient } = useAuth();

  const [weekends, setWeekends] = useState<Weekend[]>([]);
  const [joueurs, setJoueurs] = useState<Joueur[]>([]);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void; onCancel: () => void } | null>(null);
  const [hasScrolledOnLoad, setHasScrolledOnLoad] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const currentUserEmail = profile?.email;

  const currentJoueur = joueurs.find(j => 
    j.nom.toLowerCase() === profile?.nom.toLowerCase() && 
    j.prenom.toLowerCase() === profile?.prenom.toLowerCase()
  );
  const currentJoueurId = currentJoueur?.id;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const functionUrl = `${supabaseUrl}/functions/v1/presences-management`;

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

  const formatDateForDisplay = (startDate: Date, endDate: Date) => {
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const month = startDate.toLocaleDateString('fr-FR', { month: 'long' });
    const year = startDate.getFullYear();

    return `${startDay}-${endDay} ${month} ${year}`;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      await fetch(functionUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ action: 'init_data' })
      });

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ action: 'get_data' })
      });

      const data = await response.json();

      if (data.success) {
        const formattedWeekends = data.weekends.map((w: any) => {
          const debutDate = new Date(w.debut);
          const finDate = new Date(w.fin);
          
          return {
            ...w,
            dates: formatDateForDisplay(debutDate, finDate), 
            debut: debutDate,
            fin: finDate
          };
        });

        setWeekends(formattedWeekends);
        setJoueurs(data.joueurs);
        setPresences(data.presences);
      } else {
        setError('Erreur lors du chargement des données');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const sortedWeekends = [...weekends].sort((a, b) => a.debut.getTime() - b.debut.getTime());
  const sortedJoueurs = [...joueurs].sort((a, b) => parseInt(b.classement) - parseInt(a.classement));

  useEffect(() => {
    if (isClient && profile) {
      loadData();
    }
  }, [isClient, profile]);

  useEffect(() => {
    if (!loading && !hasScrolledOnLoad && sortedWeekends.length > 0 && sortedJoueurs.length > 0) {
      const timer = setTimeout(() => {
        // Scroll horizontal vers le premier weekend "À venir"
        const firstUpcomingIndex = sortedWeekends.findIndex(weekend => weekend.fin >= new Date());
        
        if (firstUpcomingIndex > 0) {
          const tableContainer = document.querySelector('.overflow-x-auto');
          if (tableContainer && window.innerWidth < 768) {
            const columnWidth = 140;
            const joueurColumnWidth = 140;
            const scrollPosition = joueurColumnWidth + ((firstUpcomingIndex - 1) * columnWidth);
            
            tableContainer.scrollTo({
              left: scrollPosition,
              behavior: 'smooth'
            });
          }
        }

        // Scroll vertical vers la ligne du joueur connecté (TOUTES VERSIONS)
        if (currentJoueurId) {
          const joueurIndex = sortedJoueurs.findIndex(j => j.id === currentJoueurId);
          if (joueurIndex >= 0) {
            const tableContainer = document.querySelector('.bg-white.rounded-lg.shadow-md .overflow-y-auto');
            if (tableContainer) {
              const rowHeight = window.innerWidth < 768 ? 45 : 40; // Hauteur ligne mobile vs desktop
              const headerHeight = window.innerWidth < 768 ? 90 : 80; // Hauteur header mobile vs desktop
              const scrollPosition = (joueurIndex * rowHeight) - headerHeight;
              
              if (scrollPosition > 0) {
                tableContainer.scrollTo({
                  top: scrollPosition,
                  behavior: 'smooth'
                });
              }
            }
          }
        }

        setHasScrolledOnLoad(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [loading, hasScrolledOnLoad, sortedWeekends, sortedJoueurs, currentJoueurId]);

  const getPresenceStatut = (joueurId: string, weekendId: string): 'présent' | 'absent' | 'indécis' | null => {
    const presence = presences.find(p => p.joueur_id === joueurId && p.weekend_id === weekendId);
    return presence ? presence.statut : null;
  };

  const canJoueurPlayWeekend = (joueur: Joueur, weekend: Weekend): boolean => {
    return joueur.equipes.some(equipe => weekend.equipes.includes(equipe));
  };

  const handlePresenceChange = async (joueurId: string, weekendId: string) => {
    if (!isClient) return;
    
    const weekend = weekends.find(w => w.id === weekendId);
    const joueur = joueurs.find(j => j.id === joueurId);

    if (!weekend || !joueur) return;

    if (!isAdmin && weekend.fin < new Date()) {
      showNotification('Impossible de modifier les présences pour un weekend terminé', 'error');
      return;
    }

    if (!canJoueurPlayWeekend(joueur, weekend)) {
      showNotification('Ce joueur ne peut pas participer à ce weekend car aucune de ses équipes ne joue', 'error');
      return;
    }

    if (!isAdmin && joueurId !== currentJoueurId) {
      showNotification('Vous ne pouvez modifier que vos propres présences ?', 'error');
      return;
    }

    const executeChange = async () => {
      const currentStatut = getPresenceStatut(joueurId, weekendId);
      let newStatut: 'présent' | 'absent' | 'indécis';

      switch (currentStatut) {
        case null:
        case 'indécis':
          newStatut = 'présent';
          break;
        case 'présent':
          newStatut = 'absent';
          break;
        case 'absent':
          newStatut = 'indécis';
          break;
      }

      try {
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ 
            action: 'update_presence',
            joueur_id: joueurId,
            weekend_id: weekendId,
            statut: newStatut
          })
        });

        const data = await response.json();

        if (data.success) {
          const existingIndex = presences.findIndex(p => p.joueur_id === joueurId && p.weekend_id === weekendId);

          if (existingIndex >= 0) {
            setPresences(presences.map((p, i) =>
              i === existingIndex ? { ...p, statut: newStatut } : p
            ));
          } else {
            setPresences([...presences, { joueur_id: joueurId, weekend_id: weekendId, statut: newStatut }]);
          }
          
          showNotification(`Présence mise à jour : ${newStatut}`, 'success');
        } else {
          showNotification('Erreur lors de la sauvegarde', 'error');
        }
      } catch (err) {
        console.error('Erreur:', err);
        showNotification('Erreur lors de la sauvegarde', 'error');
      }
    };

    if (isAdmin && joueurId !== currentJoueurId) {
      const currentStatut = getPresenceStatut(joueurId, weekendId);
      let newStatut: 'présent' | 'absent' | 'indécis';

      switch (currentStatut) {
        case null:
        case 'indécis':
          newStatut = 'présent';
          break;
        case 'présent':
          newStatut = 'absent';
          break;
        case 'absent':
          newStatut = 'indécis';
          break;
      }

      let confirmMessage = '';
      switch (newStatut) {
        case 'présent':
          confirmMessage = `Voulez-vous confirmer la présence de ${joueur.prenom} ${joueur.nom} ?`;
          break;
        case 'absent':
          confirmMessage = `Voulez-vous confirmer l'absence de ${joueur.prenom} ${joueur.nom} ?`;
          break;
        case 'indécis':
          confirmMessage = `Voulez-vous marquer ${joueur.prenom} ${joueur.nom} comme indécis ?`;
          break;
      }

      showConfirm(confirmMessage, executeChange);
    } else {
      await executeChange();
    }
  };

  const getStatutColor = (statut: 'présent' | 'absent' | 'indécis' | null) => {
    switch (statut) {
      case 'présent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'indécis':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const getStatutIcon = (statut: 'présent' | 'absent' | 'indécis' | null) => {
    switch (statut) {
      case 'présent':
        return 'ri-check-line';
      case 'absent':
        return 'ri-close-line';
      case 'indécis':
        return 'ri-question-line';
      default:
        return 'ri-subtract-line';
    }
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
            <div className="text-lg text-gray-500">Chargement des données...</div>
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

  if (!user) {
    return null;
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
          <h1 className="text-3xl font-bold text-gray-900">Présences des Joueurs</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0 z-30">
                <tr>
                  <th className="sticky left-0 bg-gray-50 px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 z-40 min-w-[140px] md:min-w-[240px]">
                    Joueur
                  </th>
                  {sortedWeekends.map((weekend) => {
                    const isPasse = weekend.fin < new Date();
                    return (
                      <th key={weekend.id} className="px-4 py-4 text-center text-sm font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[140px]">
                        <div className="flex flex-col">
                          <span>{weekend.dates}</span>
                          <span className={`text-sm mt-1 px-2 py-1 rounded ${isPasse ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-600'}`}>
                            {isPasse ? 'Passé' : 'À venir'}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedJoueurs.map((joueur) => (
                  <tr key={joueur.id} className={`hover:bg-gray-50 ${ 
                    joueur.id === currentJoueurId ? 'bg-blue-50' : ''
                  }`}>
                    <td className={`sticky left-0 px-6 py-1 border-r border-gray-200 z-20 shadow-sm min-w-[140px] md:min-w-[240px] ${ 
                      joueur.id === currentJoueurId ? 'bg-blue-50' : 'bg-white'
                    }`}>
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm md:text-base font-medium text-gray-900">
                            {joueur.prenom} {joueur.nom}
                          </div>
                        </div>
                        {joueur.id === currentJoueurId && !isAdmin && (
                          <div className="ml-2 w-2 h-2 bg-blue-500 rounded-full" title="Votre profil"></div>
                        )}
                      </div>
                    </td>
                    {sortedWeekends.map((weekend) => {
                      const statut = getPresenceStatut(joueur.id, weekend.id);
                      const isPasse = weekend.fin < new Date();
                      const canPlay = canJoueurPlayWeekend(joueur, weekend);

                      const canEdit = canPlay && (isAdmin || (!isPasse && joueur.id === currentJoueurId));

                      return (
                        <td key={weekend.id} className="px-4 py-1 text-center border-r border-gray-200">
                          {!canPlay ? (
                            <div className="inline-flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full border-2 bg-gray-50 text-gray-400 border-gray-300 mx-auto">
                              <i className="ri-forbid-line text-sm md:text-lg"></i>
                            </div>
                          ) : canEdit ? (
                            <button
                              onClick={() => handlePresenceChange(joueur.id, weekend.id)}
                              className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border-2 cursor-pointer transition-all hover:scale-105 mx-auto ${getStatutColor(statut)}`}
                              title={`Cliquer pour changer (actuellement: ${statut || 'non défini'})`}
                            >
                              <i className={`${getStatutIcon(statut)} text-sm md:text-lg`}></i>
                            </button>
                          ) : (
                            <div className={`inline-flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full border-2 mx-auto ${getStatutColor(statut)}`}>
                              <i className={`${getStatutIcon(statut)} text-sm md:text-lg`}></i>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
