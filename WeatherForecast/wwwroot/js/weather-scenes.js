/**
 * weather-scenes.js
 * Pure JS animated background scenes — no heavy 3D libraries.
 * Each scene uses CSS classes + lightweight canvas where needed.
 */

(function () {
    'use strict';

    const bg = document.getElementById('weather-background');
    if (!bg) return;

    // ─── Helpers ────────────────────────────────────────────────
    function el(tag, cls, style) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (style) Object.assign(e.style, style);
        return e;
    }
    function rnd(min, max) { return Math.random() * (max - min) + min; }
    function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }

    // ─── Scene registry ─────────────────────────────────────────
    let activeCanvases = [];
    let activeRAFs = [];
    let activeTimers = [];

    function clearScene() {
        // Stop all canvas animations
        activeRAFs.forEach(id => cancelAnimationFrame(id));
        activeRAFs = [];
        activeTimers.forEach(id => clearInterval(id));
        activeTimers = [];
        activeCanvases.forEach(c => { if (c.parentNode) c.parentNode.removeChild(c); });
        activeCanvases = [];
        // Remove all injected scene elements
        const old = bg.querySelectorAll('.ws-scene');
        old.forEach(n => n.parentNode.removeChild(n));
    }

    function scene(html) {
        clearScene();
        const wrapper = el('div', 'ws-scene weather-bg-layer');
        wrapper.innerHTML = html;
        bg.appendChild(wrapper);
        return wrapper;
    }

    // ─── SCENE: SUMMER ──────────────────────────────────────────
    function buildSunny() {
        // Sun + clouds (CSS animated)
        scene(`
            <div class="sun-glow"></div>
            <div class="cloud cloud-1"></div>
            <div class="cloud cloud-2"></div>
            <div class="cloud cloud-3"></div>
            <div class="cloud cloud-4"></div>
            <div class="bird-flock bird-1">${birdSVG(40)}</div>
            <div class="bird-flock bird-2">${birdSVG(30)}</div>
            <div class="bird-flock bird-3">${birdSVG(25)}</div>
        `);
    }

    function birdSVG(size) {
        return `
        <svg width="${size * 5}" height="${size * 2}" viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g class="bird-unit" style="animation: bird-unit-fly 0.5s ease-in-out infinite alternate;">
            <!-- Bird 1 -->
            <path class="wing-left-b1"  d="M100 38 Q80 20 60 30" stroke="rgba(30,30,30,0.75)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
            <path class="wing-right-b1" d="M100 38 Q120 20 140 30" stroke="rgba(30,30,30,0.75)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
            <!-- Bird 2 (smaller, behind) -->
            <path d="M60 55 Q46 42 32 50" stroke="rgba(30,30,30,0.55)" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M60 55 Q74 42 88 50"  stroke="rgba(30,30,30,0.55)" stroke-width="2" stroke-linecap="round" fill="none"/>
            <!-- Bird 3 -->
            <path d="M148 50 Q134 38 120 46" stroke="rgba(30,30,30,0.5)" stroke-width="1.8" stroke-linecap="round" fill="none"/>
            <path d="M148 50 Q162 38 176 46" stroke="rgba(30,30,30,0.5)" stroke-width="1.8" stroke-linecap="round" fill="none"/>
          </g>
        </svg>`;
    }

    // ─── SCENE: NIGHT ───────────────────────────────────────────
    function buildNight() {
        const wrap = scene(`
            <div class="moon"></div>
            <div class="night-cloud night-cloud-1"></div>
            <div class="night-cloud night-cloud-2"></div>
            <canvas class="stars-canvas ws-stars" id="stars-canvas-main"></canvas>
            ${buildOwlSVG()}
            ${buildFireflies(8)}
        `);

        // Animate stars via canvas
        const canvas = bg.querySelector('#stars-canvas-main');
        if (canvas) startStarsCanvas(canvas);
    }

    function startStarsCanvas(canvas) {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        const stars = [];
        const COUNT = 180;
        for (let i = 0; i < COUNT; i++) {
            stars.push({
                x: rnd(0, canvas.width),
                y: rnd(0, canvas.height * 0.75),
                r: rnd(0.5, 2.5),
                phase: rnd(0, Math.PI * 2),
                speed: rnd(0.5, 2)
            });
        }

        activeCanvases.push(canvas);

        let lastT = 0;
        function draw(t) {
            const dt = (t - lastT) / 1000;
            lastT = t;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach(s => {
                s.phase += s.speed * dt;
                const alpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.phase));
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,230,${alpha.toFixed(2)})`;
                ctx.fill();
            });
            const raf = requestAnimationFrame(draw);
            activeRAFs.push(raf);
        }
        const raf = requestAnimationFrame(draw);
        activeRAFs.push(raf);

        const resizeObs = () => {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resizeObs);
    }

    function buildOwlSVG() {
        return `
        <div class="owl-wrap ws-scene">
          <svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg" width="60" height="80">
            <!-- Branch -->
            <rect x="0" y="72" width="60" height="6" rx="3" fill="rgba(40,25,10,0.7)"/>
            <!-- Body -->
            <ellipse cx="30" cy="52" rx="18" ry="22" fill="rgba(55,40,20,0.85)"/>
            <!-- Head -->
            <ellipse cx="30" cy="30" rx="16" ry="15" fill="rgba(65,48,25,0.9)"/>
            <!-- Ear tufts -->
            <polygon points="20,17 16,8 24,16" fill="rgba(65,48,25,0.9)"/>
            <polygon points="40,17 44,8 36,16" fill="rgba(65,48,25,0.9)"/>
            <!-- Face disc -->
            <ellipse cx="30" cy="32" rx="12" ry="11" fill="rgba(200,175,130,0.4)"/>
            <!-- Eyes -->
            <circle cx="23" cy="30" r="6" fill="rgba(255,230,150,0.95)"/>
            <circle cx="37" cy="30" r="6" fill="rgba(255,230,150,0.95)"/>
            <!-- Pupils (blink animated) -->
            <ellipse cx="23" cy="30" rx="3" ry="4" fill="#1a0d00" class="owl-eye"/>
            <ellipse cx="37" cy="30" rx="3" ry="4" fill="#1a0d00" class="owl-eye"/>
            <!-- Beak -->
            <polygon points="30,34 27,40 33,40" fill="rgba(200,140,40,0.9)"/>
            <!-- Wings -->
            <ellipse cx="14" cy="56" rx="8" ry="14" fill="rgba(45,32,15,0.8)" transform="rotate(-10,14,56)"/>
            <ellipse cx="46" cy="56" rx="8" ry="14" fill="rgba(45,32,15,0.8)" transform="rotate(10,46,56)"/>
            <!-- Feet -->
            <line x1="24" y1="73" x2="20" y2="78" stroke="rgba(150,100,40,0.8)" stroke-width="2" stroke-linecap="round"/>
            <line x1="24" y1="73" x2="24" y2="78" stroke="rgba(150,100,40,0.8)" stroke-width="2" stroke-linecap="round"/>
            <line x1="24" y1="73" x2="28" y2="78" stroke="rgba(150,100,40,0.8)" stroke-width="2" stroke-linecap="round"/>
            <line x1="36" y1="73" x2="32" y2="78" stroke="rgba(150,100,40,0.8)" stroke-width="2" stroke-linecap="round"/>
            <line x1="36" y1="73" x2="36" y2="78" stroke="rgba(150,100,40,0.8)" stroke-width="2" stroke-linecap="round"/>
            <line x1="36" y1="73" x2="40" y2="78" stroke="rgba(150,100,40,0.8)" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>`;
    }

    function buildFireflies(count) {
        let html = '';
        for (let i = 0; i < count; i++) {
            const left = rndInt(2, 90);
            const top  = rndInt(40, 85);
            const dur  = rnd(4, 10).toFixed(1);
            const delay = rnd(0, 8).toFixed(1);
            const tx   = rndInt(-60, 80);
            const ty   = rndInt(-50, 20);
            const tx2  = rndInt(-40, 60);
            const ty2  = rndInt(-30, 40);
            html += `<div class="firefly" style="left:${left}%;top:${top}%;
                        animation-duration:${dur}s;
                        animation-delay:-${delay}s;
                        --tx:${tx}px;--ty:${ty}px;
                        --tx2:${tx2}px;--ty2:${ty2}px;"></div>`;
        }
        return html;
    }

    // ─── SCENE: RAIN / THUNDERSTORM ─────────────────────────────
    function buildRain(isThunder) {
        const lightningHtml = isThunder
            ? `<div class="lightning-flash"></div><div class="lightning-flash lightning-flash-2"></div>`
            : '';

        scene(`
            <div class="rain-cloud rain-cloud-1"></div>
            <div class="rain-cloud rain-cloud-2"></div>
            <div class="rain-cloud rain-cloud-3"></div>
            ${lightningHtml}
            <canvas id="rain-canvas-main" class="rain-canvas"></canvas>
            <div class="rain-mist"></div>
        `);

        const canvas = bg.querySelector('#rain-canvas-main');
        if (canvas) startRainCanvas(canvas, isThunder);
    }

    function startRainCanvas(canvas, isThunder) {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        activeCanvases.push(canvas);

        const dropCount = isThunder ? 500 : 350;
        const drops = [];
        for (let i = 0; i < dropCount; i++) {
            drops.push({
                x: rnd(0, canvas.width),
                y: rnd(-canvas.height, canvas.height),
                len: rnd(15, 40),
                speed: rnd(12, 28),
                opacity: rnd(0.3, 0.7),
                width: rnd(0.5, 1.5)
            });
        }

        let last = 0;
        function draw(t) {
            const dt = Math.min((t - last) / 1000, 0.05);
            last = t;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            drops.forEach(d => {
                ctx.beginPath();
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x - 2, d.y + d.len);
                ctx.strokeStyle = `rgba(174,214,241,${d.opacity})`;
                ctx.lineWidth = d.width;
                ctx.stroke();

                d.y += d.speed * dt * 60;
                d.x -= 1 * dt * 60;

                if (d.y > canvas.height) {
                    d.y = rnd(-50, -5);
                    d.x = rnd(0, canvas.width);
                }
                if (d.x < 0) d.x += canvas.width;
            });

            const raf = requestAnimationFrame(draw);
            activeRAFs.push(raf);
        }
        const raf = requestAnimationFrame(draw);
        activeRAFs.push(raf);

        window.addEventListener('resize', () => {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }

    // ─── SCENE: WINTER / SNOW ───────────────────────────────────
    function buildWinter() {
        scene(`
            <div class="ice-shimmer"></div>
            <canvas id="snow-canvas-main" class="snow-canvas"></canvas>
        `);

        const canvas = bg.querySelector('#snow-canvas-main');
        if (canvas) startSnowCanvas(canvas);
    }

    function startSnowCanvas(canvas) {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        activeCanvases.push(canvas);

        // 3 layers for parallax depth
        const layers = [
            { count: 60,  rMin: 3, rMax: 7,  speedMin: 1,   speedMax: 2.5, opacity: 0.9, drift: 0.5 },  // foreground
            { count: 80,  rMin: 1.5, rMax: 4, speedMin: 0.6, speedMax: 1.5, opacity: 0.65, drift: 0.3 }, // mid
            { count: 100, rMin: 0.5, rMax: 2, speedMin: 0.3, speedMax: 0.8, opacity: 0.35, drift: 0.15 } // far
        ];

        const flakes = [];
        layers.forEach(layer => {
            for (let i = 0; i < layer.count; i++) {
                flakes.push({
                    x: rnd(0, canvas.width),
                    y: rnd(0, canvas.height),
                    r: rnd(layer.rMin, layer.rMax),
                    speed: rnd(layer.speedMin, layer.speedMax),
                    drift: rnd(-layer.drift, layer.drift),
                    opacity: layer.opacity * rnd(0.7, 1),
                    phase: rnd(0, Math.PI * 2)
                });
            }
        });

        let last = 0;
        function draw(t) {
            const dt = Math.min((t - last) / 1000, 0.05);
            last = t;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            flakes.forEach(f => {
                f.phase += dt * 0.8;
                f.x += f.drift * dt * 60 + Math.sin(f.phase) * 0.3;
                f.y += f.speed * dt * 60;

                if (f.y > canvas.height + 10) {
                    f.y = -10;
                    f.x = rnd(0, canvas.width);
                }
                if (f.x < -10) f.x = canvas.width + 5;
                if (f.x > canvas.width + 10) f.x = -5;

                ctx.beginPath();
                ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${f.opacity.toFixed(2)})`;
                ctx.fill();
            });

            const raf = requestAnimationFrame(draw);
            activeRAFs.push(raf);
        }
        const raf = requestAnimationFrame(draw);
        activeRAFs.push(raf);

        window.addEventListener('resize', () => {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }

    // ─── SCENE: FOG ─────────────────────────────────────────────
    function buildFog() {
        scene(`
            <div class="fog-layer"></div>
            <div class="fog-streaks"></div>
            <div class="fog-streaks fog-streaks-2"></div>
        `);
    }

    // ─── PUBLIC API ─────────────────────────────────────────────
    window.WeatherScenes = {
        apply: function (theme) {
            clearScene();
            switch (theme) {
                case 'Summer': buildSunny(); break;
                case 'Hot':    buildSunny(); break;
                case 'Night':  buildNight(); break;
                case 'Monsoon': buildRain(false); break;
                case 'Thunderstorm': buildRain(true); break;
                case 'Winter': buildWinter(); break;
                case 'Fog':    buildFog(); break;
                default:       buildSunny(); break;
            }
        },
        clear: clearScene
    };

})();
