#!/bin/zsh
cd -- "${0:A:h}" || exit 1
export PATH="$HOME/.local/node-v22.23.4-darwin-arm64/bin:$PATH"
exec node --run dev -- --open
