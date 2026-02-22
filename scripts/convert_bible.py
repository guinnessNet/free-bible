#!/usr/bin/env python3
"""
convert_bible.py — 성경 원본 텍스트를 앱 JSON 형식으로 변환

Usage:
  # 개역개정 (single UTF-8 file, 한글약어 format)
  python scripts/convert_bible.py --format flat_ko \
    --input data/개역개정.txt \
    --id KRV2 --name "개역개정" --lang ko

  # 개역한글판
  python scripts/convert_bible.py --format flat_ko \
    --input data/개역한글판.txt \
    --id KRV --name "개역한글" --lang ko

  # 현대인의성경
  python scripts/convert_bible.py --format flat_ko \
    --input data/현대인의성경.txt \
    --id MBS --name "현대인의성경" --lang ko

  # 쉬운성경 (per-book files, EUC-KR encoding)
  python scripts/convert_bible.py --format easy_ko \
    --input "data/쉬운성경-텍스트" \
    --id EASY --name "쉬운성경" --lang ko

  # NIV (English, [BookName N] headers)
  python scripts/convert_bible.py --format niv \
    --input data/NIV-EN.txt \
    --id NIV --name "New International Version" --lang en
"""

import argparse
import json
import re
import sys
from pathlib import Path
from collections import defaultdict

# ─────────────────────────────────────────────────────────
# 한글 약어 → Book ID 매핑 (긴 약어 우선 매칭을 위해 OrderedDict처럼 사용)
# ─────────────────────────────────────────────────────────
KO_ABBR_TO_ID = [
    # 구약 — 두 글자 이상 먼저 (단순 prefix 충돌 방지)
    ("삼상", "1SA"), ("삼하", "2SA"),
    ("왕상", "1KI"), ("왕하", "2KI"),
    ("대상", "1CH"), ("대하", "2CH"),
    ("고전", "1CO"), ("고후", "2CO"),
    ("살전", "1TH"), ("살후", "2TH"),
    ("딤전", "1TI"), ("딤후", "2TI"),
    ("벧전", "1PE"), ("벧후", "2PE"),
    ("요일", "1JN"), ("요이", "2JN"), ("요삼", "3JN"),
    # 구약 — 한 글자
    ("창", "GEN"), ("출", "EXO"), ("레", "LEV"), ("민", "NUM"), ("신", "DEU"),
    ("수", "JOS"), ("삿", "JDG"), ("룻", "RUT"),
    ("스", "EZR"), ("느", "NEH"), ("에", "EST"),
    ("욥", "JOB"), ("시", "PSA"), ("잠", "PRO"), ("전", "ECC"), ("아", "SNG"),
    ("사", "ISA"), ("렘", "JER"), ("애", "LAM"), ("겔", "EZK"), ("단", "DAN"),
    ("호", "HOS"), ("욜", "JOL"), ("암", "AMO"), ("옵", "OBA"), ("욘", "JON"),
    ("미", "MIC"), ("나", "NAH"), ("합", "HAB"), ("습", "ZEP"),
    ("학", "HAG"), ("슥", "ZEC"), ("말", "MAL"),
    # 신약 — 한 글자
    ("마", "MAT"), ("막", "MRK"), ("눅", "LUK"), ("요", "JHN"), ("행", "ACT"),
    ("롬", "ROM"), ("갈", "GAL"), ("엡", "EPH"), ("빌", "PHP"), ("골", "COL"),
    ("딛", "TIT"), ("몬", "PHM"), ("히", "HEB"), ("약", "JAS"),
    ("유", "JUD"), ("계", "REV"),
]

# 빠른 검색을 위한 dict (긴 키 우선)
KO_ABBR_MAP = {abbr: book_id for abbr, book_id in KO_ABBR_TO_ID}

