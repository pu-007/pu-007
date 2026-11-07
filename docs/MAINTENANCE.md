# Profile maintenance

Edit README.md for profile copy. Keep planned work labeled as exploration.

## Language card

The workflow runs every six hours, on relevant pushes, and on manual dispatch.
It uses the built-in GITHUB_TOKEN; no PAT or external SVG service is required.
Node.js 24 is sufficient; there are no npm dependencies.

The query reads all public, owned, non-fork repositories, then sums GitHub's
language byte counts. The card shows the twelve largest languages; all
languages remain in the percentage denominator. Archived repositories count.
This measures repository contents, not proficiency or personally authored lines.

Run tests with: node --test tests/*.test.mjs
Refresh from the Actions tab: Update README Cards → Run workflow.

API and pagination failures fail the workflow before replacing the last valid SVG.
The original stats step queried the restricted stargazers connection and saved
its API error as a successful image. Stats, rank, contribution charts, and unused
error cards have been removed. Only the requested language breakdown remains.

## Artwork

assets/hero.svg contains outlined Monotype Corsiva lettering with a subtle
animated gradient and orbit. Text outlines avoid remote font requests and
missing-font substitutions. The name remains available through SVG title/desc
and the README image alt text. Reduced-motion preferences stop the animation.
assets/footer.svg uses the same palette.

The skill-icon rows use skillicons.dev. All essential artwork and the language
card are stored in this repository.
