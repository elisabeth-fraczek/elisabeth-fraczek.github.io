# Quo vadis? · Elisabeth Fraczek

A four-page, buildless website for the Senckenberg application. All site code is plain HTML, CSS and JavaScript. Python is only used to refresh the game data or run a local preview.

## Preview on your computer

Unzip the archive. Open a terminal in the directory containing the `senckenberg` folder and run:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000/senckenberg/>. Use this local address to play the game. Browsers can block the JSON requests if you open an HTML file directly.

## Edit the site

| What to change | File |
| --- | --- |
| Home page text and links | `index.html` |
| Photos and captions | `about/index.html`, `assets/photos/` |
| Background, colours, typography and layout | `assets/site.css` |
| Making of and credits | `making/index.html` |
| Game labels and instructions | `game/index.html` |
| Questions, accepted article titles and alternative spellings | `game/data/questions.json` |
| Answer matching, scoring and results | `game/game.js` |
| Stored pageview counts and canonical Wikipedia links | `game/data/pageviews.json` |

The same four navigation links appear in each HTML page. If you change a page name or folder, update its links in all four pages. All site paths are relative to work under `/senckenberg/`.

## Refresh the real Wikipedia data

From **inside** the `senckenberg` folder, run:

```sh
python3 scripts/refresh_pageviews.py
```

The script resolves article titles and redirects with the [MediaWiki Action API](https://www.mediawiki.org/wiki/API:Query), then asks the [Wikimedia Analytics API](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html) for views of each canonical title. It counts the `user` traffic category across all access types on English Wikipedia. Each answer uses the same three complete calendar months (UTC). No API key or Python packages are required. Fetching the counts can take a few minutes.

The supplied snapshot covers August–October 2026. To regenerate that period:

```sh
python3 scripts/refresh_pageviews.py --end-month 2026-10
```

Run the refresh after adding or renaming articles, then preview the game and commit the updated `questions.json` and `pageviews.json`. A refresh only replaces the file after all articles return the expected months. If Wikimedia hasn't published the latest month yet, rerun with an earlier `--end-month`.

For each round, the game sorts the accepted answers by pageviews and awards 100 points to the least-viewed and 20 to the most-viewed, with evenly spaced scores between the ranks. Tied view counts get the same points. Each game uses the bundled snapshot for consistent scores, and the game displays the period. The results show the actual counts and link each answer to its article. Articles are selected for relevance by editing the question list.

## Publish on GitHub Pages

Copy the new folder contents into the existing `senckenberg/` directory in `elisabeth-fraczek.github.io`. If the old site contains obsolete files, use Git to review any removals and make sure the new files are placed directly in `senckenberg/`. Commit and push to the branch that already publishes the site. Check the home page and the game at <https://elisabeth-fraczek.github.io/senckenberg/> after GitHub Pages finishes deploying.

The application gallery uses your supplied photos. The home illustration is AI-generated. Font licenses are included in `assets/fonts/`.
