#!/bin/bash
# KMapp deploy skripta
# Upotreba: ./deploy.sh "kratak opis izmene"
# automatski: bumpa verziju, commituje, pushuje

set -e

cd "$(dirname "$0")"

# Provera da li ima izmena
if git diff --quiet && git diff --cached --quiet; then
  echo "❌ Nema izmena za deploy."
  echo "   Izmeni neki fajl pa ponovo pokreni."
  exit 1
fi

# Nađi trenutnu verziju u index.html
CURRENT=$(grep -o "KM_VERSION = 'v[0-9]*'" index.html | grep -o "[0-9]*" | head -1)
NEXT=$((CURRENT + 1))

# Bump verziju u index.html
sed -i "s/KM_VERSION = 'v$CURRENT'/KM_VERSION = 'v$NEXT'/g" index.html
sed -i "s/vText.textContent = 'v$Current'/vText.textContent = 'v$NEXT'/g" index.html
# Bump u svim ?v= parametrima
sed -i "s/?v=$CURRENT/?v=$NEXT/g" index.html

# Bump verziju u sw3.js (cache name)
sed -i "s/kmapp-v$CURRENT/kmapp-v$NEXT/g" sw3.js

# Bump verziju u sw3.js registration
sed -i "s/sw3.js?v=$CURRENT/sw3.js?v=$NEXT/g" index.html

MSG="${1:-v$NEXT: update}"
git add -A
git commit -m "v$NEXT: $MSG"
git push

echo ""
echo "✅ Deployed v$NEXT"
echo "   https://miloshawramow-bot.github.io/kmapp-pwa/?force=$NEXT"
echo "   Sačekaj 1-2 min za GitHub Pages."
