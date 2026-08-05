dev:
  #!/usr/bin/env nu
  lsof -ti :4000 | lines | each { |pid| kill ($pid | into int) }
  cd ~/Projects/vluv
  just

gen:
  #!/usr/bin/env nu
  lsof -ti :4000 | lines | each { |pid| kill ($pid | into int) }
  cd ~/Projects/vluv
  hexo gen

update-mermaid-js:
  #!/usr/bin/env bash
  set -euo pipefail

  version="$(npm view mermaid@latest version)"
  target="{{justfile_directory()}}/source/js/host/mermaid/mermaid.min.js"
  url="https://cdn.jsdelivr.net/npm/mermaid@${version}/dist/mermaid.min.js"

  mkdir -p "$(dirname "$target")"
  curl -fsSL "$url" -o "$target"

  echo "[DONE] Updated mermaid to ${version}: $target"
