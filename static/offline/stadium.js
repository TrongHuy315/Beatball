// SET UP 
const canvas = document.getElementById("stadium_canvas");
const ctx = canvas.getContext("2d");

// ---------------- CANVAS CONFIGURATIONS ----------------- 
canvas.width = CONFIG.totalWidth; // 1230
canvas.height = CONFIG.totalHeight; // 560
canvas.style.position = "absolute";
canvas.style.left = `${(window.innerWidth - CONFIG.totalWidth) / 2}px`; // Center horizontally
canvas.style.top = `80px`; 
canvas.style.zIndex = "0"; // Đảm bảo sân ở dưới Phaser canvas

            // ----- player_container ----------- 
const phaserContainer = document.getElementById("player_container");
phaserContainer.style.position = "absolute";
phaserContainer.style.left = canvas.style.left;
phaserContainer.style.top = canvas.style.top;
phaserContainer.style.width = `${CONFIG.totalWidth}px`;
phaserContainer.style.height = `${CONFIG.totalHeight}px`;
phaserContainer.style.zIndex = "10"; // Phaser nằm trên sân
phaserContainer.style.pointerEvents = "none"; // Cho phép các sự kiện chuột đi qua
phaserContainer.style.overflow = 'visible';



// ---------------- PENALTY CONFIGURATIONS ----------------
const penaltyBox = CONFIG.penaltyBox;

// Hàm vẽ sân bóng và các thành phần
function drawPitch() {
    // Inner Rectangle 
    ctx.fillStyle = CONFIG.pitch.backgroundColor;
    ctx.fillRect(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth, 
        CONFIG.pitch.borderWidth, 
        CONFIG.pitch.width, 
        CONFIG.pitch.height 
    );

    // DRAW 
    ctx.lineWidth = CONFIG.pitch.borderWidth;
    ctx.strokeStyle = "black";
    ctx.strokeRect(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth / 2, 
        CONFIG.pitch.borderWidth / 2,
        CONFIG.pitch.width + CONFIG.pitch.borderWidth,
        CONFIG.pitch.height + CONFIG.pitch.borderWidth
    );
}   

function drawRightNets() {
    ctx.lineWidth = CONFIG.nets.borderWidth; 
    ctx.strokeStyle = CONFIG.nets.rightNetColor; 
    ctx.fillStyle = CONFIG.nets.rightNetBackgroundColor; 

    ctx.fillRect(
        CONFIG.totalWidth - CONFIG.nets.borderWidth - CONFIG.nets.width - CONFIG.pitch.borderWidth / 2,
        CONFIG.totalHeight / 2 - CONFIG.nets.height / 2 - CONFIG.nets.borderWidth / 2,
        CONFIG.nets.width + CONFIG.nets.borderWidth / 2 + CONFIG.pitch.borderWidth / 2, 
        CONFIG.nets.height + CONFIG.nets.borderWidth 
    );

    ctx.strokeRect(
        CONFIG.totalWidth - CONFIG.nets.borderWidth - CONFIG.nets.width - CONFIG.pitch.borderWidth / 2,
        CONFIG.totalHeight / 2 - CONFIG.nets.height / 2 - CONFIG.nets.borderWidth / 2,
        CONFIG.nets.width + CONFIG.nets.borderWidth / 2 + CONFIG.pitch.borderWidth / 2, 
        CONFIG.nets.height + CONFIG.nets.borderWidth 
    );
    ctx.clearRect(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.width + CONFIG.pitch.borderWidth, 
        CONFIG.totalHeight / 2 - CONFIG.nets.height / 2, 
        CONFIG.pitch.borderWidth, 
        CONFIG.nets.height
    );
    ctx.fillRect(
        CONFIG.totalWidth - CONFIG.nets.borderWidth - CONFIG.nets.width - CONFIG.pitch.borderWidth / 2, 
        CONFIG.totalHeight / 2 - CONFIG.nets.height / 2 - CONFIG.nets.borderWidth / 2,
        CONFIG.pitch.borderWidth / 2, 
        CONFIG.nets.height + CONFIG.nets.borderWidth 
    );
    ctx.fillStyle = CONFIG.pitch.backgroundColor; 
    ctx.fillRect(
        CONFIG.totalWidth - 
        CONFIG.nets.borderWidth -
         CONFIG.nets.width - CONFIG.pitch.borderWidth, 
        CONFIG.totalHeight / 2 - CONFIG.nets.height / 2 - CONFIG.nets.borderWidth / 2,
        CONFIG.pitch.borderWidth / 2, 
        CONFIG.nets.height + CONFIG.nets.borderWidth 
    );
    
    ctx.lineWidth = CONFIG.nets.netLineWidth; 
    ctx.strokeStyle = CONFIG.nets.netLineColor; 
    ctx.strokeRect(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.width + CONFIG.pitch.borderWidth + CONFIG.pitch.borderWidth / 2, 
        CONFIG.totalHeight / 2 - CONFIG.nets.height / 2, 
        0, 
        CONFIG.nets.height
    );

    
    ctx.fillStyle = CONFIG.nets.rightNetColor; // Màu trùng với khung thành

    ctx.beginPath();
    ctx.arc(
        CONFIG.totalWidth - CONFIG.nets.borderWidth - CONFIG.nets.width - CONFIG.pitch.borderWidth / 2 + 0.75,
        CONFIG.totalHeight / 2 - CONFIG.nets.height / 2 - CONFIG.nets.borderWidth / 2,
        CONFIG.nets.cornerRadius,                                                
        0, 2 * Math.PI
    );
    ctx.fill();

    // Cọc hình tròn góc trên phải
    ctx.beginPath();
    ctx.arc(
        CONFIG.totalWidth - CONFIG.nets.borderWidth - CONFIG.nets.width - CONFIG.pitch.borderWidth / 2 + 0.75,
        CONFIG.totalHeight / 2 + CONFIG.nets.height / 2 + CONFIG.nets.borderWidth / 2,
        CONFIG.nets.cornerRadius,                                                
        0, 2 * Math.PI
    );
    ctx.fill();
}

