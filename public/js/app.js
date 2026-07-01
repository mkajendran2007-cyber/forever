// Supabase Integration Config
// Verified serverless Supabase backend and Vercel routing configuration
// Paste your Supabase credentials here:
const SUPABASE_URL = 'https://kvtdwoosektgnoueqohu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4_eA4UwrykRBYbMrT5wvKw_C-IHdRjI';

// Initialize Supabase Client
const supabaseClient = (typeof window !== 'undefined' && window.supabase) 
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) 
    : null;

// Global State Variables
let config = {};
let currentSlide = 0;
let soundSynth = null;
let bgMusicNode = null;
let bgMusicPlaying = false;
let currentVolume = 0.5;
let isMuted = false;
const sessionId = Math.random().toString(36).substr(2, 9);
let timelineObserver = null;
let statsObserver = null;
let currentSection = "LockScreen";

// Admin / Edit Mode States
let isEditMode = (window.location.pathname.replace(/\/$/, '') === '/admin' || window.location.pathname.replace(/\/$/, '') === '/admin.html' || window.location.search.includes('edit=true'));
let adminToken = localStorage.getItem('adminToken') || '';
let editPhotoContext = null; // { type, id, element }

// DOM Elements
const canvas = document.getElementById('canvas-particles');
const ctx = canvas.getContext('2d');

// Initialize Web Audio Synth Fallback
class AudioSynth {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.pianoTimer = null;
        this.pianoIndex = 0;
        this.isPlayingPiano = false;
    }

    playTwinkle() {
        const now = this.ctx.currentTime;
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        freqs.forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.frequency.setValueAtTime(f, now + idx * 0.1);
            gain.gain.setValueAtTime(0, now + idx * 0.1);
            gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.1 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);
            
            osc.start(now + idx * 0.1);
            osc.stop(now + idx * 0.1 + 0.6);
        });
    }

    playGlassShatter() {
        const now = this.ctx.currentTime;
        for (let i = 0; i < 5; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(2000 + Math.random() * 3000, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1 + Math.random() * 0.2);
            
            osc.start(now);
            osc.stop(now + 0.3);
        }
    }

    startPianoLoop() {
        if (this.isPlayingPiano) return;
        this.isPlayingPiano = true;
        this.pianoIndex = 0;
        const chords = [
            [261.63, 329.63, 392.00, 493.88], // Cmaj7 (C4, E4, G4, B4)
            [220.00, 261.63, 329.63, 392.00], // Am7 (A3, C4, E4, G4)
            [174.61, 220.00, 261.63, 329.63], // Fmaj7 (F3, A3, C4, E4)
            [196.00, 246.94, 293.66, 349.23]  // G7 (G3, B3, D4, F4)
        ];
        
        const playChord = () => {
            const chord = chords[this.pianoIndex % chords.length];
            const now = this.ctx.currentTime;
            
            chord.forEach((f, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'sine';
                const lfo = this.ctx.createOscillator();
                const lfoGain = this.ctx.createGain();
                lfo.frequency.value = 3 + Math.random() * 2;
                lfoGain.gain.value = 3;
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                
                const noteTime = now + idx * 0.15;
                osc.frequency.setValueAtTime(f, noteTime);
                gain.gain.setValueAtTime(0, noteTime);
                gain.gain.linearRampToValueAtTime(0.08, noteTime + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 4.5);
                
                lfo.start(noteTime);
                osc.start(noteTime);
                
                lfo.stop(noteTime + 5);
                osc.stop(noteTime + 5);
            });
            
            this.pianoIndex++;
            this.pianoTimer = setTimeout(playChord, 5000);
        };
        
        playChord();
    }

    stopPianoLoop() {
        if (this.pianoTimer) {
            clearTimeout(this.pianoTimer);
        }
        this.isPlayingPiano = false;
    }
}

// Sparkle Particle System on Canvas
let particles = [];
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height + canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedY = -(Math.random() * 0.8 + 0.2);
        this.speedX = Math.random() * 0.4 - 0.2;
        this.opacity = Math.random() * 0.5 + 0.3;
        this.color = Math.random() > 0.5 ? '255, 209, 220' : '230, 230, 250';
        this.isHeart = Math.random() > 0.85;
    }
    update() {
        this.y += this.speedY;
        this.x += this.speedX;
        if (this.y < -10) {
            this.reset();
        }
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        if (this.isHeart) {
            ctx.fillStyle = `rgba(255, 94, 126, ${this.opacity})`;
            ctx.font = `${this.size * 3}px Arial`;
            ctx.fillText('❤️', this.x, this.y);
        } else {
            ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

window.addEventListener('mousemove', (e) => {
    particles.forEach(p => {
        const dx = p.x - e.clientX;
        const dy = p.y - e.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
            p.x += dx * 0.02;
            p.y += dy * 0.02;
        }
    });
});

for (let i = 0; i < 60; i++) {
    particles.push(new Particle());
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    requestAnimationFrame(animateParticles);
}
animateParticles();

// Fetch configurations and initialize UI elements
window.addEventListener('DOMContentLoaded', async () => {
    // Unregister any active service workers to prevent cache traps
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) {
                registration.unregister();
            }
        }).catch(err => console.error("Failed to unregister SW:", err));
    }
    // Clear browser caches
    if ('caches' in window) {
        caches.keys().then(keys => {
            for (let key of keys) {
                caches.delete(key);
            }
        }).catch(err => console.error("Failed to clear caches:", err));
    }
    try {
        if (!supabaseClient || SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
            showToast("Supabase is not initialized. Please configure SUPABASE_URL and SUPABASE_KEY at the top of public/js/app.js.", "error");
            throw new Error("Supabase is not initialized. Check your credentials at the top of public/js/app.js.");
        }

        // Fetch config from Supabase config_store table
        const { data, error } = await supabaseClient
            .from('config_store')
            .select('data')
            .eq('id', 1)
            .single();

        if (error || !data) {
            showToast("Failed to load config from Supabase. Ensure table config_store is initialized.", "error");
            console.error(error);
            throw new Error("Supabase config query failed: " + JSON.stringify(error || 'No Data'));
        }
        config = data.data;
        
        // Check Admin Auth state first if edit mode
        if (isEditMode) {
            verifyAdminAuth();
        } else {
            setupCountdown();
        }

        setupStats();
        setupTimeline();
        setupPolaroids();
        setupEnvelopes();
        setupMap();
        setupMirror();
        setupChecklist();
        setupAudioNode();
        setupTimeCapsule();
        setupQuiz();
        setupVoiceRecorder();
        applySectionOrder();

        const gender = config.settings.gender || "her";
        let brandTitleVal = config.settings.birthdayTitle || (gender === 'him' ? 'His Story' : 'Her Story');
        
        // Sanitize default or old title to remove "my ❤️" or "my" or trailing hearts
        if (brandTitleVal) {
            const cleanTitle = brandTitleVal.replace(/\s+my\s*(?:❤️|🤍|💖|💕|✨)?\s*$/gi, '').trim();
            if (cleanTitle !== brandTitleVal) {
                brandTitleVal = cleanTitle;
                config.settings.birthdayTitle = cleanTitle;
            }
        }
        
        document.getElementById('edit-brand-title').innerText = brandTitleVal;
        // Load subtitle from config if set
        const subtitleEl = document.getElementById('edit-brand-subtitle');
        if (subtitleEl && config.settings.brandSubtitle) {
            subtitleEl.innerText = config.settings.brandSubtitle;
        }
        
        const genderSelect = document.getElementById('cfg-gender-select');
        if (genderSelect) {
            genderSelect.value = gender;
            genderSelect.addEventListener('change', (e) => {
                updateGenderPronouns(e.target.value, true);
            });
        }
        updateGenderPronouns(gender, false);

        const themeSelect = document.getElementById('cfg-theme-select');
        if (themeSelect) {
            themeSelect.value = config.settings.theme || 'rose';
            themeSelect.addEventListener('change', (e) => {
                config.settings.theme = e.target.value;
                applyTheme(e.target.value);
            });
        }
        applyTheme(config.settings.theme || 'rose');

        document.getElementById('recipient-greeting-name').innerText = config.settings.recipientName.toUpperCase();
        document.getElementById('finale-her-name').innerText = config.settings.recipientName;
        
        // Show personalized greeting on lock screen
        const lockGreetingEl = document.getElementById('lock-greeting-text');
        let greetingVal = config.settings.lockGreeting;
        // Sanitize old greeting values containing "Happy Birthday ... ! 🎂" to just use name
        if (greetingVal && (greetingVal.startsWith("Happy Birthday ") || greetingVal.endsWith("! 🎂"))) {
            greetingVal = config.settings.recipientName;
            config.settings.lockGreeting = greetingVal;
        }
        
        if (lockGreetingEl && greetingVal) {
            lockGreetingEl.innerText = greetingVal;
            lockGreetingEl.style.display = 'block';
        } else if (lockGreetingEl) {
            // Default greeting to just show recipient name (e.g. sweet bun)
            lockGreetingEl.innerText = config.settings.recipientName || '';
            lockGreetingEl.style.display = 'block';
        }
        
        // Load credits fields
        document.getElementById('edit-finale-director').innerText = config.settings.directorName || "Kaja";
        document.getElementById('finale-thanks-1').innerText = config.settings.thanks1 || "For every memory.";
        document.getElementById('finale-thanks-2').innerText = config.settings.thanks2 || "For every laugh.";
        document.getElementById('finale-thanks-3').innerText = config.settings.thanks3 || "For every moment.";
        document.getElementById('finale-ending-line').innerText = config.settings.endingLine || "The End...";
        document.getElementById('finale-next-chapter').innerText = config.settings.nextChapterLine || "Or Maybe Just Another Chapter...";
    } catch (err) {
        console.error("Failed to load database config", err);
    }
    
    setupSectionObserver();
    setInterval(sendHeartbeat, 5000);

    // Setup Inline WYSIWYG Blur Events
    setupWYSIWYGListeners();
    // Setup file pickers listeners
    setupFilePickerListeners();
});

// Setup audio elements
function setupAudioNode() {
    setupVoiceSection();

    const btnMute = document.getElementById('btn-mute');
    btnMute.addEventListener('click', toggleMute);

    const volumeSlider = document.getElementById('volume-slider');
    volumeSlider.addEventListener('input', (e) => {
        currentVolume = +e.target.value;
        if (bgMusicNode && !voicePlayingActive) {
            bgMusicNode.volume = currentVolume;
        }
        isMuted = currentVolume === 0;
        updateVolumeUI();
    });
}

function toggleMute() {
    isMuted = !isMuted;
    if (isMuted) {
        if (bgMusicNode) bgMusicNode.muted = true;
        if (soundSynth) soundSynth.stopPianoLoop();
    } else {
        if (bgMusicNode) {
            bgMusicNode.muted = false;
            bgMusicNode.play().catch(() => {});
        } else if (soundSynth) {
            soundSynth.startPianoLoop();
        }
    }
    updateVolumeUI();
}

function updateVolumeUI() {
    const iconOn = document.querySelector('.icon-volume-on');
    const iconOff = document.querySelector('.icon-volume-off');
    const volSlider = document.getElementById('volume-slider');

    if (isMuted) {
        iconOn.classList.add('hidden');
        iconOff.classList.remove('hidden');
        volSlider.value = 0;
    } else {
        iconOn.classList.remove('hidden');
        iconOff.classList.add('hidden');
        volSlider.value = currentVolume;
    }
}

// Start Background Music Loop
function startBackgroundMusic() {
    if (bgMusicPlaying && bgMusicNode && bgMusicNode.src && !bgMusicNode.paused) return;
    bgMusicPlaying = true;
    document.getElementById('audio-control').classList.remove('hidden');

    if (!soundSynth) {
        soundSynth = new AudioSynth();
    }

    if (config.settings.musicUrl) {
        // Play MP3 (Reuses the already unlocked bgMusicNode instance)
        bgMusicNode.src = config.settings.musicUrl;
        bgMusicNode.loop = true;
        bgMusicNode.volume = currentVolume;
        bgMusicNode.play()
            .then(() => {
                if (soundSynth) soundSynth.stopPianoLoop();
            })
            .catch((err) => {
                console.log("Audio block fallback on start journey:", err);
                if (soundSynth) soundSynth.startPianoLoop();
            });
    } else {
        soundSynth.startPianoLoop();
    }
}

// Countdown Reveal Logic
let countdownInterval = null;
function setupCountdown() {
    if (isEditMode) return; // Skip countdown in visual editor

    // If no countdown date set, show lock screen immediately
    if (!config.settings.countdownDate) {
        document.getElementById('countdown-screen').classList.add('hidden');
        document.getElementById('lock-screen').classList.remove('hidden');
        return;
    }

    const cdt = new Date(config.settings.countdownDate);
    // If date is invalid or in the past, skip to lock screen
    if (isNaN(cdt.getTime()) || cdt <= new Date()) {
        document.getElementById('countdown-screen').classList.add('hidden');
        document.getElementById('lock-screen').classList.remove('hidden');
        return;
    }

    const msgs = [
        "Someone spent a lot of time creating this for you ❤️",
        "Every second brings you closer to your surprise ✨",
        "Something beautiful is waiting 🌸",
        "A special surprise has been prepared just for you..."
    ];
    let msgIdx = 0;

    setInterval(() => {
        const msgEl = document.getElementById('rotating-messages');
        if (msgEl) {
            msgEl.style.opacity = 0;
            setTimeout(() => {
                msgIdx = (msgIdx + 1) % msgs.length;
                msgEl.innerText = msgs[msgIdx];
                msgEl.style.opacity = 1;
            }, 500);
        }
    }, 4000);

    const checkReveal = () => {
        const now = new Date();
        const diff = cdt - now;
        
        if (diff <= 0) {
            clearInterval(countdownInterval);
            document.getElementById('countdown-screen').classList.add('hidden');
            document.getElementById('lock-screen').classList.remove('hidden');
        } else {
            document.getElementById('lock-screen').classList.add('hidden');
            document.getElementById('countdown-screen').classList.remove('hidden');
            
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            document.getElementById('cd-days').innerText = String(d).padStart(2, '0');
            document.getElementById('cd-hours').innerText = String(h).padStart(2, '0');
            document.getElementById('cd-minutes').innerText = String(m).padStart(2, '0');
            document.getElementById('cd-seconds').innerText = String(s).padStart(2, '0');
        }
    };
    
    checkReveal();
    countdownInterval = setInterval(checkReveal, 1000);
}

