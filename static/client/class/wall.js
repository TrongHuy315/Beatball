function createWalls(scene) {
    const {offset_horizontal, offset_vertical, pitch, nets, totalWidth, totalHeight, borderWidth, wall } = CONFIG;
    
    function createRectangle(x, y, width, height, direction = null, isInner = false) {
        const {nets} = CONFIG; 
        direction = null; 
        const wallOptions = {
            isStatic: true,
            restitution: wall.bounciness,
            friction: 0,
            density: 1000, 
            timeScale: 1, 
            label: 'wall', 
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
    // Top wall
    createRectangle(
        totalWidth / 2,
        pitch.borderWidth / 2 + offset_vertical,
        pitch.width + pitch.borderWidth * 2,
        pitch.borderWidth, 
        'U', 
        true
    );

    // Bottom wall
    createRectangle(
        totalWidth / 2,
        totalHeight - pitch.borderWidth / 2 - offset_vertical,
        pitch.width + pitch.borderWidth * 2,
        pitch.borderWidth,
        'D', 
        true
    );

    const side_wall_length = (pitch.height + pitch.borderWidth * 2 - nets.height) / 2;

    // Left-up wall
    createRectangle(
        nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal,
        side_wall_length / 2 + offset_vertical, 
        pitch.borderWidth,
        side_wall_length,
        'L', 
        true
    );

    // Left-down wall
    createRectangle(
        nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal,
        totalHeight - side_wall_length / 2 - offset_vertical,
        pitch.borderWidth,
        side_wall_length,
        'L', 
        true
    );
    // Right-up wall
    createRectangle(
        totalWidth - (nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal), 
        side_wall_length / 2 + offset_vertical, 
        pitch.borderWidth,
        side_wall_length,
        'L',
        true 
    );
    // Right-down wall
    createRectangle(
        totalWidth - (nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal), 
        totalHeight - side_wall_length / 2 - offset_vertical,
        pitch.borderWidth,
        side_wall_length,
        'L',
        true 
    );
    // Left net - left wall
    createRectangle(
        nets.borderWidth / 2 + offset_horizontal,
        totalHeight / 2,
        nets.borderWidth,
        nets.height + nets.borderWidth * 2, 'L', false
    );

    // Right net - right wall
    createRectangle(
        totalWidth - nets.borderWidth / 2 - offset_horizontal,
        totalHeight / 2,
        nets.borderWidth,
        nets.height + nets.borderWidth * 2, 'R', false
    );

    // Left net - up wall
    createRectangle(
        nets.borderWidth + nets.width / 2 + offset_horizontal,
        side_wall_length - nets.borderWidth / 2 + offset_vertical,
        nets.width + nets.borderWidth + pitch.borderWidth,
        nets.borderWidth,
        'U', false
    );

    // Left net - down wall
    createRectangle(
        nets.borderWidth + nets.width / 2 + offset_horizontal,
        totalHeight - (side_wall_length - nets.borderWidth / 2 + offset_vertical),
        nets.width + nets.borderWidth + pitch.borderWidth,
        nets.borderWidth,
        'D', false
    );

    // Right net - up wall
    createRectangle(
        totalWidth - nets.borderWidth - nets.width / 2 - offset_horizontal, 
        side_wall_length - nets.borderWidth / 2 + offset_vertical,
        nets.width + nets.borderWidth + pitch.borderWidth,
        nets.borderWidth,
        'U', false
    );

    // Right net - down wall
    createRectangle(
        totalWidth - nets.borderWidth - nets.width / 2 - offset_horizontal,
        totalHeight - (side_wall_length - nets.borderWidth / 2 + offset_vertical),
        nets.width + nets.borderWidth + pitch.borderWidth,
        nets.borderWidth,
        'D', false
    );
    createRectangle(totalWidth / 2, 0, totalWidth, 2); 
    createRectangle(totalWidth / 2, totalHeight, totalWidth, 2); 
    createRectangle(0, totalHeight / 2, 2, totalHeight);
    createRectangle(totalWidth, totalHeight / 2, 2, totalHeight); 
    // scene.matter.add.rectangle(
    //     CONFIG.nets.borderWidth + CONFIG.nets.width / 2,
    //     CONFIG.totalHeight / 2,
    //     CONFIG.nets.width,
    //     CONFIG.nets.height,
    //     {
    //         isSensor: true,
    //         isStatic: true,
    //         label: 'leftNet',
    //     }
    // );
    // scene.matter.add.rectangle(
    //     CONFIG.totalWidth - CONFIG.nets.borderWidth - CONFIG.nets.width / 2,
    //     CONFIG.totalHeight / 2,
    //     CONFIG.nets.width,
    //     CONFIG.nets.height,
    //     {
    //         isSensor: true,
    //         isStatic: true,
    //         label: 'rightNet',
    //     }
    // );
}