function drawLeftNets() {
    ctx.lineWidth = CONFIG.nets.borderWidth; 
    ctx.strokeStyle = CONFIG.nets.leftNetColor; 
    ctx.fillStyle = CONFIG.nets.leftNetBackgroundColor; 

    ctx.fillRect(
        CONFIG.nets.borderWidth, 
        CONFIG.totalHeight / 2 - CONFIG.nets.height / 2,
        CONFIG.nets.width, 
        CONFIG.nets.height 
    );
    ctx.strokeRect(
        CONFIG.nets.borderWidth / 2, 
        CONFIG.totalHeight / 2 - CONFIG.nets.height / 2 - CONFIG.nets.borderWidth / 2,
        CONFIG.nets.width + CONFIG.nets.borderWidth / 2 + CONFIG.pitch.borderWidth / 2, 
        CONFIG.nets.height + CONFIG.nets.borderWidth 
    );
    ctx.clearRect(
        CONFIG.nets.borderWidth + CONFIG.nets.width, 
        CONFIG.totalHeight / 2 - CONFIG.nets.height / 2, 
        CONFIG.pitch.borderWidth, 
        CONFIG.nets.height
    );
    ctx.fillRect(
        CONFIG.nets.borderWidth + CONFIG.nets.width, 
        CONFIG.totalHeight / 2 - CONFIG.nets.height / 2,
        CONFIG.pitch.borderWidth / 2, 
        CONFIG.nets.height 
    );
    ctx.fillStyle = CONFIG.pitch.backgroundColor; 
    ctx.fillRect(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth / 2, 
        CONFIG.totalHeight / 2 - CONFIG.nets.height / 2,
        CONFIG.pitch.borderWidth / 2, 
        CONFIG.nets.height 
    );
    ctx.lineWidth = CONFIG.nets.netLineWidth; 
    ctx.strokeStyle = CONFIG.nets.netLineColor; 
    ctx.strokeRect(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth / 2, 
        CONFIG.totalHeight / 2 - CONFIG.nets.height / 2, 
        0, 
        CONFIG.nets.height
    );
    


    ctx.fillStyle = CONFIG.nets.leftNetColor; // Màu trùng với khung thành

    ctx.beginPath();
    ctx.arc(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth - CONFIG.nets.cornerRadius + 0.75,                       
        CONFIG.totalHeight / 2 - CONFIG.nets.height / 2 - CONFIG.nets.borderWidth / 2, 
        CONFIG.nets.cornerRadius,                                                
        0, 2 * Math.PI
    );
    ctx.fill();

    // Cọc hình tròn góc trên phải
    ctx.beginPath();
    ctx.arc(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth - CONFIG.nets.cornerRadius + 0.75,                       
        CONFIG.totalHeight / 2 + CONFIG.nets.height / 2 + CONFIG.nets.borderWidth / 2, 
        CONFIG.nets.cornerRadius,                                                
        0, 2 * Math.PI
    );
    ctx.fill();
}