// Lock Form submit handler
document.getElementById('lock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Unlock Audio Context on submit gesture
    if (!soundSynth) soundSynth = new AudioSynth();
    if (soundSynth.ctx && soundSynth.ctx.state === 'suspended') {
        soundSynth.ctx.resume();
    }

    const password = document.getElementById('site-password').value;
    const errorEl = document.getElementById('lock-error');

    try {
        // Fallback: Check if this is the admin password first to unlock edit mode directly
        if (supabaseClient) {
            const { data: isAdmin } = await supabaseClient.rpc('verify_admin', { pass: password });
            if (isAdmin) {
                adminToken = password;
                localStorage.setItem('adminToken', adminToken);
                if (soundSynth) soundSynth.playTwinkle();
                document.getElementById('lock-screen').classList.add('hidden');
                unlockEditorMode();
                return;
            }
        }

        if (password === config.settings.password) {
            soundSynth.playTwinkle();
            document.getElementById('lock-screen').classList.add('hidden');
            document.getElementById('intro-screen').classList.remove('hidden');
            
            // Initialize and play background music immediately on user gesture!
            if (!bgMusicNode) bgMusicNode = new Audio();
            if (config.settings.musicUrl) {
                bgMusicNode.src = config.settings.musicUrl;
                bgMusicNode.loop = true;
                bgMusicNode.volume = currentVolume;
                bgMusicNode.play()
                    .then(() => {
                        bgMusicPlaying = true;
                        document.getElementById('audio-control').classList.remove('hidden');
                    })
                    .catch(err => {
                        console.log("Audio block fallback on unlock submit:", err);
                        if (soundSynth) {
                            soundSynth.startPianoLoop();
                            bgMusicPlaying = true;
                            document.getElementById('audio-control').classList.remove('hidden');
                        }
                    });
            } else {
                if (soundSynth) {
                    soundSynth.startPianoLoop();
                    bgMusicPlaying = true;
                    document.getElementById('audio-control').classList.remove('hidden');
                }
            }

            runCinematicIntro();
            logVisit();
        } else {
            errorEl.innerText = "Incorrect passcode.";
            errorEl.classList.remove('hidden');
        }
    } catch (err) {
        errorEl.innerText = "Error authenticating. Try again.";
        errorEl.classList.remove('hidden');
    }
});

// Cinematic Movie Intro Loop
function runCinematicIntro() {
    const sequence = [
        { id: 'intro-text-1', delay: 1000, duration: 3000 },
        { id: 'intro-text-2', delay: 4500, duration: 3000 },
        { id: 'intro-text-3', delay: 8000, duration: 2000 },
        { id: 'intro-final-glow', delay: 11000 }
    ];

    sequence.forEach(step => {
        setTimeout(() => {
            const el = document.getElementById(step.id);
            if (el) {
                el.classList.remove('hidden');
                void el.offsetWidth;
                el.classList.add('active');
            }
            if (step.duration) {
                setTimeout(() => {
                    if (el) {
                        el.classList.remove('active');
                        setTimeout(() => el.classList.add('hidden'), 1500);
                    }
                }, step.duration);
            }
        }, step.delay);
    });

    // Start Button trigger
    document.getElementById('btn-start-journey').addEventListener('click', () => {
        if (!bgMusicNode) bgMusicNode = new Audio();
        startBackgroundMusic();

        document.getElementById('intro-screen').classList.add('hidden');
        document.getElementById('main-experience').classList.remove('hidden');
        logAction("Start Journey", "Clicked cinematic enter button");
    });
}

// -------------------------------------------------------------
// SECTION 1: TIMELINE
// -------------------------------------------------------------
function setupTimeline() {
    const wrapper = document.getElementById('timeline-wrapper');
    wrapper.innerHTML = '';

    config.timeline.forEach((slide, idx) => {
        const slideEl = document.createElement('div');
        slideEl.className = 'timeline-slide';
        slideEl.setAttribute('data-index', idx);
        slideEl.innerHTML = `
            <div class="img-edit-wrapper">
                <div class="photo-frame-container">
                    <img class="photo-frame-img" src="${slide.photoUrl}" alt="${slide.title}">
                </div>
                ${isEditMode ? `<button class="btn-upload-overlay" onclick="triggerPhotoUpload('timeline', '${slide.id}', this, event)">📷 Change</button>` : ''}
            </div>
            <div class="timeline-slide-content">
                <h3 class="timeline-slide-title font-luxury timeline-title-edit" contenteditable="${isEditMode}">${slide.title}</h3>
                <p class="timeline-slide-quote" style="display:inline-block; width:100%;">"<span class="timeline-quote-edit" contenteditable="${isEditMode}">${slide.quote}</span>"</p>
                <p class="timeline-slide-caption timeline-caption-edit" contenteditable="${isEditMode}">${slide.caption}</p>
                ${isEditMode ? `<div class="text-center" style="margin-top:10px;"><button class="btn-admin-action logout" onclick="deleteTimelineSlide(${idx})">🗑️ Delete Slide</button></div>` : `
                <div class="slide-reactions">
                    <button class="btn-reaction" onclick="logReaction('${slide.id}', '❤️ Loved This')">❤️ Loved This</button>
                    <button class="btn-reaction" onclick="logReaction('${slide.id}', '🥹 Emotional')">🥹 Emotional</button>
                    <button class="btn-reaction" onclick="logReaction('${slide.id}', '😂 Funny')">😂 Funny</button>
                    <button class="btn-reaction" onclick="logReaction('${slide.id}', '✨ Favorite')">✨ Favorite</button>
                </div>`}
            </div>
        `;
        wrapper.appendChild(slideEl);
    });

    const btnPrev = document.getElementById('timeline-prev');
    const btnNext = document.getElementById('timeline-next');

    // Sync currentSlide variable when user swipes/scrolls manually
    wrapper.onscroll = () => {
        if (wrapper.clientWidth > 0) {
            currentSlide = Math.round(wrapper.scrollLeft / wrapper.clientWidth);
        }
    };

    btnPrev.onclick = () => {
        if (currentSlide > 0) {
            currentSlide--;
            wrapper.scrollTo({ left: wrapper.clientWidth * currentSlide, behavior: 'smooth' });
            logAction("Timeline Slide", `Navigated to slide ${currentSlide}`);
        }
    };

    btnNext.onclick = () => {
        if (currentSlide < config.timeline.length - 1) {
            currentSlide++;
            wrapper.scrollTo({ left: wrapper.clientWidth * currentSlide, behavior: 'smooth' });
            logAction("Timeline Slide", `Navigated to slide ${currentSlide}`);
        }
    };
}

async function logReaction(slideId, type, event) {
    const e = event || window.event;
    if (e && e.target) {
        e.target.classList.add('active');
    }
    if (soundSynth) soundSynth.playTwinkle();

    try {
        const entry = { slideId, reactionType: type, sessionId, timestamp: new Date().toISOString() };
        await supabaseClient.rpc('log_analytics', { type_name: 'reaction', entry });
    } catch(e) {}
}

// -------------------------------------------------------------
// SECTION 2: INSTAGRAM STYLE STORY SLIDER
// -------------------------------------------------------------
let currentStoryIndex = 0;
let storyTimer = null;
let storyProgressInterval = null;
const STORY_DURATION = 5000; // 5 seconds
let storyStartTime = 0;
let storyElapsedTime = 0;
let storyIsPaused = false;
let storyPauseTime = 0;

function setupPolaroids() {
    const track = document.getElementById('story-slide-track');
    const progressBar = document.getElementById('story-progress-bar');
    const counter = document.getElementById('story-counter');
    
    if (!track) return;
    
    track.innerHTML = '';
    progressBar.innerHTML = '';
    
    const polaroids = config.polaroids || [];
    
    if (polaroids.length === 0) {
        track.innerHTML = '<div style="color: white; text-align: center; padding-top: 100px;">No stories yet. Click Bulk Upload in Admin mode to add some!</div>';
        if (counter) counter.innerText = '0 / 0';
        return;
    }
    
    // Create progress segments and slides
    polaroids.forEach((pol, idx) => {
        const seg = document.createElement('div');
        seg.className = 'story-seg';
        seg.id = `story-seg-${idx}`;
        seg.innerHTML = '<div class="story-seg-fill"></div>';
        progressBar.appendChild(seg);
        
        const slide = document.createElement('div');
        slide.className = 'story-slide';
        slide.setAttribute('data-index', idx);
        slide.innerHTML = `<img src="${pol.url}" alt="${pol.caption || ''}" draggable="false" loading="lazy">`;
        track.appendChild(slide);
    });
    
    // Show admin overlay if in edit mode
    const adminOverlay = document.getElementById('story-admin-overlay');
    if (adminOverlay) {
        if (isEditMode) {
            adminOverlay.classList.remove('hidden');
            const hint = document.getElementById('story-caption-edit-hint');
            if (hint) hint.classList.remove('hidden');
        } else {
            adminOverlay.classList.add('hidden');
            const hint = document.getElementById('story-caption-edit-hint');
            if (hint) hint.classList.add('hidden');
        }
    }
    
    // Make caption editable if in edit mode
    const captionText = document.getElementById('story-caption-text');
    if (captionText) {
        captionText.contentEditable = isEditMode;
        if (isEditMode) {
            // Listen for input / blur to save changes
            captionText.onblur = () => {
                const pol = config.polaroids[currentStoryIndex];
                if (pol) {
                    pol.caption = captionText.innerText.trim();
                }
            };
        }
    }
    
    // Set initial slide
    showStory(currentStoryIndex);
    
    // Setup hold to pause
    const viewer = document.getElementById('story-viewer');
    if (viewer) {
        viewer.onmousedown = startStoryPause;
        viewer.onmouseup = endStoryPause;
        viewer.onmouseleave = endStoryPause;
        viewer.ontouchstart = (e) => {
            if (e.target.closest('.story-admin-btn')) return;
            startStoryPause();
        };
        viewer.ontouchend = (e) => {
            if (e.target.closest('.story-admin-btn')) return;
            endStoryPause();
        };
    }
}

function showStory(idx) {
    const polaroids = config.polaroids || [];
    if (polaroids.length === 0) return;
    
    // Boundary check
    if (idx < 0) idx = polaroids.length - 1;
    if (idx >= polaroids.length) idx = 0;
    
    currentStoryIndex = idx;
    
    // Update active slide class
    const slides = document.querySelectorAll('.story-slide');
    slides.forEach((slide, i) => {
        if (i === idx) {
            slide.classList.add('active');
        } else {
            slide.classList.remove('active');
        }
    });
    
    // Update progress bar segments
    const segments = document.querySelectorAll('.story-seg');
    segments.forEach((seg, i) => {
        const fill = seg.querySelector('.story-seg-fill');
        if (i < idx) {
            seg.className = 'story-seg done';
            if (fill) fill.style.width = '100%';
        } else if (i === idx) {
            seg.className = 'story-seg active';
            if (fill) fill.style.width = '0%';
        } else {
            seg.className = 'story-seg';
            if (fill) fill.style.width = '0%';
        }
    });
    
    // Update caption
    const captionText = document.getElementById('story-caption-text');
    if (captionText) {
        captionText.innerText = polaroids[idx].caption || '';
    }
    
    // Update counter
    const counter = document.getElementById('story-counter');
    if (counter) {
        counter.innerText = `${idx + 1} / ${polaroids.length}`;
    }
    
    // Restart animation timer
    startStoryTimer();
}

function startStoryTimer() {
    clearInterval(storyProgressInterval);
    clearTimeout(storyTimer);
    
    if (isEditMode) return; // Don't auto-advance in edit mode
    
    storyStartTime = Date.now();
    storyElapsedTime = 0;
    storyIsPaused = false;
    
    const duration = STORY_DURATION;
    
    storyProgressInterval = setInterval(() => {
        if (storyIsPaused) return;
        
        storyElapsedTime = Date.now() - storyStartTime;
        if (storyElapsedTime >= duration) {
            storyElapsedTime = duration;
            clearInterval(storyProgressInterval);
            storyNav(1); // Advance next
        }
        
        const activeSeg = document.querySelector('.story-seg.active .story-seg-fill');
        if (activeSeg) {
            const pct = (storyElapsedTime / duration) * 100;
            activeSeg.style.width = `${pct}%`;
        }
    }, 30);
}

function startStoryPause() {
    if (isEditMode) return;
    storyIsPaused = true;
    storyPauseTime = Date.now();
    
    const pauseIcon = document.getElementById('story-pause-icon');
    if (pauseIcon) pauseIcon.classList.remove('hidden');
}

function endStoryPause() {
    if (isEditMode || !storyIsPaused) return;
    storyIsPaused = false;
    
    // Adjust start time to account for the paused duration
    const pausedDuration = Date.now() - storyPauseTime;
    storyStartTime += pausedDuration;
    
    const pauseIcon = document.getElementById('story-pause-icon');
    if (pauseIcon) pauseIcon.classList.add('hidden');
}

function storyNav(dir) {
    const polaroids = config.polaroids || [];
    if (polaroids.length === 0) return;
    
    let nextIdx = currentStoryIndex + dir;
    if (nextIdx < 0) nextIdx = polaroids.length - 1;
    if (nextIdx >= polaroids.length) nextIdx = 0;
    
    showStory(nextIdx);
}

