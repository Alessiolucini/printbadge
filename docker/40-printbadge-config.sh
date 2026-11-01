#!/bin/sh
# Scrive config.js all'avvio del container con le variabili d'ambiente del servizio:
# SUPABASE_URL, SUPABASE_ANON_KEY (chiave pubblica "anon", mai la service_role), TERMS_URL, PRIVACY_URL.
set -e
esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }
cat > /usr/share/nginx/html/config.js <<JS
window.PRINTBADGE_CONFIG = {
  supabaseUrl: "$(esc "${SUPABASE_URL:-}")",
  supabaseAnonKey: "$(esc "${SUPABASE_ANON_KEY:-}")",
  termsUrl: "$(esc "${TERMS_URL:-}")",
  privacyUrl: "$(esc "${PRIVACY_URL:-}")"
};
JS
if [ -n "${SUPABASE_URL:-}" ]; then echo "printbadge: negozio collegato a ${SUPABASE_URL}"; else echo "printbadge: SUPABASE_URL non impostata, negozio disattivato"; fi
