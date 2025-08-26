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

    const { action, club } = await req.json()

    if (action === 'get_clubs') {
      const { data: clubs, error } = await supabaseClient
        .from('clubs')
        .select('*')
        .order('nom', { ascending: true })

      if (error) throw error

      // Si aucun club, initialiser avec des données par défaut
      if (!clubs || clubs.length === 0) {
        const defaultClubs = [
          { nom: 'Pau TT 1', contact_nom: 'Michel Dubois', telephone: '0559123456', email: 'contact@pau-tt.fr', adresse: '15 Avenue des Sports, 64000 Pau' },
          { nom: 'Toulouse Ping', contact_nom: 'Sophie Legrand', telephone: '0561987654', email: 'info@toulouse-ping.fr', adresse: '22 Rue du Stade, 31000 Toulouse' },
          { nom: 'Bordeaux TTC', contact_nom: 'Jean-Claude Martin', telephone: '0556741852', email: 'bordeaux.ttc@gmail.com', adresse: '8 Boulevard du Sport, 33000 Bordeaux' }
        ]

        const { data: newClubs, error: insertError } = await supabaseClient
          .from('clubs')
          .insert(defaultClubs)
          .select()

        if (insertError) throw insertError
        
        return new Response(
          JSON.stringify({ success: true, clubs: newClubs }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, clubs }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'add_club') {
      const { error } = await supabaseClient
        .from('clubs')
        .insert(club)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: 'Club ajouté' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'update_club') {
      const { id, ...clubData } = club
      const { error } = await supabaseClient
        .from('clubs')
        .update(clubData)
        .eq('id', id)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: 'Club modifié' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'delete_club') {
      const { error } = await supabaseClient
        .from('clubs')
        .delete()
        .eq('id', club.id)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: 'Club supprimé' }),
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