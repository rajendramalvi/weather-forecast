using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using WeatherForecast.Models;
using System.Net.Http;
using System.Text.Json;

namespace WeatherForecast.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private static readonly HttpClient _httpClient = new HttpClient();

        public HomeController(ILogger<HomeController> logger)
        {
            _logger = logger;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> GetWeather(string? city, string? lat, string? lon)
        {
            if (string.IsNullOrWhiteSpace(city) && (string.IsNullOrWhiteSpace(lat) || string.IsNullOrWhiteSpace(lon)))
                return BadRequest("City or coordinates are required");

            try
            {
                string latitudeStr = "0";
                string longitudeStr = "0";
                string resolvedName = "Current Location";
                string country = "";

                if (!string.IsNullOrWhiteSpace(lat) && !string.IsNullOrWhiteSpace(lon))
                {
                    string normalizedLat = lat.Replace(',', '.');
                    string normalizedLon = lon.Replace(',', '.');
                    
                    if (double.TryParse(normalizedLat, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out double latitude) &&
                        double.TryParse(normalizedLon, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out double longitude))
                    {
                        latitudeStr = latitude.ToString(System.Globalization.CultureInfo.InvariantCulture);
                        longitudeStr = longitude.ToString(System.Globalization.CultureInfo.InvariantCulture);
                        
                        try {
                            var reverseUrl = $"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={latitudeStr}&longitude={longitudeStr}&localityLanguage=en";
                            var reverseResponse = await _httpClient.GetStringAsync(reverseUrl);
                            var reverseDoc = JsonDocument.Parse(reverseResponse);
                            if (reverseDoc.RootElement.TryGetProperty("city", out var cityProp) && !string.IsNullOrEmpty(cityProp.GetString())) {
                                resolvedName = cityProp.GetString();
                            } else if (reverseDoc.RootElement.TryGetProperty("locality", out var locProp) && !string.IsNullOrEmpty(locProp.GetString())) {
                                resolvedName = locProp.GetString();
                            }
                            if (reverseDoc.RootElement.TryGetProperty("countryName", out var countryProp)) {
                                country = countryProp.GetString();
                            }
                        } catch { /* ignore reverse geocoding failure */ }
                    }
                    else
                    {
                        return BadRequest("Invalid coordinates");
                    }
                }
                else
                {
                    // 1. Get Coordinates from Geocoding API
                    var geoUrl = $"https://geocoding-api.open-meteo.com/v1/search?name={Uri.EscapeDataString(city!)}&count=1&language=en&format=json";
                    var geoResponse = await _httpClient.GetStringAsync(geoUrl);
                    var geoDoc = JsonDocument.Parse(geoResponse);

                    if (!geoDoc.RootElement.TryGetProperty("results", out var resultsArray) || resultsArray.GetArrayLength() == 0)
                    {
                        return NotFound("City not found");
                    }

                    var location = resultsArray[0];
                    double latitude = location.GetProperty("latitude").GetDouble();
                    double longitude = location.GetProperty("longitude").GetDouble();
                    latitudeStr = latitude.ToString(System.Globalization.CultureInfo.InvariantCulture);
                    longitudeStr = longitude.ToString(System.Globalization.CultureInfo.InvariantCulture);
                    resolvedName = location.GetProperty("name").GetString();
                    country = location.TryGetProperty("country", out var c) ? c.GetString() : "";
                }

                // 2. Fetch Comprehensive Weather Data
                var weatherUrl = $"https://api.open-meteo.com/v1/forecast?latitude={latitudeStr}&longitude={longitudeStr}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,visibility&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max&timezone=auto";
                var aqiUrl = $"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={latitudeStr}&longitude={longitudeStr}&current=us_aqi";
                
                var weatherResponse = await _httpClient.GetStringAsync(weatherUrl);
                var weatherDoc = JsonDocument.Parse(weatherResponse);

                var aqiResponse = "{\"current\": {\"us_aqi\": 50}}"; // default fallback
                try {
                    aqiResponse = await _httpClient.GetStringAsync(aqiUrl);
                } catch { /* ignore AQI failure */ }
                var aqiDoc = JsonDocument.Parse(aqiResponse);

                var currentData = weatherDoc.RootElement.GetProperty("current");
                var dailyData = weatherDoc.RootElement.GetProperty("daily");
                var hourlyData = weatherDoc.RootElement.GetProperty("hourly");
                
                var timezone = weatherDoc.RootElement.TryGetProperty("timezone", out var tzProp) ? tzProp.GetString() : "UTC";
                
                int aqi = 50;
                if (aqiDoc.RootElement.TryGetProperty("current", out var aqiCurrent) && aqiCurrent.TryGetProperty("us_aqi", out var aqiVal)) {
                    aqi = aqiVal.GetInt32();
                }

                var temp = currentData.GetProperty("temperature_2m").GetDouble();
                var feelsLike = currentData.GetProperty("apparent_temperature").GetDouble();
                var humidity = currentData.GetProperty("relative_humidity_2m").GetDouble();
                var wmoCode = currentData.GetProperty("weather_code").GetInt32();
                var wind = currentData.GetProperty("wind_speed_10m").GetDouble();
                var pressure = currentData.GetProperty("surface_pressure").GetDouble();
                
                double visibility = 10000;
                if (currentData.TryGetProperty("visibility", out var vis)) visibility = vis.GetDouble();

                // 3. Map WMO Code to Themes
                string theme = "Summer"; // default
                bool isDay = currentData.TryGetProperty("is_day", out var d) ? d.GetInt32() == 1 : true;
                
                if (wmoCode >= 95) theme = "Thunderstorm";
                else if (wmoCode >= 71 && wmoCode <= 77 || wmoCode >= 85 && wmoCode <= 86 || temp <= 0) theme = "Winter";
                else if (wmoCode >= 51 && wmoCode <= 67 || wmoCode >= 80 && wmoCode <= 82) theme = "Monsoon";
                else if (wmoCode == 45 || wmoCode == 48) theme = "Fog";
                else if (!isDay) theme = "Night";
                else theme = "Summer";
                
                var data = new
                {
                    Location = new {
                        City = resolvedName,
                        Country = country
                    },
                    Current = new {
                        Theme = theme,
                        Temperature = Math.Round(temp),
                        FeelsLike = Math.Round(feelsLike),
                        Humidity = Math.Round(humidity),
                        Wind = Math.Round(wind),
                        Pressure = Math.Round(pressure),
                        Visibility = Math.Round(visibility / 1000.0, 1), // in km
                        AQI = aqi,
                        Code = wmoCode,
                        IsDay = isDay,
                        Timezone = timezone
                    },
                    Daily = dailyData,
                    Hourly = hourlyData
                };

                return Json(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching real weather data");
                return StatusCode(500, "Error fetching weather data");
            }
        }

        [HttpGet]
        public async Task<IActionResult> SearchLocation(string query)
        {
            if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
                return Json(new { results = Array.Empty<object>() });

            try
            {
                var url = $"https://geocoding-api.open-meteo.com/v1/search?name={Uri.EscapeDataString(query)}&count=5&language=en&format=json";
                var response = await _httpClient.GetStringAsync(url);
                var jsonDoc = JsonDocument.Parse(response);
                
                if (jsonDoc.RootElement.TryGetProperty("results", out var resultsArray))
                {
                    var suggestions = new List<object>();
                    foreach (var item in resultsArray.EnumerateArray())
                    {
                        var name = item.GetProperty("name").GetString();
                        var admin1 = item.TryGetProperty("admin1", out var a) ? a.GetString() : null;
                        var country = item.TryGetProperty("country", out var c) ? c.GetString() : null;
                        
                        var parts = new List<string> { name ?? "" };
                        if (!string.IsNullOrEmpty(admin1)) parts.Add(admin1!);
                        if (!string.IsNullOrEmpty(country)) parts.Add(country!);
                        
                        suggestions.Add(new {
                            name = name,
                            fullName = string.Join(", ", parts)
                        });
                    }
                    return Json(new { results = suggestions });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching geocoding data");
            }

            return Json(new { results = Array.Empty<object>() });
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
