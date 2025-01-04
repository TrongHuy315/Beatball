// SET UP 
const canvas = document.getElementById("stadium_canvas");
const ctx = canvas.getContext("2d");

// ---------------- CANVAS CONFIGURATIONS ----------------- 
canvas.width = CONFIG.totalWidth; // 1230
canvas.height = CONFIG.totalHeight; // 560
canvas.style.position = "absolute";
canvas.style.left = `${(window.innerWidth - CONFIG.totalWidth) / 2}px`; // Center horizontally
canvas.style.top = `0px`; 
canvas.style.zIndex = "0";

// Cấu hình cho canvas lưới
const netsCanvas = document.getElementById("nets_canvas");
const netsCtx = netsCanvas.getContext("2d");
netsCanvas.width = CONFIG.totalWidth;
netsCanvas.height = CONFIG.totalHeight;
netsCanvas.style.position = "absolute";
netsCanvas.style.left = canvas.style.left;
netsCanvas.style.top = `0px`;
netsCanvas.style.zIndex = "15";  // z-index cao hơn player_container

// ----- player_container ----------- 
const playerContainer = document.getElementById("player_container");
playerContainer.style.position = "absolute";
playerContainer.style.left = canvas.style.left;
playerContainer.style.top = canvas.style.top;
playerContainer.style.width = `${CONFIG.totalWidth}px`;
playerContainer.style.height = `${CONFIG.totalHeight}px`;
playerContainer.style.zIndex = "10"; // Phaser nằm trên sân
playerContainer.style.pointerEvents = "none"; // Cho phép các sự kiện chuột đi qua
playerContainer.style.overflow = 'visible';



// ---------------- PENALTY CONFIGURATIONS ----------------
const penaltyBox = CONFIG.penaltyBox;