function storyChangePhoto() {
    const currentPol = config.polaroids[currentStoryIndex];
    if (!currentPol) return;
    
    const activeSlide = document.querySelector(`.story-slide[data-index="${currentStoryIndex}"]`);
    if (!activeSlide) return;
    
    const img = activeSlide.querySelector('img');
    editPhotoContext = { type: 'polaroid', id: currentPol.id, element: img };
    
    document.getElementById('general-image-file').click();
}

function storyDeleteCurrent() {
    if (config.polaroids.length <= 1) {
        showToast("You must have at least one story slide!", "error");
        return;
    }
    if (confirm("Are you sure you want to delete this story slide?")) {
        config.polaroids.splice(currentStoryIndex, 1);
        currentStoryIndex = Math.max(0, currentStoryIndex - 1);
        setupPolaroids();
        showToast("Story deleted! Remember to Save Changes.", "success");
    }
}

async function handleBulkPhotosUpload() {
    const input = document.getElementById('bulk-photos-input');
    if (!input.files || input.files.length === 0) return;
    
    const files = Array.from(input.files);
    const statusDiv = document.getElementById('bulk-upload-status');
    if (statusDiv) {
        statusDiv.innerText = `Uploading 0/${files.length} photos...`;
        statusDiv.classList.remove('hidden');
    }
    
    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
        try {
            if (statusDiv) statusDiv.innerText = `Uploading ${i + 1}/${files.length} photos...`;
            const publicUrl = await uploadToSupabaseStorage(files[i]);
            if (publicUrl) {
                const newPol = {
                    id: Math.random().toString(36).substr(2, 9),
                    url: publicUrl,
                    caption: "Click to edit caption ✨"
                };
                config.polaroids.push(newPol);
                successCount++;
            }
        } catch (err) {
            console.error("Bulk upload err: ", err);
        }
    }
    
    if (statusDiv) {
        statusDiv.innerText = `Successfully uploaded ${successCount} photos!`;
        setTimeout(() => statusDiv.classList.add('hidden'), 3000);
    }
    
    if (successCount > 0) {
        setupPolaroids();
        showToast(`Successfully added ${successCount} new stories! Remember to Save Changes.`, "success");
    }
}


// -------------------------------------------------------------
// SECTION 3: FRIENDSHIP STATS
// -------------------------------------------------------------
function setupStats() {
    document.getElementById('stat-days').setAttribute('data-target', config.stats.days);
    document.getElementById('stat-laughs').setAttribute('data-target', config.stats.laughs);

    // Sync input values in edit mode
    if (isEditMode) {
        document.getElementById('input-stat-days').value = config.stats.days;
        document.getElementById('input-stat-laughs').value = config.stats.laughs;
        
        // Listen to updates
        const inputs = ['days', 'laughs'];
        inputs.forEach(key => {
            document.getElementById(`input-stat-${key}`).addEventListener('input', (e) => {
                config.stats[key] = +e.target.value;
                document.getElementById('stat-days').innerText = config.stats.days;
                document.getElementById('stat-laughs').innerText = config.stats.laughs;
            });
        });
    }

    statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    statsObserver.observe(document.getElementById('sec-stats'));
}

function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    counters.forEach(counter => {
        if (counter.classList.contains('elegant-infinity')) return;
        const target = +counter.getAttribute('data-target');
        const duration = 2000;
        const stepTime = 30;
        const totalSteps = duration / stepTime;
        const increment = target / totalSteps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                counter.innerText = target;
                clearInterval(timer);
            } else {
                counter.innerText = Math.floor(current);
            }
        }, stepTime);
    });
}

// -------------------------------------------------------------
// SECTION 4: INTERACTIVE FUN QUESTIONS
// -------------------------------------------------------------
function answerQuestion(num, answer, event) {
    if (isEditMode) return; // Disable interactive responses in visual editor

    const respEl = document.getElementById(`q-resp-${num}`);
    respEl.classList.remove('hidden');
    let text = "";

    const e = event || window.event;
    const target = e ? e.target : null;

    if (num === 1) {
        text = answer ? "Obviously 😌" : "Wrong answer detected 😂";
        if (!answer && target) dodgeButton(target);
    } else if (num === 2) {
        text = answer ? "Mission successful 😎" : "Impossible.";
        if (!answer && target) dodgeButton(target);
    } else if (num === 3) {
        text = answer ? "That means a lot ❤️" : "System error detected 🚨";
        if (!answer && target) dodgeButton(target);
    }
    respEl.innerText = text;
    logAction("Fun Questions", `Answered question ${num}: ${answer ? 'YES' : 'NO'}`);
}

function dodgeButton(btn) {
    const container = btn.closest('.question-buttons');
    const maxX = container.clientWidth - btn.clientWidth - 10;
    const randX = Math.random() * maxX;
    btn.style.position = 'relative';
    btn.style.left = `${randX}px`;
    btn.style.transform = `scale(0.9) translateY(${Math.random() * 20 - 10}px)`;
    if (soundSynth) soundSynth.playTwinkle();
}

// -------------------------------------------------------------
// SECTION 5: SECRET ENVELOPES
// -------------------------------------------------------------
function setupEnvelopes() {
    const grid = document.getElementById('envelopes-grid');
    grid.innerHTML = '';

    config.envelopes.forEach((env, idx) => {
        const wrap = document.createElement('div');
        wrap.className = 'envelope-wrapper';
        wrap.setAttribute('data-index', idx);
        wrap.innerHTML = `
            <div class="envelope-card">
                <div class="envelope-front">
                    <span class="stamp">✉️</span>
                    <h3 class="font-luxury env-title-edit" contenteditable="${isEditMode}">${env.title}</h3>
                    ${isEditMode ? `<button class="btn-admin-action logout" onclick="deleteEnvelope(${idx})" style="position:absolute; bottom:15px; font-size:0.75rem;">Delete</button>` : ''}
                </div>
                <div class="envelope-back">
                    <p class="font-script env-title-display" style="font-size:1.6rem; color:#b76e79;">${env.title}</p>
                    <p class="env-content-edit" contenteditable="${isEditMode}" style="margin-top:10px; width:100%; min-height:80px;">${env.content}</p>
                </div>
            </div>
        `;
        
        wrap.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-admin-action')) return;
            logAction("Secret Envelope", `Opened envelope: ${env.title}`);
            if (soundSynth) soundSynth.playTwinkle();
        });

        grid.appendChild(wrap);
    });
}

// -------------------------------------------------------------
// SECTION 6: MEMORY MAP
// -------------------------------------------------------------
function setupMap() {
    const map = document.getElementById('map-container');
    if (!map) return;
    map.querySelectorAll('.map-pin').forEach(pin => pin.remove());

    const mapPoints = config.mapPoints || [];
    
    // Build dynamic path line connecting pins in chronological/index order
    const pathLine = document.getElementById('map-path-line');
    const pathGlow = document.getElementById('map-path-glow');
    if (mapPoints.length > 0) {
        let pathD = `M ${mapPoints[0].coordinateX},${mapPoints[0].coordinateY}`;
        for (let i = 1; i < mapPoints.length; i++) {
            pathD += ` L ${mapPoints[i].coordinateX},${mapPoints[i].coordinateY}`;
        }
        if (pathLine) pathLine.setAttribute('d', pathD);
        if (pathGlow) pathGlow.setAttribute('d', pathD);
    }

    mapPoints.forEach((pt, idx) => {
        const pin = document.createElement('div');
        pin.className = 'map-pin';
        pin.setAttribute('data-index', idx);
        pin.style.left = `${pt.coordinateX}%`;
        pin.style.top = `${pt.coordinateY}%`;
        pin.innerHTML = `
            <span class="pin-number">${idx + 1}</span>
            <span class="pin-label">${pt.name}</span>
        `;

        pin.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = document.getElementById('map-detail-card');
            const titleEl = document.getElementById('map-location-title');
            const descEl = document.getElementById('map-location-memory');
            
            titleEl.innerText = pt.name;
            titleEl.setAttribute('data-index', idx);
            titleEl.contentEditable = isEditMode;

            descEl.innerText = pt.memory;
            descEl.setAttribute('data-index', idx);
            descEl.contentEditable = isEditMode;
            
            const photoFrame = document.getElementById('map-location-photo');
            photoFrame.innerHTML = '';
            if (pt.photoUrl) {
                photoFrame.innerHTML = `
                    <div class="img-edit-wrapper">
                        <img src="${pt.photoUrl}" alt="${pt.name}">
                        ${isEditMode ? `<button class="btn-upload-overlay" onclick="triggerPhotoUpload('map', '${pt.id}', this, event)">📷 Change</button>` : ''}
                    </div>
                `;
                photoFrame.classList.remove('hidden');
            } else {
                if (isEditMode) {
                    photoFrame.innerHTML = `<button class="btn-admin-action" onclick="triggerPhotoUpload('map', '${pt.id}', this, event)">📷 Add Location Photo</button>`;
                    photoFrame.classList.remove('hidden');
                } else {
                    photoFrame.classList.add('hidden');
                }
            }
            card.classList.remove('hidden');

            logAction("Memory Map", `Viewed location pin: ${pt.name}`);
            if (soundSynth) soundSynth.playTwinkle();
        });

        map.appendChild(pin);
    });

    document.getElementById('btn-close-map-detail').addEventListener('click', () => {
        document.getElementById('map-detail-card').classList.add('hidden');
    });

    // Relocate Map Pins in Edit Mode by clicking map
    map.addEventListener('click', (e) => {
        if (!isEditMode) return;
        // If clicking a pin, don't relocate
        if (e.target.closest('.map-pin')) return;
        
        const rect = map.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        // Relocate active pin
        const activeDetailIndex = document.getElementById('map-location-title').getAttribute('data-index');
        if (activeDetailIndex !== null && activeDetailIndex !== undefined) {
            const idx = +activeDetailIndex;
            config.mapPoints[idx].coordinateX = Math.round(x);
            config.mapPoints[idx].coordinateY = Math.round(y);
            
            // Re-render pins
            setupMap();
            // Pulse sparkle
            if (soundSynth) soundSynth.playTwinkle();
        }
    });
}

