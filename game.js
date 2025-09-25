class GameMenu {
    constructor() {
        this.loadingElements = {
            screen: document.getElementById('loadingScreen'),
            progress: document.getElementById('loadingProgress'),
            text: document.getElementById('loadingText')
        };
        
        this.menuElements = {
            mainMenu: document.getElementById('mainMenu'),
            gameUI: document.getElementById('gameUI'),
            pauseMenu: document.getElementById('pauseMenu')
        };
        
        this.isGameStarted = false;
        this.isPaused = false;
    }
    
    async showLoading() {
        this.loadingElements.screen.style.display = 'flex';
        
        // Имитация загрузки
        const steps = [
            {text: 'Загрузка графики...', progress: 20},
            {text: 'Инициализация мира...', progress: 50},
            {text: 'Загрузка текстур...', progress: 80},
            {text: 'Готово!', progress: 100}
        ];
        
        for (const step of steps) {
            await this.updateLoading(step.text, step.progress);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.hideLoading();
    }
    
    updateLoading(text, progress) {
        return new Promise(resolve => {
            this.loadingElements.text.textContent = text;
            this.loadingElements.progress.style.width = progress + '%';
            setTimeout(resolve, 100);
        });
    }
    
    hideLoading() {
        this.loadingElements.screen.style.display = 'none';
        this.showMainMenu();
    }
    
    showMainMenu() {
        this.menuElements.mainMenu.style.display = 'flex';
    }
    
    hideMainMenu() {
        this.menuElements.mainMenu.style.display = 'none';
    }
    
    showGameUI() {
        this.menuElements.gameUI.style.display = 'block';
    }
    
    hideGameUI() {
        this.menuElements.gameUI.style.display = 'none';
    }
    
    showPauseMenu() {
        this.menuElements.pauseMenu.style.display = 'flex';
        this.isPaused = true;
    }
    
    hidePauseMenu() {
        this.menuElements.pauseMenu.style.display = 'none';
        this.isPaused = false;
    }
}

// Глобальные функции для кнопок
function startGame() {
    const menu = window.gameMenu;
    menu.hideMainMenu();
    menu.showGameUI();
    window.game.start();
}

function resumeGame() {
    const menu = window.gameMenu;
    menu.hidePauseMenu();
    window.game.setPaused(false);
}

function backToMenu() {
    const menu = window.gameMenu;
    menu.hidePauseMenu();
    menu.hideGameUI();
    menu.showMainMenu();
    window.game.stop();
}

function showSettings() {
    alert('Настройки будут в следующей версии!');
}

function showAbout() {
    alert('MetaCraft Alpha 0.1.4\n\nСоздай свою вселенную из блоков!\n\nУправление:\nWASD - движение\nМышь - вращение камеры\nЛКМ/ПКМ - установка/удаление блоков\n1-8 - выбор блоков\nE - инвентарь\nESC - пауза');
}

// Инициализация при загрузке страницы
window.addEventListener('load', () => {
    window.gameMenu = new GameMenu();
    window.gameMenu.showLoading();
});
class MetaCraftGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.raycaster = null;
        
        // Игровые объекты
        this.blocks = new Map();
        this.chunks = new Map();
        this.player = {
            position: new THREE.Vector3(0, 50, 0),
            velocity: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Vector2(0, 0),
            onGround: false,
            height: 1.8,
            radius: 0.4
        };
        
        // Настройки
        this.settings = {
            renderDistance: 4,
            gravity: -30,
            jumpForce: 10,
            walkSpeed: 5,
            flySpeed: 8,
            mouseSensitivity: 0.002
        };
        
        // Режимы
        this.modes = {
            WALK: 'walk',
            FLY: 'fly',
            CREATIVE: 'creative'
        };
        this.currentMode = this.modes.CREATIVE;
        
        // Система блоков (расширенная)
        this.blockTypes = {
            AIR: { id: 0, name: 'Воздух', color: 0x000000, solid: false, transparent: true },
            STONE: { id: 1, name: 'Камень', color: 0x888888, solid: true },
            GRASS: { id: 2, name: 'Земля', color: 0x3d9970, solid: true },
            DIRT: { id: 3, name: 'Грязь', color: 0x8B4513, solid: true },
            WOOD: { id: 4, name: 'Дерево', color: 0x8B4513, solid: true },
            LEAVES: { id: 5, name: 'Листья', color: 0x228B22, solid: true, transparent: true },
            SAND: { id: 6, name: 'Песок', color: 0xffd700, solid: true },
            WATER: { id: 7, name: 'Вода', color: 0x0066cc, solid: false, transparent: true },
            COAL_ORE: { id: 8, name: 'Уголь', color: 0x333333, solid: true },
            IRON_ORE: { id: 9, name: 'Железо', color: 0xd8d8d8, solid: true },
            GOLD_ORE: { id: 10, name: 'Золото', color: 0xffd700, solid: true },
            DIAMOND_ORE: { id: 11, name: 'Алмаз', color: 0x4cc9f0, solid: true },
            BEDROCK: { id: 12, name: 'Бедрок', color: 0x222222, solid: true, unbreakable: true }
        };
        
        this.currentBlockType = this.blockTypes.GRASS;
        this.inventory = {};
        this.hotbarSlots = [];
        
        // Состояние игры
        this.isRunning = false;
        this.isPaused = false;
        this.keys = {};
        this.mouse = { x: 0, y: 0, left: false, right: false };
        
        // Материалы
        this.materials = {};
        this.initMaterials();
    }
    
    initMaterials() {
        // Создаем материалы для каждого типа блоков
        for (const [key, blockType] of Object.entries(this.blockTypes)) {
            if (blockType.id === 0) continue; // Пропускаем воздух
            
            this.materials[blockType.id] = {
                normal: new THREE.MeshLambertMaterial({ 
                    color: blockType.color,
                    transparent: blockType.transparent || false,
                    opacity: blockType.transparent ? 0.8 : 1.0
                }),
                selected: new THREE.MeshLambertMaterial({ 
                    color: 0xffaa00,
                    transparent: blockType.transparent || false,
                    opacity: blockType.transparent ? 0.9 : 1.0
                })
            };
        }
        
        // Материал для призрачного блока
        this.ghostMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 0.4 
        });
    }
    
    async start() {
        await this.init();
        this.isRunning = true;
        this.animate();
    }
    
    stop() {
        this.isRunning = false;
        // Очистка сцены
        if (this.scene) {
            while(this.scene.children.length > 0) { 
                this.scene.remove(this.scene.children[0]); 
            }
        }
    }
    
    setPaused(paused) {
        this.isPaused = paused;
    }
    
    async init() {
        // 1. Создаем сцену
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        
        // 2. Создаем камеру (правильную FPS камеру)
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.updateCameraPosition();
        
        // 3. Создаем рендерер
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('gameCanvas'),
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // 4. Raycaster для выбора блоков
        this.raycaster = new THREE.Raycaster();
        
        // 5. Освещение
        this.setupLighting();
        
        // 6. Генерация мира
        await this.generateWorld();
        
        // 7. Призрачный блок
        this.setupGhostBlock();
        
        // 8. Инициализация инвентаря
        this.setupInventory();
        
        // 9. Управление
        this.setupControls();
        
        console.log('🎮 MetaCraft Alpha 0.1.4 запущена!');
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light (солнце)
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.sunLight.position.set(100, 100, 50);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.scene.add(this.sunLight);
        
        // Hemisphere light для неба
        const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3d9970, 0.3);
        this.scene.add(hemiLight);
    }
    
    updateCameraPosition() {
        // Правильная FPS камера
        this.camera.position.copy(this.player.position);
        this.camera.position.y += this.player.height - 0.2; // Уровень глаз
        
        // Поворот камеры
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.player.rotation.y;
        this.camera.rotation.x = this.player.rotation.x;
    }
    
    async generateWorld() {
        const chunkSize = 16;
        const worldSize = this.settings.renderDistance * 2 + 1;
        
        for (let x = -this.settings.renderDistance; x <= this.settings.renderDistance; x++) {
            for (let z = -this.settings.renderDistance; z <= this.settings.renderDistance; z++) {
                await this.generateChunk(x, z, chunkSize);
            }
        }
        
        // Помещаем игрока на поверхность
        this.findSpawnPosition();
    }
    
    async generateChunk(chunkX, chunkZ, size) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const chunkKey = `${chunkX},${chunkZ}`;
                
                for (let x = 0; x < size; x++) {
                    for (let z = 0; z < size; z++) {
                        const worldX = chunkX * size + x;
                        const worldZ = chunkZ * size + z;
                        
                        // Генерация высоты (шум Перлина)
                        const height = this.getTerrainHeight(worldX, worldZ);
                        
                        // Определяем биом
                        const biome = this.getBiome(worldX, worldZ);
                        
                        // Генерация блоков для этого столбца
                        this.generateColumn(worldX, worldZ, height, biome);
                    }
                }
                
                resolve();
            }, 0);
        });
    }
    
    getTerrainHeight(x, z) {
        // Простой шум для высоты
        const noise = Math.sin(x * 0.01) * Math.cos(z * 0.01) * 10 +
                     Math.sin(x * 0.02) * Math.cos(z * 0.02) * 5 +
                     Math.sin(x * 0.05) * Math.cos(z * 0.05) * 2;
        
        return Math.floor(noise + 30); // Базовая высота 30
    }
    
    getBiome(x, z) {
        const temperature = Math.sin(x * 0.001) * 0.5 + 0.5;
        const humidity = Math.cos(z * 0.001) * 0.5 + 0.5;
        
        if (temperature > 0.7 && humidity < 0.3) return 'DESERT';
        if (temperature < 0.3) return 'MOUNTAIN';
        if (humidity > 0.7) return 'FOREST';
        return 'PLAINS';
    }
    
    generateColumn(x, z, surfaceHeight, biome) {
        // Бедрок внизу
        this.createBlock(x, 0, z, this.blockTypes.BEDROCK);
        
        // Камень до высоты surfaceHeight-3
        for (let y = 1; y < surfaceHeight - 3; y++) {
            // Случайные руды
            let blockType = this.blockTypes.STONE;
            const oreChance = Math.random();
            
            if (oreChance < 0.02) blockType = this.blockTypes.COAL_ORE;
            else if (oreChance < 0.005) blockType = this.blockTypes.IRON_ORE;
            else if (oreChance < 0.001) blockType = this.blockTypes.GOLD_ORE;
            else if (oreChance < 0.0003) blockType = this.blockTypes.DIAMOND_ORE;
            
            this.createBlock(x, y, z, blockType);
        }
        
        // Переходный слой
        this.createBlock(x, surfaceHeight - 3, z, this.blockTypes.DIRT);
        this.createBlock(x, surfaceHeight - 2, z, this.blockTypes.DIRT);
        this.createBlock(x, surfaceHeight - 1, z, this.blockTypes.DIRT);
        
        // Поверхностный блок в зависимости от биома
        let surfaceBlock = this.blockTypes.GRASS;
        if (biome === 'DESERT') surfaceBlock = this.blockTypes.SAND;
        else if (biome === 'MOUNTAIN') surfaceBlock = this.blockTypes.STONE;
        
        this.createBlock(x, surfaceHeight, z, surfaceBlock);
        
        // Генерация деревьев в лесу
        if (biome === 'FOREST' && Math.random() < 0.1 && x % 4 === 0 && z % 4 === 0) {
            this.generateTree(x, surfaceHeight + 1, z);
        }
        
        // Пещеры
        if (Math.random() < 0.05) {
            this.generateCave(x, surfaceHeight - 5, z);
        }
    }
    
    generateTree(x, y, z) {
        // Ствол (4-6 блоков)
        const height = 4 + Math.floor(Math.random() * 3);
        for (let i = 0; i < height; i++) {
            this.createBlock(x, y + i, z, this.blockTypes.WOOD);
        }
        
        // Листва (сфера)
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = 0; dy < 3; dy++) {
                for (let dz = -2; dz <= 2; dz++) {
                    if (Math.abs(dx) + Math.abs(dz) < 4 && (dx !== 0 || dz !== 0 || dy > 1)) {
                        this.createBlock(x + dx, y + height - 1 + dy, z + dz, this.blockTypes.LEAVES);
                    }
                }
            }
        }
    }
    
    generateCave(x, y, z) {
        const size = 3 + Math.floor(Math.random() * 4);
        for (let dx = -size; dx <= size; dx++) {
            for (let dy = -size; dy <= size; dy++) {
                for (let dz = -size; dz <= size; dz++) {
                    if (dx*dx + dy*dy + dz*dz < size*size) {
                        this.removeBlock(x + dx, y + dy, z + dz);
                    }
                }
            }
        }
    }
    
    findSpawnPosition() {
        // Ищем безопасную позицию для спавна
        for (let x = 0; x < 10; x++) {
            for (let z = 0; z < 10; z++) {
                const surfaceHeight = this.getTerrainHeight(x, z);
                if (surfaceHeight > 20) {
                    this.player.position.set(x, surfaceHeight + 2, z);
                    this.updateCameraPosition();
                    return;
                }
            }
        }
    }
    
    createBlock(x, y, z, blockType) {
        if (blockType.id === 0) return null; // Не создаем воздух
        
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = this.materials[blockType.id].normal;
        const block = new THREE.Mesh(geometry, material);
        block.position.set(x, y, z);
        
        block.userData = {
            type: 'block',
            blockType: blockType,
            position: { x, y, z }
        };
        
        this.scene.add(block);
        
        const key = `${x},${y},${z}`;
        this.blocks.set(key, block);
        
        return block;
    }
    
    removeBlock(x, y, z) {
        const key = `${x},${y},${z}`;
        const block = this.blocks.get(key);
        
        if (block) {
            this.scene.remove(block);
            this.blocks.delete(key);
            
            // Добавляем блок в инвентарь
            const blockType = block.userData.blockType;
            if (!blockType.unbreakable) {
                this.addToInventory(blockType);
            }
            
            return true;
        }
        return false;
    }
    
    addToInventory(blockType) {
        if (!this.inventory[blockType.id]) {
            this.inventory[blockType.id] = 0;
        }
        this.inventory[blockType.id]++;
        this.updateHotbar();
    }
    
    setupGhostBlock() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        this.ghostBlock = new THREE.Mesh(geometry, this.ghostMaterial);
        this.scene.add(this.ghostBlock);
        this.ghostBlock.visible = false;
    }
    
    setupInventory() {
        // Заполняем инвентарь стартовыми блоками
        this.inventory[this.blockTypes.GRASS.id] = 10;
        this.inventory[this.blockTypes.WOOD.id] = 10;
        this.inventory[this.blockTypes.STONE.id] = 10;
        
        this.updateHotbar();
    }
    
    updateHotbar() {
        const hotbar = document.getElementById('hotbar');
        hotbar.innerHTML = '';
        
        const hotbarBlocks = [
            this.blockTypes.GRASS,
            this.blockTypes.STONE,
            this.blockTypes.WOOD,
            this.blockTypes.DIRT,
            this.blockTypes.SAND,
            this.blockTypes.COAL_ORE,
            this.blockTypes.IRON_ORE,
            this.blockTypes.DIAMOND_ORE
        ];
        
        hotbarBlocks.forEach((blockType, index) => {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            slot.dataset.blockId = blockType.id;
            
            if (blockType.id === this.currentBlockType.id) {
                slot.classList.add('active');
            }
            
            const preview = document.createElement('div');
            preview.className = 'block-preview';
            preview.style.backgroundColor = `#${blockType.color.toString(16).padStart(6, '0')}`;
            preview.title = blockType.name;
            
            const count = document.createElement('div');
            count.className = 'block-count';
            count.textContent = this.inventory[blockType.id] || 0;
            
            slot.appendChild(preview);
            slot.appendChild(count);
            hotbar.appendChild(slot);
            
            // Обработчик клика
            slot.addEventListener('click', () => {
                this.selectBlockType(blockType);
            });
            
            this.hotbarSlots.push(slot);
        });
    }
    
    selectBlockType(blockType) {
        this.currentBlockType = blockType;
        
        this.hotbarSlots.forEach(slot => {
            slot.classList.remove('active');
            if (parseInt(slot.dataset.blockId) === blockType.id) {
                slot.classList.add('active');
            }
        });
        
        this.ghostBlock.material.color.set(blockType.color);
    }
    
    setupControls() {
        // Клавиатура
        document.addEventListener('keydown', (event) => {
            if (this.isPaused && event.code !== 'Escape') return;
            
            this.keys[event.code] = true;
            
            // Выбор блоков цифрами 1-8
            if (event.code >= 'Digit1' && event.code <= 'Digit8') {
                const hotbarBlocks = [
                    this.blockTypes.GRASS, this.blockTypes.STONE, this.blockTypes.WOOD,
                    this.blockTypes.DIRT, this.blockTypes.SAND, this.blockTypes.COAL_ORE,
                    this.blockTypes.IRON_ORE, this.blockTypes.DIAMOND_ORE
                ];
                const slotIndex = parseInt(event.code[5]) - 1;
                if (hotbarBlocks[slotIndex]) {
                    this.selectBlockType(hotbarBlocks[slotIndex]);
                }
            }
            
            // Переключение режима полета
            if (event.code === 'KeyF') {
                this.toggleFlightMode();
            }
            
            // Пауза
            if (event.code === 'Escape') {
                this.togglePause();
            }
        });
        
        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });
        
        // Мышь
        document.addEventListener('mousemove', (event) => {
            if (this.isPaused) return;
            
            if (document.pointerLockElement === this.renderer.domElement) {
                this.mouse.x = event.movementX;
                this.mouse.y = event.movementY;
            }
        });
        
        document.addEventListener('mousedown', (event) => {
            if (this.isPaused) return;
            
            if (document.pointerLockElement === this.renderer.domElement) {
                if (event.button === 0) this.mouse.left = true;
                if (event.button === 2) this.mouse.right = true;
            }
        });
        
        document.addEventListener('mouseup', (event) => {
            if (event.button === 0) this.mouse.left = false;
            if (event.button === 2) this.mouse.right = false;
        });
        
        document.addEventListener('contextmenu', (event) => event.preventDefault());
        
        // Блокировка указателя при клике на канвас
        this.renderer.domElement.addEventListener('click', () => {
            if (!this.isPaused) {
                this.renderer.domElement.requestPointerLock();
            }
        });
    }
    
    toggleFlightMode() {
        if (this.currentMode === this.modes.WALK) {
            this.currentMode = this.modes.FLY;
            this.player.velocity.y = 0;
        } else {
            this.currentMode = this.modes.WALK;
        }
        this.updateDebugInfo();
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            document.exitPointerLock();
            window.gameMenu.showPauseMenu();
        } else {
            window.gameMenu.hidePauseMenu();
        }
    }
    
    // Продолжение в следующем сообщении...
}

