const configPhaser = {
    type: Phaser.AUTO,
    width: CONFIG.totalWidth, // Khớp với canvas.width = 1230
    height: CONFIG.totalHeight, // Khớp với canvas.height = 560
    backgroundColor: 0x000000, // Phaser canvas sẽ được làm trong suốt
    parent: 'player_container', // Đảm bảo ID này khớp với index.html
    transparent: true, // Đặt nền Phaser transparent để sân bóng hiển thị dưới
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 0 }, // Không có trọng lực cho góc nhìn trên cao
            debug: false, // Bật chế độ debug để xem các đối tượng vật lý
            setBounds: false, 
            enableSleeping: false, 
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(configPhaser);
let player; 
let ball; 
let scoreboard; 
celebrating = false; 
function resetGame(scene, countDown = CONFIG.gameConfig.resetGameCountDown, celebrate = true) {
    celebrating = celebrate; 
    return new Promise((resolve) => {
        // Tạo text hiển thị countdown
        const countDownText = scene.add.text(
            scene.scale.width / 2,
            scene.scale.height / 3,
            countDown.toString(),
            {
                fontSize: '64px',
                fontFamily: 'Arial',
                color: '#ffffff'
            }
        ).setOrigin(0.5);

        let timeLeft = countDown;

        const timerEvent = scene.time.addEvent({
            delay: 1000, 
            callback: () => {
                timeLeft--;
                
                if (timeLeft > 0) {
                    // Cập nhật text
                    countDownText.setText(timeLeft.toString());
                } else {
                    // Khi countdown kết thúc
                    countDownText.destroy();  // Xóa text
                    scene.matter.world.resume();  // Resume physics

                    // Đợi thêm 100ms để đảm bảo text đã biến mất
                    scene.time.delayedCall(100, () => {
                        // Reset các đối tượng sau khi countdown hoàn tất
                        ball.reset();
                        player.reset();
                        celebrating = false; 
                        // Hủy timer
                        timerEvent.destroy();
                        resolve(); // Hoàn thành Promise
                    });
                }
            },
            repeat: countDown - 1
        });
    });
}
function setUpScoreboard (scene) {
    scene.matter.world.on('collisionstart', (event) => {
        event.pairs.forEach((pair) => {
            if (celebrating) return; 
            if (pair.bodyA.label === 'ball' && pair.bodyB.label === 'rightNet') {
                scoreboard.updateScore('left', scoreboard.scores.right + 1);
                resetGame(scene); 
            }
            else if (pair.bodyA.label === 'ball' && pair.bodyB.label === 'leftNet') {
                scoreboard.updateScore('right', scoreboard.scores.left + 1);
                resetGame(scene); 
            }
            else if (pair.bodyA.label === 'rightNet' && pair.bodyB.label === 'ball') {
                scoreboard.updateScore('left', scoreboard.scores.right + 1);
                resetGame(scene);  
            }
            else if (pair.bodyA.label === 'leftNet' && pair.bodyB.label === 'ball') {
                scoreboard.updateScore('right', scoreboard.scores.left + 1);
                resetGame(scene);  
            }
        });
    });
    scoreboard.draw(); 
}
function setUpEvent (scene) {
    scene.matter.world.on('collisionstart', (event) => {
        event.pairs.forEach((pair) => {
            if (pair.bodyA.label === 'ball' && pair.bodyB.label === 'netEdge') {
                ball.damping = 0.84; 
            }
            else if (pair.bodyA.label === 'netEdge' && pair.bodyB.label === 'ball') {
                ball.damping = 0.84; 
            }
        });
    });
}
function preload() {
     scoreboard = new Scoreboard(); 
}

function create() {
    const {totalWidth, totalHeight} = CONFIG; 
    const {wall, nets, pitch} = CONFIG; 
    // ---- WALL ------
    createWalls(this);

    // ----- BALL -----
    ball = new Ball(this, CONFIG.ball); 

    // ---- PLAYER ---- 
    player = new PlayerController(this); 
    player.create(); 

    // ---- SCOREBOARD ---- 
    setUpScoreboard(this); 

    // ---- Event ----- 
    setUpEvent(this); 
    // ---- PHYSIC -----
    this.matter.world.setBounds(nets.borderWidth / 2, pitch.borderWidth / 2, totalWidth - nets.borderWidth, totalHeight - pitch.borderWidth);
    this.matter.world.engine.velocityIterations = 10;  
}
function update() {
    player.update(ball); 
}

