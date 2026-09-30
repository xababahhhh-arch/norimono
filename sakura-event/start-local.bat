@echo off
rem さくらプラザ イベント広報生成：この端末だけで動かす（Windows）
rem このフォルダを http://localhost:8000/ で配信し、ブラウザで開きます。ほかの端末からは接続できません（127.0.0.1 のみ）。
rem 終了するときは、この黒い画面を閉じてください。
chcp 65001 >nul
cd /d "%~dp0"
set PORT=8000
where py >nul 2>nul && (set PY=py) || (where python >nul 2>nul && (set PY=python) || (echo Python が見つかりません。README.md の「端末で動かす」を参照してください。& pause & exit /b 1))
echo http://localhost:%PORT%/ で起動します（終了：この画面を閉じる）
start "" "http://localhost:%PORT%/"
%PY% -m http.server %PORT% --bind 127.0.0.1
