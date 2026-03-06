/**
 * LEB Judges, Obadiah 2권을 biblestudytools.com에서 가져오는 스크립트
 * 사용법: node scripts/import_leb_missing.cjs
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'bibles', 'LEB');

const BOOKS = [
  { id: 'JDG', name: 'Judges', slug: 'judges', chapters: 21 },
  { id: 'OBA', name: 'Obadiah', slug: 'obadiah', chapters: 1 },
];

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
}

function parseVerses(html) {
  const verses = [];
  // Match: data-verse-id="N" ... verse text ... </div>
  const verseRegex = /data-verse-id="(\d+)"[^>]*>([\s\S]*?)<\/div>/gi;

  let match;
  while ((match = verseRegex.exec(html)) !== null) {
    const verseNum = parseInt(match[1], 10);
    let text = match[2]
      // Remove heading tags
      .replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, '')
      // Remove sup/footnote tags
      .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
      // Remove anchor tags but keep their surrounding text
      .replace(/<a[^>]*>[\s\S]*?<\/a>/g, '')
      // Remove remaining HTML tags
      .replace(/<[^>]+>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#8217;/g, '\u2019')
      .replace(/&#8220;/g, '\u201C')
      .replace(/&#8221;/g, '\u201D')
      .replace(/&#?\w+;/g, '')
      // Clean whitespace
      .replace(/\s+/g, ' ')
      .trim();

    if (text && verseNum) {
      verses.push({ verse: verseNum, text });
    }
  }
  return verses;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  for (const book of BOOKS) {
    console.log(`\n=== ${book.name} (${book.chapters} chapters) ===`);
    const chapters = [];

    for (let ch = 1; ch <= book.chapters; ch++) {
      const url = `https://www.biblestudytools.com/leb/${book.slug}/${ch}.html`;
      process.stdout.write(`  Chapter ${ch}...`);

      try {
        const html = await fetchPage(url);
        const verses = parseVerses(html);

        if (verses.length === 0) {
          console.log(` FAIL: no verses parsed`);
        } else {
          chapters.push({ chapter: ch, verses });
          console.log(` OK (${verses.length} verses)`);
        }
      } catch (err) {
        console.log(` FAIL: ${err.message}`);
      }

      await delay(800);
    }

    if (chapters.length > 0) {
      const bookData = { bookId: book.id, bookName: book.name, chapters };
      const outPath = path.join(OUTPUT_DIR, `${book.id}.json`);
      fs.writeFileSync(outPath, JSON.stringify(bookData, null, 2), 'utf-8');
      console.log(`  → ${outPath} 저장 완료`);

      // Update metadata.json
      const metaPath = path.join(OUTPUT_DIR, 'metadata.json');
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      if (!meta.books.find(b => b.id === book.id)) {
        const allBookIds = [
          'GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA',
          '1KI','2KI','1CH','2CH','EZR','NEH','EST','JOB','PSA','PRO',
          'ECC','SNG','ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO',
          'OBA','JON','MIC','NAH','HAB','ZEP','HAG','ZEC','MAL',
          'MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH',
          'PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS',
          '1PE','2PE','1JN','2JN','3JN','JUD','REV'
        ];
        const targetIdx = allBookIds.indexOf(book.id);
        let insertIdx = meta.books.length;
        for (let i = 0; i < meta.books.length; i++) {
          if (allBookIds.indexOf(meta.books[i].id) > targetIdx) {
            insertIdx = i;
            break;
          }
        }
        meta.books.splice(insertIdx, 0, {
          id: book.id,
          name: book.name,
          nameEn: book.name,
          testament: 'old',
          chapters: chapters.length,
        });
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
        console.log(`  → metadata.json 업데이트 완료`);
      }
    }
  }
}

main().catch(console.error);
