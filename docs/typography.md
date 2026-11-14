# Typography

The interface scale follows [Palermo's typography roles](https://palermo.tryprofound.com/docs/typography). Each `--type-*-font` token defines size, unitless line height, weight and the existing font stack together. Text color is chosen separately.

| Role | Default size / line height | Weight | Use |
| --- | --- | --- | --- |
| Page title | 28 / 32 px | 600 | Settings and graph page titles |
| Title | 24 / 32 px | 600 | Section headings and the archive action |
| Subtitle | 18 / 24 px | 600 | Cards, previews and dialog titles |
| Body | 14 / 20 px | 400 | Interface text and controls |
| Body spaced | 14 / 24 px | 400 | Multiline previews and comments |
| UI | 13 / 18 px | 400 | Compact controls and field labels |
| UI spaced | 13 / 20 px | 400 | Help text and descriptions |
| Caption | 12 / 16 px | 400 | Dates, counts and metadata |
| Paragraph | Reader's size / 1.7 | Reader's weight | Article prose and reading previews |
| Paragraph small | 13 px / 1.7 | 400 | Secondary prose |

CSS uses `rem` sizes so these pixel values scale with the browser's text-size setting. Title tracking is `-0.015625rem` (−0.25 px at the default root size). Display typography on the home, archive and article opening remains a separate editorial role.

Use a complete token, such as `font: var(--type-ui-spaced-font)`, or the corresponding `.type-ui-spaced` class. Both inherit color. Emphasis changes the weight to `--font-weight-medium` or `--font-weight-semibold`; it does not introduce another size. Components with a deliberate serif or monospace family can apply the role's size, leading and weight individually.

Long-form reading defaults to 16 px and remains adjustable independently of the interface scale. Article headings descend through 2, 1.5, 1.25, 1.125 and 1 times the reading size. Paragraph spacing uses one shared rhythm, and the article width preference also sets the settings page's maximum width.

Multiline text uses a spaced role. Form inputs use at least `1rem` on touch devices to avoid iOS page zoom. Numbers that change use `font-variant-numeric: tabular-nums`. Heading wrapping, underline styling and colors remain independent of the font token.
