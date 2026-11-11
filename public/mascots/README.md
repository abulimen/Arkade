# Drop-In Mascot Artwork Directory

Drop your generated mascot images (from `docs/MASCOT-PROMPTS.md`) directly into this folder (`public/mascots/`).
`MascotView` automatically detects any image placed here via `/api/mascots` and renders it across the Landing Page, Mobile Player App, Host MC Console, and Projector Stage.

## Supported Filenames (`.webp`, `.png`, `.avif`, `.jpg`, or `.svg`)

| Mascot ID | Character / Game | Default File (Required) | Optional Expression Overrides |
|---|---|---|---|
| `arky` | **Arky** (Host / Brand / Podium) | `arky.png` or `arky.webp` | `arky-idle.png`, `arky-happy.png`, `arky-cheer.png`, `arky-sleepy.png`, `arky-oops.png` |
| `olive` | **Olive** (Courier Dove / Loading / Toasts) | `olive.png` or `olive.webp` | `olive-idle.png`, `olive-happy.png`, `olive-oops.png` |
| `wilf` | **Wilf** (*Spot the Wolf*) | `wilf.png` or `wilf.webp` | `wilf-idle.png`, `wilf-thinking.png`, `wilf-oops.png`, `wilf-surprised.png`, `wilf-cheer.png` |
| `fenn` | **Fenn** (*Fake Verse*) | `fenn.png` or `fenn.webp` | `fenn-idle.png`, `fenn-happy.png`, `fenn-thinking.png`, `fenn-oops.png`, `fenn-cheer.png` |
| `jari` | **Jari** (*Gideon's 300*) | `jari.png` or `jari.webp` | `jari-idle.png`, `jari-surprised.png`, `jari-cheer.png`, `jari-oops.png` |
| `tilly` | **Tilly** (*What Came First?*) | `tilly.png` or `tilly.webp` | `tilly-idle.png`, `tilly-thinking.png`, `tilly-cheer.png`, `tilly-oops.png` |
| `cami` | **Cami** (*Who Am I?*) | `cami.png` or `cami.webp` | `cami-idle.png`, `cami-thinking.png`, `cami-cheer.png` |