function drawBackground () { // DRAW THE BACKGROUND FOR THE PART OF THE STADIUM 
    const {offset_horizontal, offset_vertical,nets, pitch, totalHeight, totalWidth, outer} = CONFIG; 
    ctx.fillStyle = 'white';
    ctx.fillRect(  // outer Region 
        0, 
        0, 
        totalWidth, 
        totalHeight 
    );
    ctx.fillStyle = outer.backgroundColor;
    ctx.fillRect(  // outer Region 
        0, 
        0, 
        totalWidth, 
        totalHeight 
    );
    ctx.strokeStyle = 'black'; 
    ctx.lineWidth = outer.borderWidth;

    ctx.strokeRect(
        outer.borderWidth / 2, 
        outer.borderWidth / 2, 
        totalWidth - outer.borderWidth, 
        totalHeight - outer.borderWidth
    );
    ctx.fillRect(  // outer Region 
        outer.borderWidth / 2, 
        outer.borderWidth / 2, 
        totalWidth - outer.borderWidth, 
        totalHeight - outer.borderWidth 
    );
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(  // PITCH
        nets.borderWidth + nets.width + offset_horizontal, 
        offset_vertical, 
        pitch.width + pitch.borderWidth * 2, 
        pitch.height + pitch.borderWidth * 2 
    );
    ctx.fillRect(  // LEFT NET 
        offset_horizontal, 
        totalHeight / 2 - (nets.height + nets.borderWidth * 2) / 2, 
        nets.width + nets.borderWidth, 
        nets.height + 2 * nets.borderWidth, 
    )
    // ctx.fillRect(  // RIGHT NET 
    //     totalWidth - offset_horizontal - nets.borderWidth - nets.width, 
    //     totalHeight / 2 - (nets.height + nets.borderWidth * 2) / 2, 
    //     nets.width + nets.borderWidth, 
    //     nets.height + 2 * nets.borderWidth, 
    // )
}
function createGrassStripes() {
    const {offset_horizontal, offset_vertical, nets, pitch} = CONFIG;
    const stripeWidth = 400; // Độ rộng của mỗi sọc
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'; // Độ mờ của sọc
    
    for (let y = 0; y < pitch.height; y += stripeWidth * 2) {
        ctx.fillRect(
            nets.borderWidth + nets.width + pitch.borderWidth + offset_horizontal,
            offset_vertical + pitch.borderWidth + y,
            pitch.width,
            stripeWidth
        );
    }
}
function drawPitch() { // DRAW THE BACKGROUND INSIDE AND THE BORDER 
    const {offset_horizontal, offset_vertical,nets, pitch, totalHeight, totalWidth} = CONFIG;   
    ctx.fillStyle = CONFIG.pitch.backgroundColor;

    // Tạo gradient trước
    const gradient = ctx.createLinearGradient(
        0, offset_vertical,
        0, offset_vertical + pitch.height
    );
    gradient.addColorStop(0, 'rgba(46, 204, 113, 1)');
    gradient.addColorStop(0.5, 'rgba(46, 204, 113, 0.92)'); // Điều chỉnh độ trong suốt
    gradient.addColorStop(1, 'rgba(46, 204, 113, 1)');
    
    // Gán gradient làm fillStyle
    ctx.fillStyle = gradient;


    ctx.fillRect(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth + offset_horizontal, 
        CONFIG.pitch.borderWidth + offset_vertical, 
        CONFIG.pitch.width, 
        CONFIG.pitch.height 
    );
    
    // DRAW 
    ctx.lineWidth = CONFIG.pitch.borderWidth;
    ctx.strokeStyle = CONFIG.pitch.lineColor;
    ctx.strokeRect(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth / 2 + offset_horizontal, 
        CONFIG.pitch.borderWidth / 2 + offset_vertical,
        CONFIG.pitch.width + CONFIG.pitch.borderWidth,
        CONFIG.pitch.height + CONFIG.pitch.borderWidth
    );
}   
function drawLeftNets() {
    const {offset_horizontal, offset_vertical, nets, pitch, arc, totalHeight, totalWidth} = CONFIG;   

    // Code gốc của bạn giữ nguyên từ đây
    ctx.lineWidth = CONFIG.pitch.borderWidth; 
    ctx.strokeStyle = nets.leftNetColor; 
    ctx.fillStyle = nets.leftNetBackgroundColor; 

    ctx.strokeRect(
        nets.borderWidth / 2 + offset_horizontal, 
        totalHeight / 2 - nets.height / 2 - nets.borderWidth / 2,
        nets.width + nets.borderWidth / 2 + pitch.borderWidth / 2, 
        nets.height + nets.borderWidth 
    );

    ctx.clearRect(
        nets.borderWidth + nets.width + offset_horizontal, 
        totalHeight / 2 - nets.height / 2, 
        pitch.borderWidth, 
        nets.height
    );

    ctx.fillStyle = 'white';
    ctx.fillRect(
        nets.borderWidth + offset_horizontal, 
        totalHeight / 2 - nets.height / 2,
        nets.width + pitch.borderWidth, 
        nets.height 
    );

    ctx.fillStyle = nets.leftNetBackgroundColor; 
    netsCtx.fillStyle = nets.leftNetBackgroundColor; 
    netsCtx.fillRect( 
        nets.borderWidth + offset_horizontal, 
        totalHeight / 2 - nets.height / 2,
        nets.width + pitch.borderWidth, 
        nets.height 
    );
    
    ctx.fillStyle = nets.leftNetColor; 

    ctx.beginPath();
    ctx.arc(
        nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal,                       
        totalHeight / 2 - nets.height / 2 - nets.borderWidth / 2, 
        nets.cornerRadius,                                                
        0, 2 * Math.PI
    );
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
        nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal,                                       
        totalHeight / 2 + nets.height / 2 + nets.borderWidth / 2, 
        nets.cornerRadius,                                                
        0, 2 * Math.PI
    );
    ctx.fill();
}
function drawRightNets() {
    const {offset_horizontal, offset_vertical, nets, pitch, arc, totalHeight, totalWidth} = CONFIG;   
    ctx.lineWidth = CONFIG.pitch.borderWidth; 
    ctx.strokeStyle = nets.rightNetColor; 
    ctx.fillStyle = nets.rightNetBackgroundColor; 
    ctx.globalAlpha = 1.0 
    ctx.fillStyle = 'white'; // Màu nền bạn muốn

    ctx.strokeRect( // STROKE IT 
        totalWidth - nets.borderWidth - nets.width - pitch.borderWidth / 2 - nets.borderWidth / 2 - offset_horizontal,
        totalHeight / 2 - nets.height / 2 - nets.borderWidth / 2,
        nets.width + nets.borderWidth / 2 + pitch.borderWidth / 2, 
        nets.height + nets.borderWidth 
    );
    ctx.clearRect( // Clear way to receive ball 
        totalWidth - nets.borderWidth - nets.width - pitch.borderWidth - offset_horizontal,
        totalHeight / 2 - nets.height / 2, 
        pitch.borderWidth, 
        nets.height
    );
    ctx.fillStyle = 'white'; 
    ctx.fillRect( // FILL BACKGROUND COLOR FOR RIGHT GOAL 
        totalWidth - nets.borderWidth - nets.width - pitch.borderWidth - offset_horizontal,
        totalHeight / 2 - nets.height / 2,
        nets.width + pitch.borderWidth, 
        nets.height 
    );

    // FILL RIGHT GOAL 
    ctx.fillStyle = nets.rightNetBackgroundColor; 
    netsCtx.fillStyle = nets.rightNetBackgroundColor; 
    netsCtx.fillRect( 
        totalWidth - nets.borderWidth - nets.width - pitch.borderWidth - offset_horizontal,
        totalHeight / 2 - nets.height / 2,
        nets.width + pitch.borderWidth, 
        nets.height 
    );
    
    ctx.fillStyle = nets.rightNetColor; 

    ctx.beginPath(); // upper corner 
    ctx.arc(
        totalWidth - nets.borderWidth - nets.width - pitch.borderWidth / 2 - offset_horizontal,
        totalHeight / 2 - nets.height / 2 - nets.borderWidth / 2, 
        nets.cornerRadius,                                                
        0, 2 * Math.PI
    );
    ctx.fill();

    ctx.beginPath(); // lower corner 
    ctx.arc(
        totalWidth - nets.borderWidth - nets.width - pitch.borderWidth / 2 - offset_horizontal,
        totalHeight / 2 + nets.height / 2 + nets.borderWidth / 2, 
        nets.cornerRadius,                                                
        0, 2 * Math.PI
    );
    ctx.fill();
}

