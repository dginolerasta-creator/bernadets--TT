import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, joueur, joueur_id } = await req.json()

    if (action === 'get_data') {
      const { data: joueurs, error } = await supabaseClient
        .from('joueurs')
        .select('*')
        .order('classement', { ascending: false })

      if (error) {
        console.error('Erreur get_data:', error)
        throw error
      }

      // Assurer que chaque joueur a un tableau d'équipes
      const joueursAvecEquipes = (joueurs || []).map(j => ({
        ...j,
        equipes: j.equipes || [1, 2] // Équipes par défaut si null
      }))

      return new Response(
        JSON.stringify({ 
          success: true, 
          joueurs: joueursAvecEquipes
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'add_joueur') {
      console.log('Ajout joueur:', joueur)
      
      // Traiter les équipes correctement
      const { equipesInput, ...joueurData } = joueur
      const equipesArray = joueurData.equipes || [1, 2]
      
      const { error } = await supabaseClient
        .from('joueurs')
        .insert({
          nom: joueurData.nom || '',
          prenom: joueurData.prenom || '',
          classement: joueurData.classement || '500',
          categorie_age: joueurData.categorie_age || 'Senior',
          telephone: joueurData.telephone || '',
          email: joueurData.email || '',
          date_naissance: joueurData.date_naissance || null,
          equipes: equipesArray,
          role: joueurData.role || 'joueur' // Inclure le rôle lors de la création
        })

      if (error) {
        console.error('Erreur add_joueur:', error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Erreur lors de l'ajout: ${error.message}`,
            details: error
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Joueur ajouté' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'update_joueur') {
      console.log('Modification joueur reçu:', joueur)
      
      const { id, equipesInput, ...joueurData } = joueur
      
      // Convertir l'ID en string pour la comparaison Supabase
      const joueurId = String(id)
      
      // Vérifier que l'ID existe
      const { data: existingJoueur, error: checkError } = await supabaseClient
        .from('joueurs')
        .select('id')
        .eq('id', joueurId)
        .single()

      if (checkError) {
        console.error('Erreur lors de la vérification:', checkError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Erreur lors de la vérification: ${checkError.message}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!existingJoueur) {
        console.error('Joueur non trouvé avec ID:', joueurId)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Joueur non trouvé'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Préparer les données à mettre à jour - MAINTENANT AVEC LES ÉQUIPES ET LE RÔLE !
      const updateData = {
        nom: joueurData.nom || '',
        prenom: joueurData.prenom || '',
        classement: joueurData.classement || '500',
        categorie_age: joueurData.categorie_age || 'Senior',
        telephone: joueurData.telephone || '',
        email: joueurData.email || '',
        date_naissance: joueurData.date_naissance || null,
        equipes: joueurData.equipes || [1, 2],
        role: joueurData.role || 'joueur' // Inclure le rôle lors de la modification
      }

      console.log('Données de mise à jour (avec équipes et rôle):', updateData)
      console.log('ID utilisé pour la mise à jour:', joueurId)

      const { data: updateResult, error } = await supabaseClient
        .from('joueurs')
        .update(updateData)
        .eq('id', joueurId)
        .select()

      if (error) {
        console.error('Erreur update_joueur:', error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Erreur lors de la modification: ${error.message}`,
            details: error
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Joueur modifié avec succès:', updateResult)
      return new Response(
        JSON.stringify({ success: true, message: 'Joueur modifié avec succès', data: updateResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'delete_joueur') {
      console.log('Suppression joueur:', joueur_id)
      
      const { error } = await supabaseClient
        .from('joueurs')
        .delete()
        .eq('id', String(joueur_id))

      if (error) {
        console.error('Erreur delete_joueur:', error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Erreur lors de la suppression: ${error.message}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Joueur supprimé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Action non reconnue' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    console.error('Erreur générale dans joueurs-management:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message, 
        details: error 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})