// -------------------------------------------------------------
// SECTION 8: TIME CAPSULE LIVE TICKER
// -------------------------------------------------------------
let capsuleInterval = null;
function setupTimeCapsule() {
    let meetDateStr = config.settings.meetDate || "2023-06-20T10:00:00";
    let startMeet = new Date(meetDateStr);

    const updateMeetDateDisplay = () => {
        document.getElementById('capsule-meet-date').innerText = startMeet.toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };
    updateMeetDateDisplay();

    const dateInput = document.getElementById('input-meet-date');
    if (dateInput) {
        const yyyy = startMeet.getFullYear();
        const mm = String(startMeet.getMonth() + 1).padStart(2, '0');
        const dd = String(startMeet.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    const updateCapsule = () => {
        const now = new Date();
        let diffMs = now - startMeet;
        if (diffMs < 0) diffMs = 0;

        let diffSecs = Math.floor(diffMs / 1000);
        let diffMins = Math.floor(diffSecs / 60);
        let diffHours = Math.floor(diffMins / 60);
        let diffDays = Math.floor(diffHours / 24);

        const years = Math.floor(diffDays / 365);
        const remainingDays = diffDays % 365;
        const months = Math.floor(remainingDays / 30);
        const days = remainingDays % 30;
        
        const hours = diffHours % 24;
        const mins = diffMins % 60;
        const secs = diffSecs % 60;

        document.getElementById('cap-years').innerText = years;
        document.getElementById('cap-months').innerText = months;
        document.getElementById('cap-days').innerText = days;
        document.getElementById('cap-hours').innerText = hours;
        document.getElementById('cap-minutes').innerText = mins;
        document.getElementById('cap-seconds').innerText = secs;
    };

    if (dateInput) {
        dateInput.onchange = (e) => {
            const val = e.target.value;
            if (val) {
                const newDateStr = `${val}T10:00:00`;
                config.settings.meetDate = newDateStr;
                startMeet = new Date(newDateStr);
                updateMeetDateDisplay();
                updateCapsule();
            }
        };
    }

    updateCapsule();
    if (capsuleInterval) clearInterval(capsuleInterval);
    capsuleInterval = setInterval(updateCapsule, 1000);

    const btnExport = document.getElementById('btn-export-memory');
    if (btnExport) {
        btnExport.onclick = exportMemoryCard;
    }
}

// -------------------------------------------------------------
// SECTION 9: MIRROR OF APPRECIATION
// -------------------------------------------------------------
function setupMirror() {
    const grid = document.getElementById('mirror-grid');
    grid.innerHTML = '';

    config.compliments.forEach((comp, idx) => {
        const card = document.createElement('div');
        card.className = 'mirror-card';
        card.setAttribute('data-index', idx);
        card.innerHTML = `
            <div class="mirror-inner">
                <div class="mirror-front">
                    <span>✨</span>
                </div>
                <div class="mirror-back" style="display:flex; flex-direction:column; justify-content:center; align-items:center;">
                    <p class="font-luxury compliment-text-edit" contenteditable="${isEditMode}" style="width:100%;">${comp.text}</p>
                    ${isEditMode ? `<button class="btn-admin-action logout" onclick="deleteCompliment(${idx})" style="font-size:0.7rem; margin-top:10px; padding:4px 8px; border-radius:10px;">Delete</button>` : ''}
                </div>
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-admin-action')) return;
            if (!card.classList.contains('shattered')) {
                card.classList.add('shattered');
                if (soundSynth) soundSynth.playGlassShatter();
                logAction("Appreciation Mirror", `Revealed compliment: ${comp.text}`);
            }
        });
        
        grid.appendChild(card);
    });
}

// -------------------------------------------------------------
// SECTION 10: FUTURE MEMORIES
// -------------------------------------------------------------
function setupChecklist() {
    const list = document.getElementById('bucket-list');
    list.innerHTML = '';

    config.checklist.forEach((item, idx) => {
        const li = document.createElement('li');
        li.className = `bucket-item ${item.checked ? 'checked' : ''}`;
        li.setAttribute('data-index', idx);
        li.innerHTML = `
            <div class="checkbox-custom">${item.checked ? '✓' : ''}</div>
            <span class="bucket-text bucket-text-edit" contenteditable="${isEditMode}">${item.text}</span>
            ${isEditMode ? `<button class="btn-admin-action logout" onclick="deleteChecklistItem(${idx})" style="padding:4px 8px; font-size:0.7rem; border-radius:10px; margin-left:auto;">Delete</button>` : ''}
        `;
        
        li.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-admin-action') || e.target.classList.contains('bucket-text-edit')) return;
            item.checked = !item.checked;
            li.className = `bucket-item ${item.checked ? 'checked' : ''}`;
            li.querySelector('.checkbox-custom').innerHTML = item.checked ? '✓' : '';
            if (soundSynth) soundSynth.playTwinkle();
            logAction("Bucket List Check", `Toggled goal: ${item.text} to ${item.checked}`);
        });

        list.appendChild(li);
    });
}

// -------------------------------------------------------------
// SECTION 11: VOICE MESSAGE
// -------------------------------------------------------------
const audioNode = document.getElementById('secret-voice-audio');
const playBtn = document.getElementById('btn-play-voice');
const wave = document.getElementById('soundwave');
let voicePlayingActive = false;

playBtn.addEventListener('click', () => {
    if (audioNode.paused) {
        audioNode.play();
        playBtn.querySelector('.play-icon').classList.add('hidden');
        playBtn.querySelector('.pause-icon').classList.remove('hidden');
        wave.classList.add('playing');
        voicePlayingActive = true;
        if (bgMusicNode) fadeAudioVolume(bgMusicNode, currentVolume * 0.15, 800);
        logAction("Voice Message", "Started playing recording");
    } else {
        audioNode.pause();
        playBtn.querySelector('.play-icon').classList.remove('hidden');
        playBtn.querySelector('.pause-icon').classList.add('hidden');
        wave.classList.remove('playing');
        voicePlayingActive = false;
        if (bgMusicNode) fadeAudioVolume(bgMusicNode, currentVolume, 800);
        logAction("Voice Message", "Paused playing recording");
    }
});

audioNode.addEventListener('ended', () => {
    playBtn.querySelector('.play-icon').classList.remove('hidden');
    playBtn.querySelector('.pause-icon').classList.add('hidden');
    wave.classList.remove('playing');
    voicePlayingActive = false;
    if (bgMusicNode) fadeAudioVolume(bgMusicNode, currentVolume, 800);
});

// -------------------------------------------------------------
// SECTION 12: SURPRISE GIFT BOX
// -------------------------------------------------------------
const gift = document.getElementById('gift-box');
gift.addEventListener('click', () => {
    if (!gift.classList.contains('opened')) {
        gift.classList.add('opened');
        if (soundSynth) soundSynth.playTwinkle();
        
        // Premium spin, scale and lift-off effect
        gift.style.transform = 'translateY(-120px) rotate(720deg) scale(0)';
        gift.style.opacity = '0';
        gift.style.transition = 'all 1s cubic-bezier(0.6, -0.28, 0.735, 0.045)';
        
        createConfettiExplosion();
        
        setTimeout(() => {
            const revealCard = document.getElementById('gift-reveal');
            revealCard.classList.remove('hidden');
            revealCard.classList.add('animate-gift-zoom');
        }, 800);
        logAction("Surprise Gift", "Opened magical gift explosion");
    }
});

function createConfettiExplosion() {
    const parent = document.getElementById('sec-gift');
    const shapes = ['🌸', '❤️', '✨', '⭐', '🎈', '🎉'];
    const colors = ['#ffd1dc', '#e6e6fa', '#ffea79', '#ff5e7e', '#b76e79', '#a0e6ff'];
    
    // Calculate center offset relative to section parent
    const rect = gift.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const startX = rect.left - parentRect.left + rect.width / 2;
    const startY = rect.top - parentRect.top + rect.height / 2;
    
    for (let i = 0; i < 60; i++) {
        const spark = document.createElement('div');
        const isEmoji = Math.random() > 0.4;
        if (isEmoji) {
            spark.innerText = shapes[Math.floor(Math.random() * shapes.length)];
            spark.style.fontSize = `${Math.random() * 1.5 + 0.8}rem`;
        } else {
            spark.style.width = `${Math.random() * 8 + 6}px`;
            spark.style.height = `${Math.random() * 8 + 6}px`;
            spark.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            spark.style.borderRadius = '50%';
        }
        
        spark.style.position = 'absolute';
        spark.style.left = `${startX}px`;
        spark.style.top = `${startY}px`;
        spark.style.pointerEvents = 'none';
        spark.style.zIndex = '100';
        spark.className = 'confetti-sparkle';
        
        parent.appendChild(spark);
        
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 200 + 80;
        const destX = Math.cos(angle) * distance;
        const destY = Math.sin(angle) * distance - 80;
        const rotation = Math.random() * 720 - 360;
        
        spark.animate([
            { transform: 'translate(0, 0) scale(0.5) rotate(0deg)', opacity: 1 },
            { transform: `translate(${destX}px, ${destY}px) scale(1.4) rotate(${rotation}deg)`, opacity: 0 }
        ], {
            duration: 1200 + Math.random() * 600,
            easing: 'cubic-bezier(0.1, 0.8, 0.25, 1)'
        }).onfinish = () => spark.remove();
    }
}



// -------------------------------------------------------------
// SECTION 14: FINAL HEART MOMENT
// -------------------------------------------------------------
document.getElementById('giant-heart').addEventListener('click', () => {
    if (soundSynth) soundSynth.playTwinkle();
    logAction("Giant Heart Touch", "Heart triggered pulse animation");
});

document.getElementById('btn-heart-continue').addEventListener('click', () => {
    document.getElementById('sec-final-question').scrollIntoView({ behavior: 'smooth' });
    logAction("Final Heart Transition", "Clicked continue to final questions");
});

// -------------------------------------------------------------
// SECTION 15: FINAL LIFETIME QUESTION
// -------------------------------------------------------------
document.getElementById('btn-final-yes').addEventListener('click', () => {
    const box = document.getElementById('final-response-box');
    const text = document.getElementById('final-response-text');
    text.innerText = "I knew it ❤️";
    box.classList.remove('hidden');
    logAction("Lifetime Agreement", "Answered YES to lifetime friendship");
    if (soundSynth) soundSynth.playTwinkle();
});

document.getElementById('btn-final-no').addEventListener('click', () => {
    const box = document.getElementById('final-response-box');
    const text = document.getElementById('final-response-text');
    text.innerText = "Friendship contract accepted. Lifetime validity.";
    box.classList.remove('hidden');
    logAction("Lifetime Agreement", "Answered ESCAPE to lifetime friendship");
    if (soundSynth) soundSynth.playTwinkle();
});

// -------------------------------------------------------------
// SECTION 16: GRAND FINALE
// -------------------------------------------------------------
document.getElementById('btn-finale-continue').addEventListener('click', () => {
    const credits = document.getElementById('finale-credits');
    const collage = document.getElementById('finale-collage');
    const wish = document.getElementById('finale-wish');

    credits.style.opacity = 0;
    setTimeout(() => {
        credits.classList.add('hidden');
        collage.classList.remove('hidden');
        wish.classList.remove('hidden');
        generateCollagePhotos();
        startFinaleConfetti();
        logAction("Grand Finale", "Triggered credits fade and collage reveal");
    }, 1000);
});

function generateCollagePhotos() {
    const collage = document.getElementById('finale-collage');
    collage.innerHTML = '';
    const urls = [];
    config.timeline.forEach(s => urls.push(s.photoUrl));
    config.polaroids.forEach(p => urls.push(p.url));

    urls.forEach((url, idx) => {
        const img = document.createElement('img');
        img.src = url;
        img.className = 'collage-photo';
        img.style.left = `${Math.random() * 80 + 5}%`;
        img.style.animationDelay = `${idx * 1.5}s`;
        img.style.animationDuration = `${10 + Math.random() * 10}s`;
        collage.appendChild(img);
    });
}

let finaleConfettiTimer = null;
function startFinaleConfetti() {
    if (finaleConfettiTimer) return;
    const triggerBatch = () => {
        for (let i = 0; i < 15; i++) {
            const star = document.createElement('div');
            star.className = 'finale-sparkle';
            star.innerText = Math.random() > 0.5 ? '❤️' : '✨';
            star.style.cssText = `
                position: fixed;
                font-size: ${Math.random() * 1.5 + 0.8}rem;
                left: ${Math.random() * 100}vw;
                bottom: -50px;
                pointer-events: none;
                z-index: 10;
                opacity: 1;
            `;
            document.body.appendChild(star);
            
            star.animate([
                { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
                { transform: `translateY(-110vh) rotate(${Math.random() * 360}deg)`, opacity: 0 }
            ], {
                duration: 4000 + Math.random() * 3000,
                easing: 'ease-out'
            }).onfinish = () => star.remove();
        }
    };
    
    triggerBatch();
    finaleConfettiTimer = setInterval(triggerBatch, 3000);
}

// -------------------------------------------------------------
// SECTION 17: FINAL REFLECTION FORM
// -------------------------------------------------------------
document.querySelectorAll('.stars-rating').forEach(starContainer => {
    const category = starContainer.getAttribute('data-category');
    const stars = starContainer.querySelectorAll('.star');

    stars.forEach(star => {
        star.addEventListener('click', () => {
            if (isEditMode) return; // Disable submissions actions in edit mode
            const val = +star.getAttribute('data-value');
            starContainer.setAttribute('data-selected-rating', val);
            
            stars.forEach((s, idx) => {
                if (idx < val) s.classList.add('active');
                else s.classList.remove('active');
            });
            if (soundSynth) soundSynth.playTwinkle();
        });
    });
});

document.getElementById('reflection-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isEditMode) {
        alert("Submissions form is disabled in Visual Editor mode.");
        return;
    }

    const ratings = {};
    document.querySelectorAll('.stars-rating').forEach(starContainer => {
        const cat = starContainer.getAttribute('data-category');
        const val = +starContainer.getAttribute('data-selected-rating') || 0;
        ratings[cat] = val;
    });

    const checkedFeelings = [];
    document.querySelectorAll('input[name="feelings"]:checked').forEach(c => {
        checkedFeelings.push(c.value);
    });

    const body = {
        ratings,
        feelings: checkedFeelings,
        memoryMessage: document.getElementById('field-memory').value,
        message: document.getElementById('field-letter').value,
        futureMessage: document.getElementById('field-future').value
    };

    try {
        const feedbackItem = {
            ...body,
            timestamp: new Date().toISOString(),
            id: Math.random().toString(36).substr(2, 9)
        };
        const { error } = await supabaseClient.rpc('submit_feedback', { new_feedback: feedbackItem });
        if (error) throw error;

        if (true) {
            document.getElementById('sec-reflection').classList.add('hidden');
            document.getElementById('sec-secret-final').classList.remove('hidden');
            if (finaleConfettiTimer) clearInterval(finaleConfettiTimer);

            startFinalSecretMessages();
            logAction("Feedback Submit", "Submitted final friendship reflection ratings");

            // Eye blink closing sequence after 13 seconds
            setTimeout(() => {
                const overlay = document.getElementById('eye-blink-overlay');
                overlay.classList.remove('hidden');
                
                setTimeout(() => {
                    overlay.classList.add('blink-close');
                }, 100);

                setTimeout(() => {
                    const sec = document.getElementById('sec-secret-final');
                    sec.innerHTML = `
                        <div class="final-letter-overlay text-center" style="display:flex; align-items:center; justify-content:center; height:100vh;">
                            <h1 class="glow-text text-animated" style="font-size:2.8rem; animation: heartBeat 2s infinite;">❤️ THANK YOU FOR BEING YOU ❤️</h1>
                        </div>
                    `;
                    overlay.classList.remove('blink-close');
                    setTimeout(() => {
                        overlay.classList.add('hidden');
                    }, 2000);
                    logAction("Eye Blink Final", "Triggered closing eye blink animation");
                }, 2200);

            }, 13000);
        }
    } catch(err) {
        alert("Failed to submit feedback. Check connection.");
    }
});

function startFinalSecretMessages() {
    const container = document.getElementById('sec-secret-final');
    setInterval(() => {
        const petal = document.createElement('div');
        petal.innerText = '🌸';
        petal.style.cssText = `
            position: absolute;
            left: ${Math.random() * 100}vw;
            top: -20px;
            font-size: ${Math.random() * 1.2 + 0.6}rem;
            pointer-events: none;
            opacity: ${Math.random() * 0.5 + 0.5};
            z-index: 5;
        `;
        container.appendChild(petal);
        
        petal.animate([
            { transform: 'translateY(0) rotate(0)', opacity: 0.8 },
            { transform: `translateY(105vh) translateX(${Math.random()*100 - 50}px) rotate(${Math.random()*360}deg)`, opacity: 0 }
        ], {
            duration: 6000 + Math.random()*3000,
            easing: 'linear'
        }).onfinish = () => petal.remove();
    }, 400);
}

// -------------------------------------------------------------
// VISITOR ANALYTICS & LOGGING
// -------------------------------------------------------------
async function logVisit() {
    if (isEditMode) return;
    const deviceType = window.innerWidth < 768 ? 'Mobile' : 'Desktop';
    const body = {
        sessionId,
        deviceType,
        browser: navigator.userAgent.split(' ')[0],
        ip: "",
        timestamp: new Date().toISOString()
    };

    try {
        await supabaseClient.rpc('log_analytics', { type_name: 'visit', entry: body });
    } catch(e) {}
}

async function logAction(action, details) {
    if (isEditMode) return;
    try {
        const entry = { action, details, sessionId, timestamp: new Date().toISOString() };
        await supabaseClient.rpc('log_analytics', { type_name: 'action', entry });
    } catch(e) {}
}

async function sendHeartbeat() {
    // Heartbeat disabled for serverless build
}

function setupSectionObserver() {
    const sections = document.querySelectorAll('section');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                currentSection = entry.target.id;
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.2 });

    sections.forEach(sec => observer.observe(sec));
}

// -------------------------------------------------------------
// VISUAL BUILDER CONFIGURATION LOGIC (Admin Only)
// -------------------------------------------------------------
async function verifyAdminAuth() {
    if (adminToken) {
        try {
            const { data: isValid } = await supabaseClient.rpc('verify_admin', { pass: adminToken });
            if (isValid) {
                unlockEditorMode();
                return;
            }
        } catch (e) {
            console.error(e);
        }
    }
    // Show Admin Login modal
    document.getElementById('admin-login-overlay').classList.remove('hidden');
    document.getElementById('admin-login-form').addEventListener('submit', handleAdminLogin);
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('login-error');

    try {
        const { data: isValid, error } = await supabaseClient.rpc('verify_admin', { pass: password });
        if (error) throw error;

        if (isValid) {
            adminToken = password;
            localStorage.setItem('adminToken', adminToken);
            document.getElementById('admin-login-overlay').classList.add('hidden');
            errorEl.classList.add('hidden');
            unlockEditorMode();
        } else {
            errorEl.innerText = "Incorrect admin password.";
            errorEl.classList.remove('hidden');
        }
    } catch(err) {
        errorEl.innerText = "Connection failed or unauthorized.";
        errorEl.classList.remove('hidden');
    }
}

function unlockEditorMode() {
    isEditMode = true;
    
    // Clear countdown check interval timer to prevent it from overlaying the editor
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    
    // Hide trigger button
    const triggerBtn = document.getElementById('btn-admin-trigger');
    if (triggerBtn) triggerBtn.classList.add('hidden');
    
    // Show editor bar
    document.getElementById('admin-editor-bar').classList.remove('hidden');
    document.body.classList.add('admin-logged-in');
    
    // Enable admin controls
    document.querySelectorAll('.admin-edit-controls').forEach(el => el.classList.remove('hidden'));
    document.querySelector('.admin-stats-editor').classList.remove('hidden');
    const capEd = document.querySelector('.admin-capsule-editor');
    if (capEd) capEd.classList.remove('hidden');
    const quizEd = document.querySelector('.admin-quiz-editor');
    if (quizEd) quizEd.classList.remove('hidden');
    
    // Disable locks & countdown screens for visual edit comfort
    document.getElementById('lock-screen').classList.add('hidden');
    document.getElementById('countdown-screen').classList.add('hidden');
    document.getElementById('main-experience').classList.remove('hidden');
    
    // Enable contenteditable on fields
    document.querySelectorAll('[contenteditable]').forEach(el => el.setAttribute('contenteditable', 'true'));
    
    // Re-render editor timeline to add upload and delete overlays
    setupTimeline();
    setupPolaroids();
    setupEnvelopes();
    setupMap();
    setupMirror();
    setupChecklist();
    setupQuizEditor();
    
    const giftSec = document.getElementById('sec-gift');
    if (giftSec) giftSec.classList.remove('hidden');

    // Bind admin bar actions
    document.getElementById('btn-visual-save').addEventListener('click', saveVisualEdits);
    document.getElementById('btn-visual-upload-photos').addEventListener('click', () => {
        document.getElementById('bulk-photos-input').click();
    });
    document.getElementById('btn-visual-upload-music').addEventListener('click', () => {
        document.getElementById('cfg-music-file').click();
    });
    document.getElementById('btn-visual-upload-voice').addEventListener('click', () => {
        document.getElementById('cfg-voice-file').click();
    });
    document.getElementById('btn-visual-share').addEventListener('click', openShareLinkModal);
    document.getElementById('btn-visual-stats').addEventListener('click', openStatsSubmissionsModal);
    document.getElementById('btn-visual-logout').addEventListener('click', handleAdminLogout);

    const privatePathInput = document.getElementById('cfg-private-path');
    if (privatePathInput) {
        privatePathInput.addEventListener('input', (e) => {
            const val = e.target.value.trim().replace(/\s+/g, '-').toLowerCase();
            const fullUrl = `${window.location.protocol}//${window.location.host}/${val}`;
            document.getElementById('share-link-input').value = fullUrl;
        });
    }
}

function handleAdminLogout() {
    localStorage.removeItem('adminToken');
    window.location.reload();
}

// WYSIWYG Inline Content Synchronizers
function setupWYSIWYGListeners() {
    document.addEventListener('blur', (e) => {
        if (!isEditMode) return;
        const target = e.target;
        if (!target.hasAttribute('contenteditable')) return;

        const text = target.innerText;

        // General settings
        if (target.id === 'edit-brand-title') {
            config.settings.birthdayTitle = text;
        } else if (target.id === 'edit-brand-subtitle') {
            config.settings.brandSubtitle = text;
        } else if (target.id === 'edit-dream-body') {
            // keep the highlight-rose intact internally if needed, or update text
        } else if (target.id === 'edit-gift-wish') {
            // done
        }
        
        // Delegated Timeline edits
        else if (target.classList.contains('timeline-title-edit')) {
            const idx = +target.closest('.timeline-slide').getAttribute('data-index');
            config.timeline[idx].title = text;
        } else if (target.classList.contains('timeline-quote-edit')) {
            const idx = +target.closest('.timeline-slide').getAttribute('data-index');
            config.timeline[idx].quote = text;
        } else if (target.classList.contains('timeline-caption-edit')) {
            const idx = +target.closest('.timeline-slide').getAttribute('data-index');
            config.timeline[idx].caption = text;
        }
        
        // Gallery / Polaroid Captions (new gallery-card layout)
        else if (target.classList.contains('polaroid-caption-edit')) {
            const cardEl = target.closest('.gallery-card') || target.closest('.polaroid-card');
            if (cardEl) {
                const pid = cardEl.getAttribute('data-id');
                const pol = config.polaroids.find(p => p.id === pid);
                if (pol) pol.caption = text;
            }
        }

        // Envelope Titles & Contents
        else if (target.classList.contains('env-title-edit')) {
            const idx = +target.closest('.envelope-wrapper').getAttribute('data-index');
            config.envelopes[idx].title = text;
            target.closest('.envelope-wrapper').querySelector('.env-title-display').innerText = text;
        } else if (target.classList.contains('env-content-edit')) {
            const idx = +target.closest('.envelope-wrapper').getAttribute('data-index');
            config.envelopes[idx].content = text;
        }

        // Map Location pin details
        else if (target.id === 'map-location-title') {
            const idx = +target.getAttribute('data-index');
            config.mapPoints[idx].name = text;
            setupMap(); // refresh labels
        } else if (target.id === 'map-location-memory') {
            const idx = +target.getAttribute('data-index');
            config.mapPoints[idx].memory = text;
        }

        // Compliments text
        else if (target.classList.contains('compliment-text-edit')) {
            const idx = +target.closest('.mirror-card').getAttribute('data-index');
            config.compliments[idx].text = text;
        }

        // Bucket Checklist items
        else if (target.classList.contains('bucket-text-edit')) {
            const idx = +target.closest('.bucket-item').getAttribute('data-index');
            config.checklist[idx].text = text;
        }



        // Finale Credits
        else if (target.id === 'edit-finale-director') {
            config.settings.directorName = text;
        } else if (target.id === 'finale-her-name') {
            config.settings.recipientName = text;
            document.getElementById('recipient-greeting-name').innerText = text.toUpperCase();
        } else if (target.classList.contains('finale-thanks-edit')) {
            const idx = +target.getAttribute('data-index');
            config.settings[`thanks${idx+1}`] = text;
        } else if (target.classList.contains('finale-ending-edit')) {
            config.settings.endingLine = text;
        } else if (target.classList.contains('finale-next-edit')) {
            config.settings.nextChapterLine = text;
        }

    }, true);
}

// Supabase storage helper
async function uploadToSupabaseStorage(file) {
    if (!supabaseClient) {
        showToast("Supabase is not configured.", "error");
        return null;
    }
    
    // Create a unique filename
    const fileExt = file.name ? file.name.split('.').pop() : 'mp3';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    
    const { data, error } = await supabaseClient.storage
        .from('media')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });
        
    if (error) {
        console.error("Storage upload error:", error);
        throw error;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
        .from('media')
        .getPublicUrl(fileName);
        
    return publicUrl;
}

