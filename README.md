# Natural-Taste
URL link: jocular-fox-018062.netlify.app <br />
![natural_taste_banner](https://github.com/user-attachments/assets/a48ce029-6d6c-40d5-b30b-f544fd1f43de)
<br />
<br />
<br />
Natural Taste offers a unique way to discover music by letting the weather inspire your playlist. By combining real-time weather data with AI-powered music recommendations, I've created an application that provides a fresh and dynamic music discovery experience tailored to the user's environment. The app uses the AccuWeather API to fetch current weather conditions for a user-specified location, then leverages the Groq AI API to generate music and artist recommendations based on the weather. This unique approach allows users to discover music that complements their local weather conditions.
<br />
<br />
<br />
How It Works

User Interface: The project consists of several HTML pages that provide different functionalities:

index.html: The landing page with social links and a call-to-action.
intel.html: Allows users to enter their city for weather search.
n_t.html: Displays current weather, music genre, and recommended tracks.
forecast.html: Shows weather forecast and corresponding music recommendations.
historical.html: Presents yesterday's weather and music recommendations.


Weather Data Retrieval:

When a user enters their city in intel.html, the application sends a request to the AccuWeather API.
The API returns current weather data for the specified location.


AI-Powered Music Recommendation:

The weather data is then sent to the Groq AI API.
Based on the weather conditions, the AI generates appropriate music genre recommendations and suggests specific tracks and artists.


Dynamic Content Display:

The received weather information and music recommendations are dynamically displayed on the relevant pages (n_t.html, forecast.html, historical.html).
The interface updates to show the location, weather conditions, recommended music genre, tracks, and artists.


Navigation:

Users can navigate between current weather, forecast, and historical data using the provided buttons.
A "Back" button allows users to return to the previous page or the main interface.