# ─────────────────────────────────────────────────────────
# 영어 책 이름 → Book ID 매핑 (NIV용)
# ─────────────────────────────────────────────────────────
EN_NAME_TO_ID = {
    "Genesis": "GEN", "Exodus": "EXO", "Leviticus": "LEV", "Numbers": "NUM",
    "Deuteronomy": "DEU", "Joshua": "JOS", "Judges": "JDG", "Ruth": "RUT",
    "1 Samuel": "1SA", "2 Samuel": "2SA", "1 Kings": "1KI", "2 Kings": "2KI",
    "1 Chronicles": "1CH", "2 Chronicles": "2CH", "Ezra": "EZR",
    "Nehemiah": "NEH", "Esther": "EST", "Job": "JOB", "Psalms": "PSA",
    "Proverbs": "PRO", "Ecclesiastes": "ECC", "Song of Solomon": "SNG",
    "Song of Songs": "SNG",  # NIV alternate name
    "Isaiah": "ISA", "Jeremiah": "JER", "Lamentations": "LAM",
    "Ezekiel": "EZK", "Daniel": "DAN", "Hosea": "HOS", "Joel": "JOL",
    "Amos": "AMO", "Obadiah": "OBA", "Jonah": "JON", "Micah": "MIC",
    "Nahum": "NAH", "Habakkuk": "HAB", "Zephaniah": "ZEP", "Haggai": "HAG",
    "Zechariah": "ZEC", "Malachi": "MAL",
    "Matthew": "MAT", "Mark": "MRK", "Luke": "LUK", "John": "JHN",
    "Acts": "ACT", "Romans": "ROM", "1 Corinthians": "1CO",
    "2 Corinthians": "2CO", "Galatians": "GAL", "Ephesians": "EPH",
    "Philippians": "PHP", "Colossians": "COL", "1 Thessalonians": "1TH",
    "2 Thessalonians": "2TH", "1 Timothy": "1TI", "2 Timothy": "2TI",
    "Titus": "TIT", "Philemon": "PHM", "Hebrews": "HEB", "James": "JAS",
    "1 Peter": "1PE", "2 Peter": "2PE", "1 John": "1JN", "2 John": "2JN",
    "3 John": "3JN", "Jude": "JUD", "Revelation": "REV",
}

# Book ID → 한글 책명 (metadata 생성용)
BOOK_ID_TO_KO = {
    "GEN": ("창세기", "old"), "EXO": ("출애굽기", "old"), "LEV": ("레위기", "old"),
    "NUM": ("민수기", "old"), "DEU": ("신명기", "old"), "JOS": ("여호수아", "old"),
    "JDG": ("사사기", "old"), "RUT": ("룻기", "old"), "1SA": ("사무엘상", "old"),
    "2SA": ("사무엘하", "old"), "1KI": ("열왕기상", "old"), "2KI": ("열왕기하", "old"),
    "1CH": ("역대상", "old"), "2CH": ("역대하", "old"), "EZR": ("에스라", "old"),
    "NEH": ("느헤미야", "old"), "EST": ("에스더", "old"), "JOB": ("욥기", "old"),
    "PSA": ("시편", "old"), "PRO": ("잠언", "old"), "ECC": ("전도서", "old"),
    "SNG": ("아가", "old"), "ISA": ("이사야", "old"), "JER": ("예레미야", "old"),
    "LAM": ("예레미야애가", "old"), "EZK": ("에스겔", "old"), "DAN": ("다니엘", "old"),
    "HOS": ("호세아", "old"), "JOL": ("요엘", "old"), "AMO": ("아모스", "old"),
    "OBA": ("오바댜", "old"), "JON": ("요나", "old"), "MIC": ("미가", "old"),
    "NAH": ("나훔", "old"), "HAB": ("하박국", "old"), "ZEP": ("스바냐", "old"),
    "HAG": ("학개", "old"), "ZEC": ("스가랴", "old"), "MAL": ("말라기", "old"),
    "MAT": ("마태복음", "new"), "MRK": ("마가복음", "new"), "LUK": ("누가복음", "new"),
    "JHN": ("요한복음", "new"), "ACT": ("사도행전", "new"), "ROM": ("로마서", "new"),
    "1CO": ("고린도전서", "new"), "2CO": ("고린도후서", "new"), "GAL": ("갈라디아서", "new"),
    "EPH": ("에베소서", "new"), "PHP": ("빌립보서", "new"), "COL": ("골로새서", "new"),
    "1TH": ("데살로니가전서", "new"), "2TH": ("데살로니가후서", "new"),
    "1TI": ("디모데전서", "new"), "2TI": ("디모데후서", "new"), "TIT": ("디도서", "new"),
    "PHM": ("빌레몬서", "new"), "HEB": ("히브리서", "new"), "JAS": ("야고보서", "new"),
    "1PE": ("베드로전서", "new"), "2PE": ("베드로후서", "new"),
    "1JN": ("요한일서", "new"), "2JN": ("요한이서", "new"), "3JN": ("요한삼서", "new"),
    "JUD": ("유다서", "new"), "REV": ("요한계시록", "new"),
}

