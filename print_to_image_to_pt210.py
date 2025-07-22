import serial
from PIL import Image
import sys

def print_image(image_path):
    ser = serial.Serial('COM4', baudrate=9600, timeout=1)
    image = Image.open(image_path).convert('1')  # 1bitモード

    width, height = image.size
    data = bytearray()

    for y in range(0, height, 24):
        data += b'\x1b*\x21'  # 24-dot single-density mode
        nL = width & 0xFF
        nH = (width >> 8) & 0xFF
        data += bytes([nL, nH])

        for x in range(width):
            slice_bytes = [0, 0, 0]  # 24bit = 3byte
            for b in range(24):
                y_pos = y + b
                if y_pos < height:
                    pixel = image.getpixel((x, y_pos))
                    if pixel == 0:  # 黒ならビットセット
                        slice_bytes[b // 8] |= 1 << (7 - (b % 8))
            data += bytes(slice_bytes)

        data += b'\n'

    data += b'\n\n\n'
    ser.write(data)
    ser.close()


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "output.png"
    print_image(path)
