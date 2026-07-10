import { createClient } from "@supabase/supabase-js";

// Cliente con permisos totales (service_role). SOLO se usa en el servidor
// (server actions / route handlers), nunca debe llegar al navegador.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
