function createWalls(scene) {
    const {offset_horizontal, offset_vertical, pitch, nets, totalWidth, totalHeight, borderWidth, wall } = CONFIG;
    
    function createRectangle(push, x, y, width, height, direction = null, isInner = false) {
        const {nets} = CONFIG; 
        direction = null; 
        const wallOptions = {
            isStatic: true,
            restitution: wall.bounciness,
            friction: 0,
            density: 1000, 
            timeScale: 1, 
            label: 'wall',
            customType: push, // Thêm hướng đẩy
            net: false, 
            slop: wall.slop, 
            collideWorldBounds: false, 
            collisionFilter: {
                category: isInner ? scene.categories.inner : scene.categories.outer,
                mask: isInner ? ~scene.categories.player : 0xFFFFFFFF
            }
        };
        scene.matter.add.rectangle(x, y, width, height, wallOptions);
        direction = null; 
        if (!direction) return;
        
        let offsetX = 0, offsetY = 0;
        if (direction === 'U') offsetY = -wall.wall_distance;
        else if (direction === 'D') offsetY = wall.wall_distance;
        else if (direction === 'R') offsetX = wall.wall_distance;
        else if (direction === 'L') offsetX = -wall.wall_distance;

        for (let i = 0; i < wall.wall_thickness - 1; i++) {
            x += offsetX;
            y += offsetY;
            scene.matter.add.rectangle(x, y, width, height, wallOptions);
        }
    }

    // Top wall - đẩy xuống
    createRectangle(
        'D',
        totalWidth / 2,
        pitch.borderWidth / 2 + offset_vertical,
        pitch.width + pitch.borderWidth * 2,
        pitch.borderWidth, 
        'U', 
        true
    );

    // Bottom wall - đẩy lên
    createRectangle(
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
    createRectangle(
        'R',
        nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal,
        side_wall_length / 2 + offset_vertical, 
        pitch.borderWidth,
        side_wall_length,
        'L', 
        true
    );

    // Left-down wall - đẩy sang phải
    createRectangle(
        'R',
        nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal,
        totalHeight - side_wall_length / 2 - offset_vertical,
        pitch.borderWidth,
        side_wall_length,
        'L', 
        true
    );

    // Right-up wall - đẩy sang trái
    createRectangle(
        'L',
        totalWidth - (nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal), 
        side_wall_length / 2 + offset_vertical, 
        pitch.borderWidth,
        side_wall_length,
        'L',
        true 
    );

    // Right-down wall - đẩy sang trái
    createRectangle(
        'L',
        totalWidth - (nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal), 
        totalHeight - side_wall_length / 2 - offset_vertical,
        pitch.borderWidth,
        side_wall_length,
        'L',
        true 
    );

    // Left net - left wall - đẩy sang phải
    createRectangle(
        'R',
        nets.borderWidth / 2 + offset_horizontal,
        totalHeight / 2,
        nets.borderWidth,
        nets.height + nets.borderWidth * 2, 
        'L', 
        false
    );

    // Right net - right wall - đẩy sang trái
    createRectangle(
        'L',
        totalWidth - nets.borderWidth / 2 - offset_horizontal,
        totalHeight / 2,
        nets.borderWidth,
        nets.height + nets.borderWidth * 2, 
        'R', 
        false
    );

    // Left net - up wall - đẩy xuống
    createRectangle(
        'D',
        nets.borderWidth + nets.width / 2 + offset_horizontal,
        side_wall_length - nets.borderWidth / 2 + offset_vertical,
        nets.width + nets.borderWidth + pitch.borderWidth,
        nets.borderWidth,
        'U', 
        false
    );

    // Left net - down wall - đẩy lên
    createRectangle(
        'U',
        nets.borderWidth + nets.width / 2 + offset_horizontal,
        totalHeight - (side_wall_length - nets.borderWidth / 2 + offset_vertical),
        nets.width + nets.borderWidth + pitch.borderWidth,
        nets.borderWidth,
        'D', 
        false
    );

    // Right net - up wall - đẩy xuống
    createRectangle(
        'D',
        totalWidth - nets.borderWidth - nets.width / 2 - offset_horizontal, 
        side_wall_length - nets.borderWidth / 2 + offset_vertical,
        nets.width + nets.borderWidth + pitch.borderWidth,
        nets.borderWidth,
        'U', 
        false
    );

    // Right net - down wall - đẩy lên
    createRectangle(
        'U',
        totalWidth - nets.borderWidth - nets.width / 2 - offset_horizontal,
        totalHeight - (side_wall_length - nets.borderWidth / 2 + offset_vertical),
        nets.width + nets.borderWidth + pitch.borderWidth,
        nets.borderWidth,
        'D', 
        false
    );

    // Tường biên - thêm hướng đẩy
    createRectangle('D', totalWidth / 2, 0, totalWidth, 2); // Top - đẩy xuống
    createRectangle('U', totalWidth / 2, totalHeight, totalWidth, 2); // Bottom - đẩy lên
    createRectangle('R', 0, totalHeight / 2, 2, totalHeight); // Left - đẩy sang phải
    createRectangle('L', totalWidth, totalHeight / 2, 2, totalHeight); // Right - đẩy sang trái

    // Left inner net sensor
    const leftInnerNet = scene.matter.add.rectangle(
        offset_horizontal + nets.borderWidth,
        totalHeight / 2,
        nets.borderWidth,
        nets.height,
        {
            isSensor: true,
            isStatic: true,
            label: 'leftInnerNet'
        }
    );

    // Right inner net sensor
    const rightInnerNet = scene.matter.add.rectangle(
        totalWidth - (offset_horizontal + nets.borderWidth),
        totalHeight / 2,
        nets.borderWidth,
        nets.height,
        {
            isSensor: true,
            isStatic: true,
            label: 'rightInnerNet'
        }
    );

    scene.matter.world.on('collisionstart', (event) => {
        event.pairs.forEach((pair) => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;

            if ((bodyA.label === 'leftInnerNet' || bodyA.label === 'rightInnerNet') &&
                (bodyB.label === 'ball' || bodyB.label === 'ball3')) {
                bodyB.gameObject.setVelocityX(bodyB.velocity.x * 0.1);
                bodyB.gameObject.setVelocityY(bodyB.velocity.y * 0.1);
            }

            if ((bodyB.label === 'leftInnerNet' || bodyB.label === 'rightInnerNet') &&
                (bodyA.label === 'ball' || bodyA.label === 'ball3')) {
                bodyA.gameObject.setVelocityX(bodyA.velocity.x * 0.1);
                bodyA.gameObject.setVelocityY(bodyA.velocity.y * 0.1);
            }
        });
    });
}