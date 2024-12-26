function createWalls(scene) {
    const {offset_horizontal, offset_vertical, pitch, nets, totalWidth, totalHeight, borderWidth, wall } = CONFIG;
    
    function create_rectangle(x, y, width, height, direction = null, isNet = false) {
        x = x + offset_horizontal; 
        y = y + offset_vertical; 
        const {nets} = CONFIG; 
        direction = null; 
        const wallOptions = {
            label: isNet ? 'netEdge' : 'wall', 
            isStatic: true,
            restitution: wall.bounciness,
            friction: wall.friction,
            density: 1000, 
            timeScale: 1, 
            net: false, 
            slop: wall.slop, 
            collideWorldBounds: false, 
        };
        scene.matter.add.rectangle(x, y, width, height, wallOptions);
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

    create_rectangle(0, 0, totalWidth, totalHeight); 
    // Top wall
    create_rectangle(
        totalWidth / 2,
        pitch.borderWidth / 2,
        pitch.width + pitch.borderWidth * 2,
        pitch.borderWidth
    );

    // Bottom wall  
    create_rectangle(
        totalWidth / 2,
        totalHeight - pitch.borderWidth / 2,
        pitch.width + pitch.borderWidth * 2,
        pitch.borderWidth
    );

    const side_wall_length = (totalHeight - nets.height) / 2;
    
    // Left-up wall
    create_rectangle(
        nets.borderWidth + nets.width + pitch.borderWidth / 2,
        side_wall_length / 2,
        pitch.borderWidth,
        side_wall_length,
        'L'
    );

    // Left-down wall
    create_rectangle(
        nets.borderWidth + nets.width + pitch.borderWidth / 2,
        totalHeight - side_wall_length / 2,
        pitch.borderWidth,
        side_wall_length,
        'L'
    );

    // Right-up wall
    create_rectangle(
        nets.borderWidth + nets.width + pitch.borderWidth / 2 + pitch.width + pitch.borderWidth,
        side_wall_length / 2,
        pitch.borderWidth,
        side_wall_length,
        'R'
    );

    // Right-down wall
    create_rectangle(
        nets.borderWidth + nets.width + pitch.borderWidth / 2 + pitch.width + pitch.borderWidth,
        totalHeight - side_wall_length / 2,
        pitch.borderWidth,
        side_wall_length,
        'R'
    );

    // Left net - left wall
    create_rectangle(
        nets.borderWidth / 2,
        totalHeight / 2,
        nets.borderWidth,
        nets.height + nets.borderWidth * 2, 'L', true
    );

    // Right net - right wall
    create_rectangle(
        totalWidth - nets.borderWidth / 2,
        totalHeight / 2,
        nets.borderWidth,
        nets.height + nets.borderWidth * 2, 'R', true
    );

    // Left net - up wall
    create_rectangle(
        nets.borderWidth + nets.width / 2,
        side_wall_length - nets.borderWidth / 2,
        nets.width + nets.borderWidth + pitch.borderWidth,
        nets.borderWidth,
        'U', true
    );

    // Left net - down wall
    create_rectangle(
        nets.borderWidth + nets.width / 2,
        side_wall_length + nets.height + nets.borderWidth / 2,
        nets.width + nets.borderWidth + pitch.borderWidth,
        nets.borderWidth,
        'D', true
    );

    // Right net - up wall
    create_rectangle(
        totalWidth - nets.borderWidth - nets.width / 2,
        side_wall_length - nets.borderWidth / 2,
        nets.width + nets.borderWidth + pitch.borderWidth,
        nets.borderWidth,
        'U', true
    );

    // Right net - down wall
    create_rectangle(
        totalWidth - nets.borderWidth - nets.width / 2,
        side_wall_length + nets.height + nets.borderWidth / 2,
        nets.width + nets.borderWidth + pitch.borderWidth,
        nets.borderWidth,
        'D', true
    );
    scene.matter.add.rectangle(
        CONFIG.nets.borderWidth + CONFIG.nets.width / 2,
        CONFIG.totalHeight / 2,
        CONFIG.nets.width,
        CONFIG.nets.height,
        {
            isSensor: true,
            isStatic: true,
            label: 'leftNet',
        }
    );
    scene.matter.add.rectangle(
        CONFIG.totalWidth - CONFIG.nets.borderWidth - CONFIG.nets.width / 2,
        CONFIG.totalHeight / 2,
        CONFIG.nets.width,
        CONFIG.nets.height,
        {
            isSensor: true,
            isStatic: true,
            label: 'rightNet',
        }
    );
}