// Floating Save trigger
async function syncLocalConfig() {
    try {
        const authRes = await fetch('/api/admin/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminToken })
        });
        if (authRes.ok) {
            const authData = await authRes.json();
            const token = authData.token;
            
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify(config)
            });
        }
    } catch (e) {
        console.log("Local Express config sync skipped or failed (likely running serverless/Vercel)");
    }
}

async function saveVisualEdits() {
    try {
        // Compile any active inline text blur
        const active = document.activeElement;
        if (active && active.hasAttribute('contenteditable')) {
            active.blur();
        }

        const { error } = await supabaseClient.rpc('save_config', {
            pass: adminToken,
            new_config: config
        });

        if (error) throw error;

        // Sync to local server if running
        await syncLocalConfig();

        if (soundSynth) soundSynth.playTwinkle();
        showToast("Visual settings saved successfully! Your surprise has been frozen ❤️", "success");
    } catch(err) {
        console.error(err);
        showToast("Failed to save changes.", "error");
    }
}

// -------------------------------------------------------------
// IMAGE & AUDIO FILE DIRECT UPLOADS LOGIC
// -------------------------------------------------------------
function triggerPhotoUpload(type, id, btnEl, event) {
    const e = event || window.event;
    if (e && typeof e.stopPropagation === 'function') {
        e.stopPropagation();
    }
    editPhotoContext = { type, id, element: btnEl.closest('.img-edit-wrapper').querySelector('img') };
    document.getElementById('general-image-file').click();
}

function setupFilePickerListeners() {
    // General photo frame uploader
    document.getElementById('general-image-file').addEventListener('change', async (e) => {
        if (!e.target.files || e.target.files.length === 0 || !editPhotoContext) return;
        
        const file = e.target.files[0];
        
        try {
            showToast("Uploading photo...", "info");
            const publicUrl = await uploadToSupabaseStorage(file);
            if (publicUrl) {
                // Update element visual source in-place
                editPhotoContext.element.src = publicUrl;
                
                // Sync path in local config object
                const type = editPhotoContext.type;
                const id = editPhotoContext.id;
                
                if (type === 'timeline') {
                    const slide = config.timeline.find(s => s.id === id);
                    if (slide) slide.photoUrl = publicUrl;
                } else if (type === 'polaroid') {
                    const pol = config.polaroids.find(p => p.id === id);
                    if (pol) pol.url = publicUrl;
                } else if (type === 'map') {
                    const pt = config.mapPoints.find(p => p.id === id);
                    if (pt) {
                        pt.photoUrl = publicUrl;
                        // update frame
                        document.getElementById('map-location-photo').innerHTML = `<div class="img-edit-wrapper"><img src="${publicUrl}" alt="${pt.name}"><button class="btn-upload-overlay" onclick="triggerPhotoUpload('map', '${pt.id}', this, event)">📷 Change</button></div>`;
                    }
                }

                if (soundSynth) soundSynth.playTwinkle();
                showToast("Photo uploaded successfully! Remember to Save Changes.", "success");
            }
        } catch(err) {
            console.error("Photo upload failed:", err);
            showToast("Photo upload failed: " + (err.message || err), "error");
        }
        
        e.target.value = '';
        editPhotoContext = null;
    });

    // Custom background music uploader
    document.getElementById('cfg-music-file').addEventListener('change', async (e) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        try {
            showToast("Uploading song...", "info");
            const publicUrl = await uploadToSupabaseStorage(file);
            if (publicUrl) {
                config.settings.musicUrl = publicUrl;
                if (soundSynth) soundSynth.playTwinkle();
                showToast("Background song uploaded successfully! Click Save to freeze it.", "success");
            }
        } catch (err) {
            console.error("Music upload failed:", err);
            showToast("Music upload failed: " + (err.message || err), "error");
        }
        e.target.value = '';
    });

    // Voice message uploader
    document.getElementById('cfg-voice-file').addEventListener('change', async (e) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        try {
            showToast("Uploading voice note...", "info");
            const publicUrl = await uploadToSupabaseStorage(file);
            if (publicUrl) {
                config.settings.voiceMessageUrl = publicUrl;
                document.getElementById('secret-voice-audio').src = publicUrl;
                setupVoiceSection();
                if (soundSynth) soundSynth.playTwinkle();
                showToast("Voice message uploaded successfully! Click Save to freeze it.", "success");
            }
        } catch (err) {
            console.error("Voice upload failed:", err);
            showToast("Voice upload failed: " + (err.message || err), "error");
        }
        e.target.value = '';
    });
}

// Bulk photos uploader indicator loop
async function handleBulkPhotosUpload() {
    const input = document.getElementById('bulk-photos-input');
    
    if (!input.files || input.files.length === 0) return;
    
    const files = Array.from(input.files);
    const total = files.length;
    
    let successCount = 0;
    const uploadedPolaroids = [];
    
    for (let i = 0; i < total; i++) {
        const remaining = total - i;
        updateProgressToast(`Uploading photos: ${remaining} photo(s) remaining...`);
        
        try {
            const publicUrl = await uploadToSupabaseStorage(files[i]);
            if (publicUrl) {
                successCount++;
                uploadedPolaroids.push({
                    id: "p_bulk_" + Date.now() + "_" + i,
                    url: publicUrl,
                    caption: "Double click to edit caption ✨"
                });
            }
        } catch (err) {
            console.error("Failed uploading index " + i, err);
        }
    }
    
    updateProgressToast(`Successfully uploaded ${successCount} photos!`, true);
    
    if (uploadedPolaroids.length > 0) {
        config.polaroids = [...config.polaroids, ...uploadedPolaroids];
        setupPolaroids(); // refresh wall visually
        if (soundSynth) soundSynth.playTwinkle();
    }
    
    input.value = '';
}

