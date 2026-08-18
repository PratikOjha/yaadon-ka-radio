# Yaadon Ka Radio

A single-page nostalgia music site built with Next.js App Router, TypeScript and Tailwind CSS v4.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Add your music

Edit `app/music.ts`. Each song is one line:

```ts
{ id: "cc-4", title: "My song", artist: "My artist", film: "My release", year: 1997, duration: 245, videoId: "YOUR_YOUTUBE_VIDEO_ID" },
```

Only use YouTube uploads you own or are licensed to use, and make sure embedding is enabled. The player is intentionally not seeded with third-party copyrighted songs.

The YouTube IFrame Player API creates the visible player directly in the artwork slot. Playback state drives the vinyl animation, seeking uses pointer events, and deleted/embedding-disabled videos are skipped with a `nostalgia:youtube-error` browser event.

## Assets

- `public/bg/scene-wide.png` — landscape background
- `public/bg/scene-tall.png` — portrait background
- `public/logo.png` — supplied Hindi logotype
