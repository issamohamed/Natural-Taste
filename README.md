# Natural Taste 🎵

A weather-inspired music discovery platform that creates personalized playlists based on your local weather conditions.

URL link: jocular-fox-018062.netlify.app <br />

![Natural Taste Banner](https://github.com/user-attachments/assets/a48ce029-6d6c-40d5-b30b-f544fd1f43de)

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

## 🛠️ Technical Architecture

### Frontend Pages
- `index.html`: Landing page with social links and main call-to-action
- `intel.html`: City search interface for weather location
- `n_t.html`: Current weather and music recommendation display
- `forecast.html`: 5-day weather forecast with music suggestions
- `historical.html`: Previous day's weather and music data

### API Integration
- **Weather Data**: AccuWeather API for accurate weather information
- **Music Recommendations**: Groq AI API for intelligent music suggestions
- **Real-time Updates**: Dynamic content loading based on user location

## 💫 How It Works

1. **Location Input**
   - Users enter their city name
   - Application validates and locates the city coordinates
   - Displays formatted location confirmation

2. **Weather Processing**
   - Fetches real-time weather data from AccuWeather
   - Processes current conditions, forecasts, and historical data
   - Displays temperature, weather description, and related metrics

3. **Music Recommendation**
   - AI analyzes weather conditions
   - Generates appropriate music genre suggestions
   - Provides specific track and artist recommendations
   - Updates recommendations based on weather changes

## 🎯 Use Cases

- **Current Weather Music**: Get immediate music recommendations based on present weather
- **Forecast Planning**: Preview music suggestions for upcoming weather conditions
- **Music Discovery**: Explore new artists and tracks through weather-based curation
- **Mood Enhancement**: Match music to environmental conditions for optimal listening experience

## 🎨 UI Features

- Clean, intuitive interface
- Responsive design for all devices
- Easy navigation between different weather views
- Visual weather representations
- Seamless music recommendation display

## 🚀 Future Enhancements

- Spotify/Apple Music integration for direct playback
- User accounts for saving favorite weather-music combinations
- Advanced weather pattern analysis
- Expanded music genre coverage
- Community sharing features

## 📝 Notes

- Weather data updates in real-time
- Music recommendations are AI-generated and contextual
- All recommendations consider both weather conditions and time of day
- System supports global city searches

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check issues page.

## 📄 License

This project is licensed under the MIT License - see the LICENSE.md file for details.

---

Built with ❤️ by Issa Mohamed
