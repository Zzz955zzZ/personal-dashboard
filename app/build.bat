@echo off
REM ============================================================
REM  Personal Dashboard - 一键构建并打开 dist
REM  双击本文件即可：在 app/ 目录执行 npm run build，
REM  构建完成后自动打开 dist 文件夹，方便拖到 Netlify Drop。
REM  （也可右键本文件 -> 发送到 -> 桌面快捷方式，常驻桌面）
REM ============================================================
cd /d "%~dp0"

echo [1/2] 正在构建 dist ...
call npm run build
if errorlevel 1 (
  echo.
  echo 构建失败，请检查上方报错。
  pause
  exit /b 1
)

echo.
echo [2/2] 构建完成，打开 dist 文件夹 ...
if exist "dist" (
  start "" "dist"
) else (
  echo 未找到 dist 文件夹，构建可能未成功。
)

echo.
echo 已就绪：把 dist 里的文件拖到 Netlify Drop 即可上线。
pause