function drawCenterLineAndCircle() { // DRAW MIDDLE LINE AND CIRCLE 
    const {offset_horizontal, offset_vertical,nets, pitch, totalHeight, totalWidth, circle} = CONFIG;   
    ctx.strokeStyle = CONFIG.pitch.lineColor;
    ctx.lineWidth = CONFIG.pitch.borderWidth;;

    ctx.beginPath(); // DRAW THE MIDDLE LINE 
    ctx.moveTo(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth + CONFIG.pitch.width / 2 + offset_horizontal, 
        CONFIG.pitch.borderWidth + offset_vertical
    );
    ctx.lineTo(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth + CONFIG.pitch.width / 2 + offset_horizontal,
        CONFIG.pitch.borderWidth + CONFIG.pitch.height + offset_vertical
    );
    ctx.stroke();

    
    const centerX = CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth + CONFIG.pitch.width / 2 + offset_horizontal; 
    const centerY = CONFIG.pitch.borderWidth + CONFIG.pitch.height / 2 + offset_vertical; 
    const radius = circle.radius; 

    ctx.beginPath(); // DRAW THE CIRCLE 
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI); 
    ctx.stroke();
} 

function drawPenaltyAreas() { // DRAW PENALTY BOX 
    const {offset_horizontal, offset_vertical,nets, pitch, totalHeight, totalWidth, penaltyBox} = CONFIG; 
    ctx.strokeStyle = CONFIG.pitch.lineColor;
    ctx.lineWidth = CONFIG.pitch.borderWidth;
    ctx.strokeRect(
        nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal, 
        totalHeight / 2 - penaltyBox.height / 2 - penaltyBox.borderWidth / 2,         
        penaltyBox.width + penaltyBox.borderWidth,                                   
        penaltyBox.height + penaltyBox.borderWidth                                  
    );

    ctx.strokeRect(
        totalWidth - offset_horizontal - nets.borderWidth - nets.width - pitch.borderWidth - penaltyBox.width - penaltyBox.borderWidth / 2,
        totalHeight / 2 - penaltyBox.height / 2 - penaltyBox.borderWidth / 2,         
        penaltyBox.width + penaltyBox.borderWidth,                                   
        penaltyBox.height + penaltyBox.borderWidth                                  
    );
}

