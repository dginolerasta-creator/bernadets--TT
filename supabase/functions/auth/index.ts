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

    const { action, email, userData } = await req.json()

    if (action === 'login') {
      // Connexion spéciale pour l'admin avec le login "compositeur"
      if (email === 'compositeur') {
        // Vérifier si l'admin existe dans la table joueurs
        const adminUserId = '00000000-0000-0000-0000-000000000001'
        const { data: existingAdmin } = await supabaseClient
          .from('joueurs')
          .select('*')
          .eq('id', adminUserId)
          .single()

        if (!existingAdmin) {
          // Créer l'admin dans la table joueurs
          await supabaseClient
            .from('joueurs')
            .insert({
              id: adminUserId,
              email: 'compositeur',
              prenom: 'Admin',
              nom: 'Système',
              classement: '',
              categorie_age: 'Senior',
              telephone: '',
              date_naissance: null,
              role: 'admin'
            })
        } else {
          // S'assurer que le rôle est admin
          await supabaseClient
            .from('joueurs')
            .update({ role: 'admin' })
            .eq('id', adminUserId)
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Connexion admin réussie',
            user_type: 'admin'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Vérifier si le joueur existe SANS le créer automatiquement
      const { data: joueur, error: joueurError } = await supabaseClient
        .from('joueurs')
        .select('*')
        .eq('email', email)
        .single()

      // Si le joueur n'existe pas, retourner une erreur
      if (!joueur || joueurError) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Email non reconnu. Veuillez utiliser un email valide ou vous connecter en tant que visiteur.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      // Si l'email est "compositeur", s'assurer que le rôle est admin
      if (email === 'compositeur' && joueur.role !== 'admin') {
        await supabaseClient
          .from('joueurs')
          .update({ role: 'admin' })
          .eq('id', joueur.id)
        
        // Mettre à jour l'objet joueur pour le retour
        joueur.role = 'admin'
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Connexion réussie',
          user_type: joueur.role === 'admin' ? 'admin' : 'joueur',
          joueur: joueur // Renvoyer toutes les données du joueur y compris le rôle
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'get_profile') {
      const authHeader = req.headers.get('Authorization')!
      const token = authHeader.replace('Bearer ', '')
      
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
      if (userError) throw userError

      const { data: profile, error: profileError } = await supabaseClient
        .from('joueurs')
        .select(`
          *,
          joueur_equipes(equipe_id)
        `)
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      return new Response(
        JSON.stringify({ profile }),
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