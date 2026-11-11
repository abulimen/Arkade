# Arkade MC guide (one page)

## Setup checklist (10 minutes before)
1. **Projector laptop:** open Arkade, go to **/mc**, choose the game, audience pack and difficulty, tap **Create room**.
2. Open **Open the projector view** in a second window on the projector (Chrome or Edge, full screen, F11). Tap **Enable sound** once.
3. Phones scan the QR code or open the short address and type the 4-letter code. Nobody needs an account.
4. Wi-Fi bad or no internet? Use **local mode**: turn on the laptop hotspot, run `npx tsx scripts/start-local.ts`, put the printed QR code on the projector and have phones join the hotspot.
5. Keep your MC link (it contains your host key). If the page reloads, you are still the MC on this device.

## Running a night
- Watch players "board the ark". **Casting Lots** picks people for the stage and shows "Come to the front!" on their phones.
- **Start** begins the game. Every screen shows a hint: what happens next. **Pause**, **Skip** and **+15 s** are always one tap.
- **Hide answer** removes an inappropriate typed answer or clue before it is shown. **Remove** or **Ban** (🚫) handles trouble-makers.
- At the end the projector shows the podium. Tap **Close room**, then **Create a new room** for the next game.

## Per game
| Game | Before you start | During |
| --- | --- | --- |
| **Spot the Wolf** | Cast lots for 6 to 10 people (4 minimum) or tick them in the player list. Everyone else watches. | Press **Next (said aloud)** when someone speaks a clue instead of typing. A tie for the accused is broken randomly and logged. |
| **Fake Verse** | 3 players minimum. | In the write phase, hide rude fakes. Rounds 5 and 6 are Double Portion. |
| **Gideon's 300** | Best with 30+ people. Defaults: keep 67%, then the top third, 10 finalists. | In Stage 3, use **Re-ask** if a buzz was unfair. Everyone cut becomes a Watchman. |
| **What Came First?** | Team-device mode lets a team share one phone. | Players can undo taps until they lock in. |
| **Who Am I?** | The kids pack shows 4 options instead of 6. | A wrong answer locks a player out of the round. |

## Troubleshooting
- **A phone shows "Reconnecting…":** it keeps its score and answers. Ask them to wait a few seconds or reopen the link.
- **Nobody can join:** check the room code, then switch to local mode on the hotspot.
- **Server restarted:** rooms are restored from snapshots within 30 seconds. Press **Resume** if the game shows paused.
- **No sound:** tap **Enable sound** on the projector window (browsers block autoplay), and check **Sound on** in the console.
