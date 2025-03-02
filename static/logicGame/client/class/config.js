// config.js

window.CONFIG = {
    offset_vertical: 90, 
    offset_horizontal: 170, 
    pitch: {
        width: 1100,  
        height: 550, 
        borderWidth: 3.8, 
        backgroundColor:'rgba(46, 204, 112, 1)',  
        lineColor: 'rgba(255, 255, 255, 1)',  
    },
    circle: {
        radius: 100,
        borderWidth: 5,  
    }, 
    arc: {
        radius: 45, 
        borderWidth: 5, 
    }, 
    outer: {
        backgroundColor:'rgba(34, 197, 94, 0.21)', 
        borderWidth: 2, 
    }, 
    gameConfig: {
        maxPlayersPerTeam: 2, 
        resetGameCountDown: 2, 
        celebrationTime: 7, 
        goalPercent: 0.3, 
        cheerPercent: 0.4 
    }, 
    sound: {
        type: 1, 
    },     
    scoreboard: {
        distance: 140,       // Khoảng cách giữa 2 số
        yOffset: 15,        // Khoảng cách từ mép trên
        fontSize: 50,
        fontWeight: '100',
        // Thêm các thuộc tính mới
        width: 60,  
        height: 55, 
        backgroundColor: '#000000',  // Màu nền
        textColor: '#FFFFFF',        // Màu chữ
        padding: 5,         // Padding trong số
        borderRadius: 2,    // Bo góc
        borderColor: '#333333',      // Màu viền
        borderWidth: 1,     // Độ dày viền
        gapBetweenScores: 20,       // Khoảng cách giữa 2 bảng điểm
        separator: {                 // Dấu ngăn cách giữa 2 điểm số
            width: 5,
            height: 5,
            color: '#FFFFFF',
            spacing: 3      // Khoảng cách giữa các chấm
        },
        teamNames: {                // Tên đội
            fontSize: 12,
            color: '#FFFFFF',
            yOffset: 5,    // Khoảng cách từ điểm số
            maxLength: 10   // Độ dài tối đa của tên đội
        },
        animation: {                // Hiệu ứng khi ghi bàn
            duration: 500,          // Thời gian animation (ms)
            scale: 1.2,            // Độ phóng to
            flashColor: '#FFFF00'   // Màu nhấp nháy
        }, 
        clock: {
            fontSize: 24,
            fontWeight: 'bold',
            textColor: '#FFFFFF',
            yOffset: 60,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderColor: '#FFFFFF',
            borderWidth: 2,
            borderRadius: 3,
            width: 80,
            height: 40,
            padding: 10
        }
    }, 
    nets: {
        percentBallGoal: 0.7, 
        restitution: 0.01,  
        width: 55, 
        height: 170,
        borderWidth: 1,
        netLineColor: 'gray', 
        netLineWidth: 2, 
        cornerRadius: 5, 
        leftNetColor: 'rgb(243, 10, 29)', 
        rightNetColor: 'rgb(0, 174, 255)',
        leftNetBackgroundColor: 'rgba(255, 0, 0, 0.23)',
        rightNetBackgroundColor: 'rgba(53, 124, 255, 0.29)',  
    },
    penaltyBox: {
        width: 175,  
        height: 300,
        borderWidth: 5, 
    },
	player: {
        // ------------ GRAPHICS -----------------
        graphic: {
            radius: 22,            // Player radius
            fillColor:'rgb(27, 99, 214)',   // Fill color (green)
            borderColor:'rgb(0, 0, 0)', // Border color (black)
            borderWidth: 2,        // Border thickness
            opacity: 1, 
            numberConfig: 
            {
                on: true, 
                value: '10',              // Số áo
                fontSize: 23,             // Kích thước font
                fontFamily: 'Arial',      // Font chữ
                color: '#ffffff',         // Màu số
                strokeColor: '#000000',   // Màu viền của số
                strokeWidth: 2,           // Độ dày viền của số
                offsetX: 0, 
                offsetY: 1, 
                fontWeight: '100', 
            }, 
            nameConfig: 
            {
                on: true,
                value: 'PhBaoThang',  
                fontSize: 18,             // Kích thước font
                fontFamily: 'Arial',      // Font chữ
                color: '#FFFFFF',         // Màu số
                strokeColor: '#000000',   // Màu viền của số
                strokeWidth: 2,           // Độ dày viền của số
                offsetY: 40, 
                fontWeight: '100',
            }, 
            rangeConfig: 
            {
                visible: false, 
                color:'rgb(255, 255, 255)', 
                alpha: 0.1, 
                width: 7, 
                offset: 8, 
            } 
        }, 
        
        // ------------- PHYSICS -----------------
        physics: {
            mass: 1.5,
            density: 0.001, 
            inertia: Infinity,     

            restitution: 0,      // Bounce factor 0.5
            slop: 0, 

            friction: 0,       
            frictionAir: 0,    
            frictionStatic: 0, 
            damping: 0.96, 
            
            label: 'player', 

            // chamfer: { radius: 1 }, // Bo tròn góc nhẹ để va chạm mượt hơn

        },
        
        // ------------- MOVEMENT CONTROLS --------------
        movement: {
            type: 'velocity',         // 'force' or 'velocity'
            force: 0,          // Base force for movement
            maxSpeed: 3.5,           // Maximum speed limit
            acceleration: 10,      // How quickly player reaches max speed
            deceleration: 0.03,    // How quickly player slows down (1 = no slowdown, 0 = instant stop)
            diagonal: true,          // Whether to allow diagonal movement
        }, 
        ballConfig: {
            normalKickDistance: 5, 
            normalKickFreezeTime: 0.3,
            normalKickVelocityAdd: 10      
        }, 
    }, 
	ball: {
        physics: {
            damping: 0.99, 
            mass: 1,
            restitution: 1,      // độ nảy 0.5
            friction: 0,        // ma sát với vật thể khác
            frictionAir: 0.00,    // ma sát không khí
            radius: 11,            // bán kính vật lý và đồ họa
            inertia: Infinity,            // không cho phép xoay
            angle: 0,              // góc cố định
            frictionStatic: 0, 
            slop: 0,      // không có ma sát tĩnh
        },
        spawn: {
            x: 400,  // center x
            y: 300   // center y
        }, 
        graphics: {
            fillColor:'rgb(164, 214, 27)',   // Fill color (green)
            borderColor:'rgb(0, 0, 0)', // Border color (black)
            borderWidth: 2,        // độ dày viền
        },
        limits: {
            maxSpeed: 13,          // tốc độ tối đa
            minSpeed: 0            // tốc độ tối thiểu
        }, 
        goalLine: {
            percentBodyForGoal: 0.8, 
            dampingHitNet: 0.84
        },
    }, 
	wall: {
        slop: 0, 
        wall_distance: 2, 
        wall_thickness: 40, 
		bounciness: 1, 
		friction: 0, 
        world_bound_offset: 0, 
	}, 
};


window.CONFIG.totalWidth = window.CONFIG.pitch.width 
    + window.CONFIG.pitch.borderWidth * 2 
    + window.CONFIG.nets.width * 2 
    + window.CONFIG.nets.borderWidth * 2 + window.CONFIG.offset_horizontal * 2;

window.CONFIG.totalHeight = window.CONFIG.pitch.height 
    + window.CONFIG.pitch.borderWidth * 2 + window.CONFIG.offset_vertical * 2;

