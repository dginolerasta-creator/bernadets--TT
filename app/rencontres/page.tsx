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

interface Rencontre {
  id: string;
  weekend_id: string;
  equipe: number;
  adversaire: string;
  jour: 'samedi' | 'dimanche';
  heure: string;
  lieu: 'domicile' | 'extérieur';
  joueurs: (number | null)[];
}

interface Joueur {
  id: string;
  nom: string;
  prenom: string;
  classement: string;
  equipes: number[];
}

interface Presence {
  joueur_id: string;
  weekend_id: string;
  statut: 'présent' | 'absent' | 'indécis';
}

interface Club {
  id: number;
  nom: string;
}

export default function RencontresPage() {
  const { user, profile, isClient } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [weekends, setWeekends] = useState<Weekend[]>([]);
  const [rencontres, setRencontres] = useState<Rencontre[]>([]);
  const [joueurs, setJoueurs] = useState<Joueur[]>([]);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void; onCancel: () => void } | null>(null);

  const [showAddWeekend, setShowAddWeekend] = useState(false);
  const [newWeekend, setNewWeekend] = useState({ debut: '', fin: '' });
  const [showAddRencontre, setShowAddRencontre] = useState<string | null>(null);
  const [newRencontre, setNewRencontre] = useState({
    equipe: 1,
    adversaire_club: '',
    adversaire_numero: 1,
    jour: 'samedi' as const,
    heure: '',
    lieu: 'domicile' as const,
  });

  const [showEquipeDropdown, setShowEquipeDropdown] = useState(false);
  const [showJourDropdown, setShowJourDropdown] = useState(false);
  const [showLieuDropdown, setShowLieuDropdown] = useState(false);
  const [showHeureDropdown, setShowHeureDropdown] = useState(false);
  const [showEditHeureDropdown, setShowEditHeureDropdown] = useState(false);
  const [showAdversaireClubDropdown, setShowAdversaireClubDropdown] = useState(false);
  const [showJoueurDropdownDropdown, setShowJoueurDropdowns] = useState<{ [key: string]: boolean }>({});

  const [editingWeekend, setEditingWeekend] = useState<string | null>(null);
  const [editingRencontre, setEditingRencontre] = useState<string | null>(null);
  const [editWeekendData, setEditWeekendData] = useState({ debut: '', fin: '' });
  const [editRencontreData, setEditRencontreData] = useState({
    equipe: 1,
    adversaire_club: '',
    adversaire_numero: 1,
    jour: 'samedi' as const,
    heure: '',
    lieu: 'domicile' as const,
  });
  const [showEditAdversaireClubDropdown, setShowEditAdversaireClubDropdown] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rencontresUrl = `${supabaseUrl}/functions/v1/rencontres-management`;
  const presencesUrl = `${supabaseUrl}/functions/v1/presences-management`;
  const clubsUrl = `${supabaseUrl}/functions/v1/clubs-management`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowEquipeDropdown(false);
        setShowJourDropdown(false);
        setShowLieuDropdown(false);
        setShowHeureDropdown(false);
        setShowEditHeureDropdown(false);
        setShowAdversaireClubDropdown(false);
        setShowEditAdversaireClubDropdown(false);
        setShowJoueurDropdowns({});
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isClient && profile) {
      loadData();
    }
  }, [isClient, profile]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [rencontresResponse, presencesResponse, clubsResponse] = await Promise.all([
        fetch(rencontresUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: 'get_data' }),
        }),
        fetch(presencesUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: 'get_data' }),
        }),
        fetch(clubsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: 'get_clubs' }),
        }),
      ]);

      const [rencontresData, presencesData, clubsData] = await Promise.all([
        rencontresResponse.json(),
        presencesResponse.json(),
        clubsResponse.json(),
      ]);

      if (rencontresData.success && presencesData.success && clubsData.success) {
        setWeekends(
          rencontresData.weekends.map((w: any) => ({
            ...w,
            debut: new Date(w.debut),
            fin: new Date(w.fin),
          }))
        );
        setRencontres(
          rencontresData.rencontres.map((r: any) => ({
            ...r,
            joueurs: r.joueurs.map((j: any) => (j ? parseInt(j) : null)),
          }))
        );
        setJoueurs(
          presencesData.joueurs.map((j: any) => ({
            ...j,
            id: j.id.toString(),
            equipes: j.equipes || [1, 2],
          }))
        );
        setPresences(presencesData.presences);
        setClubs(clubsData.clubs);
      } else {
        setError('Erreur lors du chargement des rencontres');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des rencontres');
    } finally {
      setLoading(false);
    }
  };

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
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleAddWeekend = async () => {
    if (!isAdmin) {
      showNotification("Seul l'administrateur peut ajouter des weekends!", 'error');
      return;
    }

    if (newWeekend.debut && newWeekend.fin) {
      const debutDate = new Date(newWeekend.debut);
      const finDate = new Date(newWeekend.fin);

      const formatDateForDisplay = (startDate: Date, endDate: Date) => {
        const startDay = startDate.getDate();
        const endDay = endDate.getDate();
        const month = startDate.toLocaleDateString('fr-FR', { month: 'long' });
        const year = startDate.getFullYear();

        return `${startDay}-${endDay} ${month} ${year}`;
      };

      const dates = formatDateForDisplay(debutDate, finDate);

      try {
        const response = await fetch(rencontresUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: 'add_weekend',
            weekend: {
              dates: dates,
              debut: newWeekend.debut,
              fin: newWeekend.fin,
              equipes: [1],
            },
          }),
        });

        const data = await response.json();

        if (data.success) {
          await loadData();
          setNewWeekend({ debut: '', fin: '' });
          setShowAddWeekend(false);
          showNotification('Weekend créé avec succès', 'success');
        } else {
          showNotification('Erreur lors de la création', 'error');
        }
      } catch (err) {
        console.error('Erreur:', err);
        showNotification('Erreur lors de la création', 'error');
      }
    }
  };

  const handleEditWeekend = (weekend: Weekend) => {
    if (!isAdmin) {
      showNotification("Seul l'administrateur peut modifier les weekends!", 'error');
      return;
    }

    setEditingWeekend(weekend.id);
    setEditWeekendData({
      debut: weekend.debut.toISOString().split('T')[0],
      fin: weekend.fin.toISOString().split('T')[0],
    });
  };

  const handleSaveWeekend = async () => {
    if (!isAdmin) {
      showNotification("Seul l'administrateur peut modifier les weekends!", 'error');
      return;
    }

    if (editWeekendData.debut && editWeekendData.fin) {
      const debutDate = new Date(editWeekendData.debut);
      const finDate = new Date(editWeekendData.fin);

      const formatDateForDisplay = (startDate: Date, endDate: Date) => {
        const startDay = startDate.getDate();
        const endDay = endDate.getDate();
        const month = startDate.toLocaleDateString('fr-FR', { month: 'long' });
        const year = startDate.getFullYear();

        return `${startDay}-${endDay} ${month} ${year}`;
      };

      const dates = formatDateForDisplay(debutDate, finDate);

      try {
        const response = await fetch(rencontresUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: 'update_weekend',
            weekend: {
              id: editingWeekend,
              dates: dates,
              debut: editWeekendData.debut,
              fin: editWeekendData.fin,
            },
          }),
        });

        const data = await response.json();

        if (data.success) {
          setWeekends(ws =>
            ws.map(w => (w.id === editingWeekend ? { ...w, dates, debut: new Date(editWeekendData.debut), fin: new Date(editWeekendData.fin) } : w))
          );
          setEditingWeekend(null);
          showNotification('Weekend modifié avec succès', 'success');
        } else {
          showNotification('Erreur lors de la sauvegarde', 'error');
        }
      } catch (err) {
        console.error('Erreur:', err);
        showNotification('Erreur lors de la sauvegarde', 'error');
      }
    }
  };

  const handleAddRencontre = async (weekendId: string) => {
    if (!isAdmin) {
      showNotification("Seul l'administrateur peut ajouter des rencontres!", 'error');
      return;
    }

    if (!newRencontre.adversaire_club) {
      showNotification('Veuillez remplir le club adverse!', 'error');
      return;
    }

    // Vérifier si l'équipe joue déjà ce weekend
    const equipesDejaUtilisees = rencontres
      .filter(r => r.weekend_id === weekendId)
      .map(r => r.equipe);

    if (equipesDejaUtilisees.includes(newRencontre.equipe)) {
      showNotification(`L'équipe ${newRencontre.equipe} joue déjà ce weekend!`, 'error');
      return;
    }

    const adversaire = `${newRencontre.adversaire_club} ${newRencontre.adversaire_numero}`;

    try {
      const response = await fetch(rencontresUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'add_rencontre',
          rencontre: {
            weekend_id: weekendId,
            equipe: newRencontre.equipe,
            adversaire: adversaire,
            jour: newRencontre.jour,
            heure: newRencontre.heure || '',
            lieu: newRencontre.lieu,
            joueurs: [null, null, null, null],
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        await loadData();
        setNewRencontre({
          equipe: 1,
          adversaire_club: '',
          adversaire_numero: 1,
          jour: 'samedi',
          heure: '',
          lieu: 'domicile',
        });
        setShowAddRencontre(null);
        setShowEquipeDropdown(false);
        setShowJourDropdown(false);
        setShowLieuDropdown(false);
        setShowHeureDropdown(false);
        setShowAdversaireClubDropdown(false);
        showNotification('Rencontre ajoutée avec succès', 'success');
      } else {
        showNotification("Erreur lors de l'ajout", 'error');
      }
    } catch (err) {
      console.error('Erreur:', err);
      showNotification("Erreur lors de l'ajout", 'error');
    }
  };

  const handleSaveRencontre = async () => {
    if (!isAdmin) {
      showNotification("Seul l'administrateur peut modifier les rencontres!", 'error');
      return;
    }

    if (!editRencontreData.adversaire_club) {
      showNotification('Veuillez remplir le club adverse!', 'error');
      return;
    }

    // Vérifier si l'équipe joue déjà ce weekend (sauf pour la rencontre en cours de modification)
    const rencontreEnCours = rencontres.find(r => r.id === editingRencontre);
    if (rencontreEnCours) {
      const equipesDejaUtilisees = rencontres
        .filter(r => r.weekend_id === rencontreEnCours.weekend_id && r.id !== editingRencontre)
        .map(r => r.equipe);

      if (equipesDejaUtilisees.includes(editRencontreData.equipe)) {
        showNotification(`L'équipe ${editRencontreData.equipe} joue déjà ce weekend!`, 'error');
        return;
      }
    }

    const adversaire = `${editRencontreData.adversaire_club} ${editRencontreData.adversaire_numero}`;

    try {
      const response = await fetch(rencontresUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'update_rencontre',
          rencontre: {
            id: editingRencontre,
            equipe: editRencontreData.equipe,
            adversaire: adversaire,
            jour: editRencontreData.jour,
            heure: editRencontreData.heure || '',
            lieu: editRencontreData.lieu,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRencontres(rs =>
          rs.map(r =>
            r.id === editingRencontre
              ? { ...r, equipe: editRencontreData.equipe, adversaire, jour: editRencontreData.jour, heure: editRencontreData.heure || '', lieu: editRencontreData.lieu }
              : r
          )
        );
        setEditingRencontre(null);
        showNotification('Rencontre modifiée avec succès', 'success');
      } else {
        showNotification('Erreur lors de la sauvegarde', 'error');
      }
    } catch (err) {
      console.error('Erreur:', err);
      showNotification('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleDeleteWeekend = async (id: string) => {
    if (!isAdmin) {
      showNotification("Seul l'administrateur peut supprimer des weekends!", 'error');
      return;
    }

    const executeDelete = async () => {
      try {
        const response = await fetch(rencontresUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: 'delete_weekend',
            weekend_id: id,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setWeekends(w => w.filter(week => week.id !== id));
          setRencontres(r => r.filter(ren => ren.weekend_id !== id));
          showNotification('Weekend supprimé avec succès', 'success');
        } else {
          showNotification('Erreur lors de la suppression', 'error');
        }
      } catch (err) {
        console.error('Erreur:', err);
        showNotification('Erreur lors de la suppression', 'error');
      }
    };

    showConfirm('Êtes-vous sûr de vouloir supprimer ce weekend et toutes ses rencontres ?', executeDelete);
  };

  const handleEditRencontre = (rencontre: Rencontre) => {
    if (!isAdmin) {
      showNotification("Seul l'administrateur peut modifier les rencontres!", 'error');
      return;
    }

    const adversaireParts = rencontre.adversaire.split(' ');
    const numero = parseInt(adversaireParts[adversaireParts.length - 1]);
    const club = adversaireParts.slice(0, -1).join(' ');

    setEditingRencontre(rencontre.id);
    setEditRencontreData({
      equipe: rencontre.equipe,
      adversaire_club: club,
      adversaire_numero: isNaN(numero) ? 1 : numero,
      jour: rencontre.jour,
      heure: rencontre.heure,
      lieu: rencontre.lieu,
    });
  };

  const handleDeleteRencontre = async (id: string) => {
    if (!isAdmin) {
      showNotification("Seul l'administrateur peut supprimer les rencontres!", 'error');
      return;
    }

    const executeDelete = async () => {
      try {
        const response = await fetch(rencontresUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: 'delete_rencontre',
            rencontre_id: id,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setRencontres(r => r.filter(ren => ren.id !== id));
          showNotification('Rencontre supprimée avec succès', 'success');
        } else {
          showNotification('Erreur lors de la suppression', 'error');
        }
      } catch (err) {
        console.error('Erreur:', err);
        showNotification('Erreur lors de la suppression', 'error');
      }
    };

    showConfirm('Êtes-vous sûr de vouloir supprimer cette rencontre ?', executeDelete);
  };

  const handleJoueurChange = async (rencontreId: string, position: number, joueurId: number | null) => {
    if (!isAdmin) {
      showNotification("Seul l'administrateur peut modifier la composition des équipes !", 'error');
      return;
    }

    const rencontre = rencontres.find(r => r.id === rencontreId);
    if (!rencontre) return;

    const newJoueurs = rencontre.joueurs.map((j, i) => (i === position ? joueurId : j));

    setRencontres(rs => rs.map(r => (r.id === rencontreId ? { ...r, joueurs: newJoueurs } : r)));

    setShowJoueurDropdowns({});

    try {
      const response = await fetch(rencontresUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'update_rencontre',
          rencontre: {
            id: rencontreId,
            joueurs: newJoueurs,
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setRencontres(rs => rs.map(r => (r.id === rencontreId ? { ...r, joueurs: rencontre.joueurs } : r)));
        showNotification('Erreur lors de la sauvegarde', 'error');
      } else {
        showNotification('Composition mise à jour', 'success');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setRencontres(rs => rs.map(r => (r.id === rencontreId ? { ...r, joueurs: rencontre.joueurs } : r)));
      showNotification('Erreur lors de la sauvegarde', 'error');
    }
  };

  const toggleJoueurDropdown = (rencontreId: string, position: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAdmin) return;

    const key = `${rencontreId}-${position}`;
    setShowJoueurDropdowns(prev => {
      const newState: { [key: string]: boolean } = {};
      newState[key] = !prev[key];
      return newState;
    });
  };

  const getJoueursDisponibles = (equipe: number, weekendId: string, rencontreId: string, currentPosition: number) => {
    const joueursEquipe = joueurs.filter(j => j.equipes.includes(equipe));

    const joueursPresents = joueursEquipe.filter(joueur => {
      const presence = presences.find(p => p.joueur_id === joueur.id && p.weekend_id === weekendId);
      return presence && presence.statut === 'présent';
    });

    const rencontresWeekend = rencontres.filter(r => r.weekend_id === weekendId);

    const joueursDejaSelectionnesDansWeekend = rencontresWeekend
      .flatMap(r => r.joueurs.map((joueurId, index) => ({ joueurId, rencontreId: r.id, position: index })))
      .filter(({ joueurId }) => joueurId !== null)
      .filter(({ rencontreId: rId, position }) => !(rId === rencontreId && position === currentPosition))
      .map(({ joueurId }) => joueurId);

    const joueursDisponibles = joueursPresents.filter(joueur => !joueursDejaSelectionnesDansWeekend.includes(parseInt(joueur.id)));

    return joueursDisponibles.sort((a, b) => parseInt(b.classement) - parseInt(a.classement));
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour <= 21; hour++) {
      const hourString = hour.toString().padStart(2, '0');
      slots.push(`${hourString}:00`);

      if (hour < 21) {
        slots.push(`${hourString}:30`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const bernadetsFirst = clubs.filter(c => c.nom === 'Bernadets TT');
  const autresClubs = clubs.filter(c => c.nom !== 'Bernadets TT').sort((a, b) => a.nom.localeCompare(b.nom));
  const clubsOrdonnes = [...bernadetsFirst, ...autresClubs];

  const formatJour = (jour: string) => {
    return jour.charAt(0).toUpperCase() + jour.slice(1);
  };

  const formatHeure = (heure: string) => {
    return heure.replace(':', 'H').replace('H00', 'H');
  };

  const formatLieu = (lieu: string) => {
    return lieu.charAt(0).toUpperCase() + lieu.slice(1);
  };

  const getEquipesDisponiblesPourAjout = (weekendId: string) => {
    const equipesDejaUtilisees = rencontres
      .filter(r => r.weekend_id === weekendId)
      .map(r => r.equipe);

    return [1, 2, 3].filter(equipe => !equipesDejaUtilisees.includes(equipe));
  };

  const getEquipesDisponiblesPourModification = (weekendId: string, rencontreId: string) => {
    const equipesDejaUtilisees = rencontres
      .filter(r => r.weekend_id === weekendId && r.id !== rencontreId)
      .map(r => r.equipe);

    return [1, 2, 3].filter(equipe => !equipesDejaUtilisees.includes(equipe));
  };

  const formatDateJourHeure = (jour: string, heure: string, weekend: Weekend) => {
    const jourCapitalized = jour.charAt(0).toUpperCase() + jour.slice(1);

    // Déterminer la date selon le jour
    let targetDate: Date;
    const samedi = new Date(weekend.debut);
    const dimanche = new Date(weekend.debut);
    dimanche.setDate(samedi.getDate() + 1);

    targetDate = jour === 'samedi' ? samedi : dimanche;

    const dateStr = targetDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    if (heure) {
      const heureFormatted = heure.replace(':', 'H').replace('H00', 'H');
      return `${jourCapitalized} ${dateStr} à ${heureFormatted}`;
    } else {
      return `${jourCapitalized} ${dateStr}`;
    }
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-500">Chargement des rencontres...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

  const sortedWeekends = [...weekends].sort((a, b) => a.debut.getTime() - b.debut.getTime());
  const today = new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 sm:mb-0">Rencontres</h1>
          {isAdmin && (
            <button
              onClick={() => setShowAddWeekend(!showAddWeekend)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              <i className="ri-add-line mr-2"></i>
              Ajouter un weekend
            </button>
          )}
        </div>

        {showAddWeekend && isAdmin && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Nouveau weekend</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début
                </label>
                <input
                  type="date"
                  value={newWeekend.debut}
                  onChange={e => setNewWeekend({ ...newWeekend, debut: e.target.value })}
                  className="border rounded px-3 py-2 text-base w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={newWeekend.fin}
                  onChange={e => setNewWeekend({ ...newWeekend, fin: e.target.value })}
                  className="border rounded px-3 py-2 text-base w-full"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-4">
              <button
                onClick={handleAddWeekend}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer whitespace-nowrap"
              >
                Ajouter
              </button>
              <button
                onClick={() => setShowAddWeekend(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 cursor-pointer whitespace-nowrap"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {sortedWeekends.map(weekend => {
            const weekendRencontres = rencontres.filter(r => r.weekend_id === weekend.id);
            const isPasse = weekend.fin < today;
            const isEditingThisWeekend = editingWeekend === weekend.id;

            return (
              <div key={weekend.id} className="bg-blue-100 rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  {isEditingThisWeekend ? (
                    <div className="flex items-center space-x-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date de début
                        </label>
                        <input
                          type="date"
                          value={editWeekendData.debut}
                          onChange={e => setEditWeekendData({ ...editWeekendData, debut: e.target.value })}
                          className="border rounded px-3 py-2 text-base"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date de fin
                        </label>
                        <input
                          type="date"
                          value={editWeekendData.fin}
                          onChange={e => setEditWeekendData({ ...editWeekendData, fin: e.target.value })}
                          className="border rounded px-3 py-2 text-base"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        Weekend du {weekend.dates}
                      </h3>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          isPasse ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {isPasse ? 'Terminé' : 'À venir'}
                      </span>
                    </div>
                  )}
                </div>

                {showAddRencontre === weekend.id && isAdmin && (
                  <div className="bg-gray-50 rounded p-4 mb-4">
                    <h4 className="font-semibold mb-3">Nouvelle rencontre</h4>
                    <div className="grid grid-cols-6 gap-3">
                      <div className="relative dropdown-container">
                        <button
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowEquipeDropdown(!showEquipeDropdown);
                          }}
                          className="w-full border rounded px-3 py-2 text-left bg-white text-base pr-8 cursor-pointer"
                        >
                          Équipe {newRencontre.equipe}
                        </button>
                        <i className="ri-arrow-down-s-line absolute right-2 top-1/2 transform -translate-y-1/2"></i>
                        {showEquipeDropdown && (
                          <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-lg z-10">
                            {getEquipesDisponiblesPourAjout(weekend.id).map(equipe => (
                              <button
                                key={equipe}
                                onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setNewRencontre({ ...newRencontre, equipe });
                                  setShowEquipeDropdown(false);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-gray-100 cursor-pointer"
                              >
                                Équipe {equipe}
                              </button>
                            ))}
                            {getEquipesDisponiblesPourAjout(weekend.id).length === 0 && (
                              <div className="px-3 py-2 text-gray-500 text-sm italic">
                                Toutes les équipes jouent déjà
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="relative dropdown-container">
                        <button
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowAdversaireClubDropdown(!showAdversaireClubDropdown);
                          }}
                          className="w-full border rounded px-3 py-2 text-left bg-white text-base pr-8 cursor-pointer"
                        >
                          {newRencontre.adversaire_club || 'Club adverse'}
                        </button>
                        <i className="ri-arrow-down-s-line absolute right-2 top-1/2 transform -translate-y-1/2"></i>
                        {showAdversaireClubDropdown && (
                          <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                            {clubsOrdonnes.map(club => (
                              <button
                                key={club.id}
                                onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setNewRencontre({ ...newRencontre, adversaire_club: club.nom });
                                  setShowAdversaireClubDropdown(false);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-gray-100 cursor-pointer"
                              >
                                {club.nom}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <input
                        type="number"
                        min="1"
                        placeholder="N°"
                        value={newRencontre.adversaire_numero}
                        onChange={e =>
                          setNewRencontre({
                            ...newRencontre,
                            adversaire_numero: parseInt(e.target.value) || 1,
                          })
                        }
                        className="border rounded px-3 py-2 text-base"
                      />

                      <div className="relative dropdown-container">
                        <button
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowJourDropdown(!showJourDropdown);
                          }}
                          className="w-full border rounded px-3 py-2 text-left bg-white text-base pr-8 cursor-pointer"
                        >
                          {newRencontre.jour}
                        </button>
                        <i className="ri-arrow-down-s-line absolute right-2 top-1/2 transform -translate-y-1/2"></i>
                        {showJourDropdown && (
                          <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-lg z-10">
                            {['samedi', 'dimanche'].map(jour => (
                              <button
                                key={jour}
                                onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setNewRencontre({ ...newRencontre, jour: jour as 'samedi' | 'dimanche' });
                                  setShowJourDropdown(false);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-gray-100 cursor-pointer"
                              >
                                {jour}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="relative dropdown-container">
                        <button
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowHeureDropdown(!showHeureDropdown);
                          }}
                          className="w-full border rounded px-3 py-2 text-left bg-white text-base pr-8 cursor-pointer"
                        >
                          {newRencontre.heure || 'Heure (optionnel)'}
                        </button>
                        <i className="ri-arrow-down-s-line absolute right-2 top-1/2 transform -translate-y-1/2"></i>
                        {showHeureDropdown && (
                          <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                            <button
                              onClick={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                setNewRencontre({ ...newRencontre, heure: '' });
                                setShowHeureDropdown(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 cursor-pointer text-gray-500 italic border-b"
                            >
                              Pas d'heure définie
                            </button>
                            {timeSlots.map(time => (
                              <button
                                key={time}
                                onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setNewRencontre({ ...newRencontre, heure: time });
                                  setShowHeureDropdown(false);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-gray-100 cursor-pointer"
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="relative dropdown-container">
                        <button
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowLieuDropdown(!showLieuDropdown);
                          }}
                          className="w-full border rounded px-3 py-2 text-left bg-white text-base pr-8 cursor-pointer"
                        >
                          {newRencontre.lieu}
                        </button>
                        <i className="ri-arrow-down-s-line absolute right-2 top-1/2 transform -translate-y-1/2"></i>
                        {showLieuDropdown && (
                          <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-lg z-10">
                            {['domicile', 'extérieur'].map(lieu => (
                              <button
                                key={lieu}
                                onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setNewRencontre({ ...newRencontre, lieu: lieu as 'domicile' | 'extérieur' });
                                  setShowLieuDropdown(false);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-gray-100 cursor-pointer"
                              >
                                {lieu}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-3 mt-3">
                      <button
                        onClick={() => handleAddRencontre(weekend.id)}
                        className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 cursor-pointer whitespace-nowrap"
                      >
                        Ajouter
                      </button>
                      <button
                        onClick={() => {
                          setShowAddRencontre(null);
                          setShowEquipeDropdown(false);
                          setShowJourDropdown(false);
                          setShowLieuDropdown(false);
                          setShowHeureDropdown(false);
                          setShowAdversaireClubDropdown(false);
                        }}
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 cursor-pointer whitespace-nowrap"
                      >
                        Annuler
                      </button>
                    </div>
                    {newRencontre.adversaire_club && (
                      <div className="text-sm text-gray-600 mt-2">
                        Aperçu: {newRencontre.adversaire_club} {newRencontre.adversaire_numero}
                      </div>
                    )}
                  </div>
                )}

                {weekendRencontres.length === 0 ? (
                  <p className="text-gray-500 italic">Aucune rencontre programmée</p>
                ) : (
                  <div className="space-y-4">
                    {weekendRencontres
                      .sort((a, b) => a.equipe - b.equipe)
                      .map(rencontre => {
                        const isEditingThisRencontre = editingRencontre === rencontre.id;

                        return (
                          <div key={rencontre.id} className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                            <div className="flex justify-between items-start mb-4">
                              {isEditingThisRencontre ? (
                                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0 flex-1">
                                  <div className="relative dropdown-container">
                                    <button
                                      onClick={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowEquipeDropdown(!showEquipeDropdown);
                                      }}
                                      className="w-full border rounded px-3 py-2 text-left bg-white text-base pr-8 cursor-pointer"
                                    >
                                      Équipe {editRencontreData.equipe}
                                    </button>
                                    <i className="ri-arrow-down-s-line absolute right-2 top-1/2 transform -translate-y-1/2"></i>
                                    {showEquipeDropdown && (
                                      <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-lg z-10">
                                        {getEquipesDisponiblesPourModification(rencontre.weekend_id, rencontre.id).map(equipe => (
                                          <button
                                            key={equipe}
                                            onClick={e => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setEditRencontreData({ ...editRencontreData, equipe });
                                              setShowEquipeDropdown(false);
                                            }}
                                            className="w-full px-3 py-2 text-left hover:bg-gray-100 cursor-pointer"
                                          >
                                            Équipe {equipe}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex space-x-2">
                                    <div className="relative dropdown-container flex-1">
                                      <button
                                        onClick={e => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setShowEditAdversaireClubDropdown(!showEditAdversaireClubDropdown);
                                        }}
                                        className="w-full border rounded px-3 py-2 text-left bg-white text-base pr-8 cursor-pointer"
                                      >
                                        {editRencontreData.adversaire_club || 'Club adverse'}
                                      </button>
                                      <i className="ri-arrow-down-s-line absolute right-2 top-1/2 transform -translate-y-1/2"></i>
                                      {showEditAdversaireClubDropdown && (
                                        <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                                          {clubsOrdonnes.map(club => (
                                            <button
                                              key={club.id}
                                              onClick={e => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setEditRencontreData({ ...editRencontreData, adversaire_club: club.nom });
                                                setShowEditAdversaireClubDropdown(false);
                                              }}
                                              className="w-full px-3 py-2 text-left hover:bg-gray-100 cursor-pointer"
                                            >
                                              {club.nom}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    <input
                                      type="number"
                                      min="1"
                                      value={editRencontreData.adversaire_numero}
                                      onChange={e =>
                                        setEditRencontreData({
                                          ...editRencontreData,
                                          adversaire_numero: parseInt(e.target.value) || 1,
                                        })
                                      }
                                      className="border rounded px-3 py-2 text-base w-16"
                                      placeholder="N°"
                                    />
                                  </div>

                                  <div className="flex space-x-2">
                                    <select
                                      value={editRencontreData.jour}
                                      onChange={e =>
                                        setEditRencontreData({
                                          ...editRencontreData,
                                          jour: e.target.value as 'samedi' | 'dimanche',
                                        })
                                      }
                                      className="border rounded px-3 py-2 text-base pr-8 flex-1"
                                    >
                                      <option value="samedi">samedi</option>
                                      <option value="dimanche">dimanche</option>
                                    </select>

                                    <div className="relative dropdown-container flex-1">
                                      <button
                                        onClick={e => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setShowEditHeureDropdown(!showEditHeureDropdown);
                                        }}
                                        className="w-full border rounded px-3 py-2 text-left bg-white text-base pr-8 cursor-pointer"
                                      >
                                        {editRencontreData.heure || 'Heure'}
                                      </button>
                                      <i className="ri-arrow-down-s-line absolute right-2 top-1/2 transform -translate-y-1/2"></i>
                                      {showEditHeureDropdown && (
                                        <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                                          <button
                                            onClick={e => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setEditRencontreData({ ...editRencontreData, heure: '' });
                                              setShowEditHeureDropdown(false);
                                            }}
                                            className="w-full px-3 py-2 text-left hover:bg-gray-100 cursor-pointer text-gray-500 italic border-b"
                                          >
                                            Pas d'heure définie
                                          </button>
                                          {timeSlots.map(time => (
                                            <button
                                              key={time}
                                              onClick={e => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setEditRencontreData({ ...editRencontreData, heure: time });
                                                setShowEditHeureDropdown(false);
                                              }}
                                              className="w-full px-3 py-2 text-left hover:bg-gray-100 cursor-pointer"
                                            >
                                              {time}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <select
                                    value={editRencontreData.lieu}
                                    onChange={e =>
                                      setEditRencontreData({
                                        ...editRencontreData,
                                        lieu: e.target.value as 'domicile' | 'extérieur',
                                      })
                                    }
                                    className="border rounded px-3 py-2 text-base pr-8"
                                  >
                                    <option value="domicile">domicile</option>
                                    <option value="extérieur">extérieur</option>
                                  </select>
                                </div>
                              ) : (
                                <div className="flex flex-col space-y-3 flex-1">
                                  <div className="flex items-center justify-between">
                                    <div className="hidden sm:flex items-center space-x-2">
                                      <span className="font-semibold text-blue-600 text-base whitespace-nowrap">
                                        Équipe {rencontre.equipe}
                                      </span>
                                      <span className="text-gray-400">vs</span>
                                      <span className="text-base font-medium break-words">
                                        {rencontre.adversaire}
                                      </span>
                                      <span className="text-gray-400 mx-2">-</span>
                                      <span className="text-base whitespace-nowrap">
                                        {formatDateJourHeure(rencontre.jour, rencontre.heure, weekend)}
                                      </span>
                                      <span className="text-gray-400 mx-2">-</span>
                                      <span
                                        className={`text-base whitespace-nowrap ${
                                          rencontre.lieu === 'domicile' ? 'text-blue-600 font-medium' : 'text-gray-600'
                                        }`}
                                      >
                                        {formatLieu(rencontre.lieu)}
                                      </span>
                                    </div>
                                    <div className="sm:hidden flex flex-col space-y-1">
                                      {isAdmin && (
                                        <div className="flex space-x-1 mb-2">
                                          <button
                                            onClick={() => handleEditRencontre(rencontre)}
                                            className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded hover:bg-blue-200 cursor-pointer"
                                          >
                                            <i className="ri-edit-line text-sm"></i>
                                          </button>
                                          <button
                                            onClick={() => handleDeleteRencontre(rencontre.id)}
                                            className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200 cursor-pointer"
                                          >
                                            <i className="ri-close-line text-sm"></i>
                                          </button>
                                        </div>
                                      )}
                                      <div className="flex items-center space-x-2">
                                        <span className="font-semibold text-blue-600 text-base whitespace-nowrap">
                                          Équipe {rencontre.equipe}
                                        </span>
                                        <span className="text-gray-400">vs</span>
                                        <span className="text-base font-medium break-words">
                                          {rencontre.adversaire}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <span className="whitespace-nowrap">{formatDateJourHeure(rencontre.jour, rencontre.heure, weekend)}</span>
                                        <span
                                          className={`whitespace-nowrap ${
                                            rencontre.lieu === 'domicile' ? 'text-blue-600 font-medium' : ''
                                          }`}
                                        >
                                          {formatLieu(rencontre.lieu)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="flex space-x-2 ml-1 flex-shrink-0 sm:flex-row flex-col sm:space-x-2 sm:space-y-0 space-x-0 space-y-1">
                                {isEditingThisRencontre ? (
                                  <>
                                    <button
                                      onClick={handleSaveRencontre}
                                      className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-600 rounded hover:bg-green-200 cursor-pointer"
                                      title="Sauvegarder"
                                    >
                                      <i className="ri-check-line text-sm"></i>
                                    </button>
                                    <button
                                      onClick={() => setEditingRencontre(null)}
                                      className="w-6 h-6 flex items-center justify-center bg-gray-100 text-gray-600 rounded hover:bg-gray-200 cursor-pointer"
                                      title="Annuler"
                                    >
                                      <i className="ri-close-line text-sm"></i>
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {isAdmin && (
                                      <button
                                        onClick={() => handleEditRencontre(rencontre)}
                                        className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded hover:bg-blue-200 cursor-pointer hidden sm:flex"
                                        title="Modifier"
                                      >
                                        <i className="ri-edit-line text-sm"></i>
                                      </button>
                                    )}
                                    {isAdmin && (
                                      <button
                                        onClick={() => handleDeleteRencontre(rencontre.id)}
                                        className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200 cursor-pointer hidden sm:flex"
                                        title="Supprimer"
                                      >
                                        <i className="ri-close-line text-sm"></i>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {rencontre.joueurs.map((joueurId, index) => {
                                  const dropdownKey = `${rencontre.id}-${index}`;
                                  const showDropdown = showJoueurDropdownDropdown[dropdownKey] && isAdmin;
                                  const joueursForPosition = getJoueursDisponibles(
                                    rencontre.equipe,
                                    weekend.id,
                                    rencontre.id,
                                    index
                                  );

                                  const selectedJoueur = joueurId
                                    ? joueurs.find(j => parseInt(j.id) === joueurId)
                                    : null;

                                  return (
                                    <div key={index} className="relative dropdown-container">
                                      <button
                                        onClick={e => toggleJoueurDropdown(rencontre.id, index, e)}
                                        className={`w-full border rounded px-3 py-2 text-left bg-white text-sm sm:text-base pr-8 truncate ${
                                          isAdmin ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default bg-gray-50'
                                        }`}
                                        title={selectedJoueur ? `${selectedJoueur.prenom} ${selectedJoueur.nom}` : `Joueur ${index + 1}`}
                                      >
                                        {selectedJoueur
                                          ? `${selectedJoueur.prenom} ${selectedJoueur.nom}`
                                          : `Joueur ${index + 1}`}
                                      </button>
                                      {isAdmin && (
                                        <i className="ri-arrow-down-s-line absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"></i>
                                      )}
                                      {showDropdown && (
                                        <div className="absolute top-full left-0 w-full sm:w-auto sm:min-w-full bg-white border rounded-md shadow-lg z-20 max-h-40 overflow-y-auto">
                                          <button
                                            onClick={e => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleJoueurChange(rencontre.id, index, null);
                                            }}
                                            className="w-full px-3 py-2 text-left hover:bg-gray-100 cursor-pointer text-gray-500 italic border-b text-sm sm:text-base whitespace-nowrap"
                                          >
                                            Aucun joueur
                                          </button>
                                          {joueursForPosition.map(joueur => (
                                            <button
                                              key={joueur.id}
                                              onClick={e => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleJoueurChange(rencontre.id, index, parseInt(joueur.id));
                                              }}
                                              className="w-full px-3 py-2 text-left hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                                            >
                                              <span className="text-sm sm:text-base whitespace-nowrap">
                                                {joueur.prenom} {joueur.nom}
                                              </span>
                                              <span className="text-xs sm:text-sm text-gray-500 ml-2">
                                                {joueur.classement}
                                              </span>
                                            </button>
                                          ))}
                                          {joueursForPosition.length === 0 && (
                                            <div className="px-3 py-2 text-gray-500 italic text-sm sm:text-base whitespace-nowrap">
                                              Aucun joueur disponible
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                <div className="flex justify-between items-center mt-4">
                  {isEditingThisWeekend ? (
                    <div className="flex space-x-3">
                      <button
                        onClick={handleSaveWeekend}
                        className="w-10 h-10 flex items-center justify-center bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"
                        title="Sauvegarder"
                      >
                        <i className="ri-check-line"></i>
                      </button>
                      <button
                        onClick={() => setEditingWeekend(null)}
                        className="w-10 h-10 flex items-center justify-center bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer"
                        title="Annuler"
                      >
                        <i className="ri-close-line"></i>
                      </button>
                    </div>
                  ) : (
                    <div className="flex space-x-3">
                      {isAdmin && (
                        <button
                          onClick={() => setShowAddRencontre(showAddRencontre === weekend.id ? null : weekend.id)}
                          className="w-10 h-10 flex items-center justify-center bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"
                          title="Ajouter une rencontre"
                        >
                          <i className="ri-add-line"></i>
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleEditWeekend(weekend)}
                          className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
                          title="Modifier"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteWeekend(weekend.id)}
                          className="w-10 h-10 flex items-center justify-center bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
                          title="Supprimer"
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {weekends.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-full mx-auto mb-4">
              <i className="ri-calendar-line text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun weekend de rencontre</h3>
            <p className="text-gray-500 mb-4">
              Commencez par créer votre premier weekend de championnat.
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowAddWeekend(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer whitespace-nowrap"
              >
                Créer un weekend
              </button>
            )}
          </div>
        )}
      </main>

      {notification && (
        <div
          className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all ${
            notification.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : notification.type === 'error'
              ? 'bg-red-100 text-red-800 border border-red-200'
              : 'bg-blue-100 text-blue-800 border border-blue-200'
          }`}
        >
          <div className="flex items-center">
            <i
              className={`mr-2 ${
                notification.type === 'success'
                  ? 'ri-check-circle-line'
                  : notification.type === 'error'
                  ? 'ri-error-warning-line'
                  : 'ri-information-line'
              }`}
            ></i>
            {notification.message}
          </div>
        </div>
      )}

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
    </div>
  );
}