// -------------------------------------------------------------
// DYNAMIC SECTION LIST MODIFIERS (Admin Only)
// -------------------------------------------------------------
function addTimelineSlide() {
    const newSlide = {
        id: "t_" + Date.now(),
        photoUrl: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=800&q=80",
        title: "New Slide Heading",
        quote: "Click to write custom quote",
        caption: "Click to write custom caption description details."
    };
    config.timeline.push(newSlide);
    setupTimeline();
    if (soundSynth) soundSynth.playTwinkle();
}

function deleteTimelineSlide(idx) {
    if (confirm("Delete this timeline slide?")) {
        config.timeline.splice(idx, 1);
        setupTimeline();
    }
}

function addEnvelope() {
    const newEnv = {
        id: "e_" + Date.now(),
        title: "New Secret Title",
        content: "Type the envelope secret note letter content here..."
    };
    config.envelopes.push(newEnv);
    setupEnvelopes();
    if (soundSynth) soundSynth.playTwinkle();
}

function deleteEnvelope(idx) {
    if (confirm("Delete this envelope note?")) {
        config.envelopes.splice(idx, 1);
        setupEnvelopes();
    }
}

function addCompliment() {
    const newComp = {
        id: "com_" + Date.now(),
        text: "✨ Type a new compliment here"
    };
    config.compliments.push(newComp);
    setupMirror();
    if (soundSynth) soundSynth.playTwinkle();
}

function deleteCompliment(idx) {
    if (confirm("Delete this compliment panel?")) {
        config.compliments.splice(idx, 1);
        setupMirror();
    }
}

function addChecklistItem() {
    const newGoal = {
        id: "c_" + Date.now(),
        text: "New Bucket Goal 🌌",
        checked: false
    };
    config.checklist.push(newGoal);
    setupChecklist();
    if (soundSynth) soundSynth.playTwinkle();
}

function deleteChecklistItem(idx) {
    if (confirm("Delete this checklist goal?")) {
        config.checklist.splice(idx, 1);
        setupChecklist();
    }
}

// -------------------------------------------------------------
// ADMIN MODALS MANAGEMENT
// -------------------------------------------------------------
function openShareLinkModal() {
    // Generate private URL based on settings path
    const path = config.settings.privatePath;
    const fullUrl = `${window.location.protocol}//${window.location.host}/${path}`;
    
    document.getElementById('share-link-input').value = fullUrl;
    document.getElementById('cfg-private-path').value = path;
    
    // Populate viewer password field
    const pwdInput = document.getElementById('cfg-viewer-password');
    if (pwdInput) pwdInput.value = config.settings.password || '';
    
    // Populate lock greeting field
    const greetingInput = document.getElementById('cfg-lock-greeting');
    if (greetingInput) {
        let currentGreeting = config.settings.lockGreeting;
        if (currentGreeting && (currentGreeting.startsWith("Happy Birthday ") || currentGreeting.endsWith("! 🎂"))) {
            currentGreeting = config.settings.recipientName;
        }
        greetingInput.value = currentGreeting || config.settings.recipientName || '';
    }
    
    // Populate countdown datetime field
    const cdtInput = document.getElementById('cfg-countdown-datetime');
    const statusLabel = document.getElementById('countdown-status-label');
    if (cdtInput) {
        if (config.settings.countdownDate) {
            // Convert stored ISO to local datetime-local format
            const d = new Date(config.settings.countdownDate);
            const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            cdtInput.value = localISO;
            const now = new Date();
            if (d > now) {
                if (statusLabel) statusLabel.innerText = `⏳ Countdown active — unlocks on ${d.toLocaleString()}`;
            } else {
                if (statusLabel) statusLabel.innerText = `✅ Countdown already passed — friend sees password screen directly.`;
            }
        } else {
            cdtInput.value = '';
            if (statusLabel) statusLabel.innerText = `⚡ No countdown set — friend sees password screen immediately.`;
        }
    }
    
    document.getElementById('admin-share-overlay').classList.remove('hidden');
}

function updateCountdownDate() {
    const cdtInput = document.getElementById('cfg-countdown-datetime');
    const statusLabel = document.getElementById('countdown-status-label');
    if (!cdtInput || !cdtInput.value) {
        showToast('Please pick a date and time first.', 'error');
        return;
    }
    const selectedDate = new Date(cdtInput.value);
    config.settings.countdownDate = selectedDate.toISOString();
    const now = new Date();
    const diff = selectedDate - now;
    if (diff > 0) {
        const d = Math.floor(diff / (1000*60*60*24));
        const h = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
        const m = Math.floor((diff % (1000*60*60)) / (1000*60));
        if (statusLabel) statusLabel.innerText = `⏳ Countdown set! Unlocks in ${d}d ${h}h ${m}m. Click 💾 Save to apply.`;
        showToast(`⏰ Countdown set to ${selectedDate.toLocaleString()} — Click Save Changes!`, 'success');
    } else {
        if (statusLabel) statusLabel.innerText = `⚠️ That date is in the past — friend will see password screen immediately.`;
        showToast('That date/time is already in the past.', 'error');
    }
}

function clearCountdownDate() {
    config.settings.countdownDate = null;
    const cdtInput = document.getElementById('cfg-countdown-datetime');
    const statusLabel = document.getElementById('countdown-status-label');
    if (cdtInput) cdtInput.value = '';
    if (statusLabel) statusLabel.innerText = '⚡ Countdown cleared — friend sees password screen immediately. Click 💾 Save.';
    showToast('Countdown cleared. Click Save Changes to apply.', 'success');
}

function clearCountdownInput() {
    const cdtInput = document.getElementById('cfg-countdown-datetime');
    const statusLabel = document.getElementById('countdown-status-label');
    if (cdtInput) cdtInput.value = '';
    if (statusLabel) statusLabel.innerText = '⚡ Countdown cleared — friend sees password screen immediately.';
    showToast('Countdown cleared locally. Remember to click Save Changes to apply.', 'info');
}

async function saveAllShareChanges() {
    const pathInput = document.getElementById('cfg-private-path').value.trim().replace(/\s+/g, '-').toLowerCase();
    if (!pathInput) {
        showToast("Please enter a custom private URL path.", "error");
        return;
    }

    const pwdInput = document.getElementById('cfg-viewer-password').value.trim();
    if (!pwdInput) {
        showToast("Please enter a viewer password.", "error");
        return;
    }

    const greetingInput = document.getElementById('cfg-lock-greeting').value.trim();
    const cdtInput = document.getElementById('cfg-countdown-datetime').value;

    config.settings.privatePath = pathInput;
    config.settings.password = pwdInput;
    config.settings.lockGreeting = greetingInput;

    if (cdtInput) {
        config.settings.countdownDate = new Date(cdtInput).toISOString();
    } else {
        config.settings.countdownDate = null;
    }

    // Update read-only field in the modal
    const fullUrl = `${window.location.protocol}//${window.location.host}/${pathInput}`;
    document.getElementById('share-link-input').value = fullUrl;

    const lockGreetingEl = document.getElementById('lock-greeting-text');
    if (lockGreetingEl && greetingInput) {
        lockGreetingEl.innerText = greetingInput;
        lockGreetingEl.style.display = 'block';
    }

    const saveBtn = document.getElementById('btn-share-save');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = "Saving...";
    }

    try {
        const { error } = await supabaseClient.rpc('save_config', {
            pass: adminToken,
            new_config: config
        });

        if (error) throw error;

        // Sync to local server if running
        await syncLocalConfig();

        if (soundSynth) soundSynth.playTwinkle();
        showToast("All settings saved and link generated successfully! ❤️", "success");

        const statusLabel = document.getElementById('countdown-status-label');
        if (statusLabel) {
            if (config.settings.countdownDate) {
                const d = new Date(config.settings.countdownDate);
                const now = new Date();
                if (d > now) {
                    statusLabel.innerText = `⏳ Countdown active — unlocks on ${d.toLocaleString()}`;
                } else {
                    statusLabel.innerText = `✅ Countdown already passed — friend sees password screen directly.`;
                }
            } else {
                statusLabel.innerText = `⚡ No countdown set — friend sees password screen immediately.`;
            }
        }
    } catch(err) {
        console.error(err);
        showToast("Failed to save changes.", "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerText = "Save Changes";
        }
    }
}

function openAdminLoginModal() {
    document.getElementById('admin-login-overlay').classList.remove('hidden');
    document.getElementById('admin-login-form').addEventListener('submit', handleAdminLogin);
}

function closeAdminLoginModal() {
    document.getElementById('admin-login-overlay').classList.add('hidden');
}

function closeAdminModal(type) {
    document.getElementById(`admin-${type}-overlay`).classList.add('hidden');
}

function copyShareLink() {
    const input = document.getElementById('share-link-input');
    input.select();
    document.execCommand('copy');
    showToast("Share link copied to clipboard!", "success");
}

async function updatePrivatePath() {
    const pathInput = document.getElementById('cfg-private-path').value.trim().replace(/\s+/g, '-').toLowerCase();
    if (!pathInput) return;
    
    config.settings.privatePath = pathInput;
    
    // Refresh share link URL input
    const fullUrl = `${window.location.protocol}//${window.location.host}/${pathInput}`;
    document.getElementById('share-link-input').value = fullUrl;
    
    showToast("URL path updated! Remember to Save Changes to make it active.", "success");
}

function updateViewerPassword() {
    const pwdInput = document.getElementById('cfg-viewer-password');
    if (!pwdInput) return;
    const newPwd = pwdInput.value.trim();
    if (!newPwd) {
        showToast("Please enter a password first.", "error");
        return;
    }
    config.settings.password = newPwd;
    showToast(`🔑 Viewer password set to: "${newPwd}" — Click Save Changes to apply!`, "success");
}

function updateLockGreeting() {
    const greetingInput = document.getElementById('cfg-lock-greeting');
    if (!greetingInput) return;
    const newGreeting = greetingInput.value.trim();
    if (!newGreeting) {
        showToast("Please enter a greeting text first.", "error");
        return;
    }
    config.settings.lockGreeting = newGreeting;
    // Live-update the lock screen greeting
    const lockGreetingEl = document.getElementById('lock-greeting-text');
    if (lockGreetingEl) {
        lockGreetingEl.innerText = newGreeting;
        lockGreetingEl.style.display = 'block';
    }
    showToast(`💌 Lock greeting updated! Click Save Changes to apply.`, "success");
}

