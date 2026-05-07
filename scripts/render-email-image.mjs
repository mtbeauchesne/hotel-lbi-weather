#!/usr/bin/env node
// Renders email/widget.svg and email/widget.png from live Open-Meteo data.
// Brand: Hotel LBI — white background, Prata serif headings, Montserrat sans-serif labels,
// deep teal #156988 accents, custom inline SVG weather icons.

import fs from "node:fs/promises";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

const LAT = 39.6418;
const LON = -74.1857;
const TZ = "America/New_York";
const W = 1200, H = 630;
const OUT_DIR = "email";

// ---------- helpers ----------
function fmtTime(s){
  if (!s) return "--";
  const m = s.match(/T(\d{2}):(\d{2})/);
  if (!m) return "--";
  let h = parseInt(m[1],10);
  const min = m[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12; if (h === 0) h = 12;
  return h + ":" + min + " " + ampm;
}
function fmtUpdated(){
  const now = new Date();
  return new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit",timeZone:TZ}).format(now);
}
function dayName(s){
  const d = new Date(s+"T12:00:00");
  return new Intl.DateTimeFormat("en-US",{weekday:"short",timeZone:TZ}).format(d).toUpperCase();
}
function condText(code){
  const map = {0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",
    51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",56:"Freezing drizzle",57:"Freezing drizzle",
    61:"Light rain",63:"Rain",65:"Heavy rain",66:"Freezing rain",67:"Freezing rain",
    71:"Light snow",73:"Snow",75:"Heavy snow",77:"Snow grains",
    80:"Rain showers",81:"Rain showers",82:"Heavy showers",
    85:"Snow showers",86:"Snow showers",95:"Thunderstorm",96:"Thunderstorm w/ hail",99:"Thunderstorm w/ hail"};
  return (map[code] || "—").toUpperCase();
}
const TEAL = "#156988";
const TEAL_2 = "#2C95B3";
const INK = "#404040";
const INK_SOFT = "#6a6a6a";
const LINE = "#e6e6e6";

// Custom inline SVG weather icons keyed by Open-Meteo weather codes.
// Each function returns SVG content (no <svg> wrapper) sized for a 64x64 viewBox.
function iconBody(code){
  const sun = '<circle cx="32" cy="32" r="11" fill="'+TEAL+'" opacity="0.85"/>'+
    '<g stroke="'+TEAL+'" stroke-width="2" stroke-linecap="round">'+
    '<line x1="32" y1="6" x2="32" y2="14"/><line x1="32" y1="50" x2="32" y2="58"/>'+
    '<line x1="6" y1="32" x2="14" y2="32"/><line x1="50" y1="32" x2="58" y2="32"/>'+
    '<line x1="13" y1="13" x2="19" y2="19"/><line x1="45" y1="45" x2="51" y2="51"/>'+
    '<line x1="13" y1="51" x2="19" y2="45"/><line x1="45" y1="19" x2="51" y2="13"/></g>';
  const cloudPath = 'M20 42 Q10 42 10 33 Q10 24 20 24 Q22 14 33 14 Q45 14 46 26 Q55 27 55 35 Q55 42 46 42 Z';
  const cloud = '<path d="'+cloudPath+'" fill="'+TEAL+'" opacity="0.12"/>'+
    '<path d="'+cloudPath+'" fill="none" stroke="'+TEAL+'" stroke-width="2" stroke-linejoin="round"/>';
  const rain = '<g stroke="'+TEAL_2+'" stroke-width="2" stroke-linecap="round">'+
    '<line x1="22" y1="48" x2="19" y2="56"/>'+
    '<line x1="32" y1="48" x2="29" y2="56"/>'+
    '<line x1="42" y1="48" x2="39" y2="56"/></g>';
  const snow = '<g stroke="'+TEAL+'" stroke-width="2" stroke-linecap="round">'+
    '<line x1="20" y1="50" x2="20" y2="56"/><line x1="17" y1="53" x2="23" y2="53"/>'+
    '<line x1="32" y1="50" x2="32" y2="56"/><line x1="29" y1="53" x2="35" y2="53"/>'+
    '<line x1="44" y1="50" x2="44" y2="56"/><line x1="41" y1="53" x2="47" y2="53"/></g>';
  const bolt = '<path d="M32 44 L26 54 L34 50 L28 60" stroke="'+TEAL+'" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
  const fog = '<g stroke="'+TEAL+'" stroke-width="2" stroke-linecap="round" opacity="0.7">'+
    '<line x1="10" y1="36" x2="54" y2="36"/>'+
    '<line x1="14" y1="44" x2="50" y2="44"/>'+
    '<line x1="18" y1="52" x2="46" y2="52"/></g>';
  const partly = '<circle cx="22" cy="22" r="9" fill="'+TEAL+'" opacity="0.85"/>'+
    '<g stroke="'+TEAL+'" stroke-width="2" stroke-linecap="round">'+
    '<line x1="22" y1="6" x2="22" y2="11"/><line x1="6" y1="22" x2="11" y2="22"/>'+
    '<line x1="11" y1="11" x2="14" y2="14"/><line x1="33" y1="11" x2="30" y2="14"/></g>'+
    '<path d="M26 46 Q17 46 17 38 Q17 30 26 30 Q28 22 37 22 Q47 22 48 32 Q56 33 56 40 Q56 46 48 46 Z" fill="'+TEAL+'" opacity="0.12"/>'+
    '<path d="M26 46 Q17 46 17 38 Q17 30 26 30 Q28 22 37 22 Q47 22 48 32 Q56 33 56 40 Q56 46 48 46 Z" fill="none" stroke="'+TEAL+'" stroke-width="2" stroke-linejoin="round"/>';
  if (code === 0) return sun;
  if (code === 1 || code === 2) return partly;
  if (code === 3) return cloud;
  if (code === 45 || code === 48) return cloud + fog;
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return cloud + rain;
  if ([71,73,75,77,85,86].includes(code)) return cloud + snow;
  if ([95,96,99].includes(code)) return cloud + bolt;
  return cloud;
}
function iconAt(code, x, y, size){
  const scale = size / 64;
  return '<g transform="translate('+x+','+y+') scale('+scale+')">'+iconBody(code)+'</g>';
}

// ---------- fetch ----------
async function fetchData(){
  const url = "https://api.open-meteo.com/v1/forecast"+
    "?latitude="+LAT+"&longitude="+LON+
    "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m"+
    "&hourly=uv_index"+
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset"+
    "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone="+encodeURIComponent(TZ);
  const r = await fetch(url);
  if (!r.ok) throw new Error("Open-Meteo "+r.status);
  return r.json();
}

// ---------- svg ----------
function buildSVG(j){
  const c = j.current;
  const temp = Math.round(c.temperature_2m);
  const cond = condText(c.weather_code);
  const feels = Math.round(c.apparent_temperature) + "°";
  const humidity = Math.round(c.relative_humidity_2m) + "%";
  const wind = Math.round(c.wind_speed_10m) + " mph";
  let uv = "—";
  if (j.hourly && j.hourly.uv_index){
    const nowH = new Date().toISOString().slice(0,13);
    const idx = j.hourly.time.findIndex(t => t.startsWith(nowH));
    if (idx >= 0) uv = (Math.round(j.hourly.uv_index[idx]*10)/10).toFixed(1);
  }
  const sunrise = fmtTime(j.daily.sunrise[0]);
  const sunset = fmtTime(j.daily.sunset[0]);
  const updated = fmtUpdated();

  // Font stacks: Prata for serif, Montserrat for sans, with system fallbacks that resvg can render.
  const SERIF = "'Prata', 'DejaVu Serif', Georgia, serif";
  const SANS = "'Montserrat', 'DejaVu Sans', Helvetica, Arial, sans-serif";

  // 7-day strip
  const days = j.daily.time.slice(0,7).map((t,i) => {
    const x = 60 + i * ((W - 120) / 7);
    const cx = x + ((W - 120) / 7) / 2;
    return ''+
      '<text x="'+cx+'" y="538" text-anchor="middle" font-family="'+SANS+'" font-size="14" font-weight="500" fill="'+INK_SOFT+'" letter-spacing="2.4">'+dayName(t)+'</text>'+
      iconAt(j.daily.weather_code[i], cx-22, 548, 44)+
      '<text x="'+cx+'" y="612" text-anchor="middle" font-family="'+SERIF+'" font-size="22" fill="'+INK+'">'+Math.round(j.daily.temperature_2m_max[i])+'°</text>';
  }).join("");

  // Stat boxes
  const stats = [
    ["FEELS LIKE", feels],
    ["HUMIDITY", humidity],
    ["WIND", wind],
    ["UV INDEX", uv],
    ["SUNRISE", sunrise],
    ["SUNSET", sunset],
  ];
  const statsX0 = 60;
  const statsW = W - 120;
  const colW = statsW / stats.length;
  const statsSVG = stats.map((s,i) => {
    const cx = statsX0 + colW * i + colW/2;
    return ''+
      '<text x="'+cx+'" y="380" text-anchor="middle" font-family="'+SANS+'" font-size="13" font-weight="500" fill="'+INK_SOFT+'" letter-spacing="3">'+s[0]+'</text>'+
      '<text x="'+cx+'" y="420" text-anchor="middle" font-family="'+SERIF+'" font-size="28" fill="'+INK+'">'+s[1]+'</text>';
  }).join("");

  return ''+
'<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">'+
  '<rect width="'+W+'" height="'+H+'" fill="#ffffff"/>'+
  // Eyebrow
  '<text x="'+W/2+'" y="64" text-anchor="middle" font-family="'+SANS+'" font-size="16" font-weight="500" fill="'+TEAL+'" letter-spacing="6">HOTEL LBI</text>'+
  // Title
  '<text x="'+W/2+'" y="120" text-anchor="middle" font-family="'+SERIF+'" font-size="52" fill="'+INK+'">Long Beach Island Forecast</text>'+
  // Sub
  '<text x="'+W/2+'" y="150" text-anchor="middle" font-family="'+SANS+'" font-size="15" fill="'+INK_SOFT+'" letter-spacing="1.2">Updated '+updated+' \u00b7 Ship Bottom, NJ</text>'+
  // Divider
  '<line x1="60" y1="180" x2="'+(W-60)+'" y2="180" stroke="'+LINE+'" stroke-width="1"/>'+
  // Top accent line for current card
  '<line x1="60" y1="210" x2="'+(W-60)+'" y2="210" stroke="'+TEAL+'" stroke-width="3"/>'+
  // Big temp
  '<text x="120" y="320" font-family="'+SERIF+'" font-size="140" fill="'+INK+'">'+temp+'</text>'+
  '<text x="320" y="240" font-family="'+SERIF+'" font-size="44" fill="'+TEAL+'">\u00b0F</text>'+
  // Condition
  '<text x="120" y="358" font-family="'+SANS+'" font-size="18" font-weight="500" fill="'+TEAL+'" letter-spacing="4">'+cond+'</text>'+
  // Big icon on right of current
  iconAt(c.weather_code, W - 240, 220, 130) +
  // Divider above stats
  '<line x1="60" y1="350" x2="'+(W-60)+'" y2="350" stroke="'+LINE+'" stroke-width="1"/>'+
  // Stats
  statsSVG +
  // Section title for 7-day
  '<text x="'+W/2+'" y="500" text-anchor="middle" font-family="'+SANS+'" font-size="13" font-weight="500" fill="'+TEAL+'" letter-spacing="4">SEVEN DAY OUTLOOK</text>'+
  // 7 day
  days +
'</svg>';
}

// ---------- main ----------
async function main(){
  await fs.mkdir(OUT_DIR, { recursive: true });
  const data = await fetchData();
  const svg = buildSVG(data);
  const svgPath = path.join(OUT_DIR, "widget.svg");
  await fs.writeFile(svgPath, svg, "utf8");

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: W },
    background: "#ffffff",
    font: {
      // Prefer downloaded brand fonts in fonts/, fall back to system DejaVu/Liberation.
      fontDirs: ["fonts", "/usr/share/fonts", "/usr/share/fonts/truetype/dejavu", "/usr/share/fonts/truetype/liberation"],
      defaultFontFamily: "DejaVu Sans",
      loadSystemFonts: true,
    },
  });
  const png = resvg.render().asPng();
  const pngPath = path.join(OUT_DIR, "widget.png");
  await fs.writeFile(pngPath, png);
  console.log("Wrote", svgPath, "and", pngPath, "("+png.length+" bytes)");
}

main().catch((e) => { console.error(e); process.exit(1); });
