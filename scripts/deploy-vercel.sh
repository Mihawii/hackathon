#!/bin/zsh
# Build the book and update its Vercel deployment.
# Uses the claimable deployment recorded in .vercel/ when there is no Vercel login.
set -e
cd -- "${0:A:h}/.."
npm run build
mkdir -p keepsake/dist/.vercel
[ -f .vercel/anonymous.json ] && cp .vercel/anonymous.json keepsake/dist/.vercel/
cd keepsake/dist
if npx -y vercel@latest whoami >/dev/null 2>&1; then
  npx -y vercel@latest deploy --prod --yes
else
  npx -y vercel@latest deploy --temporary --yes
fi
