class BloxdGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.raycaster = null;
        
        // Игровые объекты
        this.blocks = new Map();
        this.selectedBlock = null;
        this.placePosition = null;
        
        // Физика игрока
        this.player = {
            position: new THREE.Vector3(5, 10, 5),
            velocity: new THREE.Vector3(0, 0, 0),
            onGround: false,
            height: 1.8,
            radius: 0.3
        };
        
        // Настройки физики
        this.physics = {
            gravity: -25,
            jumpForce: 8,
            walkSpeed: 8,
            flySpeed: 12,
            friction: 0.8,
            airControl: 0.2
        };
        
        // Режимы игры
        this.modes = {
            WALK: 'walk',
            FLY: 'fly'
        };
        this.currentMode = this.modes.WALK;
        
        // Система блоков
        this.blockTypes = {
            STONE: { id: 1, name: 'Камень', color: 0x888888, solid: true },
            GRASS: { id: 2, name: 'Земля', color: 0x3d9970, solid: true },
            WOOD: { id: 3, name: 'Дерево', color: 0x8B4513, solid: true },
            SAND: { id: 4, name: 'Песок', color: 0xffd700, solid: true },
            WATER: { id: 5, name: 'Вода', color: 0x0066cc, solid: false }
        };
        
        this.currentBlockType = this.blockTypes.STONE;
        this.hotbarSlots = [];
        
        // Настройки управления
        this.keys = {};
        this.mouse = { x: 0, y: 0, left: false, right: false };
        this.cameraRotation = { x: 0, y: 0 };
        
        // Материалы
        this.materials = {
            normal: {},
            selected: new THREE.MeshLambertMaterial({ color: 0xffaa00 }),
            ghost: new THREE.MeshLambertMaterial({ 
                color: 0x00ff00, 
                transparent: true, 
                opacity: 0.4 
            })
        };
        
        // Создаем материалы для каждого типа блоков
        for (const [key, blockType] of Object.entries(this.blockTypes)) {
            this.materials.normal[blockType.id] = new THREE.MeshLambertMaterial({ 
                color: blockType.color 
            });
        }
        
        this.init();
    }
    
    init() {
        // 1. Создаем сцену
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        
        // 2. Создаем камеру
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // 3. Создаем рендерер
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('gameCanvas'), 
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // 4. Raycaster для выбора блоков
        this.raycaster = new THREE.Raycaster();
        
        // 5. Освещение
        this.setupLighting();
        
        // 6. Инициализируем хотбар
        this.setupHotbar();
        
        // 7. Создаем мир
        this.generateWorld();
        
        // 8. Призрачный блок
        this.setupGhostBlock();
        
        // 9. Управление
        this.setupControls();
        
        // 10. Запускаем игровой цикл
        this.animate();
        
        console.log('🎮 Bloxd.io Alpha 0.1.3 запущена!');
    }
    
    toggleMode() {
        if (this.currentMode === this.modes.WALK) {
            this.currentMode = this.modes.FLY;
            this.player.velocity.y = 0; // Сбрасываем вертикальную скорость
        } else {
            this.currentMode = this.modes.WALK;
        }
        
        document.getElementById('mode').textContent = 
            this.currentMode === this.modes.WALK ? 'ХОДЬБА' : 'ПОЛЕТ';
        document.getElementById('modeIndicator').textContent = 
            `Режим: ${this.currentMode === this.modes.WALK ? 'ХОДЬБА' : 'ПОЛЕТ'}`;
    }
    
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 5);
        this.scene.add(directionalLight);
    }
    
    setupHotbar() {
        const hotbar = document.getElementById('hotbar');
        hotbar.innerHTML = '';
        
        const types = Object.values(this.blockTypes);
        
        types.forEach((blockType, index) => {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            slot.dataset.blockId = blockType.id;
            
            const preview = document.createElement('div');
            preview.className = 'block-preview';
            preview.style.backgroundColor = `#${blockType.color.toString(16).padStart(6, '0')}`;
            preview.title = blockType.name;
            
            const number = document.createElement('div');
            number.style.position = 'absolute';
            number.style.bottom = '2px';
            number.style.right = '2px';
            number.style.fontSize = '12px';
            number.textContent = index + 1;
            
            slot.appendChild(preview);
            slot.appendChild(number);
            hotbar.appendChild(slot);
            
            this.hotbarSlots.push(slot);
            
            if (blockType.id === this.currentBlockType.id) {
                slot.classList.add('active');
            }
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
    
    generateWorld() {
        // Создаем землю
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x2d6a4f });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1;
        this.scene.add(ground);
        
        // Генерируем разнообразный ландшафт
        this.generateTerrain(12, 12);
        
        // Добавляем демонстрационные структуры
        this.generateDemoStructures();
    }
    
    generateTerrain(width, depth) {
        for (let x = -width; x < width; x++) {
            for (let z = -depth; z < depth; z++) {
                // Базовый слой - камень
                this.createBlock(x, 0, z, this.blockTypes.STONE);
                
                // Верхний слой - разный в зависимости от позиции
                let surfaceType = this.blockTypes.GRASS;
                const distance = Math.sqrt(x*x + z*z);
                
                if (distance < 5) {
                    this.createBlock(x, 1, z, this.blockTypes.GRASS);
                    // Добавляем холмы
                    const height = Math.max(0, Math.round(Math.sin(x * 0.3) * Math.cos(z * 0.3) * 2));
                    for (let y = 2; y <= height + 1; y++) {
                        this.createBlock(x, y, z, this.blockTypes.GRASS);
                    }
                } else if (distance < 8) {
                    this.createBlock(x, 1, z, this.blockTypes.SAND);
                } else {
                    this.createBlock(x, 1, z, this.blockTypes.STONE);
                }
                
                // Случайные деревья
                if (Math.random() < 0.05 && distance < 6) {
                    this.generateTree(x, 2, z);
                }
            }
        }
    }
    
    generateTree(x, y, z) {
        // Ствол дерева (3-4 блока в высоту)
        const trunkHeight = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < trunkHeight; i++) {
            this.createBlock(x, y + i, z, this.blockTypes.WOOD);
        }
        
        // Листва
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                for (let dy = 0; dy < 3; dy++) {
                    if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy) < 4) {
                        if (dx === 0 && dz === 0 && dy < 2) continue;
                        this.createBlock(x + dx, y + trunkHeight - 1 + dy, z + dz, this.blockTypes.GRASS);
                    }
                }
            }
        }
    }
    
    generateDemoStructures() {
        // Пирамида из песка
        for (let level = 0; level < 5; level++) {
            const size = 5 - level;
            for (let x = -size; x <= size; x++) {
                for (let z = -size; z <= size; z++) {
                    if (Math.abs(x) === size || Math.abs(z) === size) {
                        this.createBlock(x + 15, level + 1, z, this.blockTypes.SAND);
                    }
                }
            }
        }
        
        // Водоем
        for (let x = -3; x <= 3; x++) {
            for (let z = -3; z <= 3; z++) {
                this.createBlock(x - 15, 0, z, this.blockTypes.WATER);
            }
        }
    }
    
    createBlock(x, y, z, blockType = this.currentBlockType) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = this.materials.normal[blockType.id];
        const block = new THREE.Mesh(geometry, material);
        block.position.set(x, y, z);
        
        block.userData = {
            type: 'block',
            blockType: blockType,
            position: { x, y, z },
            solid: blockType.solid
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
            return true;
        }
        return false;
    }
    
    setupGhostBlock() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        this.ghostBlock = new THREE.Mesh(geometry, this.materials.ghost);
        this.ghostBlock.material.color.set(this.currentBlockType.color);
        this.scene.add(this.ghostBlock);
        this.ghostBlock.visible = false;
    }
    
    checkCollision(position) {
        // Проверяем коллизии со всеми твердыми блоками
        const playerMin = new THREE.Vector3(
            position.x - this.player.radius,
            position.y,
            position.z - this.player.radius
        );
        const playerMax = new THREE.Vector3(
            position.x + this.player.radius,
            position.y + this.player.height,
            position.z + this.player.radius
        );
        
        for (const [key, block] of this.blocks) {
            if (!block.userData.solid) continue;
            
            const blockMin = new THREE.Vector3(
                block.position.x - 0.5,
                block.position.y - 0.5,
                block.position.z - 0.5
            );
            const blockMax = new THREE.Vector3(
                block.position.x + 0.5,
                block.position.y + 0.5,
                block.position.z + 0.5
            );
            
            // AABB коллизия
            if (playerMax.x > blockMin.x && playerMin.x < blockMax.x &&
                playerMax.y > blockMin.y && playerMin.y < blockMax.y &&
                playerMax.z > blockMin.z && playerMin.z < blockMax.z) {
                return true;
            }
        }
        return false;
    }
    
    updatePhysics(deltaTime) {
        // Применяем гравитацию в режиме ходьбы
        if (this.currentMode === this.modes.WALK) {
            this.player.velocity.y += this.physics.gravity * deltaTime;
        } else {
            // В режиме полета нет гравитации
            this.player.velocity.y = 0;
        }
        
        // Движение по горизонтали
        const moveDirection = new THREE.Vector3(0, 0, 0);
        
        if (this.keys['KeyW']) moveDirection.z -= 1;
        if (this.keys['KeyS']) moveDirection.z += 1;
        if (this.keys['KeyA']) moveDirection.x -= 1;
        if (this.keys['KeyD']) moveDirection.x += 1;
        
        // Нормализуем вектор движения
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
            
            // Преобразуем направление относительно камеры
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            cameraDirection.y = 0;
            cameraDirection.normalize();
            
            const right = new THREE.Vector3();
            right.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
            
            const worldMoveDirection = new THREE.Vector3();
            worldMoveDirection.addScaledVector(cameraDirection, moveDirection.z);
            worldMoveDirection.addScaledVector(right, moveDirection.x);
            
            const speed = this.currentMode === this.modes.WALK ? this.physics.walkSpeed : this.physics.flySpeed;
            const control = this.player.onGround ? 1 : this.physics.airControl;
            
            this.player.velocity.x = worldMoveDirection.x * speed * control;
            this.player.velocity.z = worldMoveDirection.z * speed * control;
        } else {
            // Трение при отсутствии движения
            this.player.velocity.x *= this.physics.friction;
            this.player.velocity.z *= this.physics.friction;
        }
        
        // Вертикальное движение в режиме полета
        if (this.currentMode === this.modes.FLY) {
            if (this.keys['Space']) this.player.velocity.y = this.physics.flySpeed;
            if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) this.player.velocity.y = -this.physics.flySpeed;
        }
        
        // Прыжок в режиме ходьбы
        if (this.currentMode === this.modes.WALK && this.keys['Space'] && this.player.onGround) {
            this.player.velocity.y = this.physics.jumpForce;
            this.player.onGround = false;
        }
        
        // Обновляем позицию
        const newPosition = this.player.position.clone();
        newPosition.addScaledVector(this.player.velocity, deltaTime);
        
        // Проверяем коллизии по Y (вертикаль)
        const tempPos = newPosition.clone();
        if (this.checkCollision(tempPos)) {
            // Коллизия по Y - останавливаем вертикальное движение
            this.player.velocity.y = 0;
            this.player.onGround = true;
            // Находим правильную позицию по Y
            for (let y = 0; y <= 2; y += 0.1) {
                tempPos.y = this.player.position.y - y;
                if (!this.checkCollision(tempPos)) {
                    newPosition.y = tempPos.y;
                    this.player.onGround = y > 0;
                    break;
                }
            }
        } else {
            this.player.onGround = false;
        }
        
        // Проверяем коллизии по X и Z
        tempPos.copy(newPosition);
        if (this.checkCollision(tempPos)) {
            // Коллизия по X/Z - останавливаем горизонтальное движение
            this.player.velocity.x = 0;
            this.player.velocity.z = 0;
            newPosition.copy(this.player.position);
        }
        
        this.player.position.copy(newPosition);
        
        // Обновляем позицию камеры
        this.camera.position.copy(this.player.position);
        this.camera.position.y += 0.5; // Смещение камеры на уровень глаз
    }
    
    setupControls() {
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            
            if (event.code >= 'Digit1' && event.code <= 'Digit5') {
                const slotIndex = parseInt(event.code[5]) - 1;
                const blockTypes = Object.values(this.blockTypes);
                if (blockTypes[slotIndex]) {
                    this.selectBlockType(blockTypes[slotIndex]);
                }
            }
            
            // Переключение режима полета/ходьбы
            if (event.code === 'KeyF') {
                this.toggleMode();
            }
        });
        
        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });
        
        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement === this.renderer.domElement) {
                this.mouse.x = event.movementX;
                this.mouse.y = event.movementY;
            }
        });
        
        document.addEventListener('mousedown', (event) => {
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
        
        this.renderer.domElement.addEventListener('click', () => {
            this.renderer.domElement.requestPointerLock();
        });
    }
    
    handleBlockSelection() {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersectObjects = Array.from(this.blocks.values());
        const intersects = this.raycaster.intersectObjects(intersectObjects);
        
        if (this.selectedBlock) {
            const blockType = this.selectedBlock.userData.blockType;
            this.selectedBlock.material = this.materials.normal[blockType.id];
            this.selectedBlock = null;
        }
        
        this.ghostBlock.visible = false;
        this.placePosition = null;
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            this.selectedBlock = intersect.object;
            this.selectedBlock.material = this.materials.selected;
            
            const normal = intersect.face.normal;
            this.placePosition = {
                x: Math.round(intersect.point.x + normal.x * 0.5),
                y: Math.round(intersect.point.y + normal.y * 0.5),
                z: Math.round(intersect.point.z + normal.z * 0.5)
            };
            
            if (!this.isBlockAt(this.placePosition.x, this.placePosition.y, this.placePosition.z)) {
                this.ghostBlock.position.set(
                    this.placePosition.x,
                    this.placePosition.y,
                    this.placePosition.z
                );
                this.ghostBlock.visible = true;
            }
            
            if (this.mouse.right) {
                const pos = this.selectedBlock.userData.position;
                this.removeBlock(pos.x, pos.y, pos.z);
                this.mouse.right = false;
            } else if (this.mouse.left && this.placePosition) {
                if (!this.isBlockAt(this.placePosition.x, this.placePosition.y, this.placePosition.z)) {
                    this.createBlock(
                        this.placePosition.x,
                        this.placePosition.y,
                        this.placePosition.z,
                        this.currentBlockType
                    );
                    this.mouse.left = false;
                }
            }
        }
    }
    
    isBlockAt(x, y, z) {
        const key = `${x},${y},${z}`;
        return this.blocks.has(key);
    }
    
    handleInput(deltaTime) {
        const rotationSpeed = 0.002;
        
        if (document.pointerLockElement === this.renderer.domElement) {
            this.cameraRotation.x -= this.mouse.y * rotationSpeed;
            this.cameraRotation.y -= this.mouse.x * rotationSpeed;
            
            this.cameraRotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.cameraRotation.x));
            
            this.camera.rotation.x = this.cameraRotation.x;
            this.camera.rotation.y = this.cameraRotation.y;
        }
        
        this.mouse.x = 0;
        this.mouse.y = 0;
    }
    
    updateDebugInfo() {
        document.getElementById('position').textContent = 
            `${this.player.position.x.toFixed(1)}, ${this.player.position.y.toFixed(1)}, ${this.player.position.z.toFixed(1)}`;
        document.getElementById('velocity').textContent = 
            `${this.player.velocity.x.toFixed(1)}, ${this.player.velocity.y.toFixed(1)}, ${this.player.velocity.z.toFixed(1)}`;
        document.getElementById('grounded').textContent = this.player.onGround ? 'да' : 'нет';
    }
    
    animate() {
        const clock = new THREE.Clock();
        
        const gameLoop = () => {
            const deltaTime = Math.min(clock.getDelta(), 0.1); // Ограничиваем deltaTime
            
            this.handleInput(deltaTime);
            this.updatePhysics(deltaTime);
            this.handleBlockSelection();
            this.updateDebugInfo();
            
            this.renderer.render(this.scene, this.camera);
            requestAnimationFrame(gameLoop);
        };
        
        gameLoop();
    }
}

window.addEventListener('load', () => {
    new BloxdGame();
});

window.addEventListener('resize', () => {
    // TODO: Добавить обработку ресайза
});
