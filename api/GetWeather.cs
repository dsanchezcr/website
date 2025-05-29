using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using System.Net;

namespace api
{
    public class WeatherLocation
    {
        public string Name { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string Timezone { get; set; }
    }

    public class WeatherData
    {
        public string Location { get; set; }
        public double Temperature { get; set; }
        public int Humidity { get; set; }
        public int WeatherCode { get; set; }
        public string Description { get; set; }
        public string Icon { get; set; }
        public DateTime LastUpdated { get; set; }
    }

    public class GetWeather
    {
        private static readonly HttpClient httpClient = new HttpClient();
        private static readonly MemoryCache cache = new MemoryCache(new MemoryCacheOptions
        {
            SizeLimit = 100
        });

        private readonly ILogger<GetWeather> _logger;

        public GetWeather(ILogger<GetWeather> logger)
        {
            _logger = logger;
        }

        private static readonly Dictionary<string, WeatherLocation> locations = new Dictionary<string, WeatherLocation>
        {
            {
                "orlando",
                new WeatherLocation
                {
                    Name = "Orlando, FL",
                    Latitude = 28.5383,
                    Longitude = -81.3792,
                    Timezone = "America/New_York"
                }
            },
            {
                "sanjose",
                new WeatherLocation
                {
                    Name = "San José, CR",
                    Latitude = 9.9281,
                    Longitude = -84.0907,
                    Timezone = "America/Costa_Rica"
                }
            }
        };

        private static readonly Dictionary<int, (string description, string icon)> weatherCodes = new Dictionary<int, (string, string)>
        {
            { 0, ("Clear sky", "☀️") },
            { 1, ("Mainly clear", "🌤️") },
            { 2, ("Partly cloudy", "⛅") },
            { 3, ("Overcast", "☁️") },
            { 45, ("Fog", "🌫️") },
            { 48, ("Depositing rime fog", "🌫️") },
            { 51, ("Light drizzle", "🌦️") },
            { 53, ("Moderate drizzle", "🌦️") },
            { 55, ("Dense drizzle", "🌧️") },
            { 56, ("Light freezing drizzle", "🌨️") },
            { 57, ("Dense freezing drizzle", "🌨️") },
            { 61, ("Slight rain", "🌧️") },
            { 63, ("Moderate rain", "🌧️") },
            { 65, ("Heavy rain", "🌧️") },
            { 66, ("Light freezing rain", "🌨️") },
            { 67, ("Heavy freezing rain", "🌨️") },
            { 71, ("Slight snow fall", "🌨️") },
            { 73, ("Moderate snow fall", "❄️") },
            { 75, ("Heavy snow fall", "❄️") },
            { 77, ("Snow grains", "🌨️") },
            { 80, ("Slight rain showers", "🌦️") },
            { 81, ("Moderate rain showers", "🌧️") },
            { 82, ("Violent rain showers", "🌧️") },
            { 85, ("Slight snow showers", "🌨️") },
            { 86, ("Heavy snow showers", "❄️") },
            { 95, ("Thunderstorm", "⛈️") },
            { 96, ("Thunderstorm with slight hail", "⛈️") },
            { 99, ("Thunderstorm with heavy hail", "⛈️") }
        };

        [Function("GetWeatherFunction")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
        {
            _logger.LogInformation("GetWeather Function Triggered.");

            var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
            string location = query["location"];
            string latStr = query["lat"];
            string lonStr = query["lon"];

            try
            {
                List<WeatherData> weatherDataList = new List<WeatherData>();

                // Get weather for specified location or all predefined locations
                if (!string.IsNullOrEmpty(location) && locations.ContainsKey(location.ToLower()))
                {
                    var weatherData = await GetWeatherForLocation(locations[location.ToLower()]);
                    if (weatherData != null)
                        weatherDataList.Add(weatherData);
                }
                else if (!string.IsNullOrEmpty(latStr) && !string.IsNullOrEmpty(lonStr) && 
                         double.TryParse(latStr, out double lat) && double.TryParse(lonStr, out double lon))
                {
                    // Get weather for user's location
                    var userLocation = new WeatherLocation
                    {
                        Name = "Your Location",
                        Latitude = lat,
                        Longitude = lon,
                        Timezone = "auto"
                    };
                    var weatherData = await GetWeatherForLocation(userLocation);
                    if (weatherData != null)
                        weatherDataList.Add(weatherData);
                }
                else
                {
                    // Get weather for all predefined locations
                    foreach (var loc in locations.Values)
                    {
                        var weatherData = await GetWeatherForLocation(loc);
                        if (weatherData != null)
                            weatherDataList.Add(weatherData);
                    }
                }

                var response = req.CreateResponse(HttpStatusCode.OK);
                response.Headers.Add("Content-Type", "application/json; charset=utf-8");
                await response.WriteStringAsync(JsonSerializer.Serialize(weatherDataList));
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error fetching weather data: {ex.Message}");
                var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
                return errorResponse;
            }
        }

        private async Task<WeatherData> GetWeatherForLocation(WeatherLocation location)
        {
            string cacheKey = $"weather_{location.Name}_{DateTime.UtcNow:yyyyMMddHH}";

            // Check cache first (cache for 1 hour)
            if (cache.TryGetValue(cacheKey, out WeatherData cachedData))
            {
                _logger.LogInformation($"Weather data for {location.Name} retrieved from cache.");
                return cachedData;
            }

            try
            {
                string url = $"https://api.open-meteo.com/v1/forecast?latitude={location.Latitude}&longitude={location.Longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone={location.Timezone}";
                
                var response = await httpClient.GetStringAsync(url);
                using var doc = JsonDocument.Parse(response);
                var current = doc.RootElement.GetProperty("current");
                
                int weatherCode = current.GetProperty("weather_code").GetInt32();
                
                var (description, icon) = weatherCodes.ContainsKey(weatherCode) 
                    ? weatherCodes[weatherCode] 
                    : ("Unknown", "❓");

                var weatherData = new WeatherData
                {
                    Location = location.Name,
                    Temperature = current.GetProperty("temperature_2m").GetDouble(),
                    Humidity = current.GetProperty("relative_humidity_2m").GetInt32(),
                    WeatherCode = weatherCode,
                    Description = description,
                    Icon = icon,
                    LastUpdated = DateTime.UtcNow
                };

                // Cache for 1 hour, specify size since SizeLimit is set
                cache.Set(cacheKey, weatherData, new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1),
                    Size = 1
                });
                
                _logger.LogInformation($"Weather data for {location.Name} fetched and cached.");
                return weatherData;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error fetching weather data for {location.Name}: {ex.Message}");
                return null;
            }
        }
    }
}