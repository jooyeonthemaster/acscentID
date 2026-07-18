import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const researchRoot = path.resolve(__dirname, '..')
const outputRoot = path.join(researchRoot, 'references', 'web', 'instagram-official-recent')

const username = 'acscent_id'
const cutoff = new Date('2025-07-18T00:00:00+09:00')
const headers = {
  accept: '*/*',
  'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
  referer: `https://www.instagram.com/${username}/`,
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'user-agent': 'Instagram 301.0.0.34.110 Android',
  'x-asbd-id': '129477',
  'x-ig-app-id': '936619743392459',
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function extensionFor(contentType, url) {
  const type = String(contentType || '').toLowerCase()
  if (type.includes('png')) return '.png'
  if (type.includes('webp')) return '.webp'
  if (type.includes('avif')) return '.avif'
  if (type.includes('gif')) return '.gif'
  if (type.includes('mp4')) return '.mp4'
  const pathname = new URL(url).pathname.toLowerCase()
  const match = pathname.match(/\.(jpe?g|png|webp|avif|gif|mp4)$/)
  return match ? `.${match[1].replace('jpeg', 'jpg')}` : '.jpg'
}

function bestCandidate(media) {
  if (media?.display_url) {
    return {
      url: media.display_url,
      width: media.dimensions?.width ?? null,
      height: media.dimensions?.height ?? null,
    }
  }
  return [...(media?.image_versions2?.candidates || [])].sort(
    (a, b) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0),
  )[0]
}

function mediaItems(post) {
  if (post.edge_sidecar_to_children?.edges?.length) {
    return post.edge_sidecar_to_children.edges.map((edge) => edge.node)
  }
  return post.carousel_media?.length ? post.carousel_media : [post]
}

function takenAt(post) {
  return post.taken_at_timestamp ?? post.taken_at
}

function captionFor(post) {
  return post.edge_media_to_caption?.edges?.[0]?.node?.text ?? post.caption?.text ?? ''
}

async function fetchJson(url) {
  const response = await fetch(url, { headers })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
  return response.json()
}

async function download(url, destinationBase) {
  const response = await fetch(url, {
    headers: {
      'accept-language': headers['accept-language'],
      referer: headers.referer,
      'user-agent': headers['user-agent'],
    },
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
  const contentType = response.headers.get('content-type') || ''
  const destination = `${destinationBase}${extensionFor(contentType, url)}`
  const bytes = Buffer.from(await response.arrayBuffer())
  await fs.writeFile(destination, bytes)
  return { file: path.basename(destination), bytes: bytes.length, contentType }
}

await fs.mkdir(outputRoot, { recursive: true })

const profile = await fetchJson(
  `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
)
const user = profile?.data?.user
if (!user?.id) throw new Error(`Instagram user not found: ${username}`)

const profilePosts = (user.edge_owner_to_timeline_media?.edges || []).map((edge) => edge.node)
const recentPosts = profilePosts
  .filter((post) => new Date(takenAt(post) * 1000) >= cutoff)
  .sort((a, b) => takenAt(a) - takenAt(b))

const savedPosts = []
for (const post of recentPosts) {
  const publishedAt = new Date(takenAt(post) * 1000)
  const date = publishedAt.toISOString().slice(0, 10)
  const shortcode = post.code ?? post.shortcode
  const directory = `${date}-${shortcode}`
  const destinationDir = path.join(outputRoot, directory)
  await fs.mkdir(destinationDir, { recursive: true })

  const downloads = []
  for (const [index, media] of mediaItems(post).entries()) {
    const candidate = bestCandidate(media)
    if (!candidate?.url) continue
    const result = await download(
      candidate.url,
      path.join(destinationDir, `image-${String(index + 1).padStart(3, '0')}`),
    )
    downloads.push({
      ...result,
      sourceUrl: candidate.url,
      sourceWidth: candidate.width ?? null,
      sourceHeight: candidate.height ?? null,
      mediaType: media.media_type ?? media.__typename ?? null,
    })
    await sleep(250)
  }

  const record = {
    username,
    shortcode,
    url: `https://www.instagram.com/p/${shortcode}/`,
    publishedAt: publishedAt.toISOString(),
    caption: captionFor(post),
    imageCount: downloads.length,
    downloads,
  }
  await fs.writeFile(path.join(destinationDir, 'caption.txt'), `${record.caption}\n`)
  await fs.writeFile(path.join(destinationDir, 'source.json'), `${JSON.stringify(record, null, 2)}\n`)
  savedPosts.push({ ...record, directory })
}

const index = {
  generatedAt: new Date().toISOString(),
  username,
  profileUrl: `https://www.instagram.com/${username}/`,
  profilePostCount: user.edge_owner_to_timeline_media?.count ?? null,
  cutoff: cutoff.toISOString(),
  savedPostCount: savedPosts.length,
  savedImageCount: savedPosts.reduce((sum, post) => sum + post.imageCount, 0),
  posts: savedPosts,
}

await fs.writeFile(path.join(outputRoot, 'index.json'), `${JSON.stringify(index, null, 2)}\n`)
console.log(JSON.stringify(index, null, 2))