// Продолжение класса MetaCraftGame
Object.assign(MetaCraftGame.prototype, {
    handleInput(deltaTime) {
        if (this.isPaused) return;
        
        const sensitivity = this.settings.mouseSensitivity;
        
        // Вращение камеры (правильное FPS управление)
        if (document.pointerLockElement === this.renderer.domElement) {
            this.player.rotation.y -= this.mouse.x * sensitivity;
            this.player.rotation.x -= this.mouse.y * sensitivity;
            
            // Ограничиваем вертикальный взгляд
            this.player.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.player.rotation.x));
        }
        
        this.updateCameraPosition();
        
        // Движение
        const moveVector = new THREE.Vector3(0, 0, 0);
        
        if (this.keys['KeyW']) moveVector.z -= 1;
        if (this.keys['KeyS']) moveVector.z += 1;
        if (this.keys['KeyA']) moveVector.x -= 1;
        if (this.keys['KeyD']) moveVector.x += 1;
        
        if (moveVector.length() > 0) {
            moveVector.normalize();
            
            // Преобразуем направление относительно камеры
            const forward = new THREE.Vector3(0, 0, -1);
            forward.applyQuaternion(this.camera.quaternion);
            forward.y = 0;
            forward.normalize();
            
            const right = new THREE.Vector3(1, 0, 0);
            right.applyQuaternion(this.camera.quaternion);
            right.y = 0;
            right.normalize();
            
            const worldMove = new THREE.Vector3();
            worldMove.addScaledVector(forward, moveVector.z);
            worldMove.addScaledVector(right, moveVector.x);
            worldMove.normalize();
            
            const speed = this.currentMode === this.modes.FLY ? this.settings.flySpeed : this.settings.walkSpeed;
            worldMove.multiplyScalar(speed * deltaTime);
            
            this.player.velocity.x = worldMove.x;
            this.player.velocity.z = worldMove.z;
        } else {
            this.player.velocity.x *= 0.8;
            this.player.velocity.z *= 0.8;
        }
        
        // Вертикальное движение
        if (this.currentMode === this.modes.FLY) {
            this.player.velocity.y = 0;
            if (this.keys['Space']) this.player.velocity.y = this.settings.flySpeed * deltaTime;
            if (this.keys['ShiftLeft']) this.player.velocity.y = -this.settings.flySpeed * deltaTime;
        } else {
            // Гравитация и прыжки
            this.player.velocity.y += this.settings.gravity * deltaTime;
            
            if (this.keys['Space'] && this.player.onGround) {
                this.player.velocity.y = this.settings.jumpForce;
                this.player.onGround = false;
            }
        }
        
        this.mouse.x = 0;
        this.mouse.y = 0;
    },
    
    updatePhysics(deltaTime) {
        if (this.isPaused) return;
        
        // Новая позиция
        const newPos = this.player.position.clone().add(
            this.player.velocity.clone().multiplyScalar(deltaTime)
        );
        
        // Проверка коллизий
        this.checkCollisions(newPos);
        
        this.updateCameraPosition();
    },
    
    checkCollisions(newPos) {
        // Упрощенная проверка коллизий
        const feetPos = newPos.clone();
        const headPos = newPos.clone();
        headPos.y += this.player.height;
        
        this.player.onGround = false;
        
        // Проверяем коллизии по вертикали
        for (let y = 0; y <= this.player.height; y += 0.5) {
            const checkPos = newPos.clone();
            checkPos.y += y;
            
            if (this.isSolidBlockAt(checkPos.x, checkPos.y, checkPos.z)) {
                if (y < 0.5) { // Коллизия с ногами
                    this.player.onGround = true;
                    this.player.velocity.y = Math.max(0, this.player.velocity.y);
                    newPos.y = Math.floor(checkPos.y) + 1.1;
                } else { // Коллизия с головой
                    this.player.velocity.y = Math.min(0, this.player.velocity.y);
                    newPos.y = Math.floor(checkPos.y) - this.player.height - 0.1;
                }
                break;
            }
        }
        
        // Проверяем горизонтальные коллизии
        const horizontalChecks = [
            {x: this.player.radius, z: 0}, {x: -this.player.radius, z: 0},
            {x: 0, z: this.player.radius}, {x: 0, z: -this.player.radius}
        ];
        
        for (const check of horizontalChecks) {
            const checkPos = newPos.clone();
            checkPos.x += check.x;
            checkPos.z += check.z;
            checkPos.y += this.player.height * 0.5;
            
            if (this.isSolidBlockAt(checkPos.x, checkPos.y, checkPos.z)) {
                this.player.velocity.x = 0;
                this.player.velocity.z = 0;
                newPos.copy(this.player.position);
                break;
            }
        }
        
        this.player.position.copy(newPos);
    },
    
    isSolidBlockAt(x, y, z) {
        const blockX = Math.floor(x);
        const blockY = Math.floor(y);
        const blockZ = Math.floor(z);
        
        const key = `${blockX},${blockY},${blockZ}`;
        const block = this.blocks.get(key);
        
        return block && block.userData.blockType.solid;
    },
    
    handleBlockSelection() {
        if (this.isPaused) return;
        
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersects = this.raycaster.intersectObjects(Array.from(this.blocks.values()));
        
        // Сброс выделения
        if (this.selectedBlock) {
            const blockType = this.selectedBlock.userData.blockType;
            this.selectedBlock.material = this.materials[blockType.id].normal;
            this.selectedBlock = null;
        }
        
        this.ghostBlock.visible = false;
        this.placePosition = null;
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            this.selectedBlock = intersect.object;
            
            // Подсветка выбранного блока
            this.selectedBlock.material = this.materials[this.selectedBlock.userData.blockType.id].selected;
            
            // Позиция для установки нового блока
            const normal = intersect.face.normal;
            this.placePosition = {
                x: Math.round(intersect.point.x + normal.x * 0.5),
                y: Math.round(intersect.point.y + normal.y * 0.5),
                z: Math.round(intersect.point.z + normal.z * 0.5)
            };
            
            // Призрачный блок
            if (!this.isSolidBlockAt(this.placePosition.x, this.placePosition.y, this.placePosition.z)) {
                this.ghostBlock.position.set(
                    this.placePosition.x,
                    this.placePosition.y,
                    this.placePosition.z
                );
                this.ghostBlock.visible = true;
            }
            
            // Взаимодействие с блоками
            if (this.mouse.right) {
                const pos = this.selectedBlock.userData.position;
                this.removeBlock(pos.x, pos.y, pos.z);
                this.mouse.right = false;
            } else if (this.mouse.left && this.placePosition) {
                if (!this.isSolidBlockAt(this.placePosition.x, this.placePosition.y, this.placePosition.z)) {
                    // Проверяем есть ли блок в инвентаре
                    if (this.inventory[this.currentBlockType.id] > 0) {
                        this.createBlock(
                            this.placePosition.x,
                            this.placePosition.y,
                            this.placePosition.z,
                            this.currentBlockType
                        );
                        this.inventory[this.currentBlockType.id]--;
                        this.updateHotbar();
                    }
                    this.mouse.left = false;
                }
            }
        }
    },
    
    updateDebugInfo() {
        const biome = this.getBiome(Math.floor(this.player.position.x), Math.floor(this.player.position.z));
        document.getElementById('posX').textContent = this.player.position.x.toFixed(1);
        document.getElementById('posY').textContent = this.player.position.y.toFixed(1);
        document.getElementById('posZ').textContent = this.player.position.z.toFixed(1);
        document.getElementById('biome').textContent = this.getBiomeName(biome);
        document.getElementById('gameMode').textContent = 
            this.currentMode === this.modes.FLY ? 'ПОЛЕТ' : 'ХОДЬБА';
    },
    
    getBiomeName(biome) {
        const names = {
            'DESERT': 'Пустыня',
            'MOUNTAIN': 'Горы',
            'FOREST': 'Лес',
            'PLAINS': 'Равнины'
        };
        return names[biome] || biome;
    },
    
    animate() {
        if (!this.isRunning) return;
        
        const clock = new THREE.Clock();
        
        const gameLoop = () => {
            if (!this.isRunning) return;
            
            const deltaTime = Math.min(clock.getDelta(), 0.1);
            
            if (!this.isPaused) {
                this.handleInput(deltaTime);
                this.updatePhysics(deltaTime);
                this.handleBlockSelection();
                this.updateDebugInfo();
            }
            
            this.renderer.render(this.scene, this.camera);
            requestAnimationFrame(gameLoop.bind(this));
        };
        
        gameLoop();
    }
});

// Инициализация игры
window.game = new MetaCraftGame();