async function openStatsSubmissionsModal() {
    try {
        // Fetch public config
        const { data: configData } = await supabaseClient
            .from('config_store')
            .select('data')
            .eq('id', 1)
            .single();

        // Fetch private admin data
        const { data: adminData, error } = await supabaseClient
            .rpc('get_admin_data', { pass: adminToken });

        if (error) {
            showToast("Failed to load submissions: Unauthorized", "error");
            return;
        }

        const dbState = {
            ...configData.data,
            feedback: adminData.feedback || [],
            analytics: adminData.analytics || { visits: [], reactions: [], actions: [] }
        };
        
        // Render stats overview
        const visits = dbState.analytics.visits || [];
        const uniqueIps = new Set(visits.map(v => v.sessionId)).size;
        
        document.getElementById('stat-total-hits').innerText = visits.length;
        document.getElementById('stat-unique-hits').innerText = uniqueIps;
        
        const firstOpenEl = document.getElementById('stat-first-open');
        if (dbState.analytics.firstOpen) {
            const fo = dbState.analytics.firstOpen;
            firstOpenEl.innerText = `${new Date(fo.timestamp).toLocaleString()}\n(${fo.device})`;
        } else {
            firstOpenEl.innerText = "Waiting...";
        }

        // CSV export logic in-browser
        const btnExport = document.getElementById('btn-export-csv');
        btnExport.removeAttribute('href');
        btnExport.onclick = (e) => {
            e.preventDefault();
            const feedback = dbState.feedback || [];
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Date,Feelings,First Memory,Message\n";
            feedback.forEach(item => {
                const dateStr = new Date(item.timestamp).toLocaleString().replace(/,/g, '');
                const feelings = (item.feelings || []).join('; ');
                const memory = (item.memoryMessage || '').replace(/"/g, '""');
                const message = (item.message || '').replace(/"/g, '""');
                csvContent += `"${dateStr}","${feelings}","${memory}","${message}"\n`;
            });
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "submissions.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        // Populate Submissions list
        const list = document.getElementById('admin-submissions-list');
        list.innerHTML = '';
        const feedback = dbState.feedback || [];

        if (feedback.length === 0) {
            list.innerHTML = '<p class="text-center no-data" style="color:var(--text-muted); margin-top:20px;">No submissions received yet.</p>';
        } else {
            feedback.forEach(item => {
                const card = document.createElement('div');
                card.className = 'feedback-card';
                card.style.cssText = "background:rgba(255,255,255,0.02); border:1px solid var(--glass-border); padding:15px; border-radius:10px; margin-bottom:12px;";
                
                const dateStr = new Date(item.timestamp).toLocaleString();
                const feelings = (item.feelings || []).join(', ') || 'None';
                
                let ratingsStr = '';
                for (const cat in item.ratings) {
                    ratingsStr += `<span class="rating-pill" style="background:rgba(255,209,220,0.08); padding:3px 8px; border-radius:10px; font-size:0.75rem; margin-right:5px; color:var(--primary-color);">${cat}: ${item.ratings[cat]}★</span>`;
                }

                card.innerHTML = `
                    <div class="flex-justify" style="border-bottom:1px dashed var(--glass-border); padding-bottom:8px; margin-bottom:10px; font-size:0.8rem; color:var(--text-muted);">
                        <span>${dateStr}</span>
                    </div>
                    <div style="margin-bottom:10px;">${ratingsStr}</div>
                    <div style="font-size:0.88rem; display:flex; flex-direction:column; gap:8px;">
                        <p><strong>Feelings:</strong> ${escapeHTML(feelings)}</p>
                        <p><strong>First Memory:</strong> ${escapeHTML(item.memoryMessage || '-')}</p>
                        <p><strong>Message:</strong> ${escapeHTML(item.message || '-')}</p>
                    </div>
                `;
                list.appendChild(card);
            });
        }

        renderAnalyticsCharts(dbState);
        document.getElementById('admin-stats-overlay').classList.remove('hidden');
    } catch(e) {
        alert("Failed to load statistics.");
    }
}

// Escape markup helper
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Minimal User-Agent Parser if missing
class UAParser {
    constructor() {
        this.ua = navigator.userAgent;
    }
    getBrowser() {
        if (this.ua.indexOf('Chrome') > -1) return 'Chrome';
        if (this.ua.indexOf('Safari') > -1) return 'Safari';
        if (this.ua.indexOf('Firefox') > -1) return 'Firefox';
        return 'Browser';
    }
}

// Beautiful Toast Notification System
function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-text">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = 0;
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function updateProgressToast(message, isComplete = false) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    let toast = container.querySelector('.toast-progress');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast info toast-progress';
        container.appendChild(toast);
    }
    
    if (isComplete) {
        toast.className = 'toast success';
        toast.innerHTML = `<span class="toast-icon">✅</span><span class="toast-text">${message}</span>`;
        setTimeout(() => {
            toast.style.opacity = 0;
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    } else {
        toast.innerHTML = `<span class="toast-icon">⏳</span><span class="toast-text">${message}</span>`;
    }
}

// Smooth Audio Volume Fader
function fadeAudioVolume(audioNode, targetVolume, durationMs = 800) {
    if (!audioNode) return;
    if (audioNode.fadeInterval) {
        clearInterval(audioNode.fadeInterval);
    }
    const startVolume = audioNode.volume;
    const diff = targetVolume - startVolume;
    const steps = 16;
    const stepTime = durationMs / steps;
    let currentStep = 0;
    
    audioNode.fadeInterval = setInterval(() => {
        currentStep++;
        audioNode.volume = startVolume + (diff * (currentStep / steps));
        if (currentStep >= steps) {
            audioNode.volume = targetVolume;
            clearInterval(audioNode.fadeInterval);
            audioNode.fadeInterval = null;
        }
    }, stepTime);
}

// Delete Voice Note
function deleteVoiceNote() {
    if (confirm("Are you sure you want to delete the uploaded voice note?")) {
        config.settings.voiceMessageUrl = "";
        document.getElementById('secret-voice-audio').removeAttribute('src');
        showToast("Voice message deleted. Remember to click Save Changes to make it permanent.", "info");
        setupVoiceSection();
    }
}

// Voice Message placeholder manager
function setupVoiceSection() {
    const secVoice = document.getElementById('sec-voice');
    if (!secVoice) return;
    
    if (!config.settings.voiceMessageUrl && !isEditMode) {
        secVoice.classList.add('hidden');
    } else {
        secVoice.classList.remove('hidden');
        const audioEl = document.getElementById('secret-voice-audio');
        if (audioEl) {
            audioEl.src = config.settings.voiceMessageUrl || '';
        }
        
        const voiceCard = document.getElementById('voice-card');
        const playBtn = document.getElementById('btn-play-voice');
        const deleteBtn = document.getElementById('btn-delete-voice');
        
        if (!config.settings.voiceMessageUrl) {
            if (voiceCard) voiceCard.style.opacity = '0.5';
            if (voiceCard) voiceCard.querySelector('.voice-instruction').innerText = "No voice message uploaded yet. Use the upload button to add one! 🎙️";
            if (playBtn) playBtn.style.pointerEvents = 'none';
            if (deleteBtn) deleteBtn.classList.add('hidden');
        } else {
            if (voiceCard) voiceCard.style.opacity = '1';
            if (voiceCard) voiceCard.querySelector('.voice-instruction').innerText = "Click to listen to a heartfelt secret message";
            if (playBtn) playBtn.style.pointerEvents = 'auto';
            if (deleteBtn) deleteBtn.classList.remove('hidden');
        }
    }
}

// Floating Heart Sparks click interaction
document.addEventListener('click', (e) => {
    // Avoid creating hearts when clicking buttons or inputs to keep it clean
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.hasAttribute('contenteditable') || e.target.closest('.stars-rating')) return;
    
    createFloatingHeartAt(e.clientX, e.clientY);
});

document.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) {
        const touch = e.touches[0];
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.hasAttribute('contenteditable') || e.target.closest('.stars-rating')) return;
        createFloatingHeartAt(touch.clientX, touch.clientY);
    }
});

