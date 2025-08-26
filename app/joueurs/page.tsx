
'use client';

import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { useAuth } from '../../components/AuthProvider';

interface Joueur {
  id: number;
  prenom: string;
  nom: string;
  classement: string;
  categorie_age: string;
  equipes: number[];
  telephone: string;
  email: string;
  date_naissance: string;
  role: 'admin' | 'joueur';
}

export default function JoueursPage() {
  const { user, profile, isClient } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [joueurs, setJoueurs] = useState<Joueur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void; onCancel: () => void } | null>(null);
  const [editingJoueur, setEditingJoueur] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Joueur>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newJoueur, setNewJoueur] = useState<Partial<Joueur>>({
    prenom: '',
    nom: '',
    classement: '',
    categorie_age: 'Senior',
    equipes: [1, 2],
    telephone: '',
    email: '',
    role: 'joueur',
  });

  const [showCategorieDropdown, setShowCategorieDropdown] = useState(false);
  const [showEditCategorieDropdown, setShowEditCategorieDropdown] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const functionUrl = `${supabaseUrl}/functions/v1/joueurs-management`;

  const categories = [
    'Poussin',
    'Benjamin',
    'Minime',
    'Cadet',
    'Junior',
    'Senior',
    'Vétéran',
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: 'get_data' }),
      });

      const data = await response.json();

      if (data.success) {
        setJoueurs(
          data.joueurs.map((j: any) => ({
            ...j,
            equipes: j.equipes || [1, 2],
          }))
        );
      } else {
        setError('Erreur lors du chargement des joueurs');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des joueurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isClient && profile) {
      loadData();
    }
  }, [isClient, profile]);

  const handleEquipeChange = (value: string, isEdit = false) => {
    if (isEdit) {
      setEditForm({ ...editForm, equipesInput: value });

      if (!value.trim()) {
        setEditForm((prev) => ({ ...prev, equipes: [] }));
        return;
      }

      const equipesArray = value
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e !== '' && !isNaN(parseInt(e)))
        .map((e) => parseInt(e))
        .filter((e) => e > 0);

      setEditForm((prev) => ({ ...prev, equipes: equipesArray }));
    } else {
      setNewJoueur({ ...newJoueur, equipesInput: value });

      if (!value.trim()) {
        setNewJoueur((prev) => ({ ...prev, equipes: [] }));
        return;
      }

      const equipesArray = value
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e !== '' && !isNaN(parseInt(e)))
        .map((e) => parseInt(e))
        .filter((e) => e > 0);

      setNewJoueur((prev) => ({ ...prev, equipes: equipesArray }));
    }
  };

  const handleEdit = (joueur: Joueur) => {
    if (!isAdmin) {
      showNotification("Seul l'administrateur peut modifier les joueurs !", 'error');
      return;
    }
    setEditingJoueur(joueur.id);
    setEditForm({
      ...joueur,
      equipes: [...joueur.equipes],
      equipesInput: joueur.equipes.join(', '),
    });
  };

  const handleSave = async (id: number) => {
    if (!isAdmin) {
      showNotification("Seul l'administrateur peut modifier les joueurs !", 'error');
      return;
    }

    try {
      const { equipesInput, ...dataToSave } = editForm;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'update_joueur',
          joueur: { ...dataToSave, id },
        }),
      });

      const data = await response.json();

      if (data.success) {
        await loadData();
        setEditingJoueur(null);
        setEditForm({});
        setShowEditCategorieDropdown(false);
        showNotification('Joueur modifié avec succès', 'success');
      } else {
        showNotification(`Erreur lors de la sauvegarde: ${data.error || 'Erreur inconnue'}`, 'error');
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      showNotification('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleCancel = () => {
    setEditingJoueur(null);
    setEditForm({});
    setShowEditCategorieDropdown(false);
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      showNotification("Seul l'administrateur peut supprimer les joueurs !", 'error');
      return;
    }

    const executeDelete = async () => {
      try {
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: 'delete_joueur',
            joueur_id: id,
          }),
        });

        const data = await response.json();

        if (data.success) {
          await loadData();
          showNotification('Joueur supprimé avec succès', 'success');
        } else {
          showNotification('Erreur lors de la suppression', 'error');
        }
      } catch (err) {
        console.error('Erreur:', err);
        showNotification('Erreur lors de la suppression', 'error');
      }
    };

    showConfirm('Êtes-vous sûr de vouloir supprimer ce joueur ?', executeDelete);
  };

  const handleAddJoueur = async () => {
    if (!isAdmin) {
      showNotification("Seul l'administrateur peut ajouter des joueurs !", 'error');
      return;
    }
    if (newJoueur.prenom && newJoueur.nom) {
      try {
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: 'add_joueur',
            joueur: newJoueur,
          }),
        });

        const data = await response.json();

        if (data.success) {
          await loadData();
          setNewJoueur({
            prenom: '',
            nom: '',
            classement: '',
            categorie_age: 'Senior',
            equipes: [1, 2],
            telephone: '',
            email: '',
            role: 'joueur',
          });
          setShowAddForm(false);
          setShowCategorieDropdown(false);
          showNotification('Joueur ajouté avec succès', 'success');
        } else {
          showNotification("Erreur lors de l'ajout", 'error');
        }
      } catch (err) {
        console.error('Erreur:', err);
        showNotification("Erreur lors de l'ajout", 'error');
      }
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
            <div className="text-lg text-gray-500">Chargement des joueurs...</div>
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

  const sortedJoueurs = [...joueurs].sort((a, b) => parseInt(b.classement) - parseInt(a.classement));

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
        {/* Header & Add button */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Joueurs</h1>
          {isAdmin && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer w-full sm:w-auto"
            >
              <i className="ri-add-line mr-2"></i>
              Ajouter un joueur
            </button>
          )}
        </div>

        {/* Add Form */}
        {showAddForm && isAdmin && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Nouveau joueur</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Prénom"
                value={newJoueur.prenom || ''}
                onChange={(e) => setNewJoueur({ ...newJoueur, prenom: e.target.value })}
                className="border rounded px-3 py-2 text-base"
              />
              <input
                type="text"
                placeholder="Nom"
                value={newJoueur.nom || ''}
                onChange={(e) => setNewJoueur({ ...newJoueur, nom: e.target.value })}
                className="border rounded px-3 py-2 text-base"
              />
              <input
                type="text"
                placeholder="Classement"
                value={newJoueur.classement || ''}
                onChange={(e) => setNewJoueur({ ...newJoueur, classement: e.target.value })}
                className="border rounded px-3 py-2 text-base"
              />
              {/* Categorie dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowCategorieDropdown(!showCategorieDropdown)}
                  className="w-full border rounded px-3 py-2 text-left bg-white text-base pr-8 cursor-pointer"
                >
                  {newJoueur.categorie_age || 'Catégorie dâge'}
                </button>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 transform -translate-y-1/2"></i>
                {showCategorieDropdown && (
                  <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-lg z-10">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setNewJoueur({ ...newJoueur, categorie_age: cat });
                          setShowCategorieDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 cursor-pointer"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Equipes input */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Équipes
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1,2,3"
                  value={
                    newJoueur.equipesInput !== undefined
                      ? newJoueur.equipesInput
                      : newJoueur.equipes?.join(', ') || ''
                  }
                  onChange={(e) => handleEquipeChange(e.target.value)}
                  className="border rounded px-2 py-1 text-base"
                />
              </div>

              <input
                type="tel"
                placeholder="Téléphone"
                value={newJoueur.telephone || ''}
                onChange={(e) => setNewJoueur({ ...newJoueur, telephone: e.target.value })}
                className="border rounded px-3 py-2 text-base"
              />
              <input
                type="email"
                placeholder="Email"
                value={newJoueur.email || ''}
                onChange={(e) => setNewJoueur({ ...newJoueur, email: e.target.value })}
                className="border rounded px-3 py-2 text-base"
              />

              {/* Checkbox Rôle Admin (nouveau joueur) */}
              <div className="sm:col-span-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newJoueur.role === 'admin'}
                    onChange={(e) =>
                      setNewJoueur({ ...newJoueur, role: e.target.checked ? 'admin' : 'joueur' })
                    }
                    className="w-4 h-4 text-blue-600 cursor-pointer"
                  />
                  <span className="text-base font-medium">Donner les droits d'administrateur</span>
                </label>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-4">
              <button
                onClick={handleAddJoueur}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer whitespace-nowrap"
              >
                Ajouter
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setShowCategorieDropdown(false);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 cursor-pointer whitespace-nowrap"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden lg:block bg-white rounded-lg shadow-md overflow-hidden">
          <div
            className="grid gap-4 p-4 bg-blue-100 font-semibold text-base grid-cols-9"
            style={{
              gridTemplateColumns: isAdmin ? '1fr 1fr 80px 100px 60px 140px 1.8fr 90px 40px' : '1fr 1fr 80px 100px 60px 140px 2fr 40px',
            }}
          >
            <div>Prénom</div>
            <div>Nom</div>
            <div className="text-center">Classmt</div>
            <div className="text-center">Catégorie</div>
            <div className="text-center">Équipes</div>
            <div className="text-center">Téléphone</div>
            <div>Email</div>
            {isAdmin && <div className="text-center">Rôle</div>}
            <div></div>
          </div>

          {sortedJoueurs.map((joueur) => (
            <div key={joueur.id} className="border-b border-gray-200">
              <div
                className={`grid gap-4 p-4 items-center grid-cols-9 ${
                  editingJoueur === joueur.id ? 'bg-blue-50' : ''
                }`}
                style={{
                  gridTemplateColumns: isAdmin ? '1fr 1fr 80px 100px 60px 140px 1.8fr 90px 40px' : '1fr 1fr 80px 100px 60px 140px 2fr 40px',
                }}
              >
                {editingJoueur === joueur.id ? (
                  <>
                    <div className="flex flex-col justify-end">
                      <label className="text-sm font-medium text-gray-700 mb-1">
                        Prénom
                      </label>
                      <input
                        type="text"
                        value={editForm.prenom || ''}
                        onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
                        className="border rounded px-2 py-1 text-base"
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <label className="text-sm font-medium text-gray-700 mb-1">
                        Nom
                      </label>
                      <input
                        type="text"
                        value={editForm.nom || ''}
                        onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                        className="border rounded px-2 py-1 text-base"
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <label className="text-sm font-medium text-gray-700 mb-1">
                        Classement
                      </label>
                      <input
                        type="text"
                        value={editForm.classement || ''}
                        onChange={(e) => setEditForm({ ...editForm, classement: e.target.value })}
                        className="border rounded px-2 py-1 text-base text-center"
                      />
                    </div>
                    {/* Catégorie dropdown (edit) */}
                    <div className="relative">
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Catégorie
                      </label>
                      <button
                        onClick={() => setShowEditCategorieDropdown(!showEditCategorieDropdown)}
                        className="w-full border rounded px-2 py-1 text-left bg-white text-base pr-6 cursor-pointer"
                      >
                        {editForm.categorie_age || 'Catégorie'}
                      </button>
                      <i className="ri-arrow-down-s-line absolute right-1 top-1/2 transform -translate-y-1/2 text-sm"></i>
                      {showEditCategorieDropdown && (
                        <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-lg z-10">
                          {categories.map((cat) => (
                            <button
                              key={cat}
                              onClick={() => {
                                setEditForm({ ...editForm, categorie_age: cat });
                                setShowEditCategorieDropdown(false);
                              }}
                              className="w-full px-2 py-1 text-left hover:bg-gray-100 cursor-pointer text-sm"
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="text-sm font-medium text-gray-700 mb-1">
                        Équipes
                      </label>
                      <input
                        type="text"
                        value={
                          editForm.equipesInput !== undefined
                            ? editForm.equipesInput
                            : editForm.equipes?.join(', ') || ''
                        }
                        onChange={(e) => handleEquipeChange(e.target.value, true)}
                        className="border rounded px-2 py-1 text-base"
                        placeholder="Ex: 1,2,3"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="text-sm font-medium text-gray-700 mb-1">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={editForm.telephone || ''}
                        onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
                        className="border rounded px-2 py-1 text-base"
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <label className="text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editForm.email || ''}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="border rounded px-2 py-1 text-base"
                      />
                    </div>

                    {isAdmin && (
                      <div className="flex flex-col justify-end">
                        <label className="text-sm font-medium text-gray-700 mb-1">
                          Rôle
                        </label>
                        <div className="flex items-center justify-center">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editForm.role === 'admin'}
                              onChange={(e) =>
                                setEditForm({ ...editForm, role: e.target.checked ? 'admin' : 'joueur' })
                              }
                              className="w-3 h-3 text-blue-600 cursor-pointer mr-1"
                            />
                            <span className="text-xs text-gray-700">Admin</span>
                          </label>
                        </div>
                      </div>
                    )}
                    <div></div>
                  </>
                ) : (
                  <>
                    <div className="text-base">{joueur.prenom}</div>
                    <div className="text-base">{joueur.nom}</div>
                    <div className="font-semibold text-blue-600 text-center text-base">
                      {joueur.classement}
                    </div>
                    <div className="text-center text-base">{joueur.categorie_age}</div>
                    <div className="text-center text-base">
                      {joueur.equipes.join(', ') || '-'}
                    </div>
                    <div className="text-base text-center">{joueur.telephone}</div>
                    <div className="text-base text-gray-600">{joueur.email}</div>
                    {isAdmin && (
                      <div className="text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            joueur.role === 'admin'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {joueur.role === 'admin' ? 'Admin' : 'Joueur'}
                        </span>
                      </div>
                    )}
                    <div></div>
                  </>
                )}
              </div>

              <div className={`px-4 pb-4 ${editingJoueur === joueur.id ? 'bg-blue-50' : ''}`}>
                <div className="flex justify-end space-x-1">
                  {isAdmin && (
                    <>
                      {editingJoueur === joueur.id ? (
                        <>
                          <button
                            onClick={() => handleSave(joueur.id)}
                            className="w-7 h-7 flex items-center justify-center bg-green-100 text-green-600 rounded hover:bg-green-200 cursor-pointer"
                            title="Sauvegarder"
                          >
                            <i className="ri-check-line text-sm"></i>
                          </button>
                          <button
                            onClick={handleCancel}
                            className="w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-600 rounded hover:bg-gray-200 cursor-pointer"
                            title="Annuler"
                          >
                            <i className="ri-close-line text-sm"></i>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(joueur)}
                            className="w-7 h-7 flex items-center justify-center bg-blue-100 text-blue-600 rounded hover:bg-blue-200 cursor-pointer"
                            title="Modifier"
                          >
                            <i className="ri-edit-line text-sm"></i>
                          </button>
                          <button
                            onClick={() => handleDelete(joueur.id)}
                            className="w-7 h-7 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200 cursor-pointer"
                            title="Supprimer"
                          >
                            <i className="ri-delete-bin-line text-sm"></i>
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden space-y-4">
          {sortedJoueurs.map((joueur) => (
            <div
              key={joueur.id}
              className={`bg-white rounded-lg shadow-md overflow-hidden ${
                editingJoueur === joueur.id ? 'ring-2 ring-blue-200' : ''
              }`}
            >
              <div className={`p-4 ${editingJoueur === joueur.id ? 'bg-blue-50' : ''}`}>
                {editingJoueur === joueur.id ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <input
                        type="text"
                        value={editForm.prenom || ''}
                        onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
                        className="border rounded px-3 py-2 text-base font-semibold"
                        placeholder="Prénom"
                      />
                      <input
                        type="text"
                        value={editForm.nom || ''}
                        onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                        className="border rounded px-3 py-2 text-base font-semibold"
                        placeholder="Nom"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <input
                        type="text"
                        value={editForm.classement || ''}
                        onChange={(e) => setEditForm({ ...editForm, classement: e.target.value })}
                        className="border rounded px-3 py-2 text-base font-medium text-blue-600"
                        placeholder="Classement"
                      />
                      <div className="relative">
                        <button
                          onClick={() => setShowEditCategorieDropdown(!showEditCategorieDropdown)}
                          className="w-full border rounded px-3 py-2 text-left bg-white text-base pr-8 cursor-pointer"
                        >
                          {editForm.categorie_age || 'Catégorie'}
                        </button>
                        <i className="ri-arrow-down-s-line absolute right-2 top-1/2 transform -translate-y-1/2"></i>
                        {showEditCategorieDropdown && (
                          <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-lg z-10">
                            {categories.map((cat) => (
                              <button
                                key={cat}
                                onClick={() => {
                                  setEditForm({ ...editForm, categorie_age: cat });
                                  setShowEditCategorieDropdown(false);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-gray-100 cursor-pointer"
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col justify-end mb-4">
                      <div className="flex items-center space-x-2">
                        <i className="ri-team-line w-4 h-4 text-gray-500"></i>
                        <input
                          type="text"
                          value={
                            editForm.equipesInput !== undefined
                              ? editForm.equipesInput
                              : editForm.equipes?.join(', ') || ''
                          }
                          onChange={(e) => handleEquipeChange(e.target.value, true)}
                          className="border rounded px-2 py-1 text-base"
                          placeholder="Ex: 1,2,3"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <i className="ri-phone-line w-4 h-4 text-gray-500"></i>
                        <input
                          type="tel"
                          value={editForm.telephone || ''}
                          onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
                          className="border rounded px-3 py-2 text-base w-full"
                          placeholder="Téléphone"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <i className="ri-mail-line w-4 h-4 text-gray-500"></i>
                        <input
                          type="email"
                          value={editForm.email || ''}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="border rounded px-3 py-2 text-base w-full"
                          placeholder="Email"
                        />
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.role === 'admin'}
                            onChange={(e) =>
                              setEditForm({ ...editForm, role: e.target.checked ? 'admin' : 'joueur' })
                            }
                            className="w-4 h-4 text-blue-600 cursor-pointer"
                          />
                          <span className="text-base font-medium">Administrateur</span>
                        </label>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-base">
                            {joueur.prenom} {joueur.nom}
                          </h3>
                          <div className="flex items-center space-x-2 text-base text-gray-500">
                            <span className="font-medium text-blue-600">
                              {joueur.classement}
                            </span>
                            <span>•</span>
                            <span>{joueur.categorie_age}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isAdmin && (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              joueur.role === 'admin'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {joueur.role === 'admin' ? 'Admin' : 'Joueur'}
                          </span>
                        )}
                        <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                          {joueur.equipes.length > 0
                            ? `Équipes ${joueur.equipes.join(', ')}`
                            : 'Aucune équipe'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-base">
                      <div className="flex items-center text-gray-600">
                        <i className="ri-phone-line w-4 h-4 mr-2"></i>
                        <span>{joueur.telephone}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <i className="ri-mail-line w-4 h-4 mr-2"></i>
                        <span className="truncate">{joueur.email}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {isAdmin && (
                <div className="flex justify-end space-x-2 mt-1 pt-3 border-t border-gray-100">
                  {editingJoueur === joueur.id ? (
                    <>
                      <button
                        onClick={() => handleSave(joueur.id)}
                        className="w-7 h-7 flex items-center justify-center bg-green-100 text-green-600 rounded hover:bg-green-200 cursor-pointer"
                        title="Sauvegarder"
                      >
                        <i className="ri-check-line text-sm"></i>
                      </button>
                      <button
                        onClick={handleCancel}
                        className="w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-600 rounded hover:bg-gray-200 cursor-pointer"
                        title="Annuler"
                      >
                        <i className="ri-close-line text-sm"></i>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(joueur)}
                        className="w-7 h-7 flex items-center justify-center bg-blue-100 text-blue-600 rounded hover:bg-blue-200 cursor-pointer"
                        title="Modifier"
                      >
                        <i className="ri-edit-line text-sm"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(joueur.id)}
                        className="w-7 h-7 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200 cursor-pointer"
                        title="Supprimer"
                      >
                        <i className="ri-delete-bin-line text-sm"></i>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