BOOK_ID_TO_EN = {
    "GEN": "Genesis", "EXO": "Exodus", "LEV": "Leviticus", "NUM": "Numbers",
    "DEU": "Deuteronomy", "JOS": "Joshua", "JDG": "Judges", "RUT": "Ruth",
    "1SA": "1 Samuel", "2SA": "2 Samuel", "1KI": "1 Kings", "2KI": "2 Kings",
    "1CH": "1 Chronicles", "2CH": "2 Chronicles", "EZR": "Ezra",
    "NEH": "Nehemiah", "EST": "Esther", "JOB": "Job", "PSA": "Psalms",
    "PRO": "Proverbs", "ECC": "Ecclesiastes", "SNG": "Song of Solomon",
    "ISA": "Isaiah", "JER": "Jeremiah", "LAM": "Lamentations",
    "EZK": "Ezekiel", "DAN": "Daniel", "HOS": "Hosea", "JOL": "Joel",
    "AMO": "Amos", "OBA": "Obadiah", "JON": "Jonah", "MIC": "Micah",
    "NAH": "Nahum", "HAB": "Habakkuk", "ZEP": "Zephaniah", "HAG": "Haggai",
    "ZEC": "Zechariah", "MAL": "Malachi", "MAT": "Matthew", "MRK": "Mark",
    "LUK": "Luke", "JHN": "John", "ACT": "Acts", "ROM": "Romans",
    "1CO": "1 Corinthians", "2CO": "2 Corinthians", "GAL": "Galatians",
    "EPH": "Ephesians", "PHP": "Philippians", "COL": "Colossians",
    "1TH": "1 Thessalonians", "2TH": "2 Thessalonians",
    "1TI": "1 Timothy", "2TI": "2 Timothy", "TIT": "Titus",
    "PHM": "Philemon", "HEB": "Hebrews", "JAS": "James",
    "1PE": "1 Peter", "2PE": "2 Peter",
    "1JN": "1 John", "2JN": "2 John", "3JN": "3 John",
    "JUD": "Jude", "REV": "Revelation",
}

# 정식 Book ID 순서 (66권)
BOOK_ORDER = [
    "GEN","EXO","LEV","NUM","DEU","JOS","JDG","RUT","1SA","2SA",
    "1KI","2KI","1CH","2CH","EZR","NEH","EST","JOB","PSA","PRO",
    "ECC","SNG","ISA","JER","LAM","EZK","DAN","HOS","JOL","AMO",
    "OBA","JON","MIC","NAH","HAB","ZEP","HAG","ZEC","MAL",
    "MAT","MRK","LUK","JHN","ACT","ROM","1CO","2CO","GAL","EPH",
    "PHP","COL","1TH","2TH","1TI","2TI","TIT","PHM","HEB","JAS",
    "1PE","2PE","1JN","2JN","3JN","JUD","REV",
]


# ─────────────────────────────────────────────────────────
# 파서: Format A — flat_ko
#   한 파일에 전체 성경, UTF-8
#   패턴: {약어}{장}:{절} {본문}
# ─────────────────────────────────────────────────────────
# 텍스트가 없는 절(참조만 있는 줄)도 허용
FLAT_KO_RE = re.compile(r'^([가-힣]+)(\d+):(\d+)\s*(.*)$')

def match_ko_abbr(raw_abbr: str) -> str | None:
    """긴 약어부터 시도하여 Book ID 반환"""
    for abbr, book_id in KO_ABBR_TO_ID:
        if raw_abbr == abbr:
            return book_id
    return None

