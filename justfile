dev:
  #!/usr/bin/env nu
  lsof -ti :4000 | lines | each { |pid| kill ($pid | into int) }
  cd ~/Projects/vluv
  just

dev:
  #!/usr/bin/env nu
  lsof -ti :4000 | lines | each { |pid| kill ($pid | into int) }
  cd ~/Projects/vluv
  hexo gen

