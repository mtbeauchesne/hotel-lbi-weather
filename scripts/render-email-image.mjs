// scripts/render-email-image.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const LAT = 39.6453, LON = -74.1879;
const OUT_DIR = "email";

const WMO = {
  0:["Clear","☀"], 1:["Mainly Clear","☀"], 2:["Partly Cloudy","⛅"], 3:["Overcast","☁"],
  45:["Fog","≈"], 48:["Rime Fog","≈"],
  51:["Light Drizzle","☂"], 53:["Drizzle","☂"], 55:["Heavy Drizzle","☂"],
  61:["Light Rain","☂"], 63:["Rain","☂"], 65:["Heavy Rain","☂"],
  71:["Light Snow","❄"], 73:["Snow","❄"], 75:["Heavy Snow","❄"],
  80:["Showers","☂"], 81:["Showers","☂"], 82:["Heavy Showers","⛈"],
  95:["Thunderstorm","⛈"], 96:["Thunderstorm","⛈"], 99:["Severe Storm","⛈"]
};

const fmtTime = iso => new Date(iso).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", timeZone:"America/New_York" });
const fmtDay  = iso => new Date(iso).toLocaleDateString("en-US", { weekday:"short", timeZone:"America/New_York" }).toUpperCase();
const esc = s => String(s).replace(/[&<>]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));

async function fetchWeather() {
  const url = "https://api.open-meteo.com/v1/forecast"
    + `?latitude=${LAT}&longitude=${LON}`
    + "&current=temperature_2m,weather_code,wind_speed_10m"
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset"
    + "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York";
  const res = await fetch(url, { headers: { "User-Agent": "hotel-lbi-weather/1.0" } });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  return res.json();
}

function buildSvg(data) {
  const W = 1200, H = 630;
  const c = data.current;
  const cur = WMO[c.weather_code] || ["—","⛅"];
  const sunrise = fmtTime(data.daily.sunrise[0]);
  const sunset  = fmtTime(data.daily.sunset[0]);
  const wind    = Math.round(c.wind_speed_10m) + " mph";
  const temp    = Math.round(c.temperature_2m);

  const dayCount = 7;
  const dayColW  = (W - 80) / dayCount;
  const days = Array.from({ length: dayCount }, (_, i) => {
    const w = WMO[data.daily.weather_code[i]] || ["—","⛅"];
    const x = 40 + dayColW * i + dayColW / 2;
    const label = i === 0 ? "TODAY" : fmtDay(data.daily.time[i]);
    const hi = Math.round(data.daily.temperature_2m_max[i]);
    const lo = Math.round(data.daily.temperature_2m_min[i]);
    return `
      <text x="${x}" y="470" text-anchor="middle" fill="#ffffff" font-family="Helvetica, Arial, sans-serif" font-size="16" letter-spacing="3" opacity="0.9">${esc(label)}</text>
      <text x="${x}" y="510" text-anchor="middle" fill="#ffffff" font-family="Helvetica, Arial, sans-serif" font-size="28" opacity="0.95">${esc(w[1])}</text>
      <text x="${x}" y="552" text-anchor="middle" fill="#ffffff" font-family="Georgia, 'Times New Roman', serif" font-size="34" font-weight="500">${hi}°</text>
      <text x="${x}" y="582" text-anchor="middle" fill="#ffffff" font-family="Helvetica, Arial, sans-serif" font-size="16" opacity="0.7">${lo}°</text>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#156988"/>
      <stop offset="100%" stop-color="#0f4d65"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <text x="${W/2}" y="86" text-anchor="middle" fill="#ffffff" font-family="Helvetica, Arial, sans-serif" font-size="18" letter-spacing="6" opacity="0.9">HOTEL LBI</text>
  <text x="${W/2}" y="142" text-anchor="middle" fill="#ffffff" font-family="Georgia, 'Times New Roman', serif" font-size="44" font-weight="400">Long Beach Island, NJ</text>
  <line x1="${W/2 - 40}" y1="170" x2="${W/2 + 40}" y2="170" stroke="#ffffff" stroke-opacity="0.32" stroke-width="1"/>
  <text x="${W/2}" y="298" text-anchor="middle" fill="#ffffff" font-family="Georgia, 'Times New Roman', serif" font-size="170" font-weight="300">${temp}°</text>
  <text x="${W/2}" y="338" text-anchor="middle" fill="#ffffff" font-family="Helvetica, Arial, sans-serif" font-size="18" letter-spacing="5" opacity="0.95">${esc(cur[0].toUpperCase())}</text>
  <line x1="120" y1="380" x2="${W-120}" y2="380" stroke="#ffffff" stroke-opacity="0.22" stroke-width="1"/>
  <g font-family="Helvetica, Arial, sans-serif" fill="#ffffff">
    <text x="${W/2 - 280}" y="406" text-anchor="middle" font-size="13" letter-spacing="4" opacity="0.75">SUNRISE</text>
    <text x="${W/2 - 280}" y="436" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="26">${esc(sunrise)}</text>
    <text x="${W/2}" y="406" text-anchor="middle" font-size="13" letter-spacing="4" opacity="0.75">SUNSET</text>
    <text x="${W/2}" y="436" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="26">${esc(sunset)}</text>
    <text x="${W/2 + 280}" y="406" text-anchor="middle" font-size="13" letter-spacing="4" opacity="0.75">WIND</text>
    <text x="${W/2 + 280}" y="436" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="26">${esc(wind)}</text>
  </g>
  ${days}
</svg>`;
}

async function main() {
  const data = await fetchWeather();
  const svg = buildSvg(data);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}/widget.svg`, svg, "utf8");

  const resvg = new Resvg(svg, {
    background: "#156988",
    fitTo: { mode: "width", value: 1200 },
    font: { loadSystemFonts: true, defaultFontFamily: "Helvetica" }
  });
  const png = resvg.render().asPng();
  writeFileSync(`${OUT_DIR}/widget.png`, png);

  console.log(`Rendered ${OUT_DIR}/widget.svg (${svg.length} bytes) + ${OUT_DIR}/widget.png (${png.length} bytes)`);
}

main().catch(err => { console.error(err); process.exit(1); });
