class MetaCraftGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.raycaster = null;
        
        // Игровые объекты
        this.blocks = new Map();
        this.selectedBlock = null;
        this.ghostBlock = null;
        
        // Игрок
        this.player = {
            position: new THREE.Vector3(0, 20, 0),
            velocity: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Vector2(0, 0), // x: pitch, y: yaw
            onGround: false,
            height: 1.8,
            radius: 0.3
        };
        
        // Настройки
        this.settings = {
            gravity: -25,
            jumpForce: 8,
            walkSpeed: 5,
            flySpeed: 8,
            mouseSensitivity: 0.002,
            renderDistance: 4
        };
        
        // Режимы
        this.modes = {
            WALK: 'walk',
            FLY: 'fly'
        };
        this.currentMode = this.modes.FLY;
        
        // Система блоков
        this.blockTypes = {
            GRASS: { id: 1, name: 'Земля', color: 0x3d9970, solid: true },
            STONE: { id: 2, name: 'Камень', color: 0x888888, solid: true },
            WOOD: { id: 3, name: 'Дерево', color: 0x8B4513, solid: true },
            DIRT: { id: 4, name: 'Грязь', color: 0x5D4037, solid: true },
            SAND: { id: 5, name: 'Песок', color: 0xFFD700, solid: true },
            WATER: { id: 6, name: 'Вода', color: 0x2196F3, solid: false },
            COAL_ORE: { id: 7, name: 'Уголь', color: 0x212121, solid: true },
            DIAMOND_ORE: { id: 8, name: 'Алмаз', color: 0x4CC9F0, solid: true }
        };
        
        this.currentBlockType = this.blockTypes.GRASS;
        this.inventory = {};
        this.hotbarSlots = [];
        
        // Состояние игры
        this.isRunning = false;
        this.isPaused = false;
        this.keys = {};
        this.mouse = { x: 0, y: 0, left: false, right: false };
        
        this.init();
    }
    
    init() {
        // 1. Создаем сцену
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Голубое небо
        
        // 2. Создаем камеру
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.updateCamera();
        
        // 3. Создаем рендерер
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('gameCanvas'),
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // 4. Освещение
        this.setupLighting();
        
        // 5. Raycaster для выбора блоков
        this.raycaster = new THREE.Raycaster();
        
        // 6. Генерация мира
        this.generateWorld();
        
        // 7. Призрачный блок для предпросмотра
        this.setupGhostBlock();
        
        // 8. Инициализация инвентаря и хотбара
        this.setupInventory();
        
        // 9. Управление
        this.setupControls();
        
        console.log('🎮 MetaCraft инициализирована!');
    }
    
    setupLighting() {
        // Ambient light (рассеянный свет)
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light (солнце)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Hemisphere light для неба
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8BC34A, 0.3);
        this.scene.add(hemisphereLight);
    }
    
    generateWorld() {
        const worldSize = 32;
        const groundHeight = 10;
        
        // Генерация земли
        for (let x = -worldSize; x < worldSize; x++) {
            for (let z = -worldSize; z < worldSize; z++) {
                // Базовый слой - камень
                for (let y = 0; y < groundHeight - 3; y++) {
                    this.createBlock(x, y, z, this.blockTypes.STONE);
                }
                
                // Верхние слои
                this.createBlock(x, groundHeight - 3, z, this.blockTypes.DIRT);
                this.createBlock(x, groundHeight - 2, z, this.blockTypes.DIRT);
                this.createBlock(x, groundHeight - 1, z, this.blockTypes.DIRT);
                
                // Поверхность - разная в зависимости от позиции
                const distance = Math.sqrt(x*x + z*z);
                let surfaceBlock = this.blockTypes.GRASS;
                
                if (distance < 8) {
                    // Центральная область - трава
                    surfaceBlock = this.blockTypes.GRASS;
                    
                    // Генерация деревьев
                    if (Math.random() < 0.1 && x % 3 === 0 && z % 3 === 0) {
                        this.generateTree(x, groundHeight, z);
                    }
                } else if (distance < 16) {
                    // Средняя область - песок
                    surfaceBlock = this.blockTypes.SAND;
                } else {
                    // Крайняя область - камень
                    surfaceBlock = this.blockTypes.STONE;
                }
                
                this.createBlock(x, groundHeight, z, surfaceBlock);
                
                // Генерация руд под землей
                if (Math.random() < 0.05) {
                    const oreType = Math.random() < 0.8 ? this.blockTypes.COAL_ORE : this.blockTypes.DIAMOND_ORE;
                    this.createBlock(x, groundHeight - 5, z, oreType);
                }
            }
        }
        
        // Создаем несколько структур для демонстрации
        this.generateStructures();
        
        // Помещаем игрока над землей
        this.player.position.set(0, groundHeight + 5, 0);
        this.updateCamera();
    }
    
    generateTree(x, y, z) {
        // Ствол (3-4 блока высотой)
        const trunkHeight = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < trunkHeight; i++) {
            this.createBlock(x, y + i, z, this.blockTypes.WOOD);
        }
        
        // Листва (простая сфера)
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                for (let dy = 0; dy < 3; dy++) {
                    if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy) < 4) {
                        if (!(dx === 0 && dz === 0 && dy < 2)) { // Не закрываем ствол
                            this.createBlock(x + dx, y + trunkHeight - 1 + dy, z + dz, this.blockTypes.GRASS);
                        }
                    }
                }
            }
        }
    }
    
    generateStructures() {
        // Пирамида из песка
        for (let level = 0; level < 5; level++) {
            const size = 5 - level;
            for (let x = -size; x <= size; x++) {
                for (let z = -size; z <= size; z++) {
                    if (Math.abs(x) === size || Math.abs(z) === size) {
                        this.createBlock(x + 12, level + 11, z, this.blockTypes.SAND);
                    }
                }
            }
        }
        
        // Водоем
        for (let x = -3; x <= 3; x++) {
            for (let z = -3; z <= 3; z++) {
                this.createBlock(x - 12, 9, z, this.blockTypes.WATER);
            }
        }
    }
    
    createBlock(x, y, z, blockType) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshLambertMaterial({ color: blockType.color });
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
            if (!this.inventory[blockType.id]) {
                this.inventory[blockType.id] = 0;
            }
            this.inventory[blockType.id]++;
            this.updateHotbar();
            
            return true;
        }
        return false;
    }
    
    setupGhostBlock() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x00FF00, 
            transparent: true, 
            opacity: 0.4 
        });
        this.ghostBlock = new THREE.Mesh(geometry, material);
        this.scene.add(this.ghostBlock);
        this.ghostBlock.visible = false;
    }
    
    setupInventory() {
        // Стартовый инвентарь
        const startBlocks = [
            this.blockTypes.GRASS, this.blockTypes.STONE, this.blockTypes.WOOD,
            this.blockTypes.DIRT, this.blockTypes.SAND, this.blockTypes.WATER,
            this.blockTypes.COAL_ORE, this.blockTypes.DIAMOND_ORE
        ];
        
        startBlocks.forEach(blockType => {
            this.inventory[blockType.id] = 64; // По 64 блока каждого типа
        });
        
        this.updateHotbar();
    }
    
    updateHotbar() {
        const hotbar = document.getElementById('hotbar');
        hotbar.innerHTML = '';
        
        const hotbarBlocks = [
            this.blockTypes.GRASS, this.blockTypes.STONE, this.blockTypes.WOOD,
            this.blockTypes.DIRT, this.blockTypes.SAND, this.blockTypes.WATER,
            this.blockTypes.COAL_ORE, this.blockTypes.DIAMOND_ORE
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
            preview.title = `${blockType.name} (${this.inventory[blockType.id] || 0})`;
            
            const count = document.createElement('div');
            count.style.position = 'absolute';
            count.style.bottom = '2px';
            count.style.right = '2px';
            count.style.background = 'rgba(0,0,0,0.8)';
            count.style.padding = '1px 4px';
            count.style.borderRadius = '3px';
            count.style.fontSize = '10px';
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
        
        // Обновляем хотбар
        this.hotbarSlots.forEach(slot => {
            slot.classList.remove('active');
            if (parseInt(slot.dataset.blockId) === blockType.id) {
                slot.classList.add('active');
            }
        });
        
        // Обновляем призрачный блок
        this.ghostBlock.material.color.set(blockType.color);
        
        // Обновляем UI
        document.getElementById('currentBlock').textContent = blockType.name;
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
                    this.blockTypes.DIRT, this.blockTypes.SAND, this.blockTypes.WATER,
                    this.blockTypes.COAL_ORE, this.blockTypes.DIAMOND_ORE
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
        
        document.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
        
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
        
        document.getElementById('gameMode').textContent = 
            this.currentMode === this.modes.FLY ? 'ПОЛЕТ' : 'ХОДЬБА';
    }
    
    updateCamera() {
        this.camera.position.copy(this.player.position);
        this.camera.position.y += this.player.height - 0.2; // Уровень глаз
        
        // Правильное вращение FPS камеры
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.player.rotation.y;
        this.camera.rotation.x = this.player.rotation.x;
    }
    
    handleInput(deltaTime) {
        if (this.isPaused) return;
        
        const sensitivity = this.settings.mouseSensitivity;
        
        // Вращение камеры
        if (document.pointerLockElement === this.renderer.domElement) {
            this.player.rotation.y -= this.mouse.x * sensitivity;
            this.player.rotation.x -= this.mouse.y * sensitivity;
            
            // Ограничиваем вертикальный взгляд
            this.player.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.player.rotation.x));
        }
        
        // Движение
        const moveVector = new THREE.Vector3(0, 0, 0);
        
        if (this.keys['KeyW']) moveVector.z -= 1;
        if (this.keys['KeyS']) moveVector.z += 1;
        if (this.keys['KeyA']) moveVector.x -= 1;
        if (this.keys['KeyD']) moveVector.x += 1;
        
        if (moveVector.length() > 0) {
            moveVector.normalize();
            
            // Преобразуем направление относительно камеры
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            cameraDirection.y = 0;
            cameraDirection.normalize();
            
            const right = new THREE.Vector3();
            right.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
            
            const worldMove = new THREE.Vector3();
            worldMove.addScaledVector(cameraDirection, moveVector.z);
            worldMove.addScaledVector(right, moveVector.x);
            worldMove.normalize();
            
            const speed = this.currentMode === this.modes.FLY ? this.settings.flySpeed : this.settings.walkSpeed;
            worldMove.multiplyScalar(speed);
            
            this.player.velocity.x = worldMove.x;
            this.player.velocity.z = worldMove.z;
        } else {
            // Трение
            this.player.velocity.x *= 0.8;
            this.player.velocity.z *= 0.8;
        }
        
        // Вертикальное движение
        if (this.currentMode === this.modes.FLY) {
            this.player.velocity.y = 0;
            if (this.keys['Space']) this.player.velocity.y = this.settings.flySpeed;
            if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) this.player.velocity.y = -this.settings.flySpeed;
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
    }
    
    updatePhysics(deltaTime) {
        if (this.isPaused) return;
        
        // Простая проверка коллизий (для демо)
        const newPos = this.player.position.clone().add(
            this.player.velocity.clone().multiplyScalar(deltaTime)
        );
        
        // Проверяем, не упал ли игрок ниже уровня земли
        if (newPos.y < 1) {
            newPos.y = 1;
            this.player.velocity.y = 0;
            this.player.onGround = true;
        } else {
            this.player.onGround = false;
        }
        
        this.player.position.copy(newPos);
        this.updateCamera();
    }
    
    handleBlockSelection() {
        if (this.isPaused) return;
        
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersectObjects = Array.from(this.blocks.values());
        const intersects = this.raycaster.intersectObjects(intersectObjects);
        
        // Сбрасываем выделение предыдущего блока
        if (this.selectedBlock) {
            const blockType = this.selectedBlock.userData.blockType;
            this.selectedBlock.material.color.set(blockType.color);
            this.selectedBlock = null;
        }
        
        this.ghostBlock.visible = false;
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            this.selectedBlock = intersect.object;
            
            // Подсвечиваем выбранный блок
            this.selectedBlock.material.color.set(0xFFFF00);
            
            // Определяем позицию для установки нового блока
            const normal = intersect.face.normal;
            const placePosition = {
                x: Math.round(intersect.point.x + normal.x * 0.5),
                y: Math.round(intersect.point.y + normal.y * 0.5),
                z: Math.round(intersect.point.z + normal.z * 0.5)
            };
            
            // Показываем призрачный блок
            if (!this.isBlockAt(placePosition.x, placePosition.y, placePosition.z)) {
                this.ghostBlock.position.set(placePosition.x, placePosition.y, placePosition.z);
                this.ghostBlock.visible = true;
            }
            
            // Обработка кликов
            if (this.mouse.right) {
                const pos = this.selectedBlock.userData.position;
                this.removeBlock(pos.x, pos.y, pos.z);
                this.mouse.right = false;
            } else if (this.mouse.left && this.ghostBlock.visible) {
                if (this.inventory[this.currentBlockType.id] > 0) {
                    this.createBlock(
                        placePosition.x,
                        placePosition.y,
                        placePosition.z,
                        this.currentBlockType
                    );
                    this.inventory[this.currentBlockType.id]--;
                    this.updateHotbar();
                }
                this.mouse.left = false;
            }
        }
    }
    
    isBlockAt(x, y, z) {
        const key = `${x},${y},${z}`;
        return this.blocks.has(key);
    }
    
    updateDebugInfo() {
        document.getElementById('posX').textContent = Math.floor(this.player.position.x);
        document.getElementById('posY').textContent = Math.floor(this.player.position.y);
        document.getElementById('posZ').textContent = Math.floor(this.player.position.z);
    }
    
    start() {
        this.isRunning = true;
        this.animate();
    }
    
    stop() {
        this.isRunning = false;
    }
    
    setPaused(paused) {
        this.isPaused = paused;
    }
    
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
            requestAnimationFrame(gameLoop);
        };
        
        gameLoop();
    }
}
