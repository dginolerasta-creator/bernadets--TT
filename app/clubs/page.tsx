
'use client';

import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { useAuth } from '../../components/AuthProvider';

interface Club {
  id: string;
  nom: string;
  contact_nom: string;
  telephone: string;
  email: string;
  adresse: string;
}

export default function ClubsPage() {
  const { user, profile, isClient } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void; onCancel: () => void } | null>(null);

  const [editingClub, setEditingClub] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Club>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClub, setNewClub] = useState<Partial<Club>>({
    nom: '',
    contact_nom: '',
    telephone: '',
    email: '',
    adresse: '',
  });

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

  const openGoogleMaps = (adresse: string) => {
    if (adresse && adresse.trim()) {
      const encodedAddress = encodeURIComponent(adresse.trim());
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  const loadClubs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/clubs-management`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: 'get_clubs' }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data = await response.json();

      if (data.success) {
        setClubs(data.clubs ?? []);
      } else {
        setError('Erreur lors du chargement des clubs');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des clubs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isClient && profile) {
      loadClubs();
    }
  }, [isClient, profile]);

  const handleEdit = (club: Club) => {
    if (!isAdmin) {
      showNotification("Seul l'administrateur peut modifier les clubs!", 'error');
      return;
    }
    setEditingClub(club.id);
    setEditForm({ ...club });
  };

  const handleSave = async (id: string) => {
    if (!isAdmin) {
      showNotification("Seul l'administrateur peut modifier les clubs!", 'error');
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/clubs-management`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: 'update_club',
            club: { id, ...editForm },
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data = await response.json();

      if (data.success) {
        setClubs((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...editForm } : c))
        );
        setEditingClub(null);
        setEditForm({});
        showNotification('Club modifié avec succès', 'success');
      } else {
        showNotification('Erreur lors de la sauvegarde', 'error');
      }
    } catch (err) {
      console.error('Erreur:', err);
      showNotification('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleCancel = () => {
    setEditingClub(null);
    setEditForm({});
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      showNotification("Seul l'administrateur peut supprimer les clubs!", 'error');
      return;
    }

    const executeDelete = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/clubs-management`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              action: 'delete_club',
              club: { id },
            }),
          }
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP ${response.status}: ${text}`);
        }

        const data = await response.json();

        if (data.success) {
          setClubs((prev) => prev.filter((c) => c.id !== id));
          showNotification('Club supprimé avec succès', 'success');
        } else {
          showNotification('Erreur lors de la suppression', 'error');
        }
      } catch (err) {
        console.error('Erreur:', err);
        showNotification('Erreur lors de la suppression', 'error');
      }
    };

    showConfirm('Êtes-vous sûr de vouloir supprimer ce club ?', executeDelete);
  };

  const handleAddClub = async () => {
    if (!isAdmin) {
      showNotification("Seul l'administrateur peut ajouter des clubs!", 'error');
      return;
    }
    if (newClub.nom && newClub.contact_nom) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/clubs-management`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              action: 'add_club',
              club: newClub,
            }),
          }
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP ${response.status}: ${text}`);
        }

        const data = await response.json();

        if (data.success) {
          await loadClubs();
          setNewClub({
            nom: '',
            contact_nom: '',
            telephone: '',
            email: '',
            adresse: '',
          });
          setShowAddForm(false);
          showNotification('Club ajouté avec succès', 'success');
        } else {
          showNotification("Erreur lors de l'ajout", 'error');
        }
      } catch (err) {
        console.error('Erreur:', err);
        showNotification("Erreur lors de l'ajout", 'error');
      }
    } else {
      showNotification('Veuillez remplir au moins le nom du club et le nom du contact.', 'error');
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
            <div className="text-lg text-gray-500">Chargement des clubs...</div>
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
              onClick={loadClubs}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Annuaire des Clubs</h1>
          {isAdmin && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              <i className="ri-add-line mr-2"></i>
              Ajouter un club
            </button>
          )}
        </div>

        {showAddForm && isAdmin && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Nouveau club</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col justify-end">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <input
                  type="text"
                  value={newClub.nom || ''}
                  onChange={(e) =>
                    setNewClub({ ...newClub, nom: e.target.value })
                  }
                  className="border rounded px-2 py-1 text-base"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Contact
                </label>
                <input
                  type="text"
                  value={newClub.contact_nom || ''}
                  onChange={(e) =>
                    setNewClub({ ...newClub, contact_nom: e.target.value })
                  }
                  className="border rounded px-2 py-1 text-base"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={newClub.telephone || ''}
                  onChange={(e) =>
                    setNewClub({ ...newClub, telephone: e.target.value })
                  }
                  className="border rounded px-2 py-1 text-base"
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newClub.email || ''}
                  onChange={(e) =>
                    setNewClub({ ...newClub, email: e.target.value })
                  }
                  className="border rounded px-2 py-1 text-base"
                />
              </div>

              <div className="col-span-2 flex flex-col justify-end">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <input
                  type="text"
                  value={newClub.adresse || ''}
                  onChange={(e) =>
                    setNewClub({ ...newClub, adresse: e.target.value })
                  }
                  className="border rounded px-2 py-1 text-base"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-4">
              <button
                onClick={handleAddClub}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer whitespace-nowrap"
              >
                Ajouter
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 cursor-pointer whitespace-nowrap"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6">
          {clubs.map((club) => (
            <div
              key={club.id}
              className={`bg-blue-50 rounded-lg shadow-md p-6 ${
                editingClub === club.id ? 'bg-blue-100 border border-blue-200' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                {editingClub === club.id ? (
                  <input
                    type="text"
                    value={editForm.nom || ''}
                    onChange={(e) =>
                      setEditForm({ ...editForm, nom: e.target.value })
                    }
                    className="text-xl font-semibold text-gray-900 border rounded px-3 py-1 text-base"
                  />
                ) : (
                  <h3 className="text-xl font-semibold text-gray-900">
                    {club.nom}
                  </h3>
                )}

                <div className="flex space-x-2">
                  {isAdmin && editingClub === club.id && (
                    <>
                      <button
                        onClick={() => handleSave(club.id)}
                        className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-600 rounded hover:bg-green-200 cursor-pointer"
                      >
                        <i className="ri-check-line"></i>
                      </button>
                      <button
                        onClick={handleCancel}
                        className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded hover:bg-gray-200 cursor-pointer"
                      >
                        <i className="ri-close-line"></i>
                      </button>
                    </>
                  )}
                  {isAdmin && editingClub !== club.id && (
                    <>
                      <button
                        onClick={() => handleEdit(club)}
                        className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded hover:bg-blue-200 cursor-pointer"
                      >
                        <i className="ri-edit-line"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(club.id)}
                        className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200 cursor-pointer"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center text-gray-600 text-base">
                  <i className="ri-user-line w-5 h-5 flex items-center justify-center mr-3"></i>
                  <span>Contact : </span>
                  {editingClub === club.id ? (
                    <input
                      type="text"
                      value={editForm.contact_nom || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, contact_nom: e.target.value })
                      }
                      className="ml-1 border rounded px-2 py-1 text-base flex-1"
                    />
                  ) : (
                    <span className="ml-1">{club.contact_nom}</span>
                  )}
                </div>

                <div className="flex items-center text-gray-600 md:order-none order-3 text-base">
                  <i className="ri-mail-line w-5 h-5 flex items-center justify-center mr-3"></i>
                  {editingClub === club.id ? (
                    <input
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                      className="border rounded px-2 py-1 text-base flex-1"
                    />
                  ) : (
                    <span>{club.email}</span>
                  )}
                </div>

                <div className="flex items-center text-gray-600 md:order-none order-2 text-base">
                  <button
                    onClick={() => openGoogleMaps(club.adresse)}
                    className="w-5 h-5 flex items-center justify-center mr-3 text-blue-600 hover:text-blue-800 cursor-pointer"
                    title="Voir sur Google Maps"
                  >
                    <i className="ri-map-pin-line"></i>
                  </button>
                  {editingClub === club.id ? (
                    <input
                      type="text"
                      value={editForm.adresse || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, adresse: e.target.value })
                      }
                      className="border rounded px-2 py-1 text-base flex-1"
                    />
                  ) : (
                    <span>{club.adresse}</span>
                  )}
                </div>

                <div className="flex items-center text-gray-600 md:order-none order-4 text-base">
                  <i className="ri-phone-line w-5 h-5 flex items-center justify-center mr-3"></i>
                  {editingClub === club.id ? (
                    <input
                      type="tel"
                      value={editForm.telephone || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, telephone: e.target.value })
                      }
                      className="border rounded px-2 py-1 text-base flex-1"
                    />
                  ) : (
                    <span>{club.telephone}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
