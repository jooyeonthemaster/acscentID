"""화면 글꼴 55종 내려받기 → 한글 상용 2,350자 + 영문·기호로 줄인 woff2 로 만든다.

실행: python3 -m venv .fontenv && .fontenv/bin/pip install fonttools brotli certifi
      SSL_CERT_FILE=$(.fontenv/bin/python -m certifi) .fontenv/bin/python scripts/build-screen-fonts.py [id ...]
원본은 임시 폴더에 캐시하고, 결과 목록은 임시 폴더의 manifest.json 에 쓴다(→ src/lib/screen-fonts/catalog.ts 에 옮긴다).

출처는 모두 무료·상업 이용 가능한 공개 저장소만 쓴다:
  google  = github.com/google/fonts (전부 SIL OFL 1.1)
  kfonts  = npm @kfonts/* (원본 TTF + metadata.json 에 라이선스 명시)
  npm     = 제작사가 직접 올린 npm 패키지 (Pretendard·SUIT·Galmuri, OFL)
"""
import json, os, re, sys, urllib.request, io
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = f'{ROOT}/public/fonts/ui'
WORK = os.path.join(os.environ.get('TMPDIR', '/tmp'), 'acscent-screen-fonts')
CACHE = WORK + '/src'
os.makedirs(CACHE, exist_ok=True)

FONTS = [
    # id, 이름, 분류, 출처, 값
    ('pretendard', '프리텐다드', 'gothic', 'npm', ('pretendard@1.3.9', r'dist/public/static/Pretendard-(Regular|Bold)\.otf$')),
    ('suit', 'SUIT', 'gothic', 'npm', ('@sun-typeface/suit@2.0.5', r'fonts/static/(?:ttf|otf)/SUIT-(Regular|Bold)\.(?:ttf|otf)$')),
    ('noto-sans-kr', '본고딕 (Noto Sans KR)', 'gothic', 'google', 'notosanskr'),
    ('nanum-gothic', '나눔고딕', 'gothic', 'google', 'nanumgothic'),
    ('nanum-barun-gothic', '나눔바른고딕', 'gothic', 'kfonts', 'nanum-barun-gothic'),
    ('nanum-square', '나눔스퀘어', 'gothic', 'kfonts', 'nanum-square'),
    ('nanum-square-ac', '나눔스퀘어 ac', 'gothic', 'kfonts', 'nanum-square-ac'),
    ('gothic-a1', 'Gothic A1', 'gothic', 'google', 'gothica1'),
    ('ibm-plex-sans-kr', 'IBM Plex Sans KR', 'gothic', 'google', 'ibmplexsanskr'),
    ('line-seed', 'LINE Seed Sans KR', 'gothic', 'kfonts', 'line-seed-sans-kr'),
    ('nexon-lv1', '넥슨 Lv.1 고딕', 'gothic', 'kfonts', 'nexon-lv1-gothic'),
    ('nexon-lv2', '넥슨 Lv.2 고딕', 'gothic', 'kfonts', 'nexon-lv2-gothic'),
    ('hakgyo-bareon-dotum', '학교안심 바른돋움', 'gothic', 'kfonts', 'hakgyoansim-bareondotum'),
    ('hakgyo-santteut-dotum', '학교안심 산뜻돋움', 'gothic', 'kfonts', 'hakgyoansim-santteutdotum'),
    ('gowun-dodum', '고운돋움', 'gothic', 'google', 'gowundodum'),
    ('sunflower', '선플라워', 'gothic', 'google', 'sunflower'),

    ('nanum-square-round', '나눔스퀘어라운드', 'round', 'kfonts', 'nanum-square-round'),
    ('bm-jua', '배민 주아', 'round', 'kfonts', 'bm-jua'),
    ('bm-hanna-pro', '배민 한나체 Pro', 'round', 'kfonts', 'bm-hanna-pro'),
    ('bm-hanna-air', '배민 한나체 Air', 'round', 'kfonts', 'bm-hanna-air'),
    ('bm-hanna-11', '배민 한나는 열한살', 'round', 'kfonts', 'bm-hanna-11yrs'),
    ('dongle', '동글', 'round', 'google', 'dongle'),
    ('nexon-maplestory', '메이플스토리', 'round', 'kfonts', 'nexon-maplestory'),
    ('nexon-bazzi', '넥슨 배찌체', 'round', 'kfonts', 'nexon-bazzi'),
    ('hakgyo-monggeul', '학교안심 몽글몽글', 'round', 'kfonts', 'hakgyoansim-monggeulmonggeul'),
    ('hakgyo-gureum', '학교안심 구름', 'round', 'kfonts', 'hakgyoansim-gureum'),

    ('bm-dohyeon', '배민 도현', 'title', 'kfonts', 'bm-dohyeon'),
    ('bm-yeonsung', '배민 연성', 'title', 'kfonts', 'bm-yeonsung'),
    ('bm-euljiro', '배민 을지로', 'title', 'kfonts', 'bm-euljiro'),
    ('bm-euljiro-10', '배민 을지로 10년후', 'title', 'kfonts', 'bm-euljiro-10years-later'),
    ('black-han-sans', '검은고딕', 'title', 'google', 'blackhansans'),
    ('gugi', '구기', 'title', 'google', 'gugi'),
    ('orbit', '오빗', 'title', 'google', 'orbit'),
    ('bagel-fat-one', '베이글 팻 원', 'title', 'google', 'bagelfatone'),
    ('gasoek-one', '가속 원', 'title', 'google', 'gasoekone'),
    ('hakgyo-godeun', '학교안심 고든제목', 'title', 'kfonts', 'hakgyoansim-godeunjemok'),
    ('hakgyo-undongjang', '학교안심 운동장', 'title', 'kfonts', 'hakgyoansim-undongjang'),

    ('stylish', '스타일리시', 'cute', 'google', 'stylish'),
    ('poor-story', '푸어 스토리', 'cute', 'google', 'poorstory'),
    ('single-day', '싱글데이', 'cute', 'google', 'singleday'),
    ('cute-font', '큐트 폰트', 'cute', 'google', 'cutefont'),
    ('gaegu', '개구', 'cute', 'google', 'gaegu'),
    ('gamja-flower', '감자꽃', 'cute', 'google', 'gamjaflower'),
    ('hi-melody', '하이멜로디', 'cute', 'google', 'himelody'),
    ('bm-kirang', '배민 기랑해랑', 'cute', 'kfonts', 'bm-kiranghaerang'),
    ('hakgyo-kkokkoma', '학교안심 꼬꼬마', 'cute', 'kfonts', 'hakgyoansim-kkokkoma'),
    ('hakgyo-jiugae', '학교안심 지우개', 'cute', 'kfonts', 'hakgyoansim-jiugae'),
    ('nanum-pen', '나눔손글씨 펜', 'cute', 'kfonts', 'nanum-pen'),

    ('galmuri11', '갈무리11 (픽셀)', 'pixel', 'npm', ('galmuri@2.40.3', r'dist/Galmuri11(-Bold)?\.ttf$')),
    ('galmuri14', '갈무리14 (픽셀)', 'pixel', 'npm', ('galmuri@2.40.3', r'dist/Galmuri14\.ttf$')),
    ('neodgm', '네오둥근모 (픽셀)', 'pixel', 'kfonts', 'neodgm'),
    ('d2coding', 'D2Coding', 'pixel', 'kfonts', 'd2coding'),
    ('nanum-gothic-coding', '나눔고딕코딩', 'pixel', 'google', 'nanumgothiccoding'),
]

