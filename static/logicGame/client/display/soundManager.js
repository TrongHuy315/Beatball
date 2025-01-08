// static/logicGame/client/display/soundManager.js
export class SoundManager {
    constructor(scene) {
        this.scene = scene;
        this.sounds = {
            kick: [],
            endGame: null
        };
        this.isEndGameSoundPlaying = false;
    }

    preload() {
        // Load end game sound
        this.scene.load.audio('endGameSound', 'static/logicGame/client/sound/endGameSound/endGameSound1.mp3');
        
        // Load kick sounds
        this.scene.load.audio('kick1', 'static/logicGame/client/sound/normalKickSound/normalKick1.mp3');

        // Add more sounds as needed
        
        // Set up load handlers
        this.scene.load.on('filecomplete', (key, type, data) => {
            console.log('Successfully loaded:', key, type);
        });
    
        this.scene.load.on('loaderror', (file) => {
            console.error('Error loading file:', file.key);
            console.error('File URL:', file.url);
        });
    }

    create() {
        // Initialize end game sound
        this.sounds.endGame = this.scene.sound.add('endGameSound', {
            volume: 1,
            loop: true
        });

        // Initialize kick sounds array
        this.sounds.kick.push(this.scene.sound.add('kick1'));
        // Add more kick sounds as needed
    }

    playKickSound(soundType) {
        if (this.sounds.kick[soundType - 1]) {
            console.log("Sound being played");
            this.sounds.kick[soundType - 1].play();
        }
    }

    playEndGameSound() {
        if (!this.isEndGameSoundPlaying && this.sounds.endGame) {
            this.sounds.endGame.play();
            this.isEndGameSoundPlaying = true;
        }
    }

    stopEndGameSound() {
        if (this.sounds.endGame && this.isEndGameSoundPlaying) {
            this.sounds.endGame.stop();
            this.isEndGameSoundPlaying = false;
        }
    }

    // Phương thức để thêm sound mới vào danh sách
    addKickSound(sound) {
        this.sounds.kick.push(sound);
    }

    // Phương thức để get sound theo index
    getKickSound(index) {
        return this.sounds.kick[index];
    }
}