def parse_flat_ko(file_path: Path, encoding: str = "utf-8") -> dict[str, dict]:
    """
    Returns: { book_id: { chapter_num: [ {verse, text} ] } }
    """
    data: dict[str, dict] = defaultdict(lambda: defaultdict(list))
    errors = 0

    with open(file_path, encoding=encoding, errors="replace") as f:
        for lineno, raw_line in enumerate(f, 1):
            line = raw_line.strip()
            if not line:
                continue

            m = FLAT_KO_RE.match(line)
            if not m:
                errors += 1
                if errors <= 5:
                    print(f"  [WARN] line {lineno}: 패턴 불일치 — {line[:60]}", file=sys.stderr)
                continue

            raw_abbr, chapter_str, verse_str, text = m.groups()
            book_id = match_ko_abbr(raw_abbr)
            if book_id is None:
                errors += 1
                if errors <= 5:
                    print(f"  [WARN] line {lineno}: 알 수 없는 약어 '{raw_abbr}'", file=sys.stderr)
                continue

            data[book_id][int(chapter_str)].append({
                "verse": int(verse_str),
                "text": text.strip(),
            })

    if errors > 5:
        print(f"  [WARN] ...외 {errors - 5}개 추가 경고", file=sys.stderr)

    return data


# ─────────────────────────────────────────────────────────
# 파서: Format B — easy_ko (쉬운성경)
#   권별 파일, EUC-KR 인코딩, 같은 패턴
# ─────────────────────────────────────────────────────────
def parse_easy_ko(dir_path: Path) -> dict[str, dict]:
    """구약/신약 하위 디렉토리의 모든 .txt 파일을 파싱"""
    data: dict[str, dict] = defaultdict(lambda: defaultdict(list))

    txt_files = sorted(dir_path.rglob("*.txt"))
    if not txt_files:
        print(f"  [ERROR] {dir_path} 에서 .txt 파일을 찾을 수 없습니다.", file=sys.stderr)
        return data

    for txt_file in txt_files:
        file_data = parse_flat_ko(txt_file, encoding="euc-kr")
        for book_id, chapters in file_data.items():
            for chap_num, verses in chapters.items():
                data[book_id][chap_num].extend(verses)

    return data


# ─────────────────────────────────────────────────────────
# 파서: Format C — niv (NIV 영어)
#   패턴: [BookName N] 챕터 헤더, N.텍스트 절
# ─────────────────────────────────────────────────────────
CHAPTER_HEADER_RE = re.compile(r'^\[(.+?)\s+(\d+)\]$')
VERSE_RE = re.compile(r'^(\d+)\.(.+)$')

def parse_niv(file_path: Path) -> dict[str, dict]:
    data: dict[str, dict] = defaultdict(lambda: defaultdict(list))

    current_book_id: str | None = None
    current_chapter: int | None = None
    errors = 0

    with open(file_path, encoding="utf-8", errors="replace") as f:
        for lineno, raw_line in enumerate(f, 1):
            line = raw_line.strip()
            if not line or line.startswith("ns "):
                continue

            ch_m = CHAPTER_HEADER_RE.match(line)
            if ch_m:
                book_name, chapter_str = ch_m.groups()
                current_book_id = EN_NAME_TO_ID.get(book_name)
                if current_book_id is None:
                    errors += 1
                    if errors <= 5:
                        print(f"  [WARN] line {lineno}: 알 수 없는 책 이름 '{book_name}'", file=sys.stderr)
                current_chapter = int(chapter_str)
                continue

            v_m = VERSE_RE.match(line)
            if v_m and current_book_id and current_chapter is not None:
                verse_num, text = v_m.groups()
                data[current_book_id][current_chapter].append({
                    "verse": int(verse_num),
                    "text": text.strip(),
                })

    return data


# ─────────────────────────────────────────────────────────
# JSON 출력 생성
# ─────────────────────────────────────────────────────────
def build_book_json(book_id: str, chapter_map: dict, lang: str) -> dict:
    """{ bookId, bookName, chapters: [...] }"""
    if lang == "en":
        book_name = BOOK_ID_TO_EN.get(book_id, book_id)
    else:
        book_name = BOOK_ID_TO_KO.get(book_id, (book_id, ""))[0]

    chapters_sorted = sorted(chapter_map.items())
    chapters = [
        {
            "chapter": chap_num,
            "verses": sorted(verses, key=lambda v: v["verse"]),
        }
        for chap_num, verses in chapters_sorted
    ]
    return {
        "bookId": book_id,
        "bookName": book_name,
        "chapters": chapters,
    }


