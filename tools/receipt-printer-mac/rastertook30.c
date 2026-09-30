/*
 * OKPOS OK30 (Sewoo LK-T 계열) 맥 개발용 CUPS 필터 — CUPS 래스터 → ESC/POS 비트 이미지.
 * 페이지마다 용지를 자른다(윈도우 드라이버의 '페이지마다 자르기'와 같은 동작).
 * 헤드 폭 512점(180dpi·72mm) 보다 넓은 페이지는 가운데 512점만 찍는다.
 */
#include <cups/cups.h>
#include <cups/raster.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define HEAD_DOTS 512
#define BAND_ROWS 128

static void out(const void *p, size_t n) { fwrite(p, 1, n, stdout); }

int main(int argc, char *argv[]) {
  if (argc < 6 || argc > 7) {
    fputs("Usage: rastertook30 job user title copies options [file]\n", stderr);
    return 1;
  }
  int fd = 0;
  if (argc == 7 && (fd = open(argv[6], O_RDONLY)) < 0) {
    perror("ERROR: open");
    return 1;
  }
  cups_raster_t *ras = cupsRasterOpen(fd, CUPS_RASTER_READ);
  cups_page_header2_t h;
  int pages = 0;
  const unsigned char init[] = {0x1b, 0x40};
  out(init, sizeof init);

  while (cupsRasterReadHeader2(ras, &h)) {
    pages++;
    fprintf(stderr, "PAGE: %d 1\n", pages);
    fprintf(stderr, "DEBUG: page %d %ux%u bpp=%u cs=%u\n", pages, h.cupsWidth, h.cupsHeight, h.cupsBitsPerPixel, h.cupsColorSpace);
    unsigned w = h.cupsWidth < HEAD_DOTS ? h.cupsWidth : HEAD_DOTS;
    unsigned left = (h.cupsWidth - w) / 2;
    unsigned wb = (w + 7) / 8;
    unsigned char *line = malloc(h.cupsBytesPerLine);
    unsigned char *band = calloc(BAND_ROWS, wb);
    unsigned rows = 0, blank = 0;

    for (unsigned y = 0; y < h.cupsHeight; y++) {
      if (cupsRasterReadPixels(ras, line, h.cupsBytesPerLine) == 0) break;
      unsigned char *dst = band + rows * wb;
      memset(dst, 0, wb);
      int ink = 0;
      for (unsigned x = 0; x < w; x++) {
        unsigned sx = x + left, black;
        if (h.cupsBitsPerPixel == 1) {
          black = (line[sx >> 3] >> (7 - (sx & 7))) & 1;
          if (h.cupsColorSpace != CUPS_CSPACE_K) black = !black;
        } else {
          unsigned v = line[sx * (h.cupsBitsPerPixel / 8)];
          black = h.cupsColorSpace == CUPS_CSPACE_K ? v > 127 : v < 128;
        }
        if (black) { dst[x >> 3] |= 0x80 >> (x & 7); ink = 1; }
      }
      /* 빈 줄은 이미지 대신 용지 올림으로 보낸다 — 전송량이 줄고 결과는 같다 */
      if (!ink && rows == 0) { blank++; continue; }
      if (blank) {
        while (blank) { unsigned n = blank > 255 ? 255 : blank; unsigned char f[] = {0x1b, 0x4a, (unsigned char)n}; out(f, 3); blank -= n; }
      }
      rows++;
      if (rows == BAND_ROWS || y + 1 == h.cupsHeight) {
        unsigned char g[] = {0x1d, 0x76, 0x30, 0x00, wb & 255, wb >> 8, rows & 255, rows >> 8};
        out(g, sizeof g);
        out(band, (size_t)rows * wb);
        rows = 0;
      }
    }
    if (rows) {
      unsigned char g[] = {0x1d, 0x76, 0x30, 0x00, wb & 255, wb >> 8, rows & 255, rows >> 8};
      out(g, sizeof g);
      out(band, (size_t)rows * wb);
    }
    while (blank) { unsigned n = blank > 255 ? 255 : blank; unsigned char f[] = {0x1b, 0x4a, (unsigned char)n}; out(f, 3); blank -= n; }
    const unsigned char cut[] = {0x1d, 0x56, 0x42, 0x00}; /* 조금 올린 뒤 자르기 */
    out(cut, sizeof cut);
    fflush(stdout);
    free(line);
    free(band);
  }
  cupsRasterClose(ras);
  if (fd) close(fd);
  if (!pages) { fputs("ERROR: 페이지가 없습니다\n", stderr); return 1; }
  return 0;
}
