# Natural Taste 🎵

A weather-inspired music discovery platform that creates personalized playlists based on your local weather conditions.

URL link: jocular-fox-018062.netlify.app <br />

![Natural Taste Banner](https://github.com/user-attachments/assets/a48ce029-6d6c-40d5-b30b-f544fd1f43de)
<img width="1439" alt="Screenshot 2024-09-12 at 9 08 00 PM" src="https://github.com/user-attachments/assets/26dc72eb-73cd-455d-8a90-4f7a3a3e0559" />
<img width="1436" alt="Screenshot 2024-09-12 at 9 08 33 PM" src="https://github.com/user-attachments/assets/6ad029e8-c1bc-4545-9aff-c683c1a5862e" />
<img width="1437" alt="Screenshot 2024-09-12 at 9 08 20 PM" src="https://github.com/user-attachments/assets/9e89667c-c296-42a3-8052-6386385dc62e" />
<img width="1438" alt="Screenshot 2024-09-12 at 9 08 44 PM" src="https://github.com/user-attachments/assets/7804a250-fb6f-4ef7-b4a6-c502d7f78232" />

## 🌟 Overview

Natural Taste offers a unique way to discover music by letting the weather inspire your playlist. By combining real-time weather data with AI-powered music recommendations, this application provides a fresh and dynamic music discovery experience tailored to your environment.

🔗 **Live Demo**: [Natural Taste](https://jocular-fox-018062.netlify.app)

## ✨ Features

- **Real-time Weather Integration**: Fetches current weather data for any city worldwide
- **AI-Powered Music Recommendations**: Generates contextual music suggestions based on weather conditions
- **Multiple View Options**:
  - Current weather and music recommendations
  - 5-day weather forecast with corresponding music suggestions
  - Historical weather data and music pairings
- **Dynamic Genre Matching**: Automatically selects music genres that complement current weather conditions
- **Artist Discovery**: Suggests both tracks and artists based on the weather-music correlation


### API Integration
- **Weather Data**: WeatherAPI.com for current conditions, forecasts, and history
- **Music Recommendations**: Groq AI API for intelligent music suggestions
- **Real-time Updates**: Dynamic content loading based on user location

Both APIs are called from server-side routes rather than from the browser, so the
API keys stay on the server and are never shipped to the page:

| Route | Purpose |
| --- | --- |
| `GET /api/weather?kind=search&q=` | City lookup |
| `GET /api/weather?kind=current&key=` | Current conditions |
| `GET /api/weather?kind=forecast&key=` | 5-day forecast |
| `GET /api/weather?kind=historical&key=` | Yesterday's conditions |
| `POST /api/recommend` | Genre, track, and artist suggestions |

## 💫 How It Works

1. **Location Input**
   - Users enter their city name
   - Application validates and locates the city coordinates
   - Displays formatted location confirmation

2. **Weather Processing**
   - Fetches real-time weather data from WeatherAPI.com
   - Processes current conditions, forecasts, and historical data
   - Displays temperature, weather description, and related metrics

3. **Music Recommendation**
   - AI analyzes weather conditions
   - Generates appropriate music genre suggestions
   - Provides specific track and artist recommendations
   - Updates recommendations based on weather changes

## 🛠 Deploying to Cloudflare Pages

1. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**,
   and select this repository.
2. Build settings — there is no build step:

   | Setting | Value |
   | --- | --- |
   | Framework preset | None |
   | Build command | *(leave empty)* |
   | Build output directory | `natural_taste` |

3. After the first deploy, add the secrets under **Settings → Variables and secrets**
   (choose **Secret**, not plaintext), for **both** Production and Preview:

   | Name | Where to get it |
   | --- | --- |
   | `WEATHERAPI_KEY` | https://www.weatherapi.com |
   | `GROQ_API_KEY` | https://console.groq.com |

4. Redeploy so the functions pick up the secrets.

The `functions/` directory is detected automatically — no extra configuration needed.

There is deliberately no `wrangler.toml` in this repo. For a dashboard-linked Pages
project a Wrangler config file becomes the source of truth and makes the same fields
read-only in the dashboard, so the build settings above live in the dashboard instead.

## 💻 Local Development

```bash
npm install
cp .dev.vars.example .dev.vars   # then fill in your two keys
npm run dev
```

`.dev.vars` is git-ignored. Never put a key in `natural_taste/` — everything in that
directory is served to the browser as-is.

## 🎯 Use Cases

- **Current Weather Music**: Get immediate music recommendations based on present weather
- **Forecast Planning**: Preview music suggestions for upcoming weather conditions
- **Music Discovery**: Explore new artists and tracks through weather-based curation
- **Mood Enhancement**: Match music to environmental conditions for optimal listening experience


## 🚀 Future Enhancements

- Spotify/Apple Music integration for direct playback
- User accounts for saving favorite weather-music combinations
- Advanced weather pattern analysis
- Expanded music genre coverage
- Community sharing features

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check issues page.

## 📄 License

This project is licensed under the MIT License - see the LICENSE.md file for details.

