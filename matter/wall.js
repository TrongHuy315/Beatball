const Matter = require('matter-js');
const CONFIG = require('./config.js');

class Wall {
    constructor(world) {
        this.world = world;
        this.createWalls();
    }
    createRectangle(x, y, width, height, direction = null, isInner) {
        const categories = {
            outer: 0x0001,  // 00001
            inner: 0x0002,  // 00010
            player: 0x0004, // 00100
            ball: 0x0008,   // 01000
            net: 0x00016    // 10000
        }; 
        const { Bodies, World } = Matter;
        const wallOptions = {
            isStatic: true,
            restitution: CONFIG.wall.bounciness,
            friction: CONFIG.wall.friction,
            density: 1000,
            slop: CONFIG.wall.slop, 
            collisionFilter: {
                category: isInner ? categories.inner : categories.outer,
                mask: isInner ? ~categories.player : 0xFFFFFFFF
            }
        };

        const wall = Bodies.rectangle(x, y, width, height, wallOptions);
        World.add(this.world, wall);
        direction = null; 
        if (!direction) return;

        let offsetX = 0, offsetY = 0;
        if (direction === 'U') offsetY = -CONFIG.wall.wall_distance;
        else if (direction === 'D') offsetY = CONFIG.wall.wall_distance;
        else if (direction === 'R') offsetX = CONFIG.wall.wall_distance;
        else if (direction === 'L') offsetX = -CONFIG.wall.wall_distance;

        for (let i = 0; i < CONFIG.wall.wall_thickness - 1; i++) {
            x += offsetX;
            y += offsetY;
            const additionalWall = Bodies.rectangle(x, y, width, height, wallOptions);
            World.add(this.world, additionalWall);
        }
    }

    createWalls() {
        const { Bodies, World } = Matter;
        const { pitch, nets, totalWidth, totalHeight, offset_vertical, offset_horizontal} = CONFIG;

            // Top wall
        this.createRectangle(
            totalWidth / 2,
            pitch.borderWidth / 2 + offset_vertical,
            pitch.width + pitch.borderWidth * 2,
            pitch.borderWidth, 
            'U', 
            true
        );

        // Bottom wall
        this.createRectangle(
            totalWidth / 2,
            totalHeight - pitch.borderWidth / 2 - offset_vertical,
            pitch.width + pitch.borderWidth * 2,
            pitch.borderWidth,
            'D', 
            true
        );

        const side_wall_length = (pitch.height + pitch.borderWidth * 2 - nets.height) / 2;

        // Left-up wall
        this.createRectangle(
            nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal,
            side_wall_length / 2 + offset_vertical, 
            pitch.borderWidth,
            side_wall_length,
            'L', 
            true
        );

        // Left-down wall
        this.createRectangle(
            nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal,
            totalHeight - side_wall_length / 2 - offset_vertical,
            pitch.borderWidth,
            side_wall_length,
            'L', 
            true
        );
        // Right-up wall
        this.createRectangle(
            totalWidth - (nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal), 
            side_wall_length / 2 + offset_vertical, 
            pitch.borderWidth,
            side_wall_length,
            'L',
            true 
        );
        // Right-down wall
        this.createRectangle(
            totalWidth - (nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal), 
            totalHeight - side_wall_length / 2 - offset_vertical,
            pitch.borderWidth,
            side_wall_length,
            'L',
            true 
        );
        // Left net - left wall
        this.createRectangle(
            nets.borderWidth / 2 + offset_horizontal,
            totalHeight / 2,
            nets.borderWidth,
            nets.height + nets.borderWidth * 2, 'L', false
        );

        // Right net - right wall
        this.createRectangle(
            totalWidth - nets.borderWidth / 2 - offset_horizontal,
            totalHeight / 2,
            nets.borderWidth,
            nets.height + nets.borderWidth * 2, 'R', false
        );

        // Left net - up wall
        this.createRectangle(
            nets.borderWidth + nets.width / 2 + offset_horizontal,
            side_wall_length - nets.borderWidth / 2 + offset_vertical,
            nets.width + nets.borderWidth + pitch.borderWidth,
            nets.borderWidth,
            'U', false
        );

        // Left net - down wall
        this.createRectangle(
            nets.borderWidth + nets.width / 2 + offset_horizontal,
            totalHeight - (side_wall_length - nets.borderWidth / 2 + offset_vertical),
            nets.width + nets.borderWidth + pitch.borderWidth,
            nets.borderWidth,
            'D', false
        );

        // Right net - up wall
        this.createRectangle(
            totalWidth - nets.borderWidth - nets.width / 2 - offset_horizontal, 
            side_wall_length - nets.borderWidth / 2 + offset_vertical,
            nets.width + nets.borderWidth + pitch.borderWidth,
            nets.borderWidth,
            'U', false
        );

        // Right net - down wall
        this.createRectangle(
            totalWidth - nets.borderWidth - nets.width / 2 - offset_horizontal,
            totalHeight - (side_wall_length - nets.borderWidth / 2 + offset_vertical),
            nets.width + nets.borderWidth + pitch.borderWidth,
            nets.borderWidth,
            'D', false
        );
        this.createRectangle(totalWidth / 2, 0, totalWidth, 2); 
        this.createRectangle(totalWidth / 2, totalHeight, totalWidth, 2); 
        this.createRectangle(0, totalHeight / 2, 2, totalHeight);
        this.createRectangle(totalWidth, totalHeight / 2, 2, totalHeight); 
        // Net sensors
        const leftNet = Bodies.rectangle(
            CONFIG.nets.borderWidth + CONFIG.nets.width / 2,
            CONFIG.totalHeight / 2,
            CONFIG.nets.width,
            CONFIG.nets.height,
            {
                isSensor: true,
                isStatic: true,
                label: 'leftNet'
            }
        );

        const rightNet = Bodies.rectangle(
            CONFIG.totalWidth - CONFIG.nets.borderWidth - CONFIG.nets.width / 2,
            CONFIG.totalHeight / 2,
            CONFIG.nets.width,
            CONFIG.nets.height,
            {
                isSensor: true,
                isStatic: true,
                label: 'rightNet'
            }
        );

        World.add(this.world, [leftNet, rightNet]);
    }
}

module.exports = Wall;