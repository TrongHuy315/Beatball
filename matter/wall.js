const Matter = require('matter-js');
const CONFIG = require('./config.js');

class Wall {
    constructor(world) {
        this.world = world;
        this.createWalls();
    }
    createRectangle(push, x, y, width, height, direction = null, isInner) {
        const categories = {
            outer: 0x0001,  // 00001
            inner: 0x0002,  // 00010
            player: 0x0004, // 00100
            ball: 0x0008,   // 01000
            net: 0x00016    // 10000
        }; 
        const { Bodies, World } = Matter;
        const wallOptions = {
            label: 'wall', 
            isStatic: true,
            restitution: CONFIG.wall.bounciness,
            friction: 0,
            density: 1000,
            slop: CONFIG.wall.slop,
            customType: push, // Thêm thuộc tính push
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

        // Top wall - đẩy xuống
        this.createRectangle(
            'D',
            totalWidth / 2,
            pitch.borderWidth / 2 + offset_vertical,
            pitch.width + pitch.borderWidth * 2,
            pitch.borderWidth, 
            'U', 
            true
        );

        // Bottom wall - đẩy lên
        this.createRectangle(
            'U',
            totalWidth / 2,
            totalHeight - pitch.borderWidth / 2 - offset_vertical,
            pitch.width + pitch.borderWidth * 2,
            pitch.borderWidth,
            'D', 
            true
        );

        const side_wall_length = (pitch.height + pitch.borderWidth * 2 - nets.height) / 2;

        // Left-up wall - đẩy sang phải
        this.createRectangle(
            'R',
            nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal,
            side_wall_length / 2 + offset_vertical, 
            pitch.borderWidth,
            side_wall_length,
            'L', 
            true
        );

        // Left-down wall - đẩy sang phải
        this.createRectangle(
            'R',
            nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal,
            totalHeight - side_wall_length / 2 - offset_vertical,
            pitch.borderWidth,
            side_wall_length,
            'L', 
            true
        );

        // Right-up wall - đẩy sang trái
        this.createRectangle(
            'L',
            totalWidth - (nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal), 
            side_wall_length / 2 + offset_vertical, 
            pitch.borderWidth,
            side_wall_length,
            'L',
            true 
        );

        // Right-down wall - đẩy sang trái
        this.createRectangle(
            'L',
            totalWidth - (nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal), 
            totalHeight - side_wall_length / 2 - offset_vertical,
            pitch.borderWidth,
            side_wall_length,
            'L',
            true 
        );

        // Left net - left wall - đẩy sang phải
        this.createRectangle(
            'R',
            nets.borderWidth / 2 + offset_horizontal,
            totalHeight / 2,
            nets.borderWidth,
            nets.height + nets.borderWidth * 2, 
            'L', 
            false
        );

        // Right net - right wall - đẩy sang trái
        this.createRectangle(
            'L',
            totalWidth - nets.borderWidth / 2 - offset_horizontal,
            totalHeight / 2,
            nets.borderWidth,
            nets.height + nets.borderWidth * 2, 
            'R', 
            false
        );

        // Left net - up wall - đẩy xuống
        this.createRectangle(
            'D',
            nets.borderWidth + nets.width / 2 + offset_horizontal,
            side_wall_length - nets.borderWidth / 2 + offset_vertical,
            nets.width + nets.borderWidth + pitch.borderWidth,
            nets.borderWidth,
            'U', 
            false
        );

        // Left net - down wall - đẩy lên
        this.createRectangle(
            'U',
            nets.borderWidth + nets.width / 2 + offset_horizontal,
            totalHeight - (side_wall_length - nets.borderWidth / 2 + offset_vertical),
            nets.width + nets.borderWidth + pitch.borderWidth,
            nets.borderWidth,
            'D', 
            false
        );

        // Right net - up wall - đẩy xuống
        this.createRectangle(
            'D',
            totalWidth - nets.borderWidth - nets.width / 2 - offset_horizontal, 
            side_wall_length - nets.borderWidth / 2 + offset_vertical,
            nets.width + nets.borderWidth + pitch.borderWidth,
            nets.borderWidth,
            'U', 
            false
        );

        // Right net - down wall - đẩy lên
        this.createRectangle(
            'U',
            totalWidth - nets.borderWidth - nets.width / 2 - offset_horizontal,
            totalHeight - (side_wall_length - nets.borderWidth / 2 + offset_vertical),
            nets.width + nets.borderWidth + pitch.borderWidth,
            nets.borderWidth,
            'D', 
            false
        );

        // Các tường biên ngoài
        this.createRectangle('D', totalWidth / 2, 0, totalWidth, 2); // Top
        this.createRectangle('U', totalWidth / 2, totalHeight, totalWidth, 2); // Bottom
        this.createRectangle('R', 0, totalHeight / 2, 2, totalHeight); // Left
        this.createRectangle('L', totalWidth, totalHeight / 2, 2, totalHeight); // Right

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