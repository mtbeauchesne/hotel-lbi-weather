# Hotel LBI Weather

A lightweight weather app for **Hotel LBI** (Long Beach Island, NJ). No build step, no API key, no backend — just static HTML files that pull live data from the free Open-Meteo API.

## Files

- `index.html` — full-page weather experience for guests (current conditions, 7-day forecast, sunrise/sunset, UV, beach day score)
- `widget.html` — compact, email-friendly version designed to be embedded as an iframe at ~600px wide

## Hosting (GitHub Pages)

1. Go to **Settings → Pages**
2. Under **Build and deployment**, set **Source** to `Deploy from a branch`
3. Select the `main` branch and `/ (root)` folder, then **Save**
4. After ~1 minute, the site will be live at:
   - Full app: `https://mtbeauchesne.github.io/hotel-lbi-weather/`
      - Widget: `https://mtbeauchesne.github.io/hotel-lbi-weather/widget.html`

      ## Pulling the widget into the email

      Most email clients strip JavaScript and limit iframes, so there are three good options:

      ### Option A — Linked image card (most compatible)

      Render a daily snapshot of the widget as an image and link it to the live page:

          <a href="https://mtbeauchesne.github.io/hotel-lbi-weather/widget.html">
                <img src="https://yourcdn.com/hotel-lbi-weather-card.png"
                           alt="Today on Long Beach Island" width="600" />
                               </a>

                               Generate the daily image with htmlcsstoimage.com, urlbox.io, or a small Cloudflare Worker pointed at `widget.html`.

                               ### Option B — Inline iframe (Apple Mail / some webmail)

                                   <iframe src="https://mtbeauchesne.github.io/hotel-lbi-weather/widget.html"
                                               width="600" height="320"
                                                           style="border:0; border-radius:14px;"
                                                                       title="Hotel LBI Weather"></iframe>

                                                                       ### Option C — Server-rendered (AMP for Email, Iterable, Customer.io, Braze Connected Content)

                                                                       Have your ESP fetch `widget.html` server-side at send time and inline the rendered HTML.

                                                                       ## Customization

                                                                       - **Location**: change `LAT`/`LON` constants. Default is Ship Bottom, NJ (39.6453, -74.1879).
                                                                       - **Brand colors**: edit the CSS custom properties in `:root` to match Hotel LBI palette.
                                                                       - **Beach Day Score**: tunable heuristic in `beachScore()` inside `index.html`.

                                                                       ## Data source

                                                                       Open-Meteo (open-meteo.com) — free, no API key required.
