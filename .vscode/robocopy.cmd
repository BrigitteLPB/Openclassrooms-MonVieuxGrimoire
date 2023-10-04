robocopy .\\assets .\\build\\assets **.* /e /j /purge
if $? LEQ 9 exit /b 0