WEIGHT_WORDS = [
    (r'thin|hairline', 100), (r'extra\s*light|ultra\s*light', 200), (r'light', 300),
    (r'semi\s*bold|demi\s*bold', 600), (r'extra\s*bold|ultra\s*bold|heavy', 800), (r'black', 900),
    (r'medium', 500), (r'bold', 700), (r'regular|book|normal', 400),
]


def weight_of(name):
    n = name.lower().replace('-', ' ').replace('_', ' ')
    for pattern, w in WEIGHT_WORDS:
        if re.search(pattern, n):
            return w
    return 400


def get(url, binary=True):
    req = urllib.request.Request(url, headers={'User-Agent': 'acscent-font-build'})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    return data if binary else data.decode('utf-8')


def cached(url):
    path = os.path.join(CACHE, re.sub(r'[^A-Za-z0-9._-]', '_', url)[-150:])
    if not os.path.exists(path):
        with open(path, 'wb') as f:
            f.write(get(url))
    return path


def jsdelivr_files(pkg):
    return [f['name'] for f in json.loads(get(f'https://data.jsdelivr.com/v1/package/npm/{pkg}/flat', False))['files']]


def sources(kind, value):
    """→ [(weight, url)], license"""
    if kind == 'google':
        listing = json.loads(get(f'https://api.github.com/repos/google/fonts/contents/ofl/{value}', False))
        files = [x for x in listing if x['name'].endswith('.ttf')]
        static = [x for x in files if '[' not in x['name'] and 'Italic' not in x['name']]
        if static:
            return [(weight_of(x['name'].rsplit('-', 1)[-1]), x['download_url']) for x in static], 'OFL-1.1'
        var = [x for x in files if '[' in x['name'] and 'Italic' not in x['name']]
        return [('var', var[0]['download_url'])], 'OFL-1.1'
    if kind == 'kfonts':
        ver = json.loads(get(f'https://registry.npmjs.org/@kfonts/{value}/latest', False))['version']
        pkg = f'@kfonts/{value}@{ver}'
        names = jsdelivr_files(pkg)
        base = f'https://cdn.jsdelivr.net/npm/{pkg}'
        meta = {}
        if '/metadata.json' in names:
            try:
                meta = json.loads(get(base + '/metadata.json', False))
            except Exception:
                pass
        lic = meta.get('license') or meta.get('licence') or 'see package'
        if isinstance(lic, dict):
            lic = lic.get('name') or lic.get('type') or json.dumps(lic, ensure_ascii=False)
        src = [n for n in names if re.search(r'\.(ttf|otf)$', n, re.I)]
        return [(weight_of(os.path.basename(n)), base + n) for n in src], str(lic)
    if kind == 'npm':
        pkg, pattern = value
        names = jsdelivr_files(pkg)
        hit = [n for n in names if re.search(pattern, n.lstrip('/'))]
        return [(weight_of(os.path.basename(n)), f'https://cdn.jsdelivr.net/npm/{pkg}{n}') for n in hit], 'OFL-1.1'
    raise ValueError(kind)


