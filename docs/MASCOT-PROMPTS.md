# Arkade Mascot Concepts & AI Image Generation Prompts

## Why the Current Mascots Fail
In `src/ui/mascots.tsx`, all seven mascots are built out of raw geometric SVG primitives (`<circle>`, `<ellipse>`, `<rect>`) sharing the exact same stamped `<Face />` component and floating pink circles. Inanimate props like a wooden hull (`arky`) and a clay pot (`jari`) have flat eyes pasted onto them with stick-line arms. None of them have silhouette readability, anatomical charm, material depth, or commercial party-game appeal.

---

## How to Use This Guide
1. **Pick a Global Art Direction (Style Lock)** below so all 7 mascots look like they belong to the same game studio.
2. For each of the **7 mascots**, pick **Variation A**, **Variation B**, or **Variation C** (these vary both the **character concept**—e.g., replacing a literal boat/pot with an actual character—and the **visual framing**).
3. Copy the prompt (and optionally append the **Expression Sheet Modifier** if you want a 4-pose sheet in one generation).
4. Once you generate the images you love, share them here and we will process them into crisp transparent WebP/PNG game assets and wire them into the redesigned UI.

---

## Global Style Locks (Append to Any Prompt for Consistency)

- **Style Lock 1 — 3D Nintendo / Supercell Toy Figurine (Recommended for Mobile App + Projector Pop):**
  > `3D stylized character render, Nintendo Switch party game aesthetic, Supercell Clash Royale character appeal, tactile matte vinyl and warm brushed gold materials, subsurface scattering, rim lighting in warm amber and electric cyan, clean silhouette, centered full-body character on a solid flat pure dark navy #0D0B1E background for easy background removal, octane render, 8k, no text, no watermark`
- **Style Lock 2 — 2D Bold Game-Show Illustration (Jackbox / Brawl Stars / Disney TV Animation):**
  > `2D commercial video game character illustration, Brawl Stars and Jackbox Party Pack art style, bold expressive tapered ink outlines, rich cel-shaded lighting with warm rim highlights, dynamic asymmetric pose, high-contrast saturated game palette, centered full-body sticker-ready character isolated on a solid flat pure white background, no text, no watermark`
