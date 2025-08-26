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

    const { action, weekend, rencontre, weekend_id, rencontre_id } = await req.json()

    // Fonction pour formater les dates au nouveau format
    const formatDateForDisplay = (startDate: Date, endDate: Date) => {
      const startDay = startDate.getDate();
      const endDay = endDate.getDate();
      const month = startDate.toLocaleDateString('fr-FR', { month: 'long' });
      const year = startDate.getFullYear();

      return `${startDay}-${endDay} ${month} ${year}`;
    };

    if (action === 'get_data') {
      // Récupérer tous les weekends avec leurs rencontres
      const { data: weekends, error: weekendsError } = await supabaseClient
        .from('weekends')
        .select(`
          *,
          rencontres (*)
        `)
        .order('debut', { ascending: true })

      if (weekendsError) throw weekendsError

      // Formater les données pour le frontend avec le nouveau format de date
      const formattedWeekends = weekends.map(w => {
        const debutDate = new Date(w.debut);
        const finDate = new Date(w.fin);
        
        return {
          id: w.id,
          dates: formatDateForDisplay(debutDate, finDate), // Nouveau format appliqué
          debut: debutDate,
          fin: finDate,
          equipes: w.equipes || [1]
        };
      });

      const formattedRencontres = weekends.flatMap(w => 
        w.rencontres.map((r: any) => ({
          id: r.id,
          weekend_id: r.weekend_id,
          equipe: r.equipe,
          adversaire: r.adversaire,
          jour: r.jour,
          heure: r.heure,
          lieu: r.lieu,
          joueurs: r.joueurs || [null, null, null, null]
        }))
      )

      return new Response(
        JSON.stringify({ 
          success: true, 
          weekends: formattedWeekends, 
          rencontres: formattedRencontres 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'add_weekend') {
      const debutDate = new Date(weekend.debut);
      const finDate = new Date(weekend.fin);
      const dates = formatDateForDisplay(debutDate, finDate);

      const { error } = await supabaseClient
        .from('weekends')
        .insert({
          dates: dates,
          debut: weekend.debut,
          fin: weekend.fin,
          equipes: weekend.equipes || [1]
        })

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: 'Weekend ajouté' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'update_weekend') {
      const { id, ...weekendData } = weekend
      const debutDate = new Date(weekendData.debut);
      const finDate = new Date(weekendData.fin);
      const dates = formatDateForDisplay(debutDate, finDate);

      const { error } = await supabaseClient
        .from('weekends')
        .update({
          ...weekendData,
          dates: dates
        })
        .eq('id', id)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: 'Weekend modifié' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'delete_weekend') {
      const { error } = await supabaseClient
        .from('weekends')
        .delete()
        .eq('id', weekend_id)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: 'Weekend supprimé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'add_rencontre') {
      const { error } = await supabaseClient
        .from('rencontres')
        .insert({
          weekend_id: rencontre.weekend_id,
          equipe: rencontre.equipe,
          adversaire: rencontre.adversaire,
          jour: rencontre.jour,
          heure: rencontre.heure,
          lieu: rencontre.lieu,
          joueurs: rencontre.joueurs || [null, null, null, null]
        })

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: 'Rencontre ajoutée' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'update_rencontre') {
      const { id, ...rencontreData } = rencontre
      const { error } = await supabaseClient
        .from('rencontres')
        .update(rencontreData)
        .eq('id', id)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: 'Rencontre modifiée' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'delete_rencontre') {
      const { error } = await supabaseClient
        .from('rencontres')
        .delete()
        .eq('id', rencontre_id)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: 'Rencontre supprimée' }),
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