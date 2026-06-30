/* ================================
   Parallax Background Effect
   Mouse-driven parallax with tech aesthetic
   ================================ */

(function() {
    'use strict';

    // Only run on pages with parallax background
    const parallaxBg = document.getElementById('parallax-bg');
    if (!parallaxBg) return;

    const layers = document.querySelectorAll('.parallax-layer');
    const particlesContainer = document.getElementById('tech-particles');
    
    // Mouse position tracking
    let mouseX = 0.5;
    let mouseY = 0.5;
    let targetMouseX = 0.5;
    let targetMouseY = 0.5;
    
    // Smooth animation
    let animationFrame;

    // Initialize particles
    function createParticles() {
        if (!particlesContainer) return;
        
        const particleCount = 20;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'tech-particle';
            
            // Random positioning and timing
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 6 + 's';
            particle.style.animationDuration = (4 + Math.random() * 4) + 's';
            
            // Random size variation
            const size = 2 + Math.random() * 4;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            
            particlesContainer.appendChild(particle);
        }
    }

    // Handle mouse movement
    function handleMouseMove(e) {
        const rect = parallaxBg.getBoundingClientRect();
        
        // Calculate mouse position relative to the container (0-1 range)
        targetMouseX = (e.clientX - rect.left) / rect.width;
        targetMouseY = (e.clientY - rect.top) / rect.height;
        
        // Update CSS custom properties for glow effect
        parallaxBg.style.setProperty('--mouse-x', (targetMouseX * 100) + '%');
        parallaxBg.style.setProperty('--mouse-y', (targetMouseY * 100) + '%');
    }

    // Smooth animation loop
    function animate() {
        // Smooth interpolation (easing)
        const ease = 0.06;
        mouseX += (targetMouseX - mouseX) * ease;
        mouseY += (targetMouseY - mouseY) * ease;
        
        // Apply parallax to each layer with minimal distortion
        layers.forEach((layer, index) => {
            const speed = parseFloat(layer.dataset.speed) || 0.05;
            const layerMultiplier = (index + 1) * 0.5;
            
            // Very small translation
            const offsetX = (mouseX - 0.5) * 8 * speed * layerMultiplier;
            const offsetY = (mouseY - 0.5) * 8 * speed * layerMultiplier;
            
            // Minimal skew - barely noticeable
            const skewX = (mouseX - 0.5) * 0.5 * layerMultiplier;
            const skewY = (mouseY - 0.5) * 0.5 * layerMultiplier;
            
            // Very subtle scale
            const scale = 1 + (Math.abs(mouseX - 0.5) + Math.abs(mouseY - 0.5)) * 0.01;
            
            // Apply combined transform
            layer.style.transform = `translate(${offsetX}px, ${offsetY}px) skew(${skewX}deg, ${skewY}deg) scale(${scale})`;
        });
        
        animationFrame = requestAnimationFrame(animate);
    }

    // Handle touch devices
    function handleTouchMove(e) {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            handleMouseMove({
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        }
    }

    // Gyroscope support for mobile devices
    function handleDeviceOrientation(e) {
        if (e.gamma !== null && e.beta !== null) {
            // Convert device orientation to mouse-like values
            // gamma: left-right tilt (-90 to 90)
            // beta: front-back tilt (-180 to 180)
            targetMouseX = 0.5 + (e.gamma / 90) * 0.5;
            targetMouseY = 0.5 + ((e.beta - 45) / 90) * 0.5;
            
            // Clamp values
            targetMouseX = Math.max(0, Math.min(1, targetMouseX));
            targetMouseY = Math.max(0, Math.min(1, targetMouseY));
            
            parallaxBg.style.setProperty('--mouse-x', (targetMouseX * 100) + '%');
            parallaxBg.style.setProperty('--mouse-y', (targetMouseY * 100) + '%');
        }
    }

    // Initialize
    function init() {
        createParticles();
        
        // Start animation loop
        animate();
        
        // Event listeners
        document.addEventListener('mousemove', handleMouseMove, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        
        // Request gyroscope permission on iOS 13+
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ requires permission
            document.body.addEventListener('click', function requestGyro() {
                DeviceOrientationEvent.requestPermission()
                    .then(response => {
                        if (response === 'granted') {
                            window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
                        }
                    })
                    .catch(console.error);
                document.body.removeEventListener('click', requestGyro);
            }, { once: true });
        } else if ('DeviceOrientationEvent' in window) {
            // Android and older iOS
            window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
        }
    }

    // Cleanup on page unload
    function cleanup() {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('deviceorientation', handleDeviceOrientation);
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Cleanup on unload
    window.addEventListener('unload', cleanup);
})();