- **Style Lock 3 — Tactile Stop-Motion Craft (Link's Awakening / It Takes Two Miniature):**
  > `Tactile miniature stop-motion game character, carved painted cedar wood, stitched felt, and hammered brass details, tilt-shift studio macro lighting, charming handcrafted proportions, centered full-body character isolated on a solid flat dark slate background, no text, no watermark`

---

## 1. ARKY — Brand Host & Lobby Captain
**Current problem:** A flat brown trapezoid boat hull with eyes pasted on the cabin and a triangle roof.
**Role in game:** Welcomes players on the Landing Page, Lobby, Casting Lots spotlight, and Winner Podium.

### Variation 1A: Captain Arky — The Sea-Otter Ark Navigator (Character Upgrade)
Instead of a faceless boat with eyes, Arky is a charismatic, chubby sea-otter captain wearing an ancient brass compass-medal, a woven captain's tunic, and a miniature wooden ark-shaped captain's hat with a red pennant.
```text
A charismatic chubby sea-otter game-show host character named Captain Arky, wearing a whimsical captain's hat shaped like a miniature wooden Noah's ark with a tiny red pennant flag on top, a royal indigo tunic with warm gold trim, and holding a glowing golden lantern. Big expressive joyful eyes, welcoming open-armed game host pose, warm friendly grin. 3D stylized character render, Nintendo Switch party game aesthetic, Supercell character appeal, tactile fur and warm polished wood materials, rim lighting in warm gold and cyan, centered full-body on a solid flat dark navy #0D0B1E background, 8k, no text.
```

### Variation 1B: The Living Ark — Stylized Storybook Vessel Character
Keeps Arky as the Ark itself, but redesigned like a Pixar/DreamWorks living ship—carved cypress bowsprit shaped like a friendly lion-figurehead, glowing warm cabin windows, billowing rainbow-trimmed sail, and splashing stylized turquoise waves at the base.
```text
An enchanting stylized 3D miniature wooden Noah's Ark character brought to life with Pixar-level charm, curved cypress wood hull with warm glowing lantern windows, a friendly carved figurehead at the bow with expressive animated eyes and a joyful smile, a small red pennant waving from the mast, sitting atop a swirl of stylized glossy turquoise ocean waves. Nintendo party game toy aesthetic, rich wood grain and warm golden rim light, centered on a solid flat dark navy #0D0B1E background, 8k, no text.
```

### Variation 1C: Noah's Little Helper — Young Lion Herald in Captain's Gear
A cheerful golden lion cub dressed as the Ark's Quartermaster, holding a brass spyglass and standing on a wooden deck plank.
```text
An adorable, confident golden lion cub game-show host character wearing an oversized wooden ark-captain's hat and a teal bandana, holding a brass spyglass in one paw and waving excitedly with the other. Expressive oversized eyes, fluffy mane with warm golden highlights, 2D Brawl Stars and Jackbox Party Pack vector illustration style, bold ink outlines, cel-shaded vibrant colors, centered full-body sticker design on a solid flat dark background, no text.
```

---

## 2. OLIVE — Messenger Dove (Loading, Reconnect, Toasts & Olive-Leaf Points)
**Current problem:** A white circle with a triangle nose and three green blobs sticking out of its cheek.
**Role in game:** Appears during loading, connection status, notifications, and represents the Olive Leaf score currency.

### Variation 2A: 3D Plump Courier Dove with Aviator Satchel & Glowing Olive Branch
```text
An adorable, plump white mourning dove game mascot named Olive, wearing a tiny leather courier satchel with a gold buckle and a jaunty olive-green beret, carrying a freshly plucked glowing emerald olive branch in her beak. Expressive big warm dark eyes, soft sculpted feather layers with pearlescent lavender-white shading, mid-flutter hovering pose with wings spread gracefully. 3D stylized Nintendo Switch / Pixar character render, soft studio rim lighting, centered full-body on a solid flat dark navy #0D0B1E background, 8k, no text.
```

### Variation 2B: 2D Expressive Cartoon Herald Dove (Cuphead / Brawl Stars Energy)
```text
A lively, expressive 2D cartoon white dove mascot character in mid-flight, holding a golden-stemmed green olive branch like a herald's trumpet, wearing a small purple neckerchief. Exaggerated cheerful eyes, dynamic wing feathers, bold variable-width ink outlines, vibrant cel-shading, commercial party game art style, centered sticker-ready full-body character on a solid flat dark background, no text.
```

### Variation 2C: Seraphic Origami / Carved Wood & Enamel Dove Charm
```text
A charming toy-like dove mascot crafted from smooth porcelain-white wood, brushed gold wingtips, and translucent emerald glass olive leaves held in its beak, expressive painted eyes, floating above a soft golden halo ring. Tactile miniature game figurine aesthetic, macro studio lighting, centered on a solid flat dark navy #0D0B1E background, 8k, no text.
```

---

## 3. WILF — *Spot the Wolf* (Social Deduction Game Mascot)
**Current problem:** A grey circle with seven white circles glued around its chin to represent "sheep wool".
**Role in game:** Represents the hidden impostor in *Spot the Wolf*—needs to look hilariously sneaky, theatrical, and caught-in-the-act.

### Variation 3A: Sly Cartoon Wolf in an Oversized Knit Wool Hoodie (3D Toy Style)
```text
A hilariously sneaky cartoon grey wolf mascot named Wilf wearing an oversized, fluffy cream-colored sheep's wool hoodie with floppy sheep ears pulled halfway over his pointy wolf ears, one zipper tooth showing, holding a finger to his grin in a "shh" secret-agent gesture. Glowing amber eyes looking sideways mischievously, bushy wolf tail poking out the back of the sheep costume. 3D stylized Supercell / Nintendo party game character render, rich шерсть/wool and fur textures, dramatic campfire orange and moonlight blue rim lighting, centered full-body on a solid flat dark navy #0D0B1E background, 8k, no text.
```

### Variation 3B: Detective-Noir Wolf Holding a Sheep Mask on a Stick (2D Game-Show Style)
```text
A theatrical, comical big bad wolf character in a detective trenchcoat, holding a cute smiling fluffy sheep mask on a wooden stick half-covering his face, with his sly yellow wolf eyes and toothy grin peeking out from behind it. 2D Brawl Stars / Jackbox party game illustration style, bold outlines, dramatic shadows and warm campfire highlights, centered full-body character on a solid flat dark background, no text.
```

### Variation 3C: Little Sheep with a Wolf Shadow / Reversible PlushMascot
```text
A mischievous wolf cub zipped inside a puffy marshmallow-like sheep onesie costume that is bursting at the seams, with one grey wolf paw and a big bushy tail sticking out, wide comedic "caught red-handed" expression. 3D vinyl toy collectible style, soft studio lighting, centered full-body on a solid flat dark navy #0D0B1E background, 8k, no text.
```

---

## 4. FENN — *Fake Verse* (Bluffing & Scribe Game Mascot)
**Current problem:** An orange oval with two red triangles and a white triangle quill floating next to its hip.
**Role in game:** The clever wordsmith who writes convincing fake answers to fool the room.

### Variation 4A: Master Scribe Fennec Fox with Oversized Feather Quill & Parchment Scroll (3D Style)
```text
A clever, charismatic fennec fox scribe mascot named Fenn with huge expressive ears, wearing a royal violet scholar's vest with gold embroidery and half-moon spectacles perched on his snout, holding an oversized iridescent peacock-white feather quill and a floating rolled parchment scroll with wax seals. Smug, witty "I just wrote a masterpiece" grin. 3D stylized Nintendo / DreamWorks character render, plush orange and cream fur, warm candlelit gold rim lighting, centered full-body on a solid flat dark navy #0D0B1E background, 8k, no text.
```

### Variation 4B: 2D Trickster Bard Fox Twirling a Golden Ink Pen
```text
An energetic 2D cartoon fennec fox trickster character wearing a Renaissance scribe cap and capelet, twirling a glowing golden quill pen between his paws while a long ancient scroll unspools around him. Big mischievous eyes, sharp silhouette, bold comic ink lines, rich cel-shaded colors in tangerine, gold, and deep indigo, Jackbox and Brawl Stars character art style, centered on a solid flat dark background, no text.
```

### Variation 4C: Cozy Ink-Stained Scholar Fox Cub Sitting on Stacked Scrolls
```text
An adorable fennec fox cub with tiny ink smudges on his paws and nose, sitting atop a stack of ancient wooden-handled parchment scrolls, holding a giant feather quill twice his size, looking up with a cheeky scheming smile. 3D tactile vinyl game figure, warm studio lighting, centered full-body on a solid flat dark navy #0D0B1E background, 8k, no text.
```

---

## 5. JARI — *Gideon's 300* (Survival Trivia & Torch/Trumpet Game Mascot)
**Current problem:** A terracotta pot with a face on its stomach and black stick-lines for arms.
**Role in game:** High-stakes 300-player survival trivia inspired by Gideon's 300 (Judges 7: torches hidden in clay jars + ram's horn trumpets).

