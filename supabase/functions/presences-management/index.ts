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

    const { action, joueur_id, weekend_id, statut } = await req.json()

    if (action === 'get_data') {
      // Récupérer tous les weekends AVEC leurs rencontres pour obtenir les équipes réelles
      const { data: weekends, error: weekendsError } = await supabaseClient
        .from('weekends')
        .select(`
          *,
          rencontres (equipe)
        `)
        .order('debut', { ascending: true })

      if (weekendsError) {
        console.error('Erreur weekends:', weekendsError)
        return new Response(
          JSON.stringify({ 
            success: false,
            error: `Erreur weekends: ${weekendsError.message}`,
            weekends: [],
            joueurs: [],
            presences: []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Récupérer tous les joueurs AVEC leurs équipes réelles de la base de données
      const { data: joueurs, error: joueursError } = await supabaseClient
        .from('joueurs')
        .select('*')
        .order('classement', { ascending: false })

      if (joueursError) {
        console.error('Erreur joueurs:', joueursError)
        return new Response(
          JSON.stringify({ 
            success: false,
            error: `Erreur joueurs: ${joueursError.message}`,
            weekends: [],
            joueurs: [],
            presences: []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Récupérer toutes les présences
      const { data: presences, error: presencesError } = await supabaseClient
        .from('presences')
        .select('*')

      if (presencesError) {
        console.error('Erreur présences:', presencesError)
        return new Response(
          JSON.stringify({ 
            success: false,
            error: `Erreur présences: ${presencesError.message}`,
            weekends: [],
            joueurs: [],
            presences: []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Formater les données pour le frontend avec les équipes dynamiques
      const formattedWeekends = (weekends || []).map(w => {
        // Extraire les équipes uniques des rencontres de ce weekend
        const equipesFromRencontres = w.rencontres ? 
          [...new Set(w.rencontres.map((r: any) => r.equipe))].sort((a, b) => a - b) : 
          [] // Aucune équipe si aucune rencontre

        return {
          id: w.id,
          dates: w.dates,
          debut: w.debut,
          fin: w.fin,
          equipes: equipesFromRencontres // Équipes dynamiques basées sur les rencontres
        }
      }).filter(w => w.equipes.length > 0) // FILTRER: Ne garder que les weekends avec au moins une équipe

      // Formater les joueurs avec leurs VRAIES équipes depuis la base de données
      const formattedJoueurs = (joueurs || []).map(j => ({
        id: j.id,
        nom: j.nom,
        prenom: j.prenom,
        classement: j.classement || '0',
        equipes: j.equipes || [1, 2], // Utiliser les équipes réelles stockées en base
        role: j.role
      }))

      console.log('Weekends avec équipes dynamiques (filtrés):', formattedWeekends.map(w => ({ dates: w.dates, equipes: w.equipes })))
      console.log('Joueurs récupérés avec équipes:', formattedJoueurs.map(j => ({ nom: j.nom, prenom: j.prenom, equipes: j.equipes })))

      const formattedPresences = (presences || []).map(p => ({
        joueur_id: p.joueur_id,
        weekend_id: p.weekend_id,
        statut: p.statut
      }))

      return new Response(
        JSON.stringify({ 
          success: true,
          weekends: formattedWeekends,
          joueurs: formattedJoueurs,
          presences: formattedPresences
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'update_presence') {
      // Vérifier si une présence existe déjà
      const { data: existingPresence } = await supabaseClient
        .from('presences')
        .select('*')
        .eq('joueur_id', joueur_id)
        .eq('weekend_id', weekend_id)
        .single()

      if (existingPresence) {
        // Mettre à jour la présence existante
        const { error: updateError } = await supabaseClient
          .from('presences')
          .update({ 
            statut: statut,
            updated_at: new Date().toISOString()
          })
          .eq('joueur_id', joueur_id)
          .eq('weekend_id', weekend_id)

        if (updateError) {
          console.error('Erreur update:', updateError)
          return new Response(
            JSON.stringify({ 
              success: false,
              error: updateError.message 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        // Créer une nouvelle présence
        const { error: insertError } = await supabaseClient
          .from('presences')
          .insert({
            joueur_id: joueur_id,
            weekend_id: weekend_id,
            statut: statut
          })

        if (insertError) {
          console.error('Erreur insert:', insertError)
          return new Response(
            JSON.stringify({ 
              success: false,
              error: insertError.message 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Présence mise à jour'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'init_data') {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Données initialisées'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Action non reconnue', success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    console.error('Erreur dans presences-management:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        weekends: [],
        joueurs: [],
        presences: []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})