def build_metadata(translation_id: str, translation_name: str, lang: str,
                   book_data: dict[str, dict]) -> dict:
    """metadata.json 내용 생성"""
    books = []
    for book_id in BOOK_ORDER:
        if book_id not in book_data:
            continue
        ko_name, testament = BOOK_ID_TO_KO.get(book_id, (book_id, "old"))
        en_name = BOOK_ID_TO_EN.get(book_id, book_id)
        chapter_count = len(book_data[book_id])
        books.append({
            "id": book_id,
            "name": ko_name if lang != "en" else en_name,
            "nameEn": en_name,
            "testament": testament,
            "chapters": chapter_count,
        })

    return {
        "translationId": translation_id,
        "books": books,
    }


def write_outputs(out_dir: Path, translation_id: str, translation_name: str,
                  lang: str, book_data: dict[str, dict]):
    out_dir.mkdir(parents=True, exist_ok=True)

    # metadata.json
    metadata = build_metadata(translation_id, translation_name, lang, book_data)
    meta_path = out_dir / "metadata.json"
    meta_path.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"  → {meta_path}  ({len(metadata['books'])}권)")

    # 권별 JSON
    written = 0
    for book_id in BOOK_ORDER:
        if book_id not in book_data:
            continue
        book_json = build_book_json(book_id, book_data[book_id], lang)
        book_path = out_dir / f"{book_id}.json"
        book_path.write_text(
            json.dumps(book_json, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        written += 1

    print(f"  → {out_dir}/*.json  ({written}개 파일 생성)")

    # translations.json 업데이트 (public/bibles/translations.json)
    translations_path = out_dir.parent / "translations.json"
    if translations_path.exists():
        existing = json.loads(translations_path.read_text(encoding="utf-8"))
    else:
        existing = []

    # 이미 있으면 업데이트, 없으면 추가
    entry = {"id": translation_id, "name": translation_name, "language": lang, "direction": "ltr"}
    ids = [t["id"] for t in existing]
    if translation_id in ids:
        existing[ids.index(translation_id)] = entry
    else:
        existing.append(entry)

    translations_path.write_text(
        json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"  → {translations_path} 업데이트 완료")


# ─────────────────────────────────────────────────────────
# 메인
# ─────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="성경 텍스트 → JSON 변환기")
    parser.add_argument("--format", required=True, choices=["flat_ko", "easy_ko", "niv"],
                        help="입력 파일 형식")
    parser.add_argument("--input", required=True,
                        help="입력 파일 또는 디렉토리 경로")
    parser.add_argument("--id", required=True,
                        help="번역본 ID (예: KRV, NIV)")
    parser.add_argument("--name", required=True,
                        help="번역본 이름 (예: 개역한글)")
    parser.add_argument("--lang", default="ko",
                        help="언어 코드 (기본: ko)")
    parser.add_argument("--out", default="public/bibles",
                        help="출력 루트 디렉토리 (기본: public/bibles)")
    args = parser.parse_args()

    input_path = Path(args.input)
    out_dir = Path(args.out) / args.id

    print(f"\n[{args.id}] {args.name} 변환 시작")
    print(f"  형식: {args.format}")
    print(f"  입력: {input_path}")
    print(f"  출력: {out_dir}\n")

    if args.format == "flat_ko":
        if not input_path.is_file():
            print(f"[ERROR] 파일을 찾을 수 없습니다: {input_path}", file=sys.stderr)
            sys.exit(1)
        book_data = parse_flat_ko(input_path)

    elif args.format == "easy_ko":
        if not input_path.is_dir():
            print(f"[ERROR] 디렉토리를 찾을 수 없습니다: {input_path}", file=sys.stderr)
            sys.exit(1)
        book_data = parse_easy_ko(input_path)

    elif args.format == "niv":
        if not input_path.is_file():
            print(f"[ERROR] 파일을 찾을 수 없습니다: {input_path}", file=sys.stderr)
            sys.exit(1)
        book_data = parse_niv(input_path)

    else:
        print(f"[ERROR] 알 수 없는 형식: {args.format}", file=sys.stderr)
        sys.exit(1)

    if not book_data:
        print("[ERROR] 데이터를 파싱하지 못했습니다.", file=sys.stderr)
        sys.exit(1)

    print(f"  파싱 완료: {len(book_data)}권 발견\n")
    write_outputs(out_dir, args.id, args.name, args.lang, book_data)
    print("\n변환 완료!")


if __name__ == "__main__":
    main()
