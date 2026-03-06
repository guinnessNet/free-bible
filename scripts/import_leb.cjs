/**
 * LEB (Lexham English Bible) 데이터를 GitHub 레포에서 다운로드하여
 * 프로젝트 형식의 JSON으로 변환하는 스크립트
 *
 * 사용법: node scripts/import_leb.cjs
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://raw.githubusercontent.com/aaronshaf/lexham-english-bible/master/json';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'bibles', 'LEB');

// GitHub 레포 파일명 → 프로젝트 Book ID + 영문 이름 매핑
const BOOK_MAP = [
  // 구약 39권
  { file: 'Gen', id: 'GEN', name: 'Genesis', testament: 'old' },
  { file: 'Exod', id: 'EXO', name: 'Exodus', testament: 'old' },
  { file: 'Lev', id: 'LEV', name: 'Leviticus', testament: 'old' },
  { file: 'Num', id: 'NUM', name: 'Numbers', testament: 'old' },
  { file: 'Deut', id: 'DEU', name: 'Deuteronomy', testament: 'old' },
  { file: 'Josh', id: 'JOS', name: 'Joshua', testament: 'old' },
  { file: 'Judg', id: 'JDG', name: 'Judges', testament: 'old' },
  { file: 'Ruth', id: 'RUT', name: 'Ruth', testament: 'old' },
  { file: '1Sam', id: '1SA', name: '1 Samuel', testament: 'old' },
  { file: '2Sam', id: '2SA', name: '2 Samuel', testament: 'old' },
  { file: '1Kgs', id: '1KI', name: '1 Kings', testament: 'old' },
  { file: '2Kgs', id: '2KI', name: '2 Kings', testament: 'old' },
  { file: '1Chr', id: '1CH', name: '1 Chronicles', testament: 'old' },
  { file: '2Chr', id: '2CH', name: '2 Chronicles', testament: 'old' },
  { file: 'Ezra', id: 'EZR', name: 'Ezra', testament: 'old' },
  { file: 'Neh', id: 'NEH', name: 'Nehemiah', testament: 'old' },
  { file: 'Esth', id: 'EST', name: 'Esther', testament: 'old' },
  { file: 'Job', id: 'JOB', name: 'Job', testament: 'old' },
  { file: 'Ps', id: 'PSA', name: 'Psalms', testament: 'old' },
  { file: 'Prov', id: 'PRO', name: 'Proverbs', testament: 'old' },
  { file: 'Eccl', id: 'ECC', name: 'Ecclesiastes', testament: 'old' },
  { file: 'Song', id: 'SNG', name: 'Song of Solomon', testament: 'old' },
  { file: 'Isa', id: 'ISA', name: 'Isaiah', testament: 'old' },
  { file: 'Jer', id: 'JER', name: 'Jeremiah', testament: 'old' },
  { file: 'Lam', id: 'LAM', name: 'Lamentations', testament: 'old' },
  { file: 'Ezek', id: 'EZK', name: 'Ezekiel', testament: 'old' },
  { file: 'Dan', id: 'DAN', name: 'Daniel', testament: 'old' },
  { file: 'Hos', id: 'HOS', name: 'Hosea', testament: 'old' },
  { file: 'Joel', id: 'JOL', name: 'Joel', testament: 'old' },
  { file: 'Amos', id: 'AMO', name: 'Amos', testament: 'old' },
  { file: 'Obad', id: 'OBA', name: 'Obadiah', testament: 'old' },
  { file: 'Jonah', id: 'JON', name: 'Jonah', testament: 'old' },
  { file: 'Mic', id: 'MIC', name: 'Micah', testament: 'old' },
  { file: 'Nah', id: 'NAH', name: 'Nahum', testament: 'old' },
  { file: 'Hab', id: 'HAB', name: 'Habakkuk', testament: 'old' },
  { file: 'Zeph', id: 'ZEP', name: 'Zephaniah', testament: 'old' },
  { file: 'Hag', id: 'HAG', name: 'Haggai', testament: 'old' },
  { file: 'Zech', id: 'ZEC', name: 'Zechariah', testament: 'old' },
  { file: 'Mal', id: 'MAL', name: 'Malachi', testament: 'old' },
  // 신약 27권
  { file: 'Matt', id: 'MAT', name: 'Matthew', testament: 'new' },
  { file: 'Mark', id: 'MRK', name: 'Mark', testament: 'new' },
  { file: 'Luke', id: 'LUK', name: 'Luke', testament: 'new' },
  { file: 'John', id: 'JHN', name: 'John', testament: 'new' },
  { file: 'Acts', id: 'ACT', name: 'Acts', testament: 'new' },
  { file: 'Rom', id: 'ROM', name: 'Romans', testament: 'new' },
  { file: '1Cor', id: '1CO', name: '1 Corinthians', testament: 'new' },
  { file: '2Cor', id: '2CO', name: '2 Corinthians', testament: 'new' },
  { file: 'Gal', id: 'GAL', name: 'Galatians', testament: 'new' },
  { file: 'Eph', id: 'EPH', name: 'Ephesians', testament: 'new' },
  { file: 'Phil', id: 'PHP', name: 'Philippians', testament: 'new' },
  { file: 'Col', id: 'COL', name: 'Colossians', testament: 'new' },
  { file: '1Thess', id: '1TH', name: '1 Thessalonians', testament: 'new' },
  { file: '2Thess', id: '2TH', name: '2 Thessalonians', testament: 'new' },
  { file: '1Tim', id: '1TI', name: '1 Timothy', testament: 'new' },
  { file: '2Tim', id: '2TI', name: '2 Timothy', testament: 'new' },
  { file: 'Titus', id: 'TIT', name: 'Titus', testament: 'new' },
  { file: 'Phlm', id: 'PHM', name: 'Philemon', testament: 'new' },
  { file: 'Heb', id: 'HEB', name: 'Hebrews', testament: 'new' },
  { file: 'Jas', id: 'JAS', name: 'James', testament: 'new' },
  { file: '1Pet', id: '1PE', name: '1 Peter', testament: 'new' },
  { file: '2Pet', id: '2PE', name: '2 Peter', testament: 'new' },
  { file: '1John', id: '1JN', name: '1 John', testament: 'new' },
  { file: '2John', id: '2JN', name: '2 John', testament: 'new' },
  { file: '3John', id: '3JN', name: '3 John', testament: 'new' },
  { file: 'Jude', id: 'JUD', name: 'Jude', testament: 'new' },
  { file: 'Rev', id: 'REV', name: 'Revelation', testament: 'new' },
];

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// <note>...</note> 태그 제거, 연속 공백 정리
function cleanText(text) {
  return text
    .replace(/<note>[^<]*<\/note>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// GitHub 레포 형식 → 프로젝트 형식 변환
function convertBook(sourceData, bookInfo) {
  const passages = sourceData.passages;
  const chaptersMap = {};

  for (const [ref, text] of Object.entries(passages)) {
    const [chapStr, verseStr] = ref.split(':');
    const chapter = parseInt(chapStr, 10);
    const verse = parseInt(verseStr, 10);
    if (!chaptersMap[chapter]) chaptersMap[chapter] = [];
    chaptersMap[chapter].push({ verse, text: cleanText(text) });
  }

  const chapterNums = Object.keys(chaptersMap).map(Number).sort((a, b) => a - b);
  const chapters = chapterNums.map((num) => ({
    chapter: num,
    verses: chaptersMap[num].sort((a, b) => a.verse - b.verse),
  }));

  return {
    bookId: bookInfo.id,
    bookName: bookInfo.name,
    chapters,
  };
}

async function main() {
  // 출력 디렉토리 생성
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const metadataBooks = [];
  let successCount = 0;
  let failCount = 0;

  for (const book of BOOK_MAP) {
    const url = `${BASE_URL}/${book.file}.json`;
    process.stdout.write(`[${successCount + failCount + 1}/66] ${book.id} (${book.name})...`);

    try {
      const source = await fetchJSON(url);
      const converted = convertBook(source, book);

      // Book JSON 저장
      const outPath = path.join(OUTPUT_DIR, `${book.id}.json`);
      fs.writeFileSync(outPath, JSON.stringify(converted, null, 2), 'utf-8');

      // metadata용 정보 수집
      metadataBooks.push({
        id: book.id,
        name: book.name,
        nameEn: book.name,
        testament: book.testament,
        chapters: converted.chapters.length,
      });

      successCount++;
      console.log(` OK (${converted.chapters.length} chapters)`);
    } catch (err) {
      failCount++;
      console.log(` FAIL: ${err.message}`);
    }
  }

  // metadata.json 저장
  const metadata = { translationId: 'LEB', books: metadataBooks };
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );

  console.log(`\n완료: ${successCount}권 성공, ${failCount}권 실패`);

  // translations.json 업데이트
  const transPath = path.join(__dirname, '..', 'public', 'bibles', 'translations.json');
  const translations = JSON.parse(fs.readFileSync(transPath, 'utf-8'));
  if (!translations.find((t) => t.id === 'LEB')) {
    translations.push({
      id: 'LEB',
      name: 'Lexham English Bible',
      language: 'en',
      direction: 'ltr',
    });
    fs.writeFileSync(transPath, JSON.stringify(translations, null, 2), 'utf-8');
    console.log('translations.json에 LEB 추가 완료');
  }
}

main().catch(console.error);
