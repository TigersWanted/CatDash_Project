const canvas = document.getElementById("gameCanvas");

if (canvas) {
    const ctx = canvas.getContext("2d");
    const gameStage = document.querySelector(".game-stage");

    const overlay = document.getElementById("gameOverlay");
    const startCard = document.getElementById("gameStartCard");
    const overlayLabel = document.getElementById("overlayLabel");
    const overlayTitle = document.getElementById("overlayTitle");
    const overlayMessage = document.getElementById("overlayMessage");
    const playButton = document.getElementById("playButton");
    const countdownDisplay = document.getElementById("countdownDisplay");

    const distanceValue = document.getElementById("distanceValue");
    const coinValue = document.getElementById("coinValue");
    const bestValue = document.getElementById("bestValue");

    const abilityElements = {
        dash: {
            card: document.querySelector('[data-ability-id="dash"]'),
            status: document.querySelector('[data-ability-status="dash"]')
        },
        pounce: {
            card: document.querySelector('[data-ability-id="pounce"]'),
            status: document.querySelector('[data-ability-status="pounce"]')
        },
        glide: {
            card: document.querySelector('[data-ability-id="glide"]'),
            status: document.querySelector('[data-ability-status="glide"]')
        },
        time_slow: {
            card: document.querySelector('[data-ability-id="time_slow"]'),
            status: document.querySelector('[data-ability-status="time_slow"]')
        },
        magnet: {
            card: document.querySelector('[data-ability-id="magnet"]'),
            status: document.querySelector('[data-ability-status="magnet"]')
        },
        fish_frenzy: {
            card: document.querySelector('[data-ability-id="fish_frenzy"]'),
            status: document.querySelector('[data-ability-status="fish_frenzy"]')
        }
    };

    const timeSlowTimerFill = document.querySelector("[data-time-slow-timer-fill]");
    const timeSlowTimerBar = document.querySelector("[data-time-slow-timer-bar]");
    const magnetTimerFill = document.querySelector("[data-magnet-timer-fill]");
    const magnetTimerBar = document.querySelector("[data-magnet-timer-bar]");
    const fishFrenzyTimerFill = document.querySelector("[data-fish-frenzy-timer-fill]");
    const fishFrenzyTimerBar = document.querySelector("[data-fish-frenzy-timer-bar]");

    const GRAVITY = 2400;
    const JUMP_FORCE = -760;
    const JUMP_HOLD_FORCE = -2200;
    const JUMP_HOLD_TIME = 0.18;
    const JUMP_RELEASE_DAMPING = 0.72;
    const RISE_GRAVITY_HELD = 0.82;
    const RISE_GRAVITY_RELEASED = 1.35;
    const MAX_UPWARD_SPEED = -980;

    const baseBackgroundSpeed = 0.9;
    const basePlatformSpeed = 8;
    const speedStepDistance = 1000;
    const speedStepAmount = 0.15;
    const maxSpeedMultiplier = 1.7;

    const DASH_DURATION = 0.24;
    const DASH_COOLDOWN = 3.5;
    const DASH_BONUS_SPEED = 16;
    const DASH_PLAYER_PUSH = 72;

    const POUNCE_COOLDOWN = 5.5;
    const POUNCE_JUMP_FORCE = -1500;

    const GLIDE_GRAVITY_MULTIPLIER = 0.34;

    const TIME_SLOW_DURATION = 2.2;
    const TIME_SLOW_COOLDOWN = 8.5;
    const TIME_SLOW_WORLD_MULTIPLIER = 0.55;
    const TIME_SLOW_PLAYER_TIME_SCALE = 0.7;
    const TIME_SLOW_JUMP_BOOST = 1.2;
    const TIME_SLOW_POUNCE_BOOST = 1.12;


    const MAGNET_DURATION = 2.5;
    const MAGNET_COOLDOWN = 9;
    const MAGNET_RADIUS = 220;
    const MAGNET_PULL = 520;

    const FISH_FRENZY_DURATION = 3.4;
    const FISH_FRENZY_COOLDOWN = 10;


    function isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function getTargetSpeedMultiplier() {
        const steps = Math.floor(state.distance / speedStepDistance);
        return Math.min(1 + (steps * speedStepAmount), maxSpeedMultiplier);
    }

    function updateSpeedMultiplier(deltaSeconds) {
        const targetMultiplier = getTargetSpeedMultiplier();
        const smoothing = 3.5;
        state.speedMultiplier += (targetMultiplier - state.speedMultiplier) * Math.min(1, deltaSeconds * smoothing);
    }

    let groundY = 0;

    function resizeCanvas() {
        canvas.width = canvas.clientWidth || window.innerWidth;
        canvas.height = canvas.clientHeight || window.innerHeight;
        groundY = canvas.height - 140;
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const player = {
        x: 140,
        y: 250,
        width: 180,
        height: 200,
        hitboxHeight: 156,
        drawOffsetY: 10,
        velocityY: 0,
        grounded: false,

        collectWidth: 110,
        collectHeight: 110,
        collectOffsetX: 38,
        collectOffsetY: 28,
    };

    const input = {
        jumpQueued: false,
        jumpHeld: false,
        glideHeld: false
    };

    const state = {
        mode: "ready",
        countdownRunning: false,
        distance: 0,
        coins: 0,
        bestDistance: Number(gameStage?.dataset.bestDistance || 0),
        runSaved: false,
        speedMultiplier: 1,
        dashCooldownRemaining: 0,
        pounceCooldownRemaining: 0,
        timeSlowCooldownRemaining: 0,
        magnetCooldownRemaining: 0,
        fishFrenzyCooldownRemaining: 0,
        dashTimer: 0,
        dashProgress: 0,
        timeSlowTimer: 0,
        magnetTimer: 0,
        fishFrenzyTimer: 0,
        equippedAbilityOne: gameStage?.dataset.equippedAbilityOne || "",
        equippedAbilityTwo: gameStage?.dataset.equippedAbilityTwo || "",
        equippedAbilities: [
            gameStage?.dataset.equippedAbilityOne || "",
            gameStage?.dataset.equippedAbilityTwo || ""
        ].filter(Boolean),
        effects: [],
    };

    let jumpHoldTimer = 0;
    let lastTimestamp = 0;
    let countdownIntervalId = null;

    const cat1 = new Image();
    cat1.src = "/static/images/cat1.png";

    const cat2 = new Image();
    cat2.src = "/static/images/cat2.png";

    const background = new Image();
    background.src = "/static/images/background.png";

    const fishImage = new Image();
    fishImage.src = "/static/images/Fish.png";

    const jumpSound = new Audio("/static/sounds/jump.mp3");
    const fishSound = new Audio("/static/sounds/fish.m4a");
    const dashSound = new Audio("/static/sounds/SwooshSFX.m4a");

    jumpSound.volume = 0.25;
    fishSound.volume = 0.35;
    dashSound.volume = 0.50;

    function playSound(sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {});
    }

    let assetsLoaded = 0;
    const totalAssets = 4;
    let started = false;

    class Platform {
        constructor(x, width, y) {
            this.x = x;
            this.width = width;
            this.y = y;
            this.height = 10;
        }

        update(worldSpeed, deltaSeconds) {
            this.x -= worldSpeed * deltaSeconds * 60;
        }

        draw() {
            ctx.fillStyle = "#000000";
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    let backgroundX = 0;
    const runFrames = [cat1, cat2];
    let currentFrame = 0;
    let lastFrameTime = 0;

    const animationFPS = 6;
    const frameInterval = 1000 / animationFPS;

    const platforms = [];
    const fishOnMap = [];

    const minWidth = 100;
    const maxWidth = 300;
    const minGap = 80;
    const maxGap = 220;

    function getPlatformBand() {
        return {
            minY: groundY - 260,
            maxY: groundY - 110
        };
    }

    function queueJump() {
        input.jumpQueued = true;
    }

    function consumeJump() {
        const queued = input.jumpQueued;
        input.jumpQueued = false;
        return queued;
    }

    function setJumpHeld(isHeld) {
        if (!isHeld && input.jumpHeld) {
            if (player.velocityY < 0) {
                player.velocityY *= JUMP_RELEASE_DAMPING;
            }
            jumpHoldTimer = 0;
        }

        input.jumpHeld = isHeld;
    }

    function isAbilityEquipped(abilityId) {
        return state.equippedAbilities.includes(abilityId);
    }

    function getAbilityForSlot(slotNumber) {
        return slotNumber === 1 ? state.equippedAbilityOne : state.equippedAbilityTwo;
    }

    function setAbilityCardState(card, label, unlocked, cooldownRemaining, isActive = false, isHeld = false) {
        if (!card || !label) {
            return;
        }

        card.classList.remove("locked", "ready", "cooldown", "active", "armed");

        if (!unlocked) {
            card.classList.add("locked");
            label.textContent = "Locked";
            return;
        }

        if (isActive) {
            card.classList.add("active");
            label.textContent = "Active";
            return;
        }

        if (cooldownRemaining > 0) {
            card.classList.add("cooldown");
            label.textContent = `${cooldownRemaining.toFixed(1)}s`;
            return;
        }

        if (isHeld) {
            card.classList.add("armed");
            label.textContent = "Held";
            return;
        }

        card.classList.add("ready");
        label.textContent = "Ready";
    }

    function updateTimeSlowTimerBar() {
        if (!timeSlowTimerFill || !timeSlowTimerBar) {
            return;
        }
    
        const statusLabel = abilityElements.time_slow.status;
    
        if (!isAbilityEquipped("time_slow")) {
            timeSlowTimerBar.classList.add("hidden");
            statusLabel?.classList.remove("hidden-status");
            return;
        }
    
        if (state.timeSlowTimer > 0) {
            const progress = clamp((state.timeSlowTimer / TIME_SLOW_DURATION) * 100, 0, 100);
            timeSlowTimerBar.classList.remove("hidden");
            timeSlowTimerFill.style.width = `${progress}%`;
            statusLabel?.classList.add("hidden-status");
        } else {
            timeSlowTimerBar.classList.add("hidden");
            statusLabel?.classList.remove("hidden-status");
        }
    }    

    function updateMagnetTimerBar() {
        if (!magnetTimerFill || !magnetTimerBar) {
            return;
        }
    
        const statusLabel = abilityElements.magnet.status;
    
        if (!isAbilityEquipped("magnet")) {
            magnetTimerBar.classList.add("hidden");
            statusLabel?.classList.remove("hidden-status");
            return;
        }
    
        if (state.magnetTimer > 0) {
            const progress = clamp((state.magnetTimer / MAGNET_DURATION) * 100, 0, 100);
            magnetTimerBar.classList.remove("hidden");
            magnetTimerFill.style.width = `${progress}%`;
            statusLabel?.classList.add("hidden-status");
        } else {
            magnetTimerBar.classList.add("hidden");
            statusLabel?.classList.remove("hidden-status");
        }
    }    

    function updateFishFrenzyTimerBar() {
        if (!fishFrenzyTimerFill || !fishFrenzyTimerBar) {
            return;
        }
    
        const statusLabel = abilityElements.fish_frenzy.status;
    
        if (!isAbilityEquipped("fish_frenzy")) {
            fishFrenzyTimerBar.classList.add("hidden");
            statusLabel?.classList.remove("hidden-status");
            return;
        }
    
        if (state.fishFrenzyTimer > 0) {
            const progress = clamp((state.fishFrenzyTimer / FISH_FRENZY_DURATION) * 100, 0, 100);
            fishFrenzyTimerBar.classList.remove("hidden");
            fishFrenzyTimerFill.style.width = `${progress}%`;
            statusLabel?.classList.add("hidden-status");
        } else {
            fishFrenzyTimerBar.classList.add("hidden");
            statusLabel?.classList.remove("hidden-status");
        }
    }    

    function updateAbilityHud() {
        setAbilityCardState(
            abilityElements.dash.card,
            abilityElements.dash.status,
            isAbilityEquipped("dash"),
            state.dashCooldownRemaining,
            state.dashTimer > 0
        );

        setAbilityCardState(
            abilityElements.pounce.card,
            abilityElements.pounce.status,
            isAbilityEquipped("pounce"),
            state.pounceCooldownRemaining
        );

        setAbilityCardState(
            abilityElements.glide.card,
            abilityElements.glide.status,
            isAbilityEquipped("glide"),
            0,
            false,
            isAbilityEquipped("glide") && input.glideHeld && !player.grounded && player.velocityY > 0
        );

        setAbilityCardState(
            abilityElements.time_slow.card,
            abilityElements.time_slow.status,
            isAbilityEquipped("time_slow"),
            state.timeSlowCooldownRemaining,
            state.timeSlowTimer > 0
        );

        setAbilityCardState(
            abilityElements.magnet.card,
            abilityElements.magnet.status,
            isAbilityEquipped("magnet"),
            state.magnetCooldownRemaining,
            state.magnetTimer > 0
        );

        setAbilityCardState(
            abilityElements.fish_frenzy.card,
            abilityElements.fish_frenzy.status,
            isAbilityEquipped("fish_frenzy"),
            state.fishFrenzyCooldownRemaining,
            state.fishFrenzyTimer > 0
        );

        updateTimeSlowTimerBar();
        updateMagnetTimerBar();
        updateFishFrenzyTimerBar();
    }

    function updateHud() {
        if (distanceValue) {
            distanceValue.textContent = String(Math.floor(state.distance));
        }
        if (coinValue) {
            coinValue.textContent = String(state.coins);
        }
        if (bestValue) {
            bestValue.textContent = String(Math.floor(state.bestDistance));
        }
        updateAbilityHud();
    }

    function maybeSpawnFish(platform) {
        if (Math.random() < 0.6) {
            return;
        }

        const fishCount = Math.random() < 0.2 ? 2 : 1;
        const spacing = platform.width / (fishCount + 1);

        for (let i = 0; i < fishCount; i++) {
            fishOnMap.push({
                x: platform.x + spacing * (i + 1),
                y: platform.y - randomBetween(60, 370),
                radius: 14,
                collected: false,
                spinPhase: Math.random() * Math.PI * 2,
                spinSpeed: 2
            });
        }
    }

    function buildStartingLayout() {
        platforms.length = 0;
        fishOnMap.length = 0;

        const band = getPlatformBand();
        const minY = band.minY;
        const maxY = band.maxY;

        platforms.push(new Platform(0, 650, groundY - 110));

        let lastX = 0 + 650;


        for (let i = 0; i < 10; i++) {
            const width = Math.floor(Math.random() * (maxWidth - minWidth + 1)) + minWidth;
            const gap = Math.floor(Math.random() * (maxGap - minGap + 1)) + minGap;
            const y = Math.floor(Math.random() * (maxY - minY + 1)) + minY;

            platforms.push(new Platform(lastX + gap, width, y));
            maybeSpawnFish(platforms[platforms.length - 1]);
            lastX += gap + width;
        }

        const startPlatform = platforms[0];
        player.y = startPlatform.y - player.hitboxHeight;
        player.velocityY = 0;
        player.grounded = true;
    }

    function showReadyOverlay() {
        overlay.classList.remove("hidden");
        countdownDisplay.classList.add("hidden");
        startCard.classList.remove("hidden");
        overlayLabel.textContent = "Cat Dash";
        overlayTitle.textContent = "Ready to run?";
        overlayMessage.textContent = "Press Ready, then jump across platforms and collect fish.";
        playButton.textContent = "Ready";
    }

    function showGameOverOverlay() {
        overlay.classList.remove("hidden");
        countdownDisplay.classList.add("hidden");
        startCard.classList.remove("hidden");
        overlayLabel.textContent = "Game Over";
        overlayTitle.textContent = `You reached ${Math.floor(state.distance)}m`;
        overlayMessage.textContent = `You collected ${state.coins} fish. Press Play Again to try again.`;
        playButton.textContent = "Play Again";
    }

    function hideOverlay() {
        overlay.classList.add("hidden");
        countdownDisplay.classList.add("hidden");
        startCard.classList.add("hidden");
    }

    function resetRun() {
        state.distance = 0;
        state.coins = 0;
        state.runSaved = false;
        state.speedMultiplier = 1;

        state.dashCooldownRemaining = 0;
        state.pounceCooldownRemaining = 0;
        state.timeSlowCooldownRemaining = 0;
        state.magnetCooldownRemaining = 0;
        state.fishFrenzyCooldownRemaining = 0;

        state.dashTimer = 0;
        state.dashProgress = 0;
        state.timeSlowTimer = 0;
        state.magnetTimer = 0;
        state.fishFrenzyTimer = 0;

        jumpHoldTimer = 0;
        player.x = 140;
        input.jumpQueued = false;
        input.jumpHeld = false;
        input.glideHeld = false;

        backgroundX = 0;
        currentFrame = 0;

        state.effects = [];

        buildStartingLayout();
        updateHud();
    }

    function startReadyState() {
        resetRun();
        state.mode = "ready";
        state.countdownRunning = false;
        showReadyOverlay();
    }

    function startCountdown() {
        if (state.countdownRunning) {
            return;
        }

        state.countdownRunning = true;
        startCard.classList.add("hidden");
        countdownDisplay.classList.remove("hidden");

        let count = 3;
        countdownDisplay.textContent = String(count);

        if (countdownIntervalId) {
            window.clearInterval(countdownIntervalId);
        }

        countdownIntervalId = window.setInterval(() => {
            count -= 1;

            if (count > 0) {
                countdownDisplay.textContent = String(count);
                return;
            }

            if (count === 0) {
                countdownDisplay.textContent = "GO!";
                return;
            }

            window.clearInterval(countdownIntervalId);
            countdownIntervalId = null;
            state.countdownRunning = false;
            state.mode = "playing";
            hideOverlay();
        }, 700);
    }

    async function saveRunResults() {
        if (state.runSaved) {
            return;
        }

        state.runSaved = true;

        try {
            const response = await fetch("/api/runs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    distance: Math.floor(state.distance),
                    coins_collected: state.coins
                })
            });

            if (!response.ok) {
                throw new Error("Run save failed");
            }

            const result = await response.json();
            state.bestDistance = Math.max(state.bestDistance, Number(result.best_distance || 0));
            updateHud();
        } catch (error) {
            state.runSaved = false;
            console.error(error);
        }
    }

    function endRun() {
        if (state.mode !== "playing") {
            return;
        }

        state.mode = "gameOver";
        updateHud();
        showGameOverOverlay();
        saveRunResults();
    }

    function updateCooldowns(deltaSeconds) {
        state.dashCooldownRemaining = Math.max(0, state.dashCooldownRemaining - deltaSeconds);
        state.pounceCooldownRemaining = Math.max(0, state.pounceCooldownRemaining - deltaSeconds);
        state.timeSlowCooldownRemaining = Math.max(0, state.timeSlowCooldownRemaining - deltaSeconds);
        state.magnetCooldownRemaining = Math.max(0, state.magnetCooldownRemaining - deltaSeconds);
        state.fishFrenzyCooldownRemaining = Math.max(0, state.fishFrenzyCooldownRemaining - deltaSeconds);

        state.dashTimer = Math.max(0, state.dashTimer - deltaSeconds);
        state.dashProgress = state.dashTimer > 0 ? 1 - state.dashTimer / DASH_DURATION : 0;
        state.timeSlowTimer = Math.max(0, state.timeSlowTimer - deltaSeconds);
        state.magnetTimer = Math.max(0, state.magnetTimer - deltaSeconds);
        state.fishFrenzyTimer = Math.max(0, state.fishFrenzyTimer - deltaSeconds);
    }

    function dashEasing(progress) {
        const rise = Math.sin(Math.PI * clamp(progress, 0, 1));
        return 0.2 + rise * 0.8;
    }

    function spawnDashEffect() {
        const spriteBottom = player.y + player.drawOffsetY + player.height;
        const rearFootX = player.x + 34;
        const rearFootY = spriteBottom - 24;
    
        for (let index = 0; index < 7; index += 1) {
            state.effects.push({
                kind: "dash",
                x: rearFootX + randomBetween(-8, 8),
                y: rearFootY + randomBetween(-6, 6),
                vx: -180 - (Math.random() * 120),
                vy: -18 + (Math.random() * 36),
                life: 0.22 + Math.random() * 0.08,
                maxLife: 0.22 + Math.random() * 0.08,
                radius: 12 + Math.random() * 8
            });
        }
    }    
    
    function spawnPounceEffect() {
        const spriteBottom = player.y + player.drawOffsetY + player.height;
        const centerX = player.x + player.width / 2;
        const footY = spriteBottom - 16;
    
        for (let index = 0; index < 10; index += 1) {
            const angle = (-Math.PI / 2) + ((Math.random() * 1.9) - 0.95);
            const speed = 120 + Math.random() * 140;
    
            state.effects.push({
                kind: "pounce",
                x: centerX + randomBetween(-10, 10),
                y: footY + randomBetween(-6, 6),
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.28 + Math.random() * 0.2,
                maxLife: 0.28 + Math.random() * 0.2,
                radius: 14 + Math.random() * 12
            });
        }
    }         

    function updateEffects(deltaSeconds) {
        state.effects = state.effects.filter((effect) => {
            effect.life -= deltaSeconds;
            effect.x += effect.vx * deltaSeconds;
            effect.y += effect.vy * deltaSeconds;
    
            if (effect.kind === "dash") {
                effect.radius *= 0.97;
            } else if (effect.kind === "pounce") {
                effect.vy += 320 * deltaSeconds;
                effect.radius *= 0.985;
            }
    
            return effect.life > 0;
        });
    }
    
    function drawEffects() {
        for (const effect of state.effects) {
            const alpha = clamp(effect.life / effect.maxLife, 0, 1);
    
            if (effect.kind === "dash") {
                ctx.fillStyle = `rgba(185, 176, 168, ${alpha * 0.32})`;
                ctx.beginPath();
                ctx.ellipse(effect.x, effect.y, effect.radius * 1.9, effect.radius * 0.9, 0, 0, Math.PI * 2);
                ctx.fill();
                continue;
            }
    
            if (effect.kind === "pounce") {
                ctx.fillStyle = `rgba(160, 150, 142, ${alpha * 0.26})`;
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
                ctx.fill();
    
                ctx.strokeStyle = `rgba(210, 202, 194, ${alpha * 0.32})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, effect.radius * 1.15, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }     

    function getWorldMultiplier() {
        return state.timeSlowTimer > 0 ? TIME_SLOW_WORLD_MULTIPLIER : 1;
    }

    function getPlayerTimeScale() {
        return state.timeSlowTimer > 0 ? TIME_SLOW_PLAYER_TIME_SCALE : 1;
    }
    
    function getJumpForceMultiplier() {
        return state.timeSlowTimer > 0 ? TIME_SLOW_JUMP_BOOST : 1;
    }
    
    function getPounceForceMultiplier() {
        return state.timeSlowTimer > 0 ? TIME_SLOW_POUNCE_BOOST : 1;
    }    

    function updatePlayer(deltaSeconds) {
        const playerTimeScale = getPlayerTimeScale();
        const physicsDelta = deltaSeconds * playerTimeScale;
        const jumpForceMultiplier = getJumpForceMultiplier();
    
        if (consumeJump() && player.grounded) {
            player.velocityY = JUMP_FORCE * jumpForceMultiplier;
            player.grounded = false;
            jumpHoldTimer = JUMP_HOLD_TIME;
            playSound(jumpSound);
        }
    
        let appliedGravity = GRAVITY;    

        if (input.jumpHeld && jumpHoldTimer > 0 && player.velocityY < 0) {
            player.velocityY += JUMP_HOLD_FORCE * jumpForceMultiplier * physicsDelta;
            player.velocityY = Math.max(player.velocityY, MAX_UPWARD_SPEED);
            jumpHoldTimer = Math.max(0, jumpHoldTimer - physicsDelta);
            appliedGravity *= RISE_GRAVITY_HELD;
        } else if (player.velocityY < 0) {
            appliedGravity *= RISE_GRAVITY_RELEASED;
        } else {
            jumpHoldTimer = 0;
        }

        if (isAbilityEquipped("glide") && input.glideHeld && !player.grounded && player.velocityY > 0) {
            appliedGravity *= GLIDE_GRAVITY_MULTIPLIER;
        }

        player.velocityY += appliedGravity * physicsDelta;

        const previousBottom = player.y + player.hitboxHeight;
        player.y += player.velocityY * physicsDelta;
        player.grounded = false;

        if (state.dashTimer > 0) {
            player.x = clamp(
                player.x + DASH_PLAYER_PUSH * dashEasing(state.dashProgress) * physicsDelta * 5.5,
                140,
                258
            );            
        } else {
            player.x += (140 - player.x) * Math.min(1, physicsDelta * 7.5);
        }

        for (const p of platforms) {
            if (player.velocityY < 0) {
                continue;
            }

            const playerRect = {
                x: player.x,
                y: player.y,
                width: player.width,
                height: player.hitboxHeight
            };

            const platformRect = {
                x: p.x,
                y: p.y,
                width: p.width,
                height: p.height
            };

            const withinPlatformX =
                player.x + player.width > p.x &&
                player.x < p.x + p.width;

            const crossedPlatformTop =
                previousBottom <= p.y &&
                player.y + player.hitboxHeight >= p.y;

            if (withinPlatformX && crossedPlatformTop && isColliding(playerRect, platformRect)) {
                player.y = p.y - player.hitboxHeight;
                player.velocityY = 0;
                player.grounded = true;
                break;
            }
        }

        if (player.y > canvas.height + player.height + 40) {
            endRun();
        }
    }

    function updatePlatforms(worldSpeed, deltaSeconds) {
        for (let i = 0; i < platforms.length; i++) {
            platforms[i].update(worldSpeed, deltaSeconds);
        }

        const band = getPlatformBand();
        const minY = band.minY;
        const maxY = band.maxY;

        if (platforms.length && platforms[0].x + platforms[0].width < 0) {
            platforms.shift();
            const lastPlatform = platforms[platforms.length - 1];
            const width = Math.floor(Math.random() * (maxWidth - minWidth + 1)) + minWidth;
            const gap = Math.floor(Math.random() * (maxGap - minGap + 1)) + minGap;
            const y = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
            const nextPlatform = new Platform(lastPlatform.x + lastPlatform.width + gap, width, y);
            platforms.push(nextPlatform);
            maybeSpawnFish(nextPlatform);
        }
    }

    function updateFish(deltaSeconds, worldSpeed) {
        for (const fish of fishOnMap) {
            if (fish.collected) {
                continue;
            }

            fish.spinPhase += fish.spinSpeed * deltaSeconds;
            fish.x -= worldSpeed * deltaSeconds * 60;

            if (state.magnetTimer > 0) {
                const playerCenterX = player.x + (player.width / 2);
                const playerCenterY = player.y + (player.hitboxHeight / 2);
                const dx = playerCenterX - fish.x;
                const dy = playerCenterY - fish.y;
                const distance = Math.hypot(dx, dy);

                if (distance < MAGNET_RADIUS && distance > 0.001) {
                    fish.x += (dx / distance) * MAGNET_PULL * deltaSeconds;
                    fish.y += (dy / distance) * MAGNET_PULL * deltaSeconds;
                }
            }

            const collectLeft = player.x + player.collectOffsetX;
            const collectTop = player.y + player.collectOffsetY;
            const collectRight = collectLeft + player.collectWidth;
            const collectBottom = collectTop + player.collectHeight;
                    
            const closestX = clamp(fish.x, collectLeft, collectRight);
            const closestY = clamp(fish.y, collectTop, collectBottom);

            const distanceX = fish.x - closestX;
            const distanceY = fish.y - closestY;
            const touching = distanceX * distanceX + distanceY * distanceY <= fish.radius * fish.radius;

            if (touching) {
                fish.collected = true;
                state.coins += state.fishFrenzyTimer > 0 ? 2 : 1;
                playSound(fishSound);
            }
        }

        for (let i = fishOnMap.length - 1; i >= 0; i--) {
            if (fishOnMap[i].collected || fishOnMap[i].x < -80) {
                fishOnMap.splice(i, 1);
            }
        }
    }

    function triggerSlotAbility(slotNumber) {
        const abilityId = getAbilityForSlot(slotNumber);
    
        if (!abilityId || state.mode !== "playing") {
            return;
        }
    
        if (abilityId === "dash" && state.dashCooldownRemaining <= 0) {
            state.dashTimer = DASH_DURATION;
            state.dashCooldownRemaining = DASH_COOLDOWN;
            state.dashProgress = 0;
            playSound(dashSound);
            spawnDashEffect();
            return;
        }
    
        if (abilityId === "pounce" && state.pounceCooldownRemaining <= 0) {
            state.pounceCooldownRemaining = POUNCE_COOLDOWN;
            player.velocityY = POUNCE_JUMP_FORCE * getPounceForceMultiplier();
            player.grounded = false;
            jumpHoldTimer = JUMP_HOLD_TIME;
            playSound(dashSound);
            spawnPounceEffect();
            return;
        }
    
        if (abilityId === "time_slow" && state.timeSlowCooldownRemaining <= 0) {
            state.timeSlowTimer = TIME_SLOW_DURATION;
            state.timeSlowCooldownRemaining = TIME_SLOW_COOLDOWN;
            return;
        }
    
        if (abilityId === "magnet" && state.magnetCooldownRemaining <= 0) {
            state.magnetTimer = MAGNET_DURATION;
            state.magnetCooldownRemaining = MAGNET_COOLDOWN;
            return;
        }
    
        if (abilityId === "fish_frenzy" && state.fishFrenzyCooldownRemaining <= 0) {
            state.fishFrenzyTimer = FISH_FRENZY_DURATION;
            state.fishFrenzyCooldownRemaining = FISH_FRENZY_COOLDOWN;
            return;
        }
    }    

    function drawBackground(isPaused = false) {
        const speedMultiplier = state.speedMultiplier;
        const currentBackgroundSpeed = baseBackgroundSpeed * speedMultiplier;

        if (!isPaused) {
            backgroundX -= currentBackgroundSpeed;
        }

        if (backgroundX <= -canvas.width) {
            backgroundX = 0;
        }

        ctx.drawImage(background, backgroundX, 0, canvas.width, canvas.height);
        ctx.drawImage(background, backgroundX + canvas.width, 0, canvas.width, canvas.height);
    }

    function drawPlayer() {
        const currentSprite = player.grounded ? runFrames[currentFrame] : cat2;

        ctx.drawImage(
            currentSprite,
            player.x,
            player.y + player.drawOffsetY,
            player.width,
            player.height
        );
    }

    function drawPlatforms() {
        platforms.forEach((p) => p.draw());
    }

    function drawFish() {
        for (const fish of fishOnMap) {
            const size = fish.radius * 4.4;
            const scaleX = Math.cos(fish.spinPhase);

            if (fishImage.complete && fishImage.naturalWidth > 0) {
                ctx.save();
                ctx.translate(fish.x, fish.y);
                ctx.scale(scaleX, 1);
                ctx.drawImage(fishImage, -size / 2, -size / 2, size, size);
                ctx.restore();
            } else {
                ctx.fillStyle = "#ffcf57";
                ctx.beginPath();
                ctx.arc(fish.x, fish.y, fish.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function handleKeydown(event) {
        const jumpKeys = [" ", "ArrowUp", "w", "W"];
        const slotOneKeys = ["e", "E"];
        const slotTwoKeys = ["q", "Q"];

        if (jumpKeys.includes(event.key)) {
            event.preventDefault();

            if (state.mode === "playing") {
                if (!event.repeat) {
                    queueJump();
                }

                setJumpHeld(true);
            }
        }

        if (slotOneKeys.includes(event.key)) {
            event.preventDefault();

            if (getAbilityForSlot(1) === "glide") {
                if (state.mode === "playing") {
                    input.glideHeld = true;
                }
            } else if (!event.repeat) {
                triggerSlotAbility(1);
            }
        }

        if (slotTwoKeys.includes(event.key)) {
            event.preventDefault();

            if (getAbilityForSlot(2) === "glide") {
                if (state.mode === "playing") {
                    input.glideHeld = true;
                }
            } else if (!event.repeat) {
                triggerSlotAbility(2);
            }
        }
    }

    function handleKeyup(event) {
        const jumpKeys = [" ", "ArrowUp", "w", "W"];
        const slotOneKeys = ["e", "E"];
        const slotTwoKeys = ["q", "Q"];

        if (jumpKeys.includes(event.key)) {
            setJumpHeld(false);
        }

        if (
            (slotOneKeys.includes(event.key) && getAbilityForSlot(1) === "glide") ||
            (slotTwoKeys.includes(event.key) && getAbilityForSlot(2) === "glide")
        ) {
            input.glideHeld = false;
        }
    }

    playButton?.addEventListener("click", () => {
        if (state.mode === "ready" && !state.countdownRunning) {
            startCountdown();
            return;
        }

        if (state.mode === "gameOver") {
            startReadyState();
        }
    });

    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("keyup", handleKeyup);

    function checkStart() {
        assetsLoaded++;
        if (assetsLoaded === totalAssets && !started) {
            started = true;
            startReadyState();
            requestAnimationFrame(gameLoop);
        }
    }

    cat1.onload = checkStart;
    cat2.onload = checkStart;
    background.onload = checkStart;
    fishImage.onload = checkStart;

    function gameLoop(timestamp) {
        const deltaSeconds = lastTimestamp
            ? Math.min((timestamp - lastTimestamp) / 1000, 0.032)
            : 0;
        lastTimestamp = timestamp;

        updateSpeedMultiplier(deltaSeconds);

        const worldMultiplier = getWorldMultiplier();
        const speedMultiplier = state.speedMultiplier;

        let worldSpeed = basePlatformSpeed * speedMultiplier;

        if (state.dashTimer > 0) {
            worldSpeed += DASH_BONUS_SPEED * dashEasing(state.dashProgress);
        }

        worldSpeed *= worldMultiplier;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (state.mode === "playing") {
            drawBackground(false);

            const animationTimeScale = state.timeSlowTimer > 0 ? 0.65 : 1;
            const currentFrameInterval = frameInterval / animationTimeScale;

            if (timestamp - lastFrameTime > currentFrameInterval) {
                currentFrame = (currentFrame + 1) % runFrames.length;
                lastFrameTime = timestamp;
            }

            updateEffects(deltaSeconds);
            updateCooldowns(deltaSeconds);
            updatePlatforms(worldSpeed, deltaSeconds);
            updatePlayer(deltaSeconds);
            updateFish(deltaSeconds, worldSpeed);

            state.distance += worldSpeed * deltaSeconds * 10;
            state.bestDistance = Math.max(state.bestDistance, state.distance);
        } else {
            drawBackground(true);
        }

        drawPlatforms();
        drawFish();
        drawPlayer();
        drawEffects();
        updateHud();

        requestAnimationFrame(gameLoop);
    }
}
