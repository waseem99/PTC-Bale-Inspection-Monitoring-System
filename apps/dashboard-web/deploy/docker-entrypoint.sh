#!/bin/sh
set -eu

AUTH_SNIPPET=/etc/nginx/snippets/demo-auth.conf
AUTH_FILE=/etc/nginx/.htpasswd
AUTH_USER=${DEMO_BASIC_AUTH_USER:-}
AUTH_PASSWORD=${DEMO_BASIC_AUTH_PASSWORD:-}

mkdir -p /etc/nginx/snippets

if [ -n "$AUTH_USER" ] || [ -n "$AUTH_PASSWORD" ]; then
  if [ -z "$AUTH_USER" ] || [ -z "$AUTH_PASSWORD" ]; then
    echo "Both DEMO_BASIC_AUTH_USER and DEMO_BASIC_AUTH_PASSWORD are required when demo access control is enabled." >&2
    exit 1
  fi

  htpasswd -bcB "$AUTH_FILE" "$AUTH_USER" "$AUTH_PASSWORD" >/dev/null
  cat > "$AUTH_SNIPPET" <<'EOF'
auth_basic "PTC Dashboard Demo";
auth_basic_user_file /etc/nginx/.htpasswd;
EOF
  echo "Hosting-layer Basic Authentication is enabled for the dashboard demo."
else
  : > "$AUTH_SNIPPET"
  echo "WARNING: dashboard hosting-layer authentication is disabled. Do not expose this container publicly." >&2
fi

exec nginx -g 'daemon off;'
