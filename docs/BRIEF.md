# Little Days — Liber Dierum

**Idea.** A photo gallery keeps how a day looked, not how it felt. Little Days binds each day into a 3D storybook. You write a few lines, add photos and the day's song, and the day becomes a page. Touch its photograph and the picture unfolds into a pop-up paper theatre: two paper characters step out of it and act the day while an old storyteller reads it aloud.

**Audience.** People who want to return to a day a year later and feel it again: couples, families, travellers.

**How it works.** The book flies in out of the darkness and opens on touch. You pull pages by hand to move between days. Each spread holds the written entry on the left and the photo on the right. Touching the photo lifts it into a standing backdrop, layers cut from the same photo rise in front of it, and a fox and a hare act out the mood's ritual. A grandfatherly voice reads the passage with subtitles while the song plays softly underneath. The last page is blank: tap it to write a new day.

**What the system reads from the input.**
- **Text:** English or Russian keywords set the mood, and the entry's own wording gives the day a short title.
- **Photo:** its average colour tints the scene, and the photo itself becomes the backdrop and the cut-paper layers.
- **Song:** its loudness and rhythm (sharp rises in the first minute) set the pace, and it plays under the page.

**Visual system.**
- **Always the same:** the leather-bound book, parchment layout, typography (inscriptional capitals, old-style text, an illuminated gold initial), the gold frame, the stage order (backdrop, far layer, characters, near layer) and the narrator's voice.
- **Changes with the mood:**
  - **Gold** (lake, sunset, warmth): reeds, glints on water, a ticket folded into a paper boat.
  - **Rain** (rain, night, tiredness, blue photo): a lit street, falling rain, an umbrella and a lantern.
  - **Bloom** (flowers, spring, singing, lively song): poppies, a fiddle, rising notes, a bird.

**Artistic references.** Pop-up books and Victorian toy theatres; Disney's multiplane camera for layered depth; illuminated manuscripts for gilt initials and frames; storybook openings from fairytale films; candlelight and drifting gold dust, finished with a film grade (glow, depth of field, grain, vignette).

**Tools.** Three.js (WebGL), GSAP, Vite, Canvas 2D, Web Audio, IndexedDB. Narration by ElevenLabs (voice "Bill", multilingual v2 model). Fonts: Cinzel, Cinzel Decorative and IM Fell English (Google Fonts). Songs: *Chill Sunset* (Finley), *Rain Music* (Alex Morgan), *Relax* (AndriiG). Hosted on Vercel. Development assisted by Claude (Anthropic) through Claude Code.

**Links.** Prototype: https://express-charcoal-6ex1vrx.tmp.now · Demo: `media/little-days-demo.mp4`
