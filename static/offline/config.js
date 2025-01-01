// config.js

window.CONFIG = {
    pitch: {
        width: 1100, // Chiều rộng sân bóng
        height: 550, // Chiều cao sân bóng
        borderWidth: 5, // Độ rộng đường biên
        backgroundColor:"rgba(110, 120, 123, 0.25)" // Màu nền sân bóng
    },
    gameConfig: {
        resetGameCountDown: 5, 
    }, 
    scoreboard: {
        distance: 20,       // Khoảng cách giữa 2 số
        yOffset: 15,        // Khoảng cách từ mép trên
        fontSize: 30,
        fontWeight: '100',
        // Thêm các thuộc tính mới
        width: 50,          // Chiều rộng của một số
        height: 45,         // Chiều cao của một số
        backgroundColor: '#000000',  // Màu nền
        textColor: '#FFFFFF',        // Màu chữ
        padding: 5,         // Padding trong số
        borderRadius: 2,    // Bo góc
        borderColor: '#333333',      // Màu viền
        borderWidth: 1,     // Độ dày viền
        gapBetweenScores: 10,       // Khoảng cách giữa 2 bảng điểm
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
        }
    }, 
    nets: {
        restitution: 0.01,  
        width: 55, 
        height: 170,
        borderWidth: 5,
        netLineColor: "gray", 
        netLineWidth: 2, 
        cornerRadius: 5, 
        leftNetColor: "rgb(200, 33, 33)", 
        rightNetColor: "rgba(13, 166, 237, 0.86)",
        leftNetBackgroundColor: "rgba(236, 100, 100, 0.41)",
        rightNetBackgroundColor: "rgba(53, 124, 255, 0.29)",  
    },
    penaltyBox: {
        width: 150,  
        height: 320, 
    },
	player: {
        // ------------ GRAPHICS -----------------
        graphic: {
            radius: 22,            // Player radius
            fillColor:"rgb(27, 99, 214)",   // Fill color (green)
            borderColor:"rgb(0, 0, 0)", // Border color (black)
            borderWidth: 2,        // Border thickness
            opacity: 1, 
            numberConfig: 
            {
                on: true, 
                value: "10",              // Số áo
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
                value: "PhBaoThang",  
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
                color:"rgb(255, 255, 255)", 
                alpha: 0.1, 
                width: 7, 
                offset: 8, 
            } 
        }, 
        
        // ------------- PHYSICS -----------------
        physics: {
            mass: 4,
            density: 0.001, 
            inertia: Infinity,     

            restitution: 0.5,      // Bounce factor 
            slop: 0, 

            friction: 0,       
            frictionAir: 0,    
            frictionStatic: 0, 
            damping: 0.96, 
            
            label: 'player', 

            chamfer: { radius: 1 }, // Bo tròn góc nhẹ để va chạm mượt hơn

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
            normal_kick_distance: 5, 
            normal_kick_velocity_add: 10  
        }
    }, 
	ball: {
        physics: {
            damping: 0.99, 
            mass: 1,
            restitution: 0,      // độ nảy
            friction: 0,        // ma sát với vật thể khác
            frictionAir: 0.00,    // ma sát không khí
            radius: 11,            // bán kính vật lý và đồ họa
            inertia: Infinity,            // không cho phép xoay
            angle: 0,              // góc cố định
            frictionStatic: 0, 
            slop: 0,      // không có ma sát tĩnh
        },
        graphics: {
            fillColor:"rgb(164, 214, 27)",   // Fill color (green)
            borderColor:"rgb(0, 0, 0)", // Border color (black)
            borderWidth: 2,        // độ dày viền
        },
        limits: {
            maxSpeed: 13,          // tốc độ tối đa
            minSpeed: 0            // tốc độ tối thiểu
        }
    }, 
	wall: {
        slop: 0, 
        wall_distance: 2, 
        wall_thickness: 20, 
		bounciness: 0, 
		friction: 0, 
        world_bound_offset: 0, 
	}, 
};

// Tính toán totalWidth và totalHeight dựa trên các thuộc tính đã định nghĩa
window.CONFIG.totalWidth = window.CONFIG.pitch.width 
    + window.CONFIG.pitch.borderWidth * 2 
    + window.CONFIG.nets.width * 2 
    + window.CONFIG.nets.borderWidth * 2;

window.CONFIG.totalHeight = window.CONFIG.pitch.height 
    + window.CONFIG.pitch.borderWidth * 2;