def text_set():
    chars = set(chr(c) for c in range(0x20, 0x7F))
    chars |= set('·…‘’“”–—•※～〜℃°±×÷←→↑↓♡♥★☆◆◇○●□■△▲▽▼「」『』《》〈〉【】、。·')
    chars |= set(chr(c) for c in range(0x3131, 0x318F))  # 호환 자모 — 터치 키보드 글자
    chars |= set(chr(c) for c in range(0xA0, 0x100))
    for c in range(0xAC00, 0xD7A4):  # KS X 1001 완성형 2,350자
        b = chr(c).encode('cp949')
        if 0xB0 <= b[0] <= 0xC8 and b[1] >= 0xA1:
            chars.add(chr(c))
    return ''.join(sorted(chars))


TEXT = text_set()


def build(font_path, out_path, weight=None):
    font = TTFont(font_path)
    if weight is not None and 'fvar' in font:
        axes = {a.axisTag: a for a in font['fvar'].axes}
        loc = {'wght': max(axes['wght'].minValue, min(axes['wght'].maxValue, weight))}
        font = instancer.instantiateVariableFont(font, loc)
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    opts.hinting = False
    sub = subset.Subsetter(opts)
    sub.populate(text=TEXT)
    sub.subset(font)
    font.flavor = 'woff2'
    font.save(out_path)
    return os.path.getsize(out_path)


def pick(cands):
    """400·700 에 가장 가까운 파일 — 굵기가 하나뿐이면 하나만"""
    if len(cands) == 1:
        return {400: cands[0][1]} if cands[0][0] != 'var' else {400: ('var', cands[0][1]), 700: ('var', cands[0][1])}
    by = {}
    for w, u in cands:
        by.setdefault(w, u)
    ws = sorted(by)
    regular = min(ws, key=lambda w: (abs(w - 400), w))
    boldish = [w for w in ws if w >= 600]
    out = {400: by[regular]}
    if boldish:
        out[700] = by[min(boldish, key=lambda w: abs(w - 700))]
    return out


def main():
    only = set(sys.argv[1:])
    manifest = []
    for fid, label, cat, kind, value in FONTS:
        if only and fid not in only:
            continue
        try:
            cands, lic = sources(kind, value)
            if not cands:
                raise RuntimeError('파일 없음')
            chosen = pick(cands)
            os.makedirs(f'{OUT}/{fid}', exist_ok=True)
            files = {}
            for w, src in chosen.items():
                if isinstance(src, tuple):
                    size = build(cached(src[1]), f'{OUT}/{fid}/{w}.woff2', weight=w)
                else:
                    size = build(cached(src), f'{OUT}/{fid}/{w}.woff2')
                files[w] = size
            manifest.append({'id': fid, 'label': label, 'category': cat, 'weights': sorted(files), 'bytes': sum(files.values()),
                             'license': lic, 'source': kind if kind != 'npm' else value[0], 'origin': value if isinstance(value, str) else value[0]})
            print(f'OK  {fid:24s} {sorted(files)} {sum(files.values())//1024:5d}KB  {lic}')
        except Exception as e:
            print(f'ERR {fid:24s} {e}')
    mpath = WORK + '/manifest.json'
    if only and os.path.exists(mpath):
        old = [m for m in json.load(open(mpath)) if m['id'] not in {x['id'] for x in manifest}]
        manifest = old + manifest
    with open(mpath, 'w') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print('fonts', len(manifest), 'total', sum(m['bytes'] for m in manifest) // 1024 // 1024, 'MB')


if __name__ == '__main__':
    main()
