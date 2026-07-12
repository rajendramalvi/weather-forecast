document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const cityInput = document.getElementById('cityInput');
    const suggestionsBox = document.getElementById('suggestionsBox');
    const currentCity = document.getElementById('currentCity');
    const currentDate = document.getElementById('currentDate');
    const liveClock = document.getElementById('liveClock');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const weatherBackground = document.getElementById('weather-background');
    let temperatureChart = null;
    let currentWeatherData = null;
    let currentVantaEffect = null;
    let lightningInterval = null;
    
    let tempUnit = localStorage.getItem('tempUnit') || 'C';
    let timeFormat = localStorage.getItem('timeFormat') || '24h';

    document.getElementById(tempUnit === 'C' ? 'unitC' : 'unitF').checked = true;
    document.getElementById(timeFormat === '12h' ? 'time12' : 'time24').checked = true;


    // --- AUDIO SYSTEM REMOVED ---

    // --- AI ASSISTANT SYSTEM ---
    const aiWeatherStory = document.getElementById('aiWeatherStory');
    const aiOutfitSuggestion = document.getElementById('aiOutfitSuggestion');
    const aiAvatarContainer = document.getElementById('aiAvatarContainer');
    
    if (typeof lottie !== 'undefined' && aiAvatarContainer) {
        lottie.loadAnimation({
            container: aiAvatarContainer,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            // 3D floating astronaut/robot animation
            path: 'https://assets2.lottiefiles.com/packages/lf20_xbf1be8x.json' 
        });
    }

    // 3D Avatar GSAP Hover & Tilt Effects
    if (typeof gsap !== 'undefined' && aiAvatarContainer) {
        // Continuous levitation
        gsap.to(aiAvatarContainer, {
            y: -15,
            duration: 2.5,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });

        // 3D perspective tracking (looks at your mouse)
        gsap.set(aiAvatarContainer, { transformPerspective: 500, transformOrigin: "center center" });
        document.addEventListener('mousemove', (e) => {
            const xPos = (e.clientX / window.innerWidth) - 0.5;
            const yPos = (e.clientY / window.innerHeight) - 0.5;
            gsap.to(aiAvatarContainer, {
                rotationY: xPos * 50,
                rotationX: -yPos * 50,
                duration: 0.5,
                ease: "power2.out"
            });
        });
    }

    function generateAIInsights(data) {
        if (!aiWeatherStory || !aiOutfitSuggestion) return;
        
        const temp = data.current.temperature;
        const theme = data.current.theme;
        
        let story = `It's currently ${temp}°${tempUnit} in ${data.location.city}. `;
        let outfit = "Wear something comfortable.";
        
        if (theme === "Winter" || temp < 10) {
            story += "It's quite chilly out there, perfect for a cozy beverage.";
            outfit = "Grab a heavy jacket, scarf, and warm gloves!";
        } else if (theme === "Summer" || temp > 28) {
            story += "It's warm and sunny. Great time for outdoor activities!";
            outfit = "Light, breathable clothes and sunglasses are highly recommended.";
        } else if (theme === "Monsoon" || theme === "Thunderstorm") {
            story += "Expect wet conditions. Travel safely and stay dry.";
            outfit = "Don't forget your umbrella and waterproof footwear.";
        } else {
            story += "The weather is mild and pleasant today.";
            outfit = "A light jacket or sweater should be perfect.";
        }
        
        // Handle color combinations for readability
        const aiTitle = document.querySelector('#aiAssistantPanel h3');
        let textColor = 'text-white';
        let highlightColor = 'text-warning';
        
        if (theme === "Winter" || theme === "Fog") {
            textColor = 'text-dark';
            highlightColor = 'text-primary';
        } else if (theme === "Summer") {
            textColor = 'text-dark';
            highlightColor = 'text-danger';
        } else {
            textColor = 'text-white';
            highlightColor = 'text-info';
        }
        
        if (aiTitle) aiTitle.className = `h5 fw-bold mb-1 ${textColor}`;
        aiWeatherStory.className = `mb-2 fw-medium ${textColor}`;
        aiOutfitSuggestion.className = `small fw-bold ${highlightColor}`;
        
        const bagIcon = aiOutfitSuggestion.previousElementSibling;
        if(bagIcon && bagIcon.tagName === 'I') {
            bagIcon.className = `bi bi-bag-check ${highlightColor}`;
        }
        
        aiWeatherStory.textContent = "";
        aiOutfitSuggestion.textContent = "";
        
        if(typeof gsap !== 'undefined') {
            const tempObj = { p1: 0, p2: 0 };
            gsap.to(tempObj, { 
                p1: story.length, 
                duration: 2, 
                ease: "none", 
                onUpdate: () => { aiWeatherStory.textContent = story.substring(0, Math.floor(tempObj.p1)); }
            });
            setTimeout(() => {
                gsap.to(tempObj, { 
                    p2: outfit.length, 
                    duration: 1.5, 
                    ease: "none", 
                    onUpdate: () => { aiOutfitSuggestion.textContent = outfit.substring(0, Math.floor(tempObj.p2)); }
                });
            }, 2000);
        } else {
            aiWeatherStory.textContent = story;
            aiOutfitSuggestion.textContent = outfit;
        }
    }

    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
        tempUnit = document.querySelector('input[name="tempUnit"]:checked').value;
        timeFormat = document.querySelector('input[name="timeFormat"]:checked').value;
        localStorage.setItem('tempUnit', tempUnit);
        localStorage.setItem('timeFormat', timeFormat);
        updateClock();
        if(currentWeatherData) {
            updateUI(currentWeatherData);
        }
    });

    function formatTemp(c) {
        return tempUnit === 'F' ? Math.round((c * 9/5) + 32) : Math.round(c);
    }
    
    function formatTime(dateObj, tz = undefined) {
        let options = { hour: 'numeric', minute: '2-digit', hour12: timeFormat === '12h' };
        if (timeFormat === '24h') options.hour = '2-digit';
        if (tz) {
            try { options.timeZone = tz; } catch(e) {}
        }
        return dateObj.toLocaleTimeString([], options);
    }
    
    function analyzeWeatherAlerts(data) {
        const badge = document.getElementById('bellBadge');
        const list = document.getElementById('notificationItem');
        
        let alertFound = false;
        let alertMsg = '';
        
        if (data.hourly && data.hourly.weather_code) {
            for(let i=1; i<=3; i++) {
                const code = data.hourly.weather_code[i];
                if(code >= 51 && code <= 67) { alertFound = true; alertMsg = `Rain expected in ${i} hour(s)!`; break; }
                if(code >= 71 && code <= 77) { alertFound = true; alertMsg = `Snow expected in ${i} hour(s)!`; break; }
                if(code >= 80 && code <= 82) { alertFound = true; alertMsg = `Heavy showers in ${i} hour(s)!`; break; }
                if(code >= 95) { alertFound = true; alertMsg = `Thunderstorms expected in ${i} hour(s)!`; break; }
            }
        }
        
        if(alertFound) {
            badge.classList.remove('d-none');
            list.innerHTML = `<span class="dropdown-item text-white bg-danger bg-opacity-25 rounded"><i class="bi bi-exclamation-triangle-fill text-warning me-2"></i> ${alertMsg}</span>`;
            
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Weather Alert", { body: alertMsg });
            } else if ("Notification" in window && Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        new Notification("Weather Alert", { body: alertMsg });
                    }
                });
            }
        } else {
            badge.classList.add('d-none');
            list.innerHTML = `<span class="dropdown-item text-white-50">No new notifications</span>`;
        }
    }
    
    // Live Clock
    function updateClock() {
        const now = new Date();
        let tz = undefined;
        if (currentWeatherData && currentWeatherData.current && currentWeatherData.current.timezone) {
            tz = currentWeatherData.current.timezone;
        }
        liveClock.textContent = formatTime(now, tz);
        
        let dateOptions = { weekday: 'short', day: 'numeric', month: 'short' };
        if (tz) {
            try { dateOptions.timeZone = tz; } catch(e) {}
        }
        currentDate.textContent = now.toLocaleDateString([], dateOptions);
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Autocomplete Logic
    let debounceTimer;
    cityInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            suggestionsBox.classList.add('d-none');
            suggestionsBox.innerHTML = '';
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/Home/SearchLocation?query=${encodeURIComponent(query)}`);
                const data = await res.json();
                
                suggestionsBox.innerHTML = '';
                if (data.results && data.results.length > 0) {
                    data.results.forEach(item => {
                        const div = document.createElement('div');
                        div.className = 'suggestion-item';
                        div.textContent = item.fullName;
                        div.addEventListener('click', () => {
                            cityInput.value = item.name;
                            suggestionsBox.classList.add('d-none');
                            fetchWeather(item.name);
                        });
                        suggestionsBox.appendChild(div);
                    });
                    suggestionsBox.classList.remove('d-none');
                } else {
                    suggestionsBox.classList.add('d-none');
                }
            } catch (err) {
                console.error(err);
            }
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box')) {
            suggestionsBox.classList.add('d-none');
        }
    });

    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            suggestionsBox.classList.add('d-none');
            fetchWeather(cityInput.value.trim());
        }
    });

    // Fetch Weather Data
    async function fetchWeather(city, lat = null, lon = null) {
        if (!city && (lat === null || lon === null)) return;
        loadingSpinner.classList.remove('d-none');

        try {
            let url = `/Home/GetWeather?`;
            if (city) {
                url += `city=${encodeURIComponent(city)}`;
            } else {
                url += `lat=${lat}&lon=${lon}`;
            }
            const res = await fetch(url);
            if (!res.ok) throw new Error("Location not found");
            const data = await res.json();
            currentWeatherData = data;
            updateUI(data);
        } catch (error) {
            alert("Could not fetch weather data for " + (city || "your location"));
        } finally {
            loadingSpinner.classList.add('d-none');
        }
    }

    // Update the massive UI
    function updateUI(data) {
        // Top
        currentCity.textContent = data.location.city;
        
        // Center
        const unitSymbol = tempUnit === 'C' ? '&deg;C' : '&deg;F';
        document.getElementById('temperature').innerHTML = `${formatTemp(data.current.temperature)}${unitSymbol}`;
        document.getElementById('feelsLike').innerHTML = `${formatTemp(data.current.feelsLike)}${unitSymbol}`;
        document.getElementById('humidity').textContent = `${data.current.humidity}%`;
        document.getElementById('wind').textContent = `${data.current.wind} km/h`;
        document.getElementById('pressure').textContent = `${data.current.pressure} hPa`;
        document.getElementById('visibility').textContent = `${data.current.visibility} km`;
        document.getElementById('aqi').textContent = data.current.aqi;
        
        // Default Weather Icon & Condition
        const iconEl = document.getElementById('weatherIcon');
        document.getElementById('weatherCondition').textContent = data.current.theme;
        document.getElementById('weatherConditionDesc').textContent = getWeatherDescription(data.current.code);

        // Map Theme to UI Background and Particles
        applyTheme(data.current.theme, iconEl);
        
        // Generate AI Recommendations
        generateAIInsights(data);
        
        // Update Notifications
        analyzeWeatherAlerts(data);

        // Draw Hourly Graph
        const canvasEl = document.getElementById('hourlyGraph');
        if (canvasEl) {
            const ctx = canvasEl.getContext('2d');
            if (temperatureChart) temperatureChart.destroy();
            
            const next12Temps = data.hourly.temperature_2m.slice(0, 12).map(t => formatTemp(t));
            const nowHour = new Date().getHours();
            const next12Labels = Array.from({length: 12}, (_, i) => {
                const d = new Date(); d.setHours(nowHour + i);
                return formatTime(d);
            });

            temperatureChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: next12Labels,
                    datasets: [{
                        label: `Temperature ${unitSymbol}`,
                        data: next12Temps,
                        borderColor: 'rgba(255, 255, 255, 1)',
                        backgroundColor: (context) => {
                            const ctx = context.chart.ctx;
                            const gradient = ctx.createLinearGradient(0, 0, 0, 150);
                            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
                            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                            return gradient;
                        },
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: 'rgba(255,255,255,1)',
                        pointBorderColor: 'transparent',
                        pointRadius: 3,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 10 } }
                        },
                        y: {
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 10 } }
                        }
                    }
                }
            });
        }

        // Hourly
        const hourlyContainer = document.getElementById('hourlyForecast');
        hourlyContainer.innerHTML = '';
        if (data.hourly && data.hourly.temperature_2m) {
            // Render next 24 items
            for(let i=0; i<24; i++) {
                const t = data.hourly.temperature_2m[i];
                const code = data.hourly.weather_code[i];
                
                const nowHour = new Date().getHours();
                const d = new Date();
                d.setHours(nowHour + i);
                const timeStr = formatTime(d);
                
                hourlyContainer.innerHTML += `
                    <div class="hourly-item p-3 glass-panel-inner rounded-3 hover-scale flex-shrink-0">
                        <div class="small opacity-75 mb-2">${timeStr}</div>
                        <i class="bi ${getIconClass(code)} fs-3 mb-2 d-block"></i>
                        <div class="fw-semibold">${formatTemp(t)}&deg;</div>
                    </div>
                `;
            }
        }

        // Daily
        const weeklyContainer = document.getElementById('weeklyForecast');
        weeklyContainer.innerHTML = '';
        if (data.daily && data.daily.temperature_2m_max) {
            for(let i=0; i<7; i++) {
                const max = data.daily.temperature_2m_max[i];
                const min = data.daily.temperature_2m_min[i];
                const code = data.daily.weather_code[i];
                const day = new Date();
                day.setDate(day.getDate() + i);
                const dayStr = i === 0 ? "Today" : day.toLocaleDateString([], {weekday: 'long'});
                
                weeklyContainer.innerHTML += `
                    <div class="weekly-item d-flex justify-content-between align-items-center p-3 glass-panel-inner rounded-3 hover-lift">
                        <div class="fw-semibold" style="width: 100px;">${dayStr}</div>
                        <div class="d-flex align-items-center gap-3">
                            <i class="bi ${getIconClass(code)} fs-4"></i>
                            <div class="opacity-75" style="width: 40px; text-align: right;">${formatTemp(min)}&deg;</div>
                            <div class="bg-secondary rounded-pill" style="height: 4px; width: 60px; overflow:hidden;">
                                <div class="bg-warning h-100" style="width: ${((max - min) / 20) * 100}%"></div>
                            </div>
                            <div class="fw-semibold" style="width: 40px;">${formatTemp(max)}&deg;</div>
                        </div>
                    </div>
                `;
            }

            if (data.daily.sunrise && data.daily.sunrise.length > 0) {
                const sr = new Date(data.daily.sunrise[0]);
                document.getElementById('sunriseTime').textContent = formatTime(sr);
            }
            if (data.daily.sunset && data.daily.sunset.length > 0) {
                const ss = new Date(data.daily.sunset[0]);
                document.getElementById('sunsetTime').textContent = formatTime(ss);
            }
            if (data.daily.uv_index_max && data.daily.uv_index_max.length > 0) {
                document.getElementById('uvIndex').textContent = data.daily.uv_index_max[0];
            }
        }

        // Initialize 3D Tilt Physics
        if (typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(document.querySelectorAll(".glass-panel"), {
                max: 5,
                speed: 400,
                glare: true,
                "max-glare": 0.2
            });
            VanillaTilt.init(document.querySelectorAll(".glass-panel-inner"), {
                max: 10,
                speed: 400,
                glare: true,
                "max-glare": 0.1
            });
        }
    }

    // Engine: Theme & Particle application
    async function applyTheme(theme, iconEl) {
        if (!weatherBackground) return;
        weatherBackground.setAttribute('data-theme', theme);
        
        let bgColor = "#111111";
        if (theme === "Summer") bgColor = "#0f81c7"; 
        if (theme === "Monsoon") bgColor = "#2b3b4a";
        if (theme === "Thunderstorm") bgColor = "#1a1a24";
        if (theme === "Winter") bgColor = "#8fbcd4";
        if (theme === "Fog") bgColor = "#768691";
        if (theme === "Night") bgColor = "#050b14";
        
        // Clean up previous effects
        if (currentVantaEffect) {
            currentVantaEffect.destroy();
            currentVantaEffect = null;
        }
        if (lightningInterval) {
            clearInterval(lightningInterval);
            lightningInterval = null;
            if(typeof gsap !== 'undefined') gsap.killTweensOf(weatherBackground);
        }
        
        if (typeof gsap !== 'undefined') {
            gsap.to(document.body, { backgroundColor: bgColor, duration: 2 });
            gsap.to(weatherBackground, { backgroundColor: bgColor, duration: 2 });
        } else {
            document.body.style.backgroundColor = bgColor;
            weatherBackground.style.backgroundColor = bgColor;
        }
        
        // --- Live Animated Background Scenes ---
        if (window.WeatherScenes) {
            WeatherScenes.apply(theme);
        }

        // GSAP Lightning for Thunderstorm
        if (theme === "Thunderstorm" && typeof gsap !== 'undefined') {
            lightningInterval = setInterval(() => {
                if (Math.random() > 0.7) {
                    gsap.to(weatherBackground, {
                        backgroundColor: "#ffffff",
                        duration: 0.1,
                        yoyo: true,
                        repeat: 3,
                        onComplete: () => {
                            gsap.to(weatherBackground, { backgroundColor: bgColor, duration: 0.5 });
                        }
                    });
                }
            }, 3000);
        }



        if (theme === "Summer") {
            iconEl.innerHTML = '<img src="https://www.amcharts.com/wp-content/themes/amcharts4/css/img/icons/weather/animated/day.svg" class="img-fluid" style="height: 120px;" />';
        } else if (theme === "Monsoon" || theme === "Thunderstorm") {
            if(theme === "Thunderstorm") {
                iconEl.innerHTML = '<img src="https://www.amcharts.com/wp-content/themes/amcharts4/css/img/icons/weather/animated/thunder.svg" class="img-fluid" style="height: 120px;" />';
            } else {
                iconEl.innerHTML = '<img src="https://www.amcharts.com/wp-content/themes/amcharts4/css/img/icons/weather/animated/rainy-1.svg" class="img-fluid" style="height: 120px;" />';
            }
        } else if (theme === "Winter") {
            iconEl.innerHTML = '<img src="https://www.amcharts.com/wp-content/themes/amcharts4/css/img/icons/weather/animated/snowy-1.svg" class="img-fluid" style="height: 120px;" />';
        } else if (theme === "Fog") {
            iconEl.innerHTML = '<img src="https://www.amcharts.com/wp-content/themes/amcharts4/css/img/icons/weather/animated/cloudy.svg" class="img-fluid" style="height: 120px;" />';
        } else if (theme === "Night") {
            iconEl.innerHTML = '<img src="https://www.amcharts.com/wp-content/themes/amcharts4/css/img/icons/weather/animated/night.svg" class="img-fluid" style="height: 120px;" />';
        } else {
            iconEl.innerHTML = '<img src="https://www.amcharts.com/wp-content/themes/amcharts4/css/img/icons/weather/animated/day.svg" class="img-fluid" style="height: 120px;" />';
        }
        
        if (typeof gsap !== 'undefined') {
            gsap.fromTo(iconEl, { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "bounce.out" });
        }
    }

    function getWeatherDescription(code) {
        if(code === 0) return "Clear sky";
        if(code <= 3) return "Partly cloudy";
        if(code === 45 || code === 48) return "Foggy";
        if(code >= 51 && code <= 67) return "Rain";
        if(code >= 71 && code <= 77) return "Snow";
        if(code >= 80 && code <= 82) return "Rain showers";
        if(code >= 95) return "Thunderstorm";
        return "Unknown";
    }
    
    function getIconClass(code) {
        if(code === 0) return "bi-sun text-warning";
        if(code <= 3) return "bi-cloud text-light";
        if(code === 45 || code === 48) return "bi-cloud-fog text-secondary";
        if(code >= 51 && code <= 67) return "bi-cloud-rain text-info";
        if(code >= 71 && code <= 77) return "bi-snow text-white";
        if(code >= 80 && code <= 82) return "bi-cloud-rain text-info";
        if(code >= 95) return "bi-lightning-charge text-warning";
        return "bi-cloud text-light";
    }


    // Default Fetch
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                fetchWeather(null, position.coords.latitude, position.coords.longitude);
            },
            error => {
                fetchWeather("Ahmedabad"); // Fallback if permission denied or error
            }
        );
    } else {
        fetchWeather("Ahmedabad");
    }
});
