import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

/**
 * MCP Server
 */
const server = new McpServer({
  name: "Live Weather MCP",
  version: "1.2.0",
});

/**
 * City → Lat/Lon → Current Weather
 */
async function getWeather(city) {
  try {
    /* ---------- STEP 1: GEOCODING ---------- */
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city
    )}&count=1`;

    const geoRes = await fetch(geoUrl);
    const geoJson = await geoRes.json();

    if (!geoJson.results || geoJson.results.length === 0) {
      return null;
    }

    const {
      latitude,
      longitude,
      name,
      country,
      admin1,
    } = geoJson.results[0];

    /* ---------- STEP 2: WEATHER ---------- */
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;

    const weatherRes = await fetch(weatherUrl);
    const weatherJson = await weatherRes.json();

    if (!weatherJson.current_weather) {
      return null;
    }

    const w = weatherJson.current_weather;

    /* ---------- SAFE LOCATION STRING ---------- */
    const locationParts = [name];
    if (admin1) locationParts.push(admin1);
    locationParts.push(country);

    return {
      location: locationParts.join(", "),
      temperature: `${w.temperature}°C`,
      wind: `${w.windspeed} km/h`,
      rain: w.weathercode >= 51 ? "Rain expected" : "No rain expected",
      forecast:
        w.weathercode === 0
          ? "Clear sky"
          : w.weathercode < 3
          ? "Partly cloudy"
          : w.weathercode < 50
          ? "Cloudy"
          : "Rainy",
      time: w.time,
    };
  } catch (err) {
    console.error("Weather fetch error:", err);
    return null;
  }
}

/**
 * Question → Answer
 */
function answerQuestion(weather, question) {
  const q = question.toLowerCase();

  if (q.includes("temperature") || q.includes("temp")) {
    return `🌡 Temperature in ${weather.location}: ${weather.temperature}`;
  }

  if (q.includes("rain")) {
    return `🌧 Rain status in ${weather.location}: ${weather.rain}`;
  }

  if (q.includes("wind")) {
    return `🌬 Wind speed in ${weather.location}: ${weather.wind}`;
  }

  if (q.includes("forecast")) {
    return `📢 Forecast for ${weather.location}: ${weather.forecast}`;
  }

  return `
📍 Location: ${weather.location}
🕒 Time: ${weather.time}
🌡 Temperature: ${weather.temperature}
📢 Forecast: ${weather.forecast}
🌧 Rain: ${weather.rain}
🌬 Wind: ${weather.wind}
`;
}

/**
 * MCP Tool
 */
server.tool(
  "askWeather",
  {
    city: z.string(),
    question: z.string(),
  },
  async ({ city, question }) => {
    const weather = await getWeather(city);

    if (!weather) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Weather data not available for "${city}".`,
          },
        ],
      };
    }

    return {
      content: [{ type: "text", text: answerQuestion(weather, question) }],
    };
  }
);

/**
 * Start MCP
 */
async function start() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

start();      