### Variation 5A: Little Torch-Golem Warrior — Living Cracked Terracotta Knight with Ram's Horn (3D Style)
Upgrades the clay jar into an adorable, heroic fantasy creature (think *Clash Mini* / *Zelda* guardian pot spirit) with glowing fire peeking through cracks and a ram's horn shofar!
```text
A heroic, pint-sized living terracotta clay-jar golem mascot named Jari, shaped like a stout ancient Canaanite pitcher with stubby armored clay limbs, glowing golden-orange firelight shining through dramatic cracks in his clay body, a roaring stylized flame crown rising from his top opening, and holding a curved ivory ram's horn trumpet (shofar) in one hand. Fierce yet cute determined eyes, 3D Supercell Clash Royale / Nintendo character render, warm firelight and deep midnight shadows, centered full-body on a solid flat dark navy #0D0B1E background, 8k, no text.
```

### Variation 5B: Gideon's Cub — Brave Young Lion Scout Holding a Flaming Pitcher & Shofar (Character Upgrade)
Replaces the inanimate pot altogether with a brave animal warrior carrying Gideon's iconic jar-and-torch and trumpet.
```text
A brave, pint-sized desert lion cub warrior mascot for "Gideon's 300", wearing a bronze headband and woven sash, holding a cracked terracotta pitcher bursting with bright golden flame in one paw and a curled ram's horn trumpet in the other. Heroic excited expression, dramatic upward torchlight glow, 3D stylized Nintendo / Supercell character render, centered full-body on a solid flat dark navy #0D0B1E background, 8k, no text.
```

### Variation 5C: 2D Arcade Flame-Spirit Popping Out of a Cracked Clay Pitcher
```text
A dynamic 2D game-show mascot: a cheerful, blazing golden fire-spirit character popping halfway out of a cracking ancient terracotta clay jar, blowing a curled ram's horn trumpet with confetti sparks flying around. Bold variable ink outlines, vibrant orange, gold, and teal cel-shading, Brawl Stars art style, centered full-body sticker on a solid flat dark background, no text.
```

---

## 6. TILLY — *What Came First?* (Chronology & Timeline Game Mascot)
**Current problem:** A green semicircle with hexagons, wireframe glasses, and a stick hourglass floating beside it.
**Role in game:** Ancient timekeeper who challenges players to put Bible events in chronological order.

### Variation 6A: Professor Tilly — Ancient Timekeeper Tortoise with Brass Astrolabe Shell & Hourglass (3D Style)
```text
A lovable, wise old Galapagos tortoise professor mascot named Tilly, whose emerald-and-gold shell is inlaid with glowing brass clockwork gears and ancient sundial markings. Wearing round brass spectacles on the tip of her nose and a scholar's scarf, holding a glowing golden-sand hourglass in one flipper while pointing a finger in an "aha!" pose. 3D stylized Nintendo / Pixar character render, rich reptilian skin texture, polished brass and glowing sand, centered full-body on a solid flat dark navy #0D0B1E background, 8k, no text.
```

