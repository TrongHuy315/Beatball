const Matter = require('matter-js');
const CONFIG = require('./config.js');

class Wall {
    constructor(world) {
        this.world = world;
        this.createWalls();
    }

    createRectangle(x, y, width, height, direction = null, isNet = false) {
        const { Bodies, World } = Matter;
        const wallOptions = {
            label: isNet ? 'netEdge' : 'wall',
            isStatic: true,
            restitution: CONFIG.wall.bounciness,
            friction: CONFIG.wall.friction,
            density: 1000,
            slop: CONFIG.wall.slop
        };

        const wall = Bodies.rectangle(x, y, width, height, wallOptions);
        World.add(this.world, wall);

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
        const { pitch, nets, totalWidth, totalHeight } = CONFIG;

        // Top wall
        this.createRectangle(
            totalWidth / 2,
            pitch.borderWidth / 2,
            pitch.width + pitch.borderWidth * 2,
            pitch.borderWidth
        );

        // Bottom wall
        this.createRectangle(
            totalWidth / 2,
            totalHeight - pitch.borderWidth / 2,
            pitch.width + pitch.borderWidth * 2,
            pitch.borderWidth
        );

        const side_wall_length = (totalHeight - nets.height) / 2;

        // Left-up wall
        this.createRectangle(
            nets.borderWidth + nets.width + pitch.borderWidth / 2,
            side_wall_length / 2,
            pitch.borderWidth,
            side_wall_length,
            'L'
        );

        // Left-down wall
        this.createRectangle(
            nets.borderWidth + nets.width + pitch.borderWidth / 2,
            totalHeight - side_wall_length / 2,
            pitch.borderWidth,
            side_wall_length,
            'L'
        );

        // Right-up wall
        this.createRectangle(
            nets.borderWidth + nets.width + pitch.borderWidth / 2 + pitch.width + pitch.borderWidth,
            side_wall_length / 2,
            pitch.borderWidth,
            side_wall_length,
            'R'
        );

        // Right-down wall
        this.createRectangle(
            nets.borderWidth + nets.width + pitch.borderWidth / 2 + pitch.width + pitch.borderWidth,
            totalHeight - side_wall_length / 2,
            pitch.borderWidth,
            side_wall_length,
            'R'
        );

        // Left net walls
        this.createRectangle(
            nets.borderWidth / 2,
            totalHeight / 2,
            nets.borderWidth,
            nets.height + nets.borderWidth * 2,
            'L',
            true
        );

        this.createRectangle(
            nets.borderWidth + nets.width / 2,
            side_wall_length - nets.borderWidth / 2,
            nets.width + nets.borderWidth + pitch.borderWidth,
            nets.borderWidth,
            'U',
            true
        );

        this.createRectangle(
            nets.borderWidth + nets.width / 2,
            side_wall_length + nets.height + nets.borderWidth / 2,
            nets.width + nets.borderWidth + pitch.borderWidth,
            nets.borderWidth,
            'D',
            true
        );

        // Right net walls
        this.createRectangle(
            totalWidth - nets.borderWidth / 2,
            totalHeight / 2,
            nets.borderWidth,
            nets.height + nets.borderWidth * 2,
            'R',
            true
        );

        this.createRectangle(
            totalWidth - nets.borderWidth - nets.width / 2,
            side_wall_length - nets.borderWidth / 2,
            nets.width + nets.borderWidth + pitch.borderWidth,
            nets.borderWidth,
            'U',
            true
        );

        this.createRectangle(
            totalWidth - nets.borderWidth - nets.width / 2,
            side_wall_length + nets.height + nets.borderWidth / 2,
            nets.width + nets.borderWidth + pitch.borderWidth,
            nets.borderWidth,
            'D',
            true
        );

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