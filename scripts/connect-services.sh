#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

GITHUB_REPO="https://github.com/IronCanuck/cody-codes.git"
SUPABASE_PROJECT_REF="nxaidsisoauzhpdkaixm"
SUPABASE_URL="https://${SUPABASE_PROJECT_REF}.supabase.co"
VERCEL_PRODUCTION_URL="https://www.codycodes.ca"

echo "==> Cody Codes — connect GitHub, Vercel, and Supabase"
echo

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

need git
need npm
need npx

echo "1) GitHub"
CURRENT_REMOTE="$(git remote get-url origin 2>/dev/null || true)"
if [[ "$CURRENT_REMOTE" == "$GITHUB_REPO" ]]; then
  echo "   origin already points at $GITHUB_REPO"
else
  echo "   Setting origin to $GITHUB_REPO"
  git remote remove origin 2>/dev/null || true
  git remote add origin "$GITHUB_REPO"
fi

if git rev-parse --abbrev-ref HEAD >/dev/null 2>&1; then
  echo "   Push with: git push -u origin main"
fi
echo

echo "2) Supabase"
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "   Created .env from .env.example — add VITE_SUPABASE_ANON_KEY before running the app."
fi

echo "   Logging in (browser) if needed..."
npx supabase login

echo "   Linking local project to $SUPABASE_PROJECT_REF..."
npx supabase link --project-ref "$SUPABASE_PROJECT_REF"

echo "   Applying migrations..."
npx supabase db push

echo "   Confirm auth redirect URLs in Supabase Dashboard → Authentication → URL Configuration:"
echo "     Site URL: $VERCEL_PRODUCTION_URL"
echo "     Redirect URLs: http://localhost:5173/**, $VERCEL_PRODUCTION_URL/**, https://codycodes.ca/**"
echo

echo "3) Vercel"
echo "   Logging in (browser) if needed..."
npx vercel login

echo "   Linking this folder to the Vercel project..."
npx vercel link

echo "   Pull production env vars into .env.local (optional, for local preview):"
echo "     npx vercel env pull .env.local"
echo
echo "   Ensure these env vars exist in Vercel → Settings → Environment Variables:"
echo "     VITE_SUPABASE_URL=$SUPABASE_URL"
echo "     VITE_SUPABASE_ANON_KEY=<anon key from Supabase → Project Settings → API>"
echo

echo "4) Vercel ↔ GitHub (one-time in dashboard)"
echo "   https://vercel.com/new → Import $GITHUB_REPO"
echo "   Framework preset: Vite"
echo "   Build command: npm run build"
echo "   Output directory: dist"
echo "   Root directory: ./"
echo "   Add the same VITE_* env vars, then deploy."
echo

echo "5) GitHub Actions secrets (repo → Settings → Secrets and variables → Actions)"
echo "   VITE_SUPABASE_ANON_KEY       — for CI builds"
echo "   SUPABASE_ACCESS_TOKEN      — for migration workflow (Supabase → Account → Access Tokens)"
echo "   SUPABASE_DB_PASSWORD       — database password for supabase db push in CI"
echo

echo "Done. Run ./scripts/connect-services.sh again anytime to re-link after cloning."
