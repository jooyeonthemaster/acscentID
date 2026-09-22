/**
 * Build the shared background catalog from the complete, existing design archive.
 * Does not regenerate artwork or alter any source image. No UI mockups, reference
 * posters, portrait cutouts or print frames are included.
 *
 * Run from any directory: node scripts/prepare-screen-backgrounds.mjs
 */
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resolve = (...parts) => path.join(root, ...parts);
const posterRoot = 'design-review/poster-inspired-backgrounds-v2';
const studyRoot = 'design-review/birthday-cafe-backgrounds-2026-09-21/backgrounds';
const outputRoot = 'public/assets/screen-backgrounds';
const catalogPath = 'src/lib/screen-backgrounds/catalog.json';
const reportPath = 'design-review/screen-backgrounds-asset-report.json';
const targets = {
  booth: { width: 1920, height: 1080, thumbnailWidth: 384, thumbnailHeight: 216 },
  kiosk: { width: 1080, height: 1920, thumbnailWidth: 216, thumbnailHeight: 384 },
};
const posterPalettes = ['wanted','soft','jua','jua','kirang','serif','wanted','jua','kirang','jua','jua','soft','soft','serif','wanted','wanted','kirang','serif','jua','serif'];
const studyDefinitions = {
  booth: [
    ['ribbon-cake','리본 케이크 파티','jua','#6f2634','#b64255','#fff9ef'],
    ['blue-ticket-stage','블루 티켓 스테이지','wanted','#193d67','#d44b40','#fff9ec'],
    ['film-contact-sheet','필름 컨택트 시트','wanted','#24211f','#a3322f','#f7f0e4'],
    ['y2k-bubble','Y2K 버블 팝','soft','#35577d','#f16fa4','#fcfbff'],
    ['school-notebook','스쿨 노트 팬레터','kirang','#204b7d','#ef514e','#fffaf0'],
    ['plush-patchwork','플러시 패치워크','jua','#315d58','#e26c67','#fffaf1'],
    ['vintage-rose-letter','빈티지 로즈 레터','serif','#5f2a38','#a72f46','#fff8ec'],
    ['pixel-fanclub','픽셀 팬클럽','jua','#504487','#f072a7','#fffdf5'],
    ['polaroid-garden','폴라로이드 가든','serif','#405e4f','#df7c70','#fffdf6'],
    ['disco-confetti','디스코 컨페티','wanted','#262941','#ba304a','#fffaf2'],
  ],
  kiosk: [
    ['perfume-lab-pastel','퍼퓸 랩 파스텔','serif','#5d4143','#bb7180','#fffaf3'],
    ['lucky-draw-arcade','럭키드로우 아케이드','jua','#204689','#e14742','#fff8e6'],
    ['scrapbook-diary','스크랩북 다이어리','kirang','#204778','#c83c39','#fbf5e9'],
    ['gingham-cake-table','깅엄 케이크 테이블','jua','#6d3843','#df6574','#fff9ee'],
    ['flower-shop-fan-event','플라워 숍 팬 이벤트','serif','#46614e','#d18178','#fffbf2'],
    ['iridescent-bubble','이리데슨트 버블','soft','#415f82','#d270a3','#fbfbff'],
    ['mono-blue-zine','모노 블루 진','wanted','#1f3964','#2961a7','#f8f2e8'],
    ['riso-fan-letter','리소 팬레터','kirang','#334e7a','#e05d6b','#fff8eb'],
    ['night-concert-confetti','나이트 콘서트 컨페티','wanted','#202a52','#8267c9','#f7f5ff'],
    ['cozy-plush-shrine','코지 플러시 슈라인','jua','#65474a','#bd6f72','#fff7ec'],
  ],
};
const legacyDefinitions = [
  ['glass-bloom','글라스 블룸','attract/glass-bloom.png','serif','dark','#fff3f5','#f1b0c8','#34202e'],
  ['graphite','그래파이트 갤러리','attract/graphite-gallery.png','wanted','dark','#f7f5ee','#dcc9a2','#242320'],
  ['gingham','파스텔 깅엄','concepts/01-gingham-stationery.png','serif','light','#263d59','#de665f','#fffaf0'],
  ['scrapbook','스크랩북 티켓','concepts/02-scrapbook-ticket.png','kirang','light','#173e68','#d94842','#f7f0e2'],
  ['airy','에어리 그라데이션','concepts/03-airy-gradient.png','soft','light','#244a68','#e96e65','#eefaff'],
  ['retro','레트로 체크','concepts/04-retro-check.png','jua','light','#164b7e','#dc3d37','#fff6df'],
];

