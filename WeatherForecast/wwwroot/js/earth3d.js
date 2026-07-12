document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("toggle3DMapBtn");
    const closeBtn = document.getElementById("close3DMapBtn");
    const container = document.getElementById("earth3d-container");
    const wrapper = document.getElementById("earth-canvas-wrapper");
    
    let isInitialized = false;
    let scene, camera, renderer, earthMesh, cloudsMesh;
    let animationId;
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    
    // Check if toggle exists
    if(!toggleBtn || !container) return;
    
    toggleBtn.addEventListener('click', () => {
        container.classList.remove('d-none');
        // Small delay to allow display:block before fading in
        setTimeout(() => {
            container.style.opacity = '1';
        }, 10);
        
        if (!isInitialized) {
            initEarth();
        } else {
            animate();
        }
    });
    
    closeBtn.addEventListener('click', () => {
        container.style.opacity = '0';
        setTimeout(() => {
            container.classList.add('d-none');
            if (animationId) cancelAnimationFrame(animationId);
        }, 500);
    });
    
    function initEarth() {
        if(typeof THREE === 'undefined') {
            console.error("Three.js is not loaded yet.");
            return;
        }
        
        // Scene setup
        scene = new THREE.Scene();
        
        // Camera setup
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 2.5;
        
        // Renderer setup
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        wrapper.appendChild(renderer.domElement);
        
        // Ambient Light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        scene.add(ambientLight);
        
        // Point Light (Sun)
        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(5, 3, 5);
        scene.add(pointLight);
        
        // Earth geometry & material
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        
        // Use high quality textures (CDN)
        const textureLoader = new THREE.TextureLoader();
        const earthMap = textureLoader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg');
        const bumpMap = textureLoader.load('https://unpkg.com/three-globe/example/img/earth-topology.png');
        const waterMap = textureLoader.load('https://unpkg.com/three-globe/example/img/earth-water.png');
        
        const material = new THREE.MeshPhongMaterial({
            map: earthMap,
            bumpMap: bumpMap,
            bumpScale: 0.015,
            specularMap: waterMap,
            specular: new THREE.Color('grey')
        });
        
        earthMesh = new THREE.Mesh(geometry, material);
        scene.add(earthMesh);
        
        // Clouds geometry & material
        const cloudGeometry = new THREE.SphereGeometry(1.02, 64, 64);
        const cloudMap = textureLoader.load('https://unpkg.com/three-globe/example/img/earth-clouds.png');
        
        const cloudMaterial = new THREE.MeshPhongMaterial({
            map: cloudMap,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        cloudsMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        scene.add(cloudsMesh);
        
        // Interaction (Drag to rotate)
        wrapper.addEventListener('mousedown', onPointerDown);
        wrapper.addEventListener('mousemove', onPointerMove);
        wrapper.addEventListener('mouseup', onPointerUp);
        wrapper.addEventListener('mouseleave', onPointerUp);
        
        // Zooming logic (Wheel & Pinch)
        wrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            camera.position.z += e.deltaY * 0.002;
            camera.position.z = Math.max(1.2, Math.min(camera.position.z, 5));
        }, { passive: false });
        
        let initialPinchDistance = null;
        
        wrapper.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                isDragging = false;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                initialPinchDistance = Math.hypot(dx, dy);
            } else if (e.touches.length === 1) {
                onPointerDown(e.touches[0]);
            }
        }, { passive: false });
        
        wrapper.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && initialPinchDistance !== null) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const distance = Math.hypot(dx, dy);
                const delta = initialPinchDistance - distance;
                
                camera.position.z += delta * 0.01;
                camera.position.z = Math.max(1.2, Math.min(camera.position.z, 5));
                
                initialPinchDistance = distance;
            } else if (e.touches.length === 1) {
                onPointerMove(e.touches[0]);
            }
        }, { passive: false });
        
        wrapper.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) {
                initialPinchDistance = null;
            }
            if (e.touches.length === 0) {
                onPointerUp();
            }
        });
        
        // Raycaster for clicking
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        
        wrapper.addEventListener('click', (e) => {
            // Calculate mouse position in normalized device coordinates
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(earthMesh);
            
            if (intersects.length > 0) {
                // Approximate lat/lon from 3D coordinate
                const point = intersects[0].point;
                // Get normalized vector
                const n = point.clone().normalize();
                
                // Inverse apply earth rotation to get absolute local coordinate
                const euler = new THREE.Euler(-earthMesh.rotation.x, -earthMesh.rotation.y, -earthMesh.rotation.z, 'YXZ');
                const localPoint = n.clone().applyEuler(euler);
                
                const lat = Math.asin(localPoint.y) * (180 / Math.PI);
                const lon = Math.atan2(localPoint.x, localPoint.z) * (180 / Math.PI);
                
                // Stop drag interactions temporarily
                isDragging = false;
                
                // Animate Camera
                const targetPos = point.clone().normalize().multiplyScalar(1.2); // Zoom in
                
                if (typeof gsap !== 'undefined') {
                    gsap.to(camera.position, {
                        x: targetPos.x,
                        y: targetPos.y,
                        z: targetPos.z,
                        duration: 1.5,
                        ease: "power2.inOut",
                        onUpdate: () => {
                            camera.lookAt(new THREE.Vector3(0,0,0));
                        },
                        onComplete: () => {
                            // Call global fetchWeather
                            if(typeof window.fetchWeather === 'function') {
                                window.fetchWeather(null, lat, lon);
                                setTimeout(() => {
                                    closeBtn.click(); // close map
                                    // Reset camera after a brief delay
                                    setTimeout(() => {
                                        camera.position.set(0, 0, 2.5);
                                        camera.lookAt(new THREE.Vector3(0,0,0));
                                    }, 600);
                                }, 500);
                            }
                        }
                    });
                } else {
                    if(typeof window.fetchWeather === 'function') {
                        window.fetchWeather(null, lat, lon);
                        closeBtn.click();
                    }
                }
            }
        });
        
        window.addEventListener('resize', () => {
            if(!camera || !renderer) return;
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        isInitialized = true;
        animate();
    }
    
    function onPointerDown(e) {
        isDragging = true;
        previousMousePosition = { x: e.offsetX || e.clientX, y: e.offsetY || e.clientY };
    }
    
    function onPointerMove(e) {
        if (!isDragging) return;
        
        const currentMousePosition = { x: e.offsetX || e.clientX, y: e.offsetY || e.clientY };
        const deltaMove = {
            x: currentMousePosition.x - previousMousePosition.x,
            y: currentMousePosition.y - previousMousePosition.y
        };
        
        // Rotate earth
        if(earthMesh) {
            earthMesh.rotation.y += deltaMove.x * 0.005;
            earthMesh.rotation.x += deltaMove.y * 0.005;
            
            // Limit x rotation (poles)
            earthMesh.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, earthMesh.rotation.x));
            
            // Sync clouds
            if(cloudsMesh) {
                cloudsMesh.rotation.y = earthMesh.rotation.y;
                cloudsMesh.rotation.x = earthMesh.rotation.x;
            }
        }
        
        previousMousePosition = currentMousePosition;
    }
    
    function onPointerUp() {
        isDragging = false;
    }
    
    function animate() {
        if (container.classList.contains('d-none')) return;
        animationId = requestAnimationFrame(animate);
        
        if (!isDragging && earthMesh && cloudsMesh) {
            // Auto rotate slowly
            earthMesh.rotation.y += 0.0005;
            cloudsMesh.rotation.y += 0.0007; // clouds move slightly faster
        }
        
        renderer.render(scene, camera);
    }
});
