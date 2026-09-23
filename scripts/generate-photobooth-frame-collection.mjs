import sharp from 'sharp'
import { mkdir, writeFile, readFile, copyFile } from 'node:fs/promises'

// Native vector artwork: transparent, print-resolution overlays, no stock art embedded.
const out = 'public/assets/photobooth/frames'
await mkdir(out, { recursive: true })
const rows = [
['gallery-white','갤러리 화이트','기본','ivory','#faf8f2','#32312e','GALLERY / MOMENTS','line'],
['noir-film','누아르 필름','기본','film','#242428','#f7efe0','NEGATIVE / 400','film'],
['silver-contact','실버 콘택트','기본','contact','#e2e5e7','#4d5961','CONTACT SHEET','cross'],
['editorial-red','레드 에디토리얼','기본','editorial','#fff8ef','#c42d36','THE MOMENT ISSUE','line'],
['museum-navy','네이비 뮤지엄','기본','double','#172e43','#d8c695','PRIVATE COLLECTION','cross'],
['pink-satin','핑크 새틴 리본','리본·레이스','ribbon','#fbe9ef','#c9668d','TIED WITH LOVE','bow'],
['blue-lace','블루 레이스','리본·레이스','lace','#e8f1fb','#7498c1','A LITTLE ROMANCE','flower'],
['cherry-coquette','체리 코케트','리본·레이스','gingham','#fff0f2','#af3154','CHERRY ON TOP','cherry'],
['black-bow','블랙 보우','리본·레이스','ribbon','#f6f1e9','#302b30','MON CHERI','bow'],
['pearl-envelope','진주 편지','리본·레이스','pearl','#f3ede3','#92765f','WITH ALL MY LOVE','envelope'],
['strawberry-milk','딸기우유 카페','카페·디저트','stripe','#fff1ec','#db7178','STRAWBERRY MILK','berry'],
['matcha-club','말차 클럽','카페·디저트','gingham','#eef0df','#64816b','MATCHA SOCIAL CLUB','cup'],
['butter-bakery','버터 베이커리','카페·디저트','scallop','#fff0bd','#a66a34','BAKED WITH LOVE','bread'],
['cherry-soda','체리 소다','카페·디저트','bubble','#e7f5fa','#dc4a50','SWEET SODA DAY','cherry'],
['coffee-receipt','커피 영수증','카페·디저트','receipt','#f3e6d5','#6c4b36','ONE CUP OF MEMORIES','cup'],
['blue-desktop','블루 데스크톱','레트로','window','#d9edff','#3471b4','MEMORY.EXE','cursor'],
['lilac-chat','라일락 채팅','레트로','chat','#eee3ff','#8462bf','YOU HAVE A MESSAGE','heart'],
['mint-player','민트 뮤직 플레이어','레트로','player','#ddf6ed','#2d8e80','NOW PLAYING / US','music'],
['pink-arcade','핑크 아케이드','레트로','pixel','#ffe4ee','#d04b96','PLAYER ONE / LOVE','pixelheart'],
['midnight-terminal','미드나잇 터미널','레트로','terminal','#1c2539','#92ebd2','SAVE THE MEMORY_','cursor'],
['birthday-cake','생일 케이크','생일파티','scallop','#fff2de','#ec967e','HAPPY BIRTHDAY','cake'],
['confetti-parade','컨페티 퍼레이드','생일파티','confetti','#fff5d7','#4e82b6','MAKE A WISH','party'],
['balloon-letter','풍선 초대장','생일파티','balloon','#eaf2ff','#8c86cf','TODAY IS YOUR DAY','balloon'],
['candle-wishes','촛불 소원','생일파티','stripe','#f7e5f0','#a4588c','A WISH FOR YOU','candle'],
['party-ticket','생일 파티 티켓','생일파티','ticket','#f9d965','#433a77','ADMIT ONE / BIRTHDAY','star'],
['bias-club','최애 팬클럽','팬클럽','varsity','#edf0ff','#3c5195','MY BIAS CLUB','heart'],
['comeback-stage','컴백 스테이지','팬클럽','stage','#25213e','#ed9ee2','YOU ARE MY HEADLINER','star'],
['lightstick-night','응원봉의 밤','팬클럽','orbit','#162b46','#9edbec','OUR LIGHTS FOR YOU','lightstick'],
['fan-letter','최애에게 쓰는 편지','팬클럽','airmail','#fff5e9','#bd626a','DEAR MY FAVORITE','envelope'],
['birthday-pass','생일카페 입장권','팬클럽','pass','#e9f2da','#547b51','BIRTHDAY CAFE / GUEST','ticket'],
['school-notebook','스쿨 노트','문구·스크랩','notebook','#eef4fc','#527ca3','DEAR DIARY','pencil'],
['kraft-scrapbook','크라프트 스크랩','문구·스크랩','tape','#e7d3b5','#7c624a','KEEP THIS MOMENT','tape'],
['postage-memories','추억 우표','문구·스크랩','stamp','#ede3f4','#8b6b9b','POSTCARD FROM US','envelope'],
['polaroid-date','폴라로이드 데이트','문구·스크랩','polaroid','#fffaf0','#c88b6b','OUR LITTLE ARCHIVE','clip'],
['doodle-page','낙서 다이어리','문구·스크랩','doodle','#fff8d8','#7977b5','GOOD DAYS ONLY','pencil'],
['daisy-garden','데이지 가든','꽃·계절','garden','#eef1df','#6d8a54','IN FULL BLOOM','flower'],
['sakura-letter','벚꽃 편지','꽃·계절','petals','#fff0f3','#d588a1','SPRING WITH YOU','sakura'],
['summer-seaside','여름 바닷가','꽃·계절','wave','#e0f4f8','#498aa9','SALT AIR / SWEET DAYS','shell'],
['autumn-leaf','가을 책갈피','꽃·계절','leaves','#f7e9d2','#b97142','GOLDEN LITTLE DAYS','leaf'],
['winter-snow','겨울 눈꽃','꽃·계절','snow','#e9f0fa','#849ebe','WARM MEMORIES','snow'],
['cosmic-orbit','코스믹 오빗','별·드림','orbit','#272849','#c7b4ee','YOU ARE MY UNIVERSE','planet'],
['moon-mail','달빛 우편','별·드림','moon','#e7e6fa','#837da9','TO THE MOON AND BACK','moon'],
['cloud-nine','구름 위의 하루','별·드림','cloud','#e2f2fe','#83afd0','ON CLOUD NINE','cloud'],
['lucky-clover','행운의 클로버','별·드림','clover','#e8f0df','#58826b','LUCKY TO KNOW YOU','clover'],
['dream-butterfly','꿈꾸는 나비','별·드림','butterfly','#f3e8f9','#b084c3','A BEAUTIFUL DAYDREAM','butterfly'],
['tennis-social','테니스 소셜','취향·컬처','court','#e6efd9','#477b55','LOVE / LOVE','ball'],
['vinyl-record','바이닐 레코드','취향·컬처','record','#f0ded1','#5b454e','OUR FAVORITE TRACK','record'],
['cinema-premiere','시네마 프리미어','취향·컬처','cinema','#241f26','#e2bc7f','STARRING YOU','film'],
['racing-check','레이싱 체크','취향·컬처','checker','#f4eee6','#b63c37','BEST DAY / FULL SPEED','flag'],
['love-airline','러브 에어라인','취향·컬처','boarding','#e7f1f5','#3c7185','DESTINATION / YOU','plane'],
]
const rect=(x,y,w,h,c,rx=0,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${c}" ${extra}/>`
const path=(d,c,extra='')=>`<path d="${d}" fill="${c}" ${extra}/>`
const circle=(x,y,r,c,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${extra}/>`
const text=(x,y,t,c,size=23,extra='')=>`<text x="${x}" y="${y}" fill="${c}" font-family="Helvetica,Arial,sans-serif" font-size="${size}" letter-spacing="4" ${extra}>${t}</text>`
const stroke=(d,c,width=3)=>path(d,'none',`stroke="${c}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`)
function motif(type,c,b){
 const heart=path('M0 24C-52-7-30-45 0-17C30-45 52-7 0 24Z',c)
 const star=path('M0-32 9-10 32-8 15 8 20 31 0 18-20 31-15 8-32-8-9-10Z',c)
 const flower=Array.from({length:5},(_,i)=>`<ellipse cx="0" cy="-18" rx="11" ry="20" fill="${b}" stroke="${c}" stroke-width="2" transform="rotate(${i*72})"/>`).join('')+circle(0,0,8,c)
 const bow=path('M0 0C-68-57-63 38-4 5L-23 53 0 39 23 53 4 5C63 38 68-57 0 0Z',c)+circle(0,0,8,b)
 switch(type){
 case 'heart': return heart
 case 'star': case 'party': return star+stroke('M-43-25l-8-15M35-30l13-12M39 26l15 7',c)
 case 'bow': return bow
 case 'flower': case 'sakura': return flower
 case 'clover': return [0,90,180,270].map(a=>`<g transform="rotate(${a}) translate(0,-15) scale(.55)">${heart}</g>`).join('')+stroke('M0 0Q8 26 22 36',c)
 case 'cherry': return circle(-18,18,15,c)+circle(19,22,15,c)+stroke('M-18 4Q-6-8 0-32Q23-16 19 7',c)+path('M0-30Q40-37 27-13Q8-11 0-30',c)
 case 'berry': return path('M-27-9Q-34 8 0 40Q34 8 27-9Z',c)+path('M0-25-10-10-27-15-17 0 0-8 17 0 27-15 10-10Z','#729264')+[-12,0,12].map(x=>stroke(`M${x} 6v5`,b,3)).join('')
 case 'cup': return rect(-28,-19,46,44,b,6,`stroke="${c}" stroke-width="4"`)+stroke('M18-12Q48-12 39 9Q32 18 19 12M-35 31h70M-13-29q-8-9 0-18M4-29q-8-9 0-18',c)
 case 'bread':return path('M-32 27V-5Q-48-30-20-37Q0-50 20-37Q48-30 32-5V27Z',b,`stroke="${c}" stroke-width="4"`)+stroke('M-18-12v24M0-17v29M18-12v24',c)
 case 'envelope':return rect(-36,-23,72,47,b,3,`stroke="${c}" stroke-width="3"`)+stroke('M-35-22 0 5 35-22M-35 23-10 0M35 23 10 0',c)+`<g transform="translate(0,4) scale(.3)">${heart}</g>`
 case 'cake':return rect(-33,-3,66,35,c,4)+path('M-33-3Q-25 13-16-3Q-8 13 0-3Q8 13 16-3Q25 13 33-3V-13H-33Z',b,`stroke="${c}" stroke-width="3"`)+stroke('M0-14v-23M-43 36h86',c,4)+path('M0-56Q-17-38 0-38Q17-38 0-56',c)
 case 'candle':return rect(-12,-17,24,60,b,2,`stroke="${c}" stroke-width="3"`)+stroke('M-12 0l24-12M-12 21l24-12M-12 42l24-12',c,4)+path('M0-51Q-25-18 0-24Q25-18 0-51',c)
 case 'balloon':return `<ellipse cx="0" cy="-13" rx="25" ry="31" fill="${c}"/>`+stroke('M0 19q-16 18 0 24q16 12-3 23',c,2)+stroke('M-13-27q-8 10-5 20',b,3)
 case 'cursor':return path('M-24-37V28L-6 10 10 38 23 30 7 3H32Z',b,`stroke="${c}" stroke-width="5"`)
 case 'pixelheart':return path('M-36-24h24v12h24v-12h24v36H24v12H12v12H-12V24H-24V12H-36Z',c)
 case 'music':return stroke('M-11 18v-51l42-9v51M-11-23l42-9',c,6)+`<ellipse cx="-23" cy="22" rx="14" ry="10" fill="${c}"/><ellipse cx="19" cy="13" rx="14" ry="10" fill="${c}"/>`
 case 'lightstick':return rect(-9,0,18,47,c,4)+circle(0,-21,29,b,`stroke="${c}" stroke-width="4"`)+`<g transform="translate(0,-21) scale(.5)">${star}</g>`
 case 'ticket':return rect(-39,-22,78,44,b,6,`stroke="${c}" stroke-width="3"`)+stroke('M17-18v36',c,2)+`<g transform="translate(-10,0) scale(.45)">${star}</g>`
 case 'pencil':return `<g transform="rotate(28)">${rect(-9,-40,18,62,c)}${path('M-9 22 0 44 9 22Z',b,`stroke="${c}" stroke-width="2"`)}</g>`
 case 'tape':return `<g transform="rotate(-18)">${rect(-38,-16,76,32,c,0,'opacity=".6"')}${stroke('M-26-13v26M-9-13v26M8-13v26M25-13v26',b,4)}</g>`
 case 'clip':return stroke('M-14 26v-52q0-27 24-23q20 0 20 23v58q0 26-19 26q-18 0-18-26v-49q0-11 11-11q10 0 10 11v43',c,5)
 case 'shell':return path('M0 32Q-60 6-31-25Q-18-47 0-32Q18-47 31-25Q60 6 0 32Z',b,`stroke="${c}" stroke-width="3"`)+stroke('M0 30-27-23M0 30V-30M0 30 27-23',c,2)
 case 'leaf':return path('M-28 29Q-47-31 31-39Q43 24-28 29Z',c)+stroke('M-33 38 21-25',b,3)
 case 'snow':return [0,60,120].map(a=>`<g transform="rotate(${a})">${stroke('M0-37v74M-10-29 0-18 10-29M-10 29 0 18 10 29',c,3)}</g>`).join('')
 case 'planet':return circle(0,0,26,b,`stroke="${c}" stroke-width="3"`)+`<ellipse cx="0" cy="0" rx="46" ry="13" fill="none" stroke="${c}" stroke-width="4" transform="rotate(-25)"/>`
 case 'moon':return path('M14-34C-42-29-35 46 17 33C-15 17-18-8 14-34Z',c)
 case 'cloud':return path('M-31 22Q-53 9-31-6Q-31-39-3-27Q20-40 30-9Q59-2 37 22Z',b,`stroke="${c}" stroke-width="3"`)
 case 'butterfly':return path('M0 0Q-53-59-39-5Q-58 36 0 10Q58 36 39-5Q53-59 0 0Z',b,`stroke="${c}" stroke-width="3"`)+stroke('M0-9v28M0-9-9-23M0-9 9-23',c)
 case 'ball':return circle(0,0,32,b,`stroke="${c}" stroke-width="3"`)+stroke('M-23-22Q18 0-23 22M23-22Q-18 0 23 22',c)
 case 'record':return circle(0,0,37,c)+circle(0,0,26,'none',`stroke="${b}" stroke-width="1"`)+circle(0,0,13,b)+circle(0,0,4,c)
 case 'film':return rect(-30,-36,60,72,c)+[-27,-9,9,27].map(y=>rect(-25,y-3,8,6,b)+rect(17,y-3,8,6,b)).join('')+rect(-11,-25,22,48,b)
 case 'flag':return stroke('M-27-38v80',c,4)+path('M-25-35Q0-49 31-28V9Q0-9-25 4Z',c)
 case 'plane':return path('M-39 1-5-8 4-39 14-39 15-9 42 5 41 14 11 7 8 32-1 37-5 7-36 13Z',c)
 default:return stroke('M-22 0h44M0-22v44',c,3)
 }
}
const wrap=body=>`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 1200 1800">${body}</svg>`
// 인화 재단 안전선 — DS-RX1 의 PR(4x6) 은 4.13x6.15in 로 찍은 뒤 4x6in 로 자른다.
// 원판 기준 위아래 약 28px, 좌우 약 19px 가 잘려 나가므로 글자·선은 가장자리에서 40px 안쪽에 둔다.
// (scripts/verify-photobooth-frames.mjs 가 모든 글자를 이 안전선으로 검사한다)
const SAFE=40
const catalog=[]; const sheet=[]
for(const [i,[slug,title,category,style,b,c,label,icon]] of rows.entries()){
 let art=rect(0,0,1200,100,b)+rect(0,100,100,1700,b)+rect(1100,100,100,1700,b)+rect(0,1760,1200,40,b)
 art+=rect(SAFE,SAFE,1200-SAFE*2,1800-SAFE*2,'none',0,`stroke="${c}" stroke-width="2"`)
 const sides=(fn)=>[50,1150].map(x=>Array.from({length:13},(_,j)=>fn(x,155+j*121,j)).join('')).join('')
 if(['film','cinema'].includes(style)) art+=sides((x,y)=>rect(x-15,y,30,43,b,5,`stroke="${c}" stroke-width="2"`))
 else if(['gingham','checker','court','contact'].includes(style)) art+=sides((x,y,j)=>rect(x-30,y,60,60,c,0,`opacity="${style==='checker'?'.75':'.2'}"`)+rect(x-30,y+60,30,60,c,0,'opacity=".15"'))
 else if(['stripe','airmail'].includes(style)) art+=sides((x,y,j)=>path(`M${x-40} ${y}l80-42v25l-80 42Z`,style==='airmail'&&j%2?'#5f85ae':c,'opacity=".5"'))
 else if(['lace','scallop','pearl','stamp'].includes(style)) art+=sides((x,y)=>[0,30,60,90].map(d=>circle(x,y+d,style==='pearl'?9:15,style==='pearl'?'#fffdf5':'none',`stroke="${c}" stroke-width="2"`)).join(''))
 else if(['notebook','receipt','boarding'].includes(style)) art+=sides((x,y)=>stroke(`M${x-24} ${y}h48m-48 20h48m-48 20h32`,c,2))
 else if(['orbit','moon','stage','snow','confetti'].includes(style)) art+=sides((x,y,j)=>`<g transform="translate(${x},${y}) scale(.28) rotate(${j*31})">${motif(j%2?'star':icon,c,b)}</g>`)
 else if(['wave','garden','leaves','petals'].includes(style)) art+=sides((x,y,j)=>`<g transform="translate(${x},${y}) scale(.48) rotate(${j%2?25:-25})">${motif(icon,c,b)}</g>`)
 else if(['window','chat','player','terminal','pixel'].includes(style)){
 art+=rect(26,26,1148,60,c)+rect(1100,35,58,41,b,0,`stroke="white" stroke-width="3"`)+stroke('M1114 45l27 21m-27 0 27-21',c,4)
 art+=sides((x,y,j)=>rect(x-17,y,34,34,c,0,`opacity="${j%2?'.18':'.5'}"`))
 } else if(style==='ticket'||style==='pass') art+=sides((x,y)=>stroke(`M${x} ${y}v62`,c,3))+Array.from({length:10},(_,j)=>rect(900+j*16,44,j%3?3:8,40,c)).join('')
 else if(['bubble','balloon','cloud','clover','butterfly','record'].includes(style)) art+=sides((x,y,j)=>`<g transform="translate(${x},${y}) scale(${j%2?.55:.9}) rotate(${j%2?18:-18})">${motif(icon,c,b)}</g>`)
 else if(style==='court') art+=sides((x,y)=>rect(x-26,y,52,90,'none',0,`stroke="${c}" stroke-width="3"`))
 else if(style==='tape') art+=sides((x,y,j)=>`<g transform="translate(${x},${y}) scale(.9)">${motif('tape',c,b)}</g>`)
 else if(style==='varsity') art+=sides((x,y,j)=>text(x<600?x+14:x-14,y,String(j+1).padStart(2,'0'),c,30,'text-anchor="middle" font-weight="bold"'))
 else if(style==='ribbon') art+=sides((x,y,j)=>stroke(`M${x} ${y}q-36 30 0 58t0 58`,c,3))
 else if(style==='doodle') art+=sides((x,y,j)=>stroke(`M${x-20} ${y}q40-30 25 12t-25 40`,c,3))
 else art+=sides((x,y,j)=>circle(x,y,j%3?3:6,c,'opacity=".45"'))
 if(style==='double'||style==='ivory'||style==='polaroid') art+=rect(SAFE+12,SAFE+12,1200-(SAFE+12)*2,1800-(SAFE+12)*2,'none',0,`stroke="${c}" stroke-width="${style==='double'?5:1}"`)
 // All substantial art remains in side rails/top title; footer center is transparent.
 const positions= style==='ribbon'?[[75,96,1.2],[1125,360,.85],[75,1250,.7]]:style==='editorial'?[[70,210,.65],[1130,1350,.65]]:[[75,180,1.25],[1125,420,1.05],[70,1020,.95],[1130,1440,1.1]]
 art+=positions.map(([x,y,s],j)=>`<g transform="translate(${x},${y}) scale(${s}) rotate(${j%2?10:-10})">${motif(icon,c,b)}</g>`).join('')
 const computer=['window','chat','player','terminal','pixel'].includes(style)
 art+=text(computer?58:600,computer?66:65,label,computer?b:c,computer?27:32,computer?'':'text-anchor="middle"')
 // 아래 크레딧 줄은 두지 않는다: 행사 칸(y 1564~1764) 아래는 재단으로 잘리는 띠뿐이다
 // Preserve the existing event footer exactly (PRINT.margin=36, footerH=200).
 art=`<defs><mask id="safe"><rect width="1200" height="1800" fill="white"/><rect x="36" y="1564" width="1128" height="200" fill="black"/></mask></defs><g mask="url(#safe)">${art}</g>`
 const markup=wrap(art)
 await writeFile(`${out}/${slug}.svg`,markup)
 await sharp(Buffer.from(markup)).withMetadata({density:300}).png({compressionLevel:9}).toFile(`${out}/${slug}.png`)
 await sharp(Buffer.from(markup)).resize(200,300).webp({quality:90}).toFile(`${out}/${slug}-thumb.webp`)
 const id=`a50f2026-0923-4000-8000-${String(i+1).padStart(12,'0')}`
 catalog.push({id,kind:'frame',title:`${category} · ${title}`,category,image_url:`/assets/photobooth/frames/${slug}.png`,thumbnail_url:`/assets/photobooth/frames/${slug}-thumb.webp`,display_order:200+i,event_id:null,is_active:true})
 const preview=await sharp(Buffer.from(wrap(rect(0,0,1200,1800,'#d9dde3')+rect(160,140,880,1400,'#e9edf1',20)+text(600,820,'YOUR PHOTO','#9ba6b2',48,'text-anchor="middle"')+art))).resize(200,300).png().toBuffer()
 sheet.push({input:preview,left:(i%10)*216+8,top:Math.floor(i/10)*340+8})
 sheet.push({input:Buffer.from(`<svg width="208" height="28"><text x="104" y="19" text-anchor="middle" font-family="Arial" font-size="12" fill="#333">${i+1}. ${slug}</text></svg>`),left:(i%10)*216+4,top:Math.floor(i/10)*340+310})
}
await writeFile('src/lib/photobooth/frame-catalog.json',JSON.stringify(catalog,null,2)+'\n')
await sharp({create:{width:2160,height:1700,channels:3,background:'#faf9f6'}}).composite(sheet).jpeg({quality:90}).toFile('design-review/photobooth-frames-50/contact-sheet.jpg')
await writeFile('design-review/photobooth-frames-50/index.html',`<!doctype html><html lang="ko"><meta charset="utf-8"><title>AC’SCENT 프레임 50종</title><style>body{background:#f6f3ee;color:#252323;font:16px system-ui;margin:32px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:24px}figure{margin:0}img{width:100%;background:#dce2e7}figcaption{padding:12px 0;font-size:14px}h1{font-size:28px}</style><h1>AC’SCENT PHOTO CLUB — 50 FRAMES</h1><p>1200 × 1800 · 투명 PNG · 300 dpi / 사진 영역은 회색으로 표시</p><main>${catalog.map(f=>`<figure><a href="../../public${f.image_url}"><img loading="lazy" src="../../public${f.image_url}" alt="${f.title}"></a><figcaption>${f.title}</figcaption></figure>`).join('')}</main></html>`)
await copyFile('design-review/photobooth-frames-50/contact-sheet.jpg', 'public/assets/photobooth/frame-collection-preview.jpg')
const gallery = await readFile('design-review/photobooth-frames-50/index.html', 'utf8')
await mkdir('public/booth', { recursive: true })
await writeFile('public/booth/frames-preview.html', gallery.replaceAll('../../public/assets/', '/assets/'))
console.log(`Generated ${catalog.length} transparent frames, SVG sources, thumbnails and review gallery.`)
