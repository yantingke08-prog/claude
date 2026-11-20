# assets/broll

B-roll stills (1080×1920) for lines that have no honest trading visual. Each entry is registered in `src/broll.ts`, with the prompt to use.

| id | file | covers | status |
|----|------|--------|--------|
| `desk-watch` | `desk-watch.png` | 你更容易栽在哪种成交上？… 先别急着回答。 | **Not generated yet.** This environment had no imagegen tool. Until the file exists, `src/scenes/Broll.tsx` draws a procedural stand-in: a trader from behind with three glowing screens. |

To use a real still:

1. Generate it with the prompt in `src/broll.ts` (imagegen, 1080×1920).
2. Save it here as `desk-watch.png`.
3. Restart the studio, or re-render. The scene picks it up automatically and adds a slow push-in.

Rules: use your own generated images only. No stock images or images of unknown source, no celebrity likeness, no recognisable brand logos, no real broker UI. Keep the lower quarter dark, because captions sit there.

The reference image `outputs/参考-非交易元素B-roll示例.png` named in the brief was not in the repo, so it was not used.
