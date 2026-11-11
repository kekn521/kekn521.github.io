#!/usr/bin/env python3
"""Deterministic photo-to-ASCII text converter.

Converts a JPEG portrait to a fixed-size ASCII art text file (text output
only -- no raster images are produced).

Source-specific note: the default crop bounds CROP = (145, 50, 650, 680)
are tuned for /tmp/ken-portrait-source.jpg, an 800x800 portrait with a
white background. The crop is fixed and documented as source-specific;
the portrait photo itself is NOT copied into public assets -- only the
generated ASCII text file is.

Output: every line is exactly `columns` characters wide (trailing spaces
included), LF newlines, terminating newline at the end. ASCII-only.
"""

import argparse

from PIL import Image, ImageOps

# Fixed, source-specific crop for /tmp/ken-portrait-source.jpg (800x800).
CROP = (145, 50, 650, 680)

# Darkness ramp: index 0 = ' ' (white), last = '@' (black).
RAMP = " .:-=+*#%@"

# Pixels at or above this brightness are forced to space (white background).
WHITE_CUTOFF = 247


def convert(source: str, output: str, columns: int) -> None:
    with Image.open(source) as img:
        img = ImageOps.exif_transpose(img)
        img = img.crop(CROP)
        img = img.convert("L")
        img = ImageOps.autocontrast(img, cutoff=1)
        rows = round(columns * 630 / 505 * 0.6)
        img = img.resize((columns, rows), Image.LANCZOS)

    pixels = img.load()
    lines = []
    for y in range(rows):
        line = []
        for x in range(columns):
            v = pixels[x, y]
            if v >= WHITE_CUTOFF:
                line.append(" ")
            else:
                idx = (255 - v) * len(RAMP) // 256
                line.append(RAMP[min(idx, len(RAMP) - 1)])
        assert len(line) == columns
        lines.append("".join(line))

    text = "\n".join(lines) + "\n"
    assert text.isascii()
    with open(output, "w", encoding="ascii", newline="\n") as f:
        f.write(text)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert a portrait JPEG to a deterministic ASCII text file."
    )
    parser.add_argument("source", help="Path to the source JPEG image.")
    parser.add_argument("output", help="Path to the output ASCII text file.")
    parser.add_argument(
        "--columns",
        type=int,
        default=72,
        help="Number of character columns (default: 72).",
    )
    args = parser.parse_args()
    convert(args.source, args.output, args.columns)


if __name__ == "__main__":
    main()
