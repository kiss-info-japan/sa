import tkinter as tk
from tkinter import messagebox
import serial

# --- ここを環境に合わせて設定 ---
PRINTER_PORT = 'COM4'    # 実際のCOMポートに書き換える
BAUD_RATE = 9600         # PT-201の通信速度（通常9600）
# -------------------------------

def print_text():
    text = text_box.get("1.0", tk.END).strip()
    if not text:
        messagebox.showwarning("警告", "印刷するテキストを入力してください。")
        return

    try:
        with serial.Serial(PRINTER_PORT, BAUD_RATE, timeout=1) as printer:
            # 文字コードは中国製プリンターでよく使われるgb2312を指定
            # 改行コードはCR LF(\r\n)を多めに付けて紙送りも実施
            data = text.encode('gb2312') + b'\r\n\r\n\r\n'
            printer.write(data)
            # 紙送りコマンド ESC d 5 （5行送り）
            printer.write(b'\x1b\x64\x05')
        messagebox.showinfo("完了", "印刷指示を送信しました。")
    except serial.SerialException as e:
        messagebox.showerror("エラー", f"プリンターとの通信に失敗しました。\n{e}")
    except Exception as e:
        messagebox.showerror("エラー", f"予期せぬエラーが発生しました。\n{e}")

# GUI構築
root = tk.Tk()
root.title("Goojprt PT-201 印刷システム")

label = tk.Label(root, text="印刷したい文章を入力してください:")
label.pack(padx=10, pady=5)

text_box = tk.Text(root, height=10, width=50)
text_box.pack(padx=10, pady=5)

print_button = tk.Button(root, text="印刷する", command=print_text, bg='lightblue', font=('Arial', 14))
print_button.pack(padx=10, pady=10)

root.mainloop()
