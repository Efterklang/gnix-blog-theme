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