function drawPenaltyArcs() { // DRAW PENALTY BOX ARC 
    const {offset_horizontal, offset_vertical,nets, pitch, arc, totalHeight, totalWidth} = CONFIG;   
    const arcRadius = arc.radius; 
    ctx.strokeStyle = CONFIG.pitch.lineColor;
    ctx.lineWidth = CONFIG.pitch.borderWidth;
    // LEFT ARC 
    ctx.beginPath();
    ctx.arc(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth + CONFIG.penaltyBox.width + offset_horizontal + pitch.borderWidth / 2, // Tâm X (căn mép trong khu vực cấm địa)
        CONFIG.totalHeight / 2,                                      // Tâm Y (giữa chiều cao canvas)
        arcRadius,                                              // Bán kính hình bán nguyệt
        Math.PI / 2,                                            // Góc bắt đầu: 90 độ
        (Math.PI * 3) / 2,                                      // Góc kết thúc: 270 độ
        true                                                    // Ngược chiều kim đồng hồ
    );
    ctx.stroke();

    // RIGHT ARC 
    ctx.beginPath();
    ctx.arc(
        CONFIG.totalWidth - CONFIG.nets.borderWidth - CONFIG.nets.width - CONFIG.pitch.borderWidth - CONFIG.penaltyBox.width - offset_horizontal - 
        pitch.borderWidth / 2, // Tâm X (mép trong bên phải)
        CONFIG.totalHeight / 2,                                                     // Tâm Y (giữa chiều cao canvas)
        arcRadius,                                                             // Bán kính hình bán nguyệt
        Math.PI * 3 / 2,                                                       // Góc bắt đầu: 270 độ
        Math.PI / 2,                                                           // Góc kết thúc: 90 độ
        true                                                                   // Ngược chiều kim đồng hồ
    );
    ctx.stroke();
}
function drawCornerArcs() {
    const {offset_horizontal, offset_vertical, nets, pitch} = CONFIG;
    
    // Vị trí các góc
    const corners = [
        // Góc trái trên
        {
            x: nets.borderWidth + nets.width + pitch.borderWidth + offset_horizontal,
            y: pitch.borderWidth + offset_vertical,
            startAngle: 0,
            endAngle: Math.PI * 0.5,
            color: 'rgba(255, 50, 50, 0.8)'  // Màu đỏ cho team đỏ
        },
        // Góc trái dưới
        {
            x: nets.borderWidth + nets.width + pitch.borderWidth + offset_horizontal,
            y: pitch.borderWidth + offset_vertical + pitch.height,
            startAngle: Math.PI * 1.5,
            endAngle: Math.PI * 2,
            color: 'rgba(255, 50, 50, 0.8)'  // Màu đỏ cho team đỏ
        },
        // Góc phải trên
        {
            x: nets.borderWidth + nets.width + pitch.borderWidth + offset_horizontal + pitch.width,
            y: pitch.borderWidth + offset_vertical,
            startAngle: Math.PI * 0.5,
            endAngle: Math.PI,
            color: 'rgba(50, 150, 255, 0.8)'  // Màu xanh cho team xanh
        },
        // Góc phải dưới
        {
            x: nets.borderWidth + nets.width + pitch.borderWidth + offset_horizontal + pitch.width,
            y: pitch.borderWidth + offset_vertical + pitch.height,
            startAngle: Math.PI,
            endAngle: Math.PI * 1.5,
            color: 'rgba(50, 150, 255, 0.8)'  // Màu xanh cho team xanh
        }
    ];

    const radius = 15;

    corners.forEach(corner => {
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, radius, corner.startAngle, corner.endAngle);
        ctx.lineTo(corner.x, corner.y);
        ctx.closePath();
        
        ctx.fillStyle = corner.color;
        ctx.fill();

        // Vẽ viền 1/4 hình tròn
        ctx.strokeStyle = CONFIG.pitch.lineColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, radius, corner.startAngle, corner.endAngle);
        ctx.stroke();
    });
}
function drawStadiumLights() {
    const {offset_horizontal, offset_vertical, nets, pitch} = CONFIG;
    
    // Vị trí các đèn (4 góc sân)
    const lights = [
        // Góc trái trên
        {
            x: nets.borderWidth + nets.width + offset_horizontal,
            y: offset_vertical,
            startAngle: 0,                // Bắt đầu từ góc 0 độ
            endAngle: Math.PI / 2         // Đến 90 độ
        },
        // Góc trái dưới
        {
            x: nets.borderWidth + nets.width + offset_horizontal,
            y: offset_vertical + pitch.height + pitch.borderWidth * 2,
            startAngle: -Math.PI / 2,     // Bắt đầu từ -90 độ
            endAngle: 0                   // Đến 0 độ
        },
        // Góc phải trên
        {
            x: nets.borderWidth + nets.width + pitch.width + pitch.borderWidth * 2 + offset_horizontal,
            y: offset_vertical,
            startAngle: Math.PI / 2,      // Bắt đầu từ 90 độ
            endAngle: Math.PI             // Đến 180 độ
        },
        // Góc phải dưới
        {
            x: nets.borderWidth + nets.width + pitch.width + pitch.borderWidth * 2 + offset_horizontal,
            y: offset_vertical + pitch.height + pitch.borderWidth * 2,
            startAngle: -Math.PI,         // Bắt đầu từ -180 độ
            endAngle: -Math.PI / 2        // Đến -90 độ
        }
    ];

    lights.forEach(light => {
        // Tạo gradient cho tia sáng
        const gradient = ctx.createRadialGradient(
            light.x, light.y, 0,
            light.x, light.y, 400  // Tăng độ dài tia sáng để phủ sâu vào sân
        );
        
        // Giảm độ đậm của ánh sáng thêm nữa
        gradient.addColorStop(0, 'rgba(255, 255, 220, 0.08)');   // Vàng nhạt ở tâm
        gradient.addColorStop(0.4, 'rgba(255, 255, 220, 0.05)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 220, 0.03)');
        gradient.addColorStop(1, 'rgba(255, 255, 220, 0)');      // Mờ dần về cuối

        ctx.fillStyle = gradient;

        // Vẽ hình quạt cho tia sáng
        ctx.beginPath();
        ctx.arc(light.x, light.y, 400, light.startAngle, light.endAngle);
        ctx.lineTo(light.x, light.y);
        ctx.closePath();
        ctx.fill();
    });
}

function render() {
    ctx.clearRect(0, 0, CONFIG.totalWidth, CONFIG.totalHeight); // Clear canvas
    drawBackground(); 
    drawPitch(); 
    drawPenaltyAreas(); 
    drawCenterLineAndCircle();
    drawPenaltyArcs(); 
    drawStadiumLights(); 
    drawCornerArcs(); 
    drawLeftNets();  
    drawRightNets();    
}
render();
