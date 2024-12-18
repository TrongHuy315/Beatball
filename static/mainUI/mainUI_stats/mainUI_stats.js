// --------------------- STATS HEADING CONFIGURATION ---------------
// ---------- Rating Heading Configuration -----------------
const stats_heading = document.getElementById("stats_heading");
	// --------- Cấu hình các thuộc tính ----------
var pos_heading_stats_x = 10;                 // Vị trí x (px)
var pos_heading_stats_y = 10;                 // Vị trí y (px)

	// ------------ Áp dụng các thuộc tính -------------
stats_heading.textContent = "STATS"; // Đặt tên cho heading
stats_heading.style.position = 'absolute'; // Định vị tuyệt đối
stats_heading.style.left = `${pos_heading_stats_x}px`;   // Vị trí X
stats_heading.style.top = `${pos_heading_stats_y}px`;    // Vị trí Y
stats_heading.style.fontSize = "20px";  // Cỡ chữ
stats_heading.style.fontFamily = "'Arial', sans-serif"; // Kiểu chữ
stats_heading.style.fontWeight = "100";   
stats_heading.style.color ="rgb(195, 214, 53)";        // Màu chữ
stats_heading.style.letterSpacing = "0.1px"; 
stats_heading.style.textTransform = "uppercase"; 
stats_heading.style.opacity = "0.81"; 
stats_heading.style.width = "100%";
stats_heading.style.height = "100%";  


var first_y = 0; 
let stats = {
	"Matches": 485, 
	"Winrate": 0.89, 
	"Goal": 223, 
	"Assist": 150, 
	"Goal Ratio": 1.34, 
	"Assist Ratio": 1.59, 
	"G/A Ratio": 1.88 
}
// position of the first word 
let statKeys = Object.keys(stats); // Mảng các tên thuộc tính
let statValues = Object.values(stats); // Mảng các giá trị tương ứng

// Khoảng cách giữa các dòng (y-distance)
var line_distance = 30; // Khoảng cách giữa các phần tử (có thể điều chỉnh)

var fx = 10; // Vị trí X ban đầu
var fy = 50; // Vị trí Y ban đầu, ngay dưới heading

// Tạo các phần tử cho mỗi stats
for (let i = 0; i < statKeys.length; i++) {
    // Tạo phần tử cho tên stat
    let statName = document.createElement("div");
    statName.textContent = `${statKeys[i]}:`; // Tên stat
    statName.style.position = 'absolute'; // Định vị tuyệt đối
    statName.style.left = `${fx}px`;
    statName.style.top = `${fy + i * line_distance}px`; // Tính toán vị trí Y
    statName.style.fontSize = "16px"; // Cỡ chữ cho tên stat
    statName.style.fontFamily = "'Arial', sans-serif"; // Kiểu chữ
    statName.style.fontWeight = "200"; // Cỡ chữ đậm
    statName.style.color = "#4A4A4A"; // Màu chữ

    // Thêm phần tử tên stat vào DOM
    stats_heading.appendChild(statName);

    // Tạo phần tử cho giá trị của stat
    let statValue = document.createElement("div");
    statValue.textContent = statValues[i]; // Giá trị của stat
    statValue.style.position = 'absolute'; // Định vị tuyệt đối
    statValue.style.left = `${fx + 150}px`; // Cách tên stat một khoảng
    statValue.style.top = `${fy + i * line_distance}px`; // Vị trí Y
    statValue.style.fontSize = "16px"; // Cỡ chữ cho giá trị stat
    statValue.style.fontFamily = "'Arial', sans-serif"; // Kiểu chữ
    statValue.style.fontWeight = "400"; // Cỡ chữ bình thường
    statValue.style.color = "#6C6F7F"; // Màu chữ cho giá trị

    // Thêm phần tử giá trị stat vào DOM
    stats_heading.appendChild(statValue);
}