async function inventory() {
  const manifest = JSON.parse(await readFile(resolve(posterRoot, 'output-manifest.json'), 'utf8'));
  if (manifest.concepts.length !== 20) throw new Error('Expected all 20 poster-inspired concepts.');
  const jobs = [];
  for (const target of Object.keys(targets)) {
    for (const concept of manifest.concepts) {
      const ordinal = Number(concept.id);
      const source = concept.outputs?.[target]?.final;
      if (!source) throw new Error(`Missing poster artwork for ${target}-${concept.id}.`);
      jobs.push({
        id: `${target}-poster-${concept.id}`, target, title: concept.name,
        source: path.join(posterRoot, source), collection: 'poster',
        palette: posterPalettes[ordinal - 1], tone: ordinal >= 14 && ordinal <= 17 ? 'dark' : 'light',
        ink: concept.ink, accent: concept.accent, base: concept.base, display_order: ordinal,
      });
    }
    for (const [index, [slug, title, palette, ink, accent, base]] of studyDefinitions[target].entries()) {
      const id = String(index + 1).padStart(2, '0');
      jobs.push({
        id: `${target}-study-${id}`, target, title,
        source: path.join(studyRoot, `${target}-${id}-${slug}.png`),
        collection: 'study', palette, tone: 'light', ink, accent, base, display_order: 101 + index,
      });
    }
    for (const [index, [slug, title, source, palette, tone, ink, accent, base]] of legacyDefinitions.entries()) {
      jobs.push({
        id: `${target}-legacy-${slug}`, target, title,
        source: path.join('public/assets/photobooth', source),
        collection: 'legacy', palette, tone, ink, accent, base, display_order: 201 + index,
      });
    }
  }
  if (jobs.length !== 72 || new Set(jobs.map(job => job.id)).size !== jobs.length) {
    throw new Error('Expected 72 unique background catalog entries.');
  }
  // Validate every original before creating assets so incomplete archives fail early.
  await Promise.all(jobs.map(job => stat(resolve(job.source))));
  return jobs;
}

async function exportBackground(job) {
  const dimensions = targets[job.target];
  const source = resolve(job.source);
  const metadata = await sharp(source).metadata();
  const fullPath = path.join(outputRoot, job.target, `${job.id}.webp`);
  const thumbnailPath = path.join(outputRoot, job.target, `${job.id}-thumb.webp`);
  const pipeline = sharp(source).rotate().resize(dimensions.width, dimensions.height, { fit: 'cover', position: 'centre' }).flatten({ background: job.base });
  const [full, thumbnail] = await Promise.all([
    pipeline.clone().webp({ quality: 84, effort: 5 }).toFile(resolve(fullPath)),
    pipeline.clone().resize(dimensions.thumbnailWidth, dimensions.thumbnailHeight, { fit: 'cover' }).webp({ quality: 76, effort: 5 }).toFile(resolve(thumbnailPath)),
  ]);
  const { source: _source, ...fields } = job;
  const catalog = {
    id: fields.id, target: fields.target, title: fields.title,
    image_url: `/${fullPath.replace(/^public\//, '')}`,
    thumbnail_url: `/${thumbnailPath.replace(/^public\//, '')}`,
    collection: fields.collection, palette: fields.palette, tone: fields.tone,
    ink: fields.ink, accent: fields.accent, base: fields.base,
    display_order: fields.display_order, is_active: true,
  };
  const report = {
    id: job.id, target: job.target, collection: job.collection, source: job.source,
    sourceWidth: metadata.width, sourceHeight: metadata.height,
    image: fullPath, thumbnail: thumbnailPath,
    width: full.width, height: full.height, bytes: full.size, thumbnailBytes: thumbnail.size,
    conversion: job.target === 'kiosk' && metadata.width > metadata.height
      ? 'Existing landscape artwork adapted to portrait with centered cover crop; no regeneration.'
      : 'Resized to target dimensions with centered cover; original preserved.',
  };
  return { catalog, report };
}

async function main() {
  const jobs = await inventory();
  await Promise.all([
    mkdir(resolve(outputRoot, 'booth'), { recursive: true }),
    mkdir(resolve(outputRoot, 'kiosk'), { recursive: true }),
    mkdir(path.dirname(resolve(catalogPath)), { recursive: true }),
  ]);
  const results = new Array(jobs.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < jobs.length) {
      const index = cursor++;
      results[index] = await exportBackground(jobs[index]);
    }
  }));
  const summary = Object.fromEntries(Object.keys(targets).map(target => {
    const records = results.filter(result => result.catalog.target === target);
    return [target, {
      count: records.length, width: targets[target].width, height: targets[target].height,
      fullBytes: records.reduce((sum, result) => sum + result.report.bytes, 0),
      thumbnailBytes: records.reduce((sum, result) => sum + result.report.thumbnailBytes, 0),
    }];
  }));
  const report = {
    generatedAt: new Date().toISOString(), summary,
    sourcePolicy: 'Original files are preserved; mockups, reference posters and print frames are excluded.',
    portraitPolicy: 'The 20 poster-inspired kiosk images are native portrait. The 10 prior kiosk studies and 6 legacy landscape images use centered cover crops for portrait display.',
    images: results.map(result => result.report),
  };
  await writeFile(resolve(catalogPath), JSON.stringify(results.map(result => result.catalog), null, 2) + '\n');
  await writeFile(resolve(reportPath), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ catalog: catalogPath, report: reportPath, summary }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
