#!/bin/bash
# さくらプラザ イベント広報生成：この端末だけで動かす（macOS・Linux）
# このフォルダを http://localhost:8000/ で配信し、ブラウザで開きます。ほかの端末からは接続できません（127.0.0.1 のみ）。
# 終了するときは、この画面で Ctrl + C を押すか、画面を閉じてください。
cd "$(dirname "$0")" || exit 1
PORT=8000
if command -v python3 >/dev/null 2>&1; then PY=python3; elif command -v python >/dev/null 2>&1; then PY=python; else
  echo "Python が見つかりません。README.md の「端末で動かす」を参照してください。"; read -r -p "Enter キーで閉じます"; exit 1
fi
echo "http://localhost:${PORT}/ で起動します（終了：Ctrl + C）"
( sleep 1; (command -v open >/dev/null && open "http://localhost:${PORT}/") || (command -v xdg-open >/dev/null && xdg-open "http://localhost:${PORT}/") ) &
exec "$PY" -m http.server "$PORT" --bind 127.0.0.1
