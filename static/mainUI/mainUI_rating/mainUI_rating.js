// ---------- Rating Heading Configuration -----------------
const rating_heading = document.getElementById("rating_heading");

	// --------- Cấu hình các thuộc tính ----------
const pos_heading_x = 10;                 // Vị trí x (px)
const pos_heading_y = 10;                 // Vị trí y (px)

	// ------------ Áp dụng các thuộc tính -------------
rating_heading.textContent = "Rating"; // Đặt tên cho heading
rating_heading.style.position = 'absolute'; // Định vị tuyệt đối
rating_heading.style.left = `${pos_heading_x}px`;   // Vị trí X
rating_heading.style.top = `${pos_heading_y}px`;    // Vị trí Y
rating_heading.style.fontSize = "20px";  // Cỡ chữ
rating_heading.style.fontFamily = "'Arial', sans-serif"; // Kiểu chữ
rating_heading.style.fontWeight = "100";   
rating_heading.style.color = "#6C6F7F";        // Màu chữ
rating_heading.style.letterSpacing = "0.1px"; 
rating_heading.style.textTransform = "uppercase"; 
rating_heading.style.opacity = "0.81"; 

// ---------- Rating Heading Configuration -----------------
const user_rating = document.getElementById("user_rating");

	// --------- Cấu hình các thuộc tính ----------
var elo = 2866      // Tên heading
var pos_rating_x = 60;                 // Vị trí x (px)
var pos_rating_y = 60;                 // Vị trí y (px)

	// ------------ Áp dụng các thuộc tính -------------
user_rating.textContent = "2866"; // Đặt tên cho heading
user_rating.style.position = "absolute"; // Định vị tuyệt đối
user_rating.style.left = `${pos_rating_x}px`;   // Vị trí X
user_rating.style.top = `${pos_rating_y}px`;    // Vị trí Y
user_rating.style.fontSize = "48px";  // Cỡ chữ
user_rating.style.fontFamily = "'Arial', sans-serif"; 
user_rating.style.color = "#333";        // Màu chữ
user_rating.style.fontWeight = "100"; 
user_rating.style.color ="rgb(184, 170, 49)";
var user_rating_rect = user_rating.getBoundingClientRect(); 

const user_rating_add = document.getElementById("user_rating_add");

	// --------- Cấu hình các thuộc tính ----------
var elo = 2866      // Tên heading
var pos_rating_add_x = 120;                 // Vị trí x (px)
var pos_rating_add_y = 35;                 // Vị trí y (px)

	// ------------ Áp dụng các thuộc tính -------------
user_rating_add.textContent = "+47"; // Đặt tên cho heading
user_rating_add.style.position = "absolute"; // Định vị tuyệt đối
user_rating_add.style.left = `${pos_rating_x + pos_rating_add_x}px`;   // Vị trí X
user_rating_add.style.top = `${pos_rating_y + pos_rating_add_y}px`;    // Vị trí Y
user_rating_add.style.fontSize = "24px";  // Cỡ chữ
user_rating_add.style.fontFamily = "'Arial', sans-serif"; 
user_rating_add.style.color = "#333";        // Màu chữ
user_rating_add.style.fontWeight = "100"; 
user_rating_add.style.color ="rgb(57, 174, 89)";