### Variation 6B: Time-Traveler Sea Turtle Riding a Swirling Sand-Clock Ribbon (2D Game-Show Style)
```text
A spirited 2D cartoon tortoise time-traveler character wearing brass steampunk-lite goggles and a vest with pocket watches, surfing on a swirling ribbon of golden hourglass sand and timeline cards. Expressive wide eyes behind round glasses, bold clean outlines, rich emerald green, amber gold, and sky blue palette, Jackbox / Brawl Stars illustration style, centered on a solid flat dark background, no text.
```

### Variation 6C: Chibi Clockwork Tortoise Toy with Glowing Hexagonal Shell Plates
```text
An adorable chibi tortoise game mascot with oversized round spectacles, a dome shell made of faceted jade-green and gold hexagonal tiles that softly glow, clutching a miniature wooden hourglass with both paws. 3D vinyl collectible toy aesthetic, soft studio lighting, centered full-body on a solid flat dark navy #0D0B1E background, 8k, no text.
```

---

## 7. CAMI — *Who Am I?* (Progressive Clue & Mystery Identity Mascot)
**Current problem:** Two overlapping green circles and a curved line for a tail with a transparent circle for a monocle.
**Role in game:** Mystery detective who shifts colors and gradually reveals identity as clues 1-to-4 drop.

### Variation 7A: Sherlock Cami — Color-Shifting Chameleon Detective with Brass Magnifying Glass (3D Style)
```text
A quirky, charming chameleon detective mascot named Cami, wearing a miniature checked deerstalker detective cap and a tiny capelet, holding a large brass magnifying glass up to one oversized turret eye that is zoomed in huge through the lens. Her scaly skin transitions in a vibrant iridescent gradient from emerald green to electric cyan and violet with glowing question-mark spot patterns, curled spiral tail. 3D stylized Nintendo / Pixar character render, rich iridescent scale shader, studio rim lighting, centered full-body on a solid flat dark navy #0D0B1E background, 8k, no text.
```

### Variation 7B: 2D Mystery-Show Chameleon Inspector Peeking Over Clue Cards
```text
A playful 2D cartoon chameleon detective character with a curled tail and crested head, wearing a trenchcoat collar and holding a giant magnifying glass that magnifies his huge curious eye, surrounded by floating golden question marks. Vibrant rainbow-shifting scales, bold ink outlines, cel-shaded lighting, Brawl Stars / Jackbox Party Pack character style, centered full-body on a solid flat dark background, no text.
```

### Variation 7C: Neon-Prism Chameleon Figurine Half-Cloaked in Starlight Silhouette
Matches the in-game mechanic where Cami starts in mystery silhouette and fills with color as clues appear:
```text
A stylized 3D chameleon mascot perched on a glowing golden question mark, half of its body shimmering in cosmic deep indigo starlight silhouette and the other half bursting into vivid turquoise, emerald, and gold scales, holding a brass spyglass. Nintendo party game character aesthetic, centered full-body on a solid flat dark navy #0D0B1E background, 8k, no text.
```

---

## Optional Bonus Prompts

### Bonus 1: Expression Sheet Modifier (Append to any mascot prompt if you want 4 emotions at once)
If you want a single image containing 4 expressions (`idle`, `cheer`, `thinking`, `surprised/oops`) that we can slice into reactive sprites:
```text
Character expression sheet showing 4 distinct full-body poses arranged in a clean 2x2 grid on a solid flat dark navy #0D0B1E background: (top-left) cheerful welcoming idle pose, (top-right) jumping celebratory cheering pose with stars, (bottom-left) chin-scratching curious thinking pose, (bottom-right) comedic wide-eyed surprised gasp pose. Consistent character proportions and lighting across all 4 poses, no text, no labels.
```

### Bonus 2: Landing Page Hero Banner / Key Art Ensemble
If you want a flagship hero illustration for the new Landing Page featuring the characters together:
```text
Key art hero illustration for a mobile party game called "ARKADE": an enchanted glowing wooden Ark stage at night lit by warm golden lanterns and festival spotlights, with five expressive 3D stylized animal mascots (a sea-otter captain, a wolf in a sheep hoodie, a fennec fox scribe with a quill, a glowing flame-jar warrior with a ram's horn, a bespectacled tortoise with an hourglass, and a chameleon detective with a magnifying glass) celebrating around a glowing golden game buzzer. Nintendo Switch party game box-art quality, vibrant jewel-toned lighting, 16:9 widescreen, no text.
```
