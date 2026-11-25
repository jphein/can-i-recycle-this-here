# Demo video — script and shot list (draft 1)

Target 2:30 (limit 2–3 min). Narration 249 words, recorded with Azure Speech Dragon HD after JP
approves a 20-second voice sample. Screen capture at a 390 × 844 phone viewport (headless browser
recording or a phone screen recording). Uploaded to YouTube or Vimeo by JP unless the vault holds a
login for an existing channel; no new account is created for this.

**JP's hands** are needed for shots 3, 5 and 7: three real items photographed in the office
(a greasy pizza box, a few AA batteries, a vape or pair of earbuds). Everything else is screen
capture the lane can make. If the photo path is still off on the day, shots 3, 5 and 7 show the item
on camera and then the typed answer; the narration below already works for both.

| # | Time | Picture | Narration |
|---|---|---|---|
| 1 | 0:00–0:15 | Three bins at a curb (blue, green, trash); title card "Can I Recycle This Here?" | You're standing at the bins with something in your hand. Blue, green, or trash? The internet gives you rules for somewhere else. |
| 2 | 0:15–0:35 | The app's start page on a phone; scroll past the big photo button and the typed box | This app gives you the rule for here: western Nevada County. Point your phone at the item, or type its name. |
| 3 | 0:35–0:55 | **JP's hands:** a greasy pizza box photographed → green "organics" answer with the county quote | A greasy pizza box. Not the blue cart. It goes in the green cart, and under the answer is the exact sentence from the county's own recycling guide, with the date we read it. |
| 4 | 0:55–1:10 | Zoom on the quote card, link and "Read 2026-11-24" | Every answer works this way. The model only names what it sees. A table built from the county's and the hauler's public pages decides where it goes. |
| 5 | 1:10–1:30 | **JP's hands:** AA batteries → drop-off answer with the eight drop-off sites | Batteries never go inside any cart. They can start fires and hurt waste workers. Bag them on top of your recycling cart, or take them to one of these drop-offs. |
| 6 | 1:30–1:50 | Type "juice box" → yellow "Not sure" card with the Call WM button | And when there's no local rule, the app says so. Juice box: not sure. Here's the hauler's number. It never guesses, because one wrong item can spoil a whole truck of recycling. |
| 7 | 1:50–2:05 | **JP's hands:** a vape → "take the whole device to McCourtney Road" | A vape. Don't pull the battery out. Take the whole thing to the transfer station. |
| 8 | 2:05–2:20 | Terminal: `node scripts/typed-rate.mjs` result line; the test suite passing | I tested it on a hundred typed items. Of the eighty it has rules for, ninety-one percent got the right cited answer. Everything else said "not sure". None went to a wrong cart, and the tests fail if one ever does. |
| 9 | 2:20–2:30 | Repo page; footer tally "3 of 4 checks answered from a cited local rule" | It's open source, it needs no account, and it's built to be handed to the county to keep current. Can I recycle this here? Now you know. |

Word count of the narration column: 249 (limit 320), about 1:50 of speech at a calm pace; the rest is picture.

## Production notes
- Record the screen at 2× scale so the quote text stays readable when YouTube downscales.
- Captions: burn in the narration text (accessibility, and many judges watch muted).
- Music: none, or a CC0 bed at −30 dB under the voice.
- Shot 8 numbers come from `node scripts/typed-rate.mjs` on the day of recording; update the
  narration if they change.
- If the photo path is live by then, add one line to shot 4 naming the model, and show its
  photo hit rate in shot 8.
