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

    const { action, poule, equipe, poule_id, equipe_id } = await req.json()

    if (action === 'get_data') {
      // Récupérer toutes les poules avec leurs équipes
      const { data: poules, error: poulesError } = await supabaseClient
        .from('poules')
        .select(`
          *,
          equipes_poules (*)
        `)
        .order('created_at', { ascending: true })

      if (poulesError) throw poulesError

      // Formater les données pour le frontend
      const formattedPoules = poules.map(p => ({
        id: p.id,
        nom: p.nom,
        division: p.division,
        equipes: p.equipes_poules.map((e: any) => ({
          id: e.id,
          club: e.club_nom,
          numero: e.numero,
          nom_complet: e.nom_complet
        }))
      }))

      return new Response(
        JSON.stringify({ success: true, poules: formattedPoules }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'add_poule') {
      const { error } = await supabaseClient
        .from('poules')
        .insert({
          nom: poule.nom,
          division: poule.division
        })

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: 'Poule créée' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'delete_poule') {
      const { error } = await supabaseClient
        .from('poules')
        .delete()
        .eq('id', poule_id)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: 'Poule supprimée' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'add_equipe') {
      const { error } = await supabaseClient
        .from('equipes_poules')
        .insert({
          poule_id: poule_id,
          club_nom: equipe.club,
          numero: equipe.numero,
          nom_complet: equipe.nom_complet
        })

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: 'Équipe ajoutée' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'delete_equipe') {
      const { error } = await supabaseClient
        .from('equipes_poules')
        .delete()
        .eq('id', equipe_id)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: 'Équipe supprimée' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Action non reconnue' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})