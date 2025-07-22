from PIL import Image, ImageDraw, ImageFont

def wrap_text(text, font, max_width):
    lines = []
    dummy_img = Image.new('L', (10, 10))
    draw = ImageDraw.Draw(dummy_img)

    for original_line in text.split('\n'):
        line = ""
        for char in original_line:
            bbox = draw.textbbox((0, 0), line + char, font=font)
            width = bbox[2] - bbox[0]
            if width <= max_width:
                line += char
            else:
                lines.append(line)
                line = char
        if line:
            lines.append(line)
    return lines


def create_image_from_text(text, output_path="output.png"):
    font_path = "C:\\Windows\\Fonts\\meiryo.ttc"
    font_size = 22
    padding = 10  # 左右余白

    try:
        font = ImageFont.truetype(font_path, font_size)
    except Exception as e:
        print(f"フォント読み込みエラー: {e}")
        return

    max_width = 384

    # 文字列を折り返し処理
    lines = wrap_text(text, font, max_width - padding * 2)

    # 高さ計算（行数×行の高さ＋上下余白）
    height = font_size * len(lines) + padding * 2

    image = Image.new('L', (max_width, height), color=255)
    draw = ImageDraw.Draw(image)

    y = padding
    for line in lines:
        draw.text((padding, y), line, font=font, fill=0)
        y += font_size

    image.save(output_path)
    print(f"画像を保存しました: {output_path}")

if __name__ == "__main__":
    print("スクリプト起動")
    with open("print_input.txt", "r", encoding="utf-8") as f:
        input_text = f.read()
    create_image_from_text(input_text)
