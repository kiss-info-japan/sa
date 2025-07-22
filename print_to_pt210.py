import sys
import serial

PRINTER_PORT = 'COM4'  # 実際のプリンタポート名に変更してください
BAUD_RATE = 9600       # プリンタのボーレート

# 引数の文字列を取得（複数行の場合は連結）
text = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "（テキストがありません）"

try:
    with serial.Serial(PRINTER_PORT, BAUD_RATE, timeout=1) as printer:
        # 日本語Shift_JISエンコードに変更（必要に応じて変更）
        encoded_text = text.encode('shift_jis', errors='replace')

        printer.write(encoded_text)
        printer.write(b'\r\n\r\n\r\n')          # 改行を追加
        printer.write(b'\x1b\x64\x05')           # 紙送りコマンド(ESC d 5行送り)

    print("✅ 印刷完了")
except Exception as e:
    print(f"❌ 印刷エラー: {e}")
    sys.exit(1)
