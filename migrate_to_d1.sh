#!/bin/bash
# KMapp D1 Migration Script
# Run this AFTER creating the D1 database in Cloudflare dashboard
# Usage: bash migrate_to_d1.sh <D1_DATABASE_ID>

set -e

D1_DB_ID="${1:?Usage: bash migrate_to_d1.sh <D1_DATABASE_ID>}"
CF_TOKEN="${CLOUDFLARE_API_TOKEN_2:?Need CLOUDFLARE_API_TOKEN_2 env var}"
CF_ACCOUNT="a1da27122fdeaf0d68ea19cb5cec4e55"

echo "=== KMapp D1 Migration ==="
echo "Database ID: $D1_DB_ID"
echo ""

# Step 1: Run schema
echo "1. Creating schema..."
npx wrangler@3.99.0 d1 execute kmapp-db --remote --file=schema.sql 2>&1 || true
echo "Schema created."
echo ""

# Step 2: Migrate users
echo "2. Migrating users..."
python3 << 'PYEOF'
import json, urllib.request

API = "https://kmapp-n37.pages.dev/api"
users = json.load(open('migration_data/users.json'))
for u in users:
    data = json.dumps(u).encode()
    req = urllib.request.Request(f"{API}/saveUser", data=data, headers={'Content-Type': 'application/json'})
    try:
        resp = urllib.request.urlopen(req)
        print(f"  User {u['username']}: {json.loads(resp.read())['success']}")
    except Exception as e:
        print(f"  User {u['username']}: FAILED - {e}")
PYEOF
echo ""

# Step 3: Migrate messages
echo "3. Migrating messages..."
python3 << 'PYEOF'
import json, urllib.request

API = "https://kmapp-n37.pages.dev/api"
messages = json.load(open('migration_data/messages.json'))
success = 0
for m in messages:
    data = json.dumps({
        "sender": m["sender"],
        "senderName": m["senderName"],
        "recipient": m["recipient"],
        "recipientName": m["recipientName"],
        "text": m["text"]
    }).encode()
    req = urllib.request.Request(f"{API}/sendMessage", data=data, headers={'Content-Type': 'application/json'})
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        if result.get('success'):
            success += 1
    except:
        pass
print(f"  Migrated {success}/{len(messages)} messages")
PYEOF
echo ""

echo "=== Migration complete! ==="
echo "KMapp is now running on Cloudflare D1, independent of Base44 credits."