function drawCenterLineAndCircle() {
    ctx.strokeStyle = "black";
    ctx.lineWidth = CONFIG.pitch.borderWidth;

    ctx.beginPath();
    ctx.moveTo(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth + CONFIG.pitch.width / 2, 
        CONFIG.pitch.borderWidth 
    );
    ctx.lineTo(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth + CONFIG.pitch.width / 2,
        CONFIG.pitch.borderWidth + CONFIG.pitch.height
    );
    ctx.stroke();

    const centerX = CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth + CONFIG.pitch.width / 2; // Tọa độ X trung tâm
    const centerY = CONFIG.pitch.borderWidth + CONFIG.pitch.height / 2; // Tọa độ Y trung tâm
    const radius = 110; // Bán kính hình tròn

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI); // Vẽ hình tròn
    ctx.stroke();
}

function drawPenaltyAreas() {
    // Vẽ khu vực cấm địa lớn bên trái
    ctx.strokeStyle = "black";
    ctx.lineWidth = CONFIG.pitch.borderWidth;

    ctx.strokeRect(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth / 2, // X bắt đầu
        CONFIG.totalHeight / 2 - CONFIG.penaltyBox.height / 2,            // Y bắt đầu
        CONFIG.penaltyBox.width,                                     // Chiều rộng
        CONFIG.penaltyBox.height                                     // Chiều cao
    );

    // Vẽ khu vực cấm địa lớn bên phải
    ctx.strokeRect(
        CONFIG.totalWidth - CONFIG.nets.borderWidth - CONFIG.nets.width - CONFIG.pitch.borderWidth / 2 - CONFIG.penaltyBox.width, // X bắt đầu
        CONFIG.totalHeight / 2 - CONFIG.penaltyBox.height / 2,                                              // Y bắt đầu
        CONFIG.penaltyBox.width,                                                                       // Chiều rộng
        CONFIG.penaltyBox.height                                                                       // Chiều cao
    );
}

function drawPenaltyArcs() {
    const arcRadius = 55; // Bán kính của hình bán nguyệt

    // Hình bán nguyệt bên trái
    ctx.beginPath();
    ctx.arc(
        CONFIG.nets.borderWidth + CONFIG.nets.width + CONFIG.pitch.borderWidth + CONFIG.penaltyBox.width, // Tâm X (căn mép trong khu vực cấm địa)
        CONFIG.totalHeight / 2,                                      // Tâm Y (giữa chiều cao canvas)
        arcRadius,                                              // Bán kính hình bán nguyệt
        Math.PI / 2,                                            // Góc bắt đầu: 90 độ
        (Math.PI * 3) / 2,                                      // Góc kết thúc: 270 độ
        true                                                    // Ngược chiều kim đồng hồ
    );
    ctx.stroke();

    // Hình bán nguyệt bên phải
    ctx.beginPath();
    ctx.arc(
        CONFIG.totalWidth - CONFIG.nets.borderWidth - CONFIG.nets.width - CONFIG.pitch.borderWidth - CONFIG.penaltyBox.width, // Tâm X (mép trong bên phải)
        CONFIG.totalHeight / 2,                                                     // Tâm Y (giữa chiều cao canvas)
        arcRadius,                                                             // Bán kính hình bán nguyệt
        Math.PI * 3 / 2,                                                       // Góc bắt đầu: 270 độ
        Math.PI / 2,                                                           // Góc kết thúc: 90 độ
        true                                                                   // Ngược chiều kim đồng hồ
    );
    ctx.stroke();
}

// Hàm vẽ sân bóng
function render() {
    ctx.clearRect(0, 0, CONFIG.totalWidth, CONFIG.totalHeight); // Clear canvas
    drawPitch(); 
    drawPenaltyAreas();
    drawLeftNets();  
    drawRightNets(); 
    drawCenterLineAndCircle();
    drawPenaltyArcs(); 
}

// Vẽ sân bóng ban đầu
render();
