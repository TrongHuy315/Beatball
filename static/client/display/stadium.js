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
function drawPitch() { // DRAW THE BACKGROUND INSIDE AND THE BORDER 
    const {offset_horizontal, offset_vertical,nets, pitch, totalHeight, totalWidth} = CONFIG;   
    ctx.fillStyle = CONFIG.pitch.backgroundColor;
    ctx.fillRect(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth + offset_horizontal, 
        CONFIG.pitch.borderWidth + offset_vertical, 
        CONFIG.pitch.width, 
        CONFIG.pitch.height 
    );
    
    // DRAW 
    ctx.lineWidth = CONFIG.pitch.borderWidth;
    ctx.strokeStyle = "black";
    ctx.strokeRect(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth / 2 + offset_horizontal, 
        CONFIG.pitch.borderWidth / 2 + offset_vertical,
        CONFIG.pitch.width + CONFIG.pitch.borderWidth,
        CONFIG.pitch.height + CONFIG.pitch.borderWidth
    );
}   
function drawLeftNets() {
    const {offset_horizontal, offset_vertical,nets, pitch, arc, totalHeight, totalWidth} = CONFIG;   
    ctx.lineWidth = nets.borderWidth; 
    ctx.strokeStyle = nets.leftNetColor; 
    ctx.fillStyle = nets.leftNetBackgroundColor; 

    ctx.strokeRect( // STROKE IT 
        nets.borderWidth / 2 + offset_horizontal, 
        totalHeight / 2 - nets.height / 2 - nets.borderWidth / 2,
        nets.width + nets.borderWidth / 2 + pitch.borderWidth / 2, 
        nets.height + nets.borderWidth 
    );
    ctx.clearRect( // Clear way to receive ball 
        nets.borderWidth + nets.width + offset_horizontal, 
        totalHeight / 2 - nets.height / 2, 
        pitch.borderWidth, 
        nets.height
    );
    ctx.fillStyle = 'white'; 
    ctx.fillRect( // FILL BACKGROUND COLOR FOR LEFT GOAL 
        nets.borderWidth + offset_horizontal, 
        totalHeight / 2 - nets.height / 2,
        nets.width + pitch.borderWidth, 
        nets.height 
    );

    // FILL LEFT GOAL 
    ctx.fillStyle = nets.leftNetBackgroundColor; 
    netsCtx.fillStyle = nets.leftNetBackgroundColor; 
    netsCtx.fillRect( 
        nets.borderWidth + offset_horizontal, 
        totalHeight / 2 - nets.height / 2,
        nets.width + pitch.borderWidth, 
        nets.height 
    );
    
    ctx.fillStyle = nets.leftNetColor; 

    ctx.beginPath(); // upper corner 
    ctx.arc(
        nets.borderWidth + nets.width + pitch.borderWidth / 2 + offset_horizontal,                       
        totalHeight / 2 - nets.height / 2 - nets.borderWidth / 2, 
        nets.cornerRadius,                                                
        0, 2 * Math.PI
    );
    ctx.fill();

    ctx.beginPath(); // lower corner 
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
    ctx.lineWidth = nets.borderWidth; 
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
    ctx.strokeStyle = "black";
    ctx.lineWidth = circle.borderWidth;

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
    ctx.strokeStyle = "black";
    ctx.lineWidth = penaltyBox.borderWidth;
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

    // LEFT ARC 
    ctx.beginPath();
    ctx.arc(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth + CONFIG.penaltyBox.width + offset_horizontal, // Tâm X (căn mép trong khu vực cấm địa)
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
        CONFIG.totalWidth - CONFIG.nets.borderWidth - CONFIG.nets.width - CONFIG.pitch.borderWidth - CONFIG.penaltyBox.width - offset_horizontal, // Tâm X (mép trong bên phải)
        CONFIG.totalHeight / 2,                                                     // Tâm Y (giữa chiều cao canvas)
        arcRadius,                                                             // Bán kính hình bán nguyệt
        Math.PI * 3 / 2,                                                       // Góc bắt đầu: 270 độ
        Math.PI / 2,                                                           // Góc kết thúc: 90 độ
        true                                                                   // Ngược chiều kim đồng hồ
    );
    ctx.stroke();
}
function render() {
    ctx.clearRect(0, 0, CONFIG.totalWidth, CONFIG.totalHeight); // Clear canvas
    drawBackground(); 
    drawPitch(); 
    drawPenaltyAreas(); 
    drawCenterLineAndCircle();
    drawPenaltyArcs(); 

    drawLeftNets();  
    drawRightNets();
}
render();
