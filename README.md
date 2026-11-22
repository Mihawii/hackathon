# Little Days · Liber Dierum

A diary that keeps how a day *felt*. Each day — a few written lines, its photographs and its song — is bound into a sacred-looking 3D storybook. Touch a page's photograph and it unfolds into a pop-up paper theatre: two paper players step out of the picture and act the day while an old storyteller reads it aloud.

Built for the Genesis Hackathon · ArtTech case *Make the Invisible Visible* (November 2026).

- **Live site:** https://express-charcoal-6ex1vrx.tmp.now
- **Demo video:** [media/little-days-demo.mp4](media/little-days-demo.mp4) · narration only: [media/little-days-narration.mp3](media/little-days-narration.mp3)
- **One-page brief:** [docs/BRIEF.md](docs/BRIEF.md)

## Run it

Requires Node.js 22.12 or newer.

```sh
npm install
npm run dev        # http://127.0.0.1:8427/
npm run build      # static site in keepsake/dist/ (relative paths, host anywhere)
npm run deploy     # build and update the Vercel deployment
```

On a Mac you can also double-click **Start Little Days.command**.

## Using the book

1. The book flies in out of the dark and comes to rest over a slowly turning seal of runes. Tap it to open.
2. Drag a page corner toward the spine to turn it; the leaf follows your hand. Arrow keys work too. When idle, the corner lifts by itself to show it can be pulled.
3. Hover the photograph and it lights up; tap it. The print charges with light, springs up as a backdrop, layers cut from the same photo snap open in front of it, and a fox and a hare spin out of the picture to act the day. A narrator reads with subtitles while the day's song steps back. Tap anywhere to fold it all back into the page.
4. The last leaf is blank. Tap it to write a new day: date, words, photographs and a song file or link. The day is bound into the book in this browser (IndexedDB).

A hint at the bottom of the screen always names the next thing to do.

## How a day becomes a page

| Input | What the system reads | What it changes |
| --- | --- | --- |
| Text (English or Russian) | Mood words: lake, sunset, warmth → *gold*; rain, night, tiredness → *rain*; flowers, spring, singing → *bloom* | The mood, the ritual, the weather, and a short title made from the entry's own words |
| Photographs | Average colour of the first photo | The tint, and when the words leave the mood open, the mood itself; the photo becomes the backdrop and the torn layers of the scene |
| Song | Loudness and the rate of sharp rises in the first minute (or the energy picked for a link) | The pace; the song plays under the page and ducks under the voice |

**Constant across every day:** the leather binding, the parchment layout, the type (inscriptional capitals, old-style text, an illuminated gold initial), the gold-ruled frame, the stage order (backdrop, far layer, players, near layer) and the narrator.

**Changing with the mood:**

- *Gold* — reeds, glints on the water, a ticket folded into a paper boat that sails off.
- *Rain* — falling rain, an umbrella, a lantern lit against the wet street.
- *Bloom* — paper poppies, a fiddle, rising notes, a bird crossing.

## Artistic references

Pop-up books and Victorian toy theatres; Disney's multiplane camera (layered depth); illuminated manuscripts (gilt initials, ruled frames); storybook openings of fairytale films; candlelight and drifting gold dust, finished with a film grade — bloom, depth of field, split-tone, vignette and grain.

## Project structure

```
keepsake/                 the web app (Vite root)
  index.html              page shell, captions, hint, writing desk
  album.js                days, storage, music, narration, hints, new-day form
  book-model.js           the 3D book: framing, page pulls, stage camera, fly-in, post-processing
  grimoire.js             painted leather cover, sigil, gilt and marbled materials
  popup.js                the pop-up theatre: torn photo layers, players, props, weather
  paper-player-art.js     jointed paper fox and hare, ticket, umbrella, lantern, fiddle, bird
  sparkles.js             gold dust shared by every effect
  narration.js            plays the narration with subtitles; falls back to Flite, device voice, captions
  album.css               layout and the writing-desk dialog
  assets/                 book model, sample photos, songs, narration
  tools/                  book model generator (make_book.py) and embedder (embed-book.mjs)
scripts/
  generate-narration.mjs  re-record the narration with an ElevenLabs API key
  deploy-vercel.sh        build and deploy
docs/BRIEF.md             one-page project brief
media/                    demo video and narration
```

## Voice

The narration is recorded with ElevenLabs, voice **Bill** (an older, warm narrator), model `eleven_multilingual_v2`, one take per sentence joined with film-paced pauses so the subtitles are exact (`keepsake/assets/narration/elevenlabs/`). If it cannot load, the book falls back to CMU Flite recordings, then a device voice, then subtitles alone. To re-record with your own key: `ELEVENLABS_API_KEY=… npm run voice`.

## Credits and tools

- Three.js (WebGL), GSAP, Vite, Canvas 2D, Web Audio, IndexedDB.
- Narration: ElevenLabs. Fallback voice: CMU Flite `awb`.
- Fonts: Cinzel, Cinzel Decorative, IM Fell English (Google Fonts).
- Songs for the sample days: *Chill Sunset* by Finley, *Rain Music* by Alex Morgan, *Relax* by AndriiG.
- The book model is generated by `keepsake/tools/make_book.py`; the cover, sigil and page ornament are painted in code. The three sample photographs were generated for the demo.
- Camera timing and pointer damping draw on the hackathon kit's *3D Animation / 3* (`cinematic-scene-showcase.tsx`) and *3D Animation / 5* (`Rig.jsx`).
- Development assisted by Claude (Anthropic) through Claude Code.