function createFloatingHeartAt(x, y) {
    const heart = document.createElement('div');
    const theme = config.settings.theme || "rose";
    let icon = '❤️';
    if (theme === 'midnight') {
        icon = Math.random() > 0.5 ? '💜' : '✨';
    } else if (theme === 'neon') {
        icon = Math.random() > 0.5 ? '💖' : '⚡';
    } else if (theme === 'pastel') {
        icon = Math.random() > 0.5 ? '🌻' : '✨';
    } else {
        icon = Math.random() > 0.5 ? '❤️' : '🌸';
    }
    heart.innerText = icon;
    heart.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        font-size: ${Math.random() * 1.2 + 0.6}rem;
        pointer-events: none;
        z-index: 99999;
        transform: translate(-50%, -50%) scale(0.5);
        opacity: 0.9;
        filter: drop-shadow(0 0 5px rgba(255, 209, 220, 0.8));
    `;
    document.body.appendChild(heart);
    
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 50 + 30;
    const destX = Math.cos(angle) * speed;
    const destY = Math.sin(angle) * speed - 60; // floats upwards slightly
    
    heart.animate([
        { transform: 'translate(-50%, -50%) scale(0.5) rotate(0deg)', opacity: 0.9 },
        { transform: `translate(calc(-50% + ${destX}px), calc(-50% + ${destY}px)) scale(1.5) rotate(${Math.random() * 360 - 180}deg)`, opacity: 0 }
    ], {
        duration: 1000 + Math.random() * 500,
        easing: 'ease-out'
    }).onfinish = () => heart.remove();
}

function updateGenderPronouns(gender, updateConfigObj = false) {
    if (updateConfigObj) {
        config.settings.gender = gender;
    }
    
    const titleBase = gender === 'him' ? 'His Story' : 'Her Story';
    document.title = `${titleBase} – A Journey of Memories`;
    
    const brandTitleEl = document.getElementById('edit-brand-title');
    if (brandTitleEl) {
        const currentBrandText = brandTitleEl.innerText.trim();
        if (currentBrandText === 'Her Story' || currentBrandText === 'His Story') {
            brandTitleEl.innerText = titleBase;
            config.settings.birthdayTitle = titleBase;
        }
    }
    
    const introText3El = document.getElementById('intro-text-3');
    if (introText3El) {
        const currentIntroText = introText3El.innerText.trim();
        if (currentIntroText === 'Today is her day.' || currentIntroText === 'Today is his day.') {
            introText3El.innerText = gender === 'him' ? 'Today is his day.' : 'Today is her day.';
        }
    }
}

/* --- VISUAL THEME HANDLER --- */
function applyTheme(theme) {
    document.body.classList.remove('theme-rose', 'theme-midnight', 'theme-neon', 'theme-pastel');
    if (theme && theme !== 'rose') {
        document.body.classList.add(`theme-${theme}`);
    }
}

/* --- INTERACTIVE TRIVIA QUIZ --- */
const defaultQuiz = [
    {
        question: "Where did we first meet?",
        choices: ["College Library", "Seminar Hall / Auditorium", "Canteen Benches", "Class Row 3"],
        correctIndex: 1
    },
    {
        question: "What is my favorite snack that you always steal?",
        choices: ["Potato Chips", "Chocolate Chip Cookies", "Hot Ginger Tea", "Spicy Noodles"],
        correctIndex: 2
    },
    {
        question: "What is my level of drama?",
        choices: ["Perfectly calm", "Normal human", "Gold Medalist in Roasting", "Inactive"],
        correctIndex: 2
    }
];

let currentQuizIndex = 0;
function setupQuiz() {
    const quizData = config.quiz || defaultQuiz;
    config.quiz = quizData;

    const playView = document.getElementById('quiz-play-view');
    const completedView = document.getElementById('quiz-completed-view');
    const progressText = document.getElementById('quiz-progress-text');
    const questionDisplay = document.getElementById('quiz-question-display');
    const optionsContainer = document.getElementById('quiz-options-container');
    const feedbackDisplay = document.getElementById('quiz-feedback-display');

    if (!playView) return;
    feedbackDisplay.className = 'quiz-feedback-text';
    feedbackDisplay.innerText = '';

    const giftSec = document.getElementById('sec-gift');
    if (!isEditMode && giftSec) {
        giftSec.classList.add('hidden');
    }

    if (currentQuizIndex >= quizData.length) {
        playView.classList.add('hidden');
        completedView.classList.remove('hidden');
        if (giftSec) giftSec.classList.remove('hidden');
        return;
    }

    playView.classList.remove('hidden');
    completedView.classList.add('hidden');

    const currentQuestion = quizData[currentQuizIndex];
    progressText.innerText = `Question ${currentQuizIndex + 1} of ${quizData.length}`;
    questionDisplay.innerText = currentQuestion.question;

    optionsContainer.innerHTML = '';
    currentQuestion.choices.forEach((choice, choiceIdx) => {
        const btn = document.createElement('button');
        btn.className = 'btn-quiz-option';
        btn.innerText = choice;
        btn.addEventListener('click', () => {
            const allBtns = optionsContainer.querySelectorAll('button');
            allBtns.forEach(b => b.disabled = true);

            if (choiceIdx === currentQuestion.correctIndex) {
                btn.classList.add('correct');
                feedbackDisplay.innerText = "Correct Answer! 🎉";
                feedbackDisplay.className = "quiz-feedback-text success-text";
                if (soundSynth) soundSynth.playTwinkle();
                setTimeout(() => {
                    currentQuizIndex++;
                    setupQuiz();
                }, 1500);
            } else {
                btn.classList.add('incorrect');
                allBtns[currentQuestion.correctIndex].classList.add('correct');
                feedbackDisplay.innerText = "Incorrect. Try again!";
                feedbackDisplay.className = "quiz-feedback-text error-text";
                setTimeout(() => {
                    allBtns.forEach(b => {
                        b.disabled = false;
                        b.classList.remove('incorrect', 'correct');
                    });
                    feedbackDisplay.innerText = '';
                }, 2000);
            }
        });
        optionsContainer.appendChild(btn);
    });
}

function scrollToGift() {
    const giftSec = document.getElementById('sec-gift');
    if (giftSec) {
        giftSec.scrollIntoView({ behavior: 'smooth' });
    }
}

function setupQuizEditor() {
    const quizData = config.quiz || defaultQuiz;
    const container = document.getElementById('quiz-edit-cards-container');
    if (!container) return;
    container.innerHTML = '';

    quizData.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = 'quiz-edit-card';
        card.innerHTML = `
            <h5>Question ${idx + 1}</h5>
            <input type="text" class="quiz-edit-input quiz-question-input" data-index="${idx}" value="${q.question}" placeholder="Question text">
            <div class="quiz-edit-choices-grid">
                ${q.choices.map((choice, choiceIdx) => `
                    <div class="quiz-choice-edit-row">
                        <input type="radio" name="quiz-correct-${idx}" data-q-index="${idx}" data-choice-index="${choiceIdx}" ${choiceIdx === q.correctIndex ? 'checked' : ''}>
                        <input type="text" class="quiz-edit-input quiz-choice-input" data-q-index="${idx}" data-choice-index="${choiceIdx}" value="${choice}" placeholder="Choice ${choiceIdx + 1}">
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(card);
    });

    container.querySelectorAll('.quiz-question-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = +e.target.getAttribute('data-index');
            config.quiz[idx].question = e.target.value;
        });
    });

    container.querySelectorAll('.quiz-choice-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const qIdx = +e.target.getAttribute('data-q-index');
            const cIdx = +e.target.getAttribute('data-choice-index');
            config.quiz[qIdx].choices[cIdx] = e.target.value;
        });
    });

    container.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const qIdx = +e.target.getAttribute('data-q-index');
            const cIdx = +e.target.getAttribute('data-choice-index');
            config.quiz[qIdx].correctIndex = cIdx;
        });
    });
}

/* --- IN-BROWSER AUDIO RECORDER CONTROL --- */
let mediaRecorder = null;
let audioChunks = [];
let recordTimer = null;
let recordStart = null;
let recordedBlob = null;
let audioCtx = null;
let analyser = null;
let dataArray = null;
let recordingAnimationId = null;

function setupVoiceRecorder() {
    const btnRecordVoice = document.getElementById('btn-record-voice');
    const overlay = document.getElementById('recorder-overlay');
    const btnRecordMic = document.getElementById('btn-record-mic');
    const btnCancel = document.getElementById('btn-recorder-cancel');
    const btnSave = document.getElementById('btn-recorder-save');
    const statusText = document.getElementById('recorder-status');
    const timerText = document.getElementById('recorder-timer');
    const waveformBars = document.querySelectorAll('.recorder-bar');

    if (!btnRecordVoice) return;

    btnRecordVoice.addEventListener('click', () => {
        overlay.classList.remove('hidden');
        statusText.innerText = "Ready to record";
        timerText.innerText = "00:00";
        btnRecordMic.className = "btn-record-action";
        btnRecordMic.innerText = "⏺️";
        btnSave.disabled = true;
        btnSave.style.opacity = "0.5";
        recordedBlob = null;
    });

    btnCancel.addEventListener('click', () => {
        stopRecordingStreams();
        overlay.classList.add('hidden');
    });

    btnRecordMic.addEventListener('click', async () => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            btnRecordMic.className = "btn-record-action";
            btnRecordMic.innerText = "⏺️";
            statusText.innerText = "Processing recording...";
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioChunks = [];
                
                try {
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const source = audioCtx.createMediaStreamSource(stream);
                    analyser = audioCtx.createAnalyser();
                    analyser.fftSize = 32;
                    source.connect(analyser);
                    dataArray = new Uint8Array(analyser.frequencyBinCount);
                    
                    const animateWaveform = () => {
                        if (!analyser) return;
                        analyser.getByteFrequencyData(dataArray);
                        waveformBars.forEach((bar, idx) => {
                            const val = dataArray[idx % dataArray.length];
                            const height = Math.max(10, (val / 255) * 50);
                            bar.style.height = `${height}px`;
                            bar.classList.add('active');
                        });
                        recordingAnimationId = requestAnimationFrame(animateWaveform);
                    };
                    animateWaveform();
                } catch(e) {
                    console.error("Audio visualizer failed", e);
                }

                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    recordedBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                    statusText.innerText = "Recording captured! Click Use Recording to save.";
                    btnSave.disabled = false;
                    btnSave.style.opacity = "1";
                    stopRecordingStreams();
                };

                mediaRecorder.start();
                btnRecordMic.className = "btn-record-action recording";
                btnRecordMic.innerText = "⏹️";
                statusText.innerText = "Recording voice note...";
                
                recordStart = Date.now();
                recordTimer = setInterval(() => {
                    const elapsedSecs = Math.floor((Date.now() - recordStart) / 1000);
                    const mm = String(Math.floor(elapsedSecs / 60)).padStart(2, '0');
                    const ss = String(elapsedSecs % 60).padStart(2, '0');
                    timerText.innerText = `${mm}:${ss}`;
                }, 1000);

            } catch(err) {
                statusText.innerText = "Error: Microphone access denied.";
                console.error(err);
            }
        }
    });

    btnSave.addEventListener('click', async () => {
        if (!recordedBlob) return;
        statusText.innerText = "Uploading live recording...";
        btnSave.disabled = true;
        btnSave.style.opacity = "0.5";

        try {
            const file = new File([recordedBlob], "live-voice.mp3", { type: "audio/mp3" });
            const publicUrl = await uploadToSupabaseStorage(file);
            if (publicUrl) {
                const data = { success: true, url: publicUrl };
                config.settings.voiceMessageUrl = data.url;
                
                const audioEl = document.getElementById('secret-voice-audio');
                if (audioEl) {
                    audioEl.src = data.url;
                    audioEl.load();
                }
                
                document.getElementById('voice-card').classList.remove('hidden');
                const btnDelete = document.getElementById('btn-delete-voice');
                if (btnDelete) btnDelete.classList.remove('hidden');

                showToast("Voice message recorded and uploaded successfully! ❤️", "success");
                overlay.classList.add('hidden');
            } else {
                statusText.innerText = "Upload failed: " + (data.error || "unknown error");
                btnSave.disabled = false;
                btnSave.style.opacity = "1";
            }
        } catch(err) {
            statusText.innerText = "Network upload failed.";
            btnSave.disabled = false;
            btnSave.style.opacity = "1";
        }
    });
}

function stopRecordingStreams() {
    if (recordTimer) {
        clearInterval(recordTimer);
        recordTimer = null;
    }
    if (mediaRecorder && mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    mediaRecorder = null;
    if (recordingAnimationId) {
        cancelAnimationFrame(recordingAnimationId);
        recordingAnimationId = null;
    }
    if (audioCtx) {
        audioCtx.close();
        audioCtx = null;
    }
    analyser = null;
    const waveformBars = document.querySelectorAll('.recorder-bar');
    waveformBars.forEach(bar => {
        bar.style.height = '15px';
        bar.classList.remove('active');
    });
}

/* --- DYNAMIC SECTION SORTING --- */
const ALL_SECTIONS = [
    { id: "sec-timeline", name: "Friendship Timeline" },
    { id: "sec-polaroids", name: "Polaroid Memory Wall" },
    { id: "sec-stats", name: "Friendship Stats" },
    { id: "sec-questions", name: "Fun Questions" },
    { id: "sec-envelopes", name: "Secret Envelopes" },
    { id: "sec-map", name: "Memory Map" },
    { id: "sec-dream", name: "A Special Dream" },
    { id: "sec-capsule", name: "Time Capsule" },
    { id: "sec-appreciation", name: "Mirror of Appreciation" },
    { id: "sec-future", name: "Future Memories (Bucket List)" },
    { id: "sec-voice", name: "Voice Message" },
    { id: "sec-quiz", name: "Interactive Trivia Quiz" },
    { id: "sec-gift", name: "Surprise Gift Box" },
    { id: "sec-heart", name: "Final Heart Moment" },
    { id: "sec-final-question", name: "Final Question" },
    { id: "sec-finale", name: "Grand Finale Credits" },
    { id: "sec-reflection", name: "Final Reflection Page" },
    { id: "sec-secret-final", name: "Final Secret Message" }
];

function applySectionOrder() {
    const main = document.getElementById('main-experience');
    if (!main) return;
    
    const order = config.settings.sectionOrder || ALL_SECTIONS.map(s => s.id);
    config.settings.sectionOrder = order;

    order.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            main.appendChild(el);
        }
    });
}

window.openAdminModal = function(type) {
    if (type === 'reorder') {
        renderSectionSorter();
        document.getElementById('admin-reorder-overlay').classList.remove('hidden');
    }
};

function renderSectionSorter() {
    const list = document.getElementById('reorder-sections-list');
    if (!list) return;
    list.innerHTML = '';

    const order = config.settings.sectionOrder || ALL_SECTIONS.map(s => s.id);
    
    order.forEach((id, idx) => {
        const secObj = ALL_SECTIONS.find(s => s.id === id);
        if (!secObj) return;

        const item = document.createElement('div');
        item.className = 'glass-card';
        item.style.cssText = 'padding:10px 15px; display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); border-radius:10px; margin:0;';
        item.innerHTML = `
            <span style="font-weight:600; font-size:0.95rem;">${idx + 1}. ${secObj.name}</span>
            <div style="display:flex; gap:5px;">
                <button class="btn-admin-bar" style="padding:4px 8px; border-radius:5px;" onclick="moveSection(${idx}, -1)" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}>▲</button>
                <button class="btn-admin-bar" style="padding:4px 8px; border-radius:5px;" onclick="moveSection(${idx}, 1)" ${idx === order.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>▼</button>
            </div>
        `;
        list.appendChild(item);
    });
}

window.moveSection = function(index, direction) {
    const order = config.settings.sectionOrder;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= order.length) return;

    const temp = order[index];
    order[index] = order[targetIndex];
    order[targetIndex] = temp;

    config.settings.sectionOrder = order;
    renderSectionSorter();
    applySectionOrder();
};

/* --- NATIVE SVG ANALYTICS CHARTS --- */
function renderAnalyticsCharts(dbState) {
    const visits = dbState.analytics.visits || [];
    const feedback = dbState.feedback || [];

    const barContainer = document.getElementById('analytics-bar-chart-container');
    if (barContainer) {
        const now = Date.now();
        const hourlyHits = Array(24).fill(0);
        visits.forEach(v => {
            const diffMs = now - new Date(v.timestamp).getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            if (diffHours >= 0 && diffHours < 24) {
                hourlyHits[23 - diffHours]++;
            }
        });

        const maxHits = Math.max(...hourlyHits, 1);
        let svgContent = `<svg width="100%" height="100%" viewBox="0 0 240 100" preserveAspectRatio="none" style="overflow:visible;">
            <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--primary-color)" />
                    <stop offset="100%" stop-color="rgba(255, 94, 126, 0.2)" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>`;
        
        hourlyHits.forEach((hits, idx) => {
            const x = idx * 10 + 1;
            const barHeight = (hits / maxHits) * 80;
            const y = 90 - barHeight;
            svgContent += `<rect x="${x}" y="${y}" width="8" height="${barHeight}" fill="url(#barGrad)" rx="2" filter="url(#glow)"></rect>`;
        });
        
        svgContent += `<line x1="0" y1="90" x2="240" y2="90" stroke="rgba(255,255,255,0.1)" stroke-width="1" />`;
        svgContent += `</svg>`;
        barContainer.innerHTML = svgContent;
    }

    const doughnutContainer = document.getElementById('analytics-doughnut-chart-container');
    if (doughnutContainer) {
        const feelingsCounts = {};
        feedback.forEach(item => {
            (item.feelings || []).forEach(f => {
                feelingsCounts[f] = (feelingsCounts[f] || 0) + 1;
            });
        });

        const totalFeelings = Object.values(feelingsCounts).reduce((a, b) => a + b, 0);
        if (totalFeelings === 0) {
            doughnutContainer.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem;">No feelings responses yet.</p>`;
            return;
        }

        let currentAngle = 0;
        const colors = ['#ff5e7e', '#00f2fe', '#ffd1dc', '#a0a0b0', '#ec38bc', '#b76e79'];
        let idx = 0;
        
        let svgContent = `<svg width="100" height="100" viewBox="0 0 42 42" class="donut" style="transform: rotate(-90deg); overflow:visible; min-width:100px;">
            <circle class="donut-hole" cx="21" cy="21" r="15.91549430918954" fill="transparent"></circle>
            <circle class="donut-ring" cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="rgba(255,255,255,0.03)" stroke-width="4"></circle>`;
        
        let legendHtml = `<div style="display:flex; flex-direction:column; gap:6px; text-align:left; font-size:0.78rem; margin-left:15px; max-width:180px;">`;

        for (const feeling in feelingsCounts) {
            const count = feelingsCounts[feeling];
            const pct = (count / totalFeelings) * 100;
            const offset = 100 - currentAngle;
            const color = colors[idx % colors.length];
            
            svgContent += `<circle class="donut-segment" cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="${color}" stroke-width="4" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${offset}"></circle>`;
            
            legendHtml += `<div style="display:flex; align-items:center; gap:6px;">
                <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${color}; flex-shrink:0;"></span>
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${feeling}: ${count} (${Math.round(pct)}%)</span>
            </div>`;

            currentAngle += pct;
            idx++;
        }

        svgContent += `</svg>`;
        legendHtml += `</div>`;

        doughnutContainer.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; width:100%;">${svgContent}${legendHtml}</div>`;
    }
}

/* --- CANVAS MEMORY EXPORTER --- */
function exportMemoryCard() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 1000);
    const theme = config.settings.theme || "rose";
    let bgStart = "#09090e", bgEnd = "#1f1225";
    let accentColor = "#ff5e7e";
    if (theme === 'midnight') {
        bgStart = "#03001e"; bgEnd = "#7303c0"; accentColor = "#ec38bc";
    } else if (theme === 'neon') {
        bgStart = "#000000"; bgEnd = "#111111"; accentColor = "#00f2fe";
    } else if (theme === 'pastel') {
        bgStart = "#faf6f0"; bgEnd = "#eae1d8"; accentColor = "#d4a373";
    }
    grad.addColorStop(0, bgStart);
    grad.addColorStop(1, bgEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 1000);

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 760, 960);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 28, 744, 944);

    const textColor = theme === 'pastel' ? '#3d352e' : '#ffffff';
    const textMuted = theme === 'pastel' ? '#7f7467' : '#a0a0b0';

    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = theme === 'pastel' ? 0 : 15;

    ctx.font = "italic 40px 'Playfair Display', Georgia, serif";
    ctx.fillText("Her Story", 400, 120);

    ctx.shadowBlur = 0;
    ctx.fillStyle = textMuted;
    ctx.font = "300 20px 'Inter', sans-serif";
    ctx.fillText("A Journey of Memories", 400, 160);

    ctx.fillStyle = accentColor;
    ctx.font = "30px Arial";
    ctx.fillText("❤️", 400, 210);

    ctx.fillStyle = textColor;
    ctx.font = "italic 60px 'Great Vibes', cursive";
    const nameText = `${config.settings.directorName || 'Kaja'} & ${config.settings.recipientName || 'Aditi'}`;
    ctx.fillText(nameText, 400, 290);

    const drawStatsBlock = (y, value, label) => {
        ctx.fillStyle = theme === 'pastel' ? 'rgba(0,0,0,0.03)' : 'rgba(255, 255, 255, 0.03)';
        ctx.strokeStyle = theme === 'pastel' ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        
        const x = 150, w = 500, h = 120, r = 15;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = accentColor;
        ctx.font = "bold 32px 'Inter', sans-serif";
        ctx.fillText(value, 400, y + 55);

        ctx.fillStyle = textColor;
        ctx.font = "600 16px 'Inter', sans-serif";
        ctx.fillText(label.toUpperCase(), 400, y + 90);
    };

    let daysText = document.getElementById('cap-years').innerText + " Years, " +
                   document.getElementById('cap-months').innerText + " Months, " +
                   document.getElementById('cap-days').innerText + " Days";

    drawStatsBlock(360, daysText, "Time Capsule Anniversary");
    drawStatsBlock(510, "∞", "Photos & Memories Shared");
    drawStatsBlock(660, "Legendary Level ❤️", "Friendship Bond Level");

    ctx.fillStyle = textMuted;
    ctx.font = "italic 20px 'Playfair Display', serif";
    ctx.fillText('"True friendship is a journey without an end."', 400, 860);

    ctx.fillStyle = accentColor;
    ctx.font = "bold 16px 'Inter', sans-serif";
    ctx.fillText("website.com/" + (config.settings.privatePath || ""), 400, 920);

    const link = document.createElement('a');
    link.download = `friendship-milestone.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}
