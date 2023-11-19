#!/bin/sh

scripts=$(dirname $0)

$scripts/commit.sh "$@"
if [[ $? -eq 0 ]]; then
  git push -u
fi
