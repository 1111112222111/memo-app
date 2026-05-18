@echo off
REM Wrapper for 7za.exe — suppresses symlink errors on Windows
"C:\Users\GAOMON\Desktop\备忘录项目\node_modules\7zip-bin\win\x64\7za.exe" %*
exit /b 0
