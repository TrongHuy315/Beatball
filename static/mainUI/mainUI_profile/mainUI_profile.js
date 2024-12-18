// ---------- avatar configuration -----------------
avatar_html = document.getElementById("user_avatar");
var avatar_path = avatar_html.dataset.avatarPath;
var avatar_x = 19;
var avatar_y = 10;
var avatar_width = 63;
var avatar_height = 60;
var scale = 1;
avatar_width *= scale;
avatar_height *= scale;

// Tạo thẻ <img> và cấu hình các thuộc tính
const avatarImage = document.createElement("img");
avatarImage.src = avatar_path; // Đặt đường dẫn hình ảnh
avatarImage.style.position = "absolute"; // Đặt vị trí tuyệt đối
avatarImage.style.left = `${avatar_x}px`; // Vị trí X
avatarImage.style.top = `${avatar_y}px`; // Vị trí Y
avatarImage.style.width = `${avatar_width}px`; // Chiều rộng
avatarImage.style.height = `${avatar_height}px`; // Chiều cao
avatarImage.style.borderRadius = "50%"; // Làm tròn hình ảnh (avatar)

// Gắn hình ảnh vào thẻ chứa avatar
avatar_html.appendChild(avatarImage);

// ----------- distance configuration ---------------
var avatar_name_dis = 18; // horizontal distance between name and avatar 
var username_id_dis = 25; // vertical distance between username and id 


// ----------- username configuration -------------- 
username_html = document.getElementById("user_name");
// ------------ configurations ----------
var posx = avatar_x + avatar_width * scale + avatar_name_dis; // X: khoảng cách từ trái sang (px)
var posy = 20; // Y: khoảng cách từ trên xuống (px)
var fontSize = "18px"; // Cỡ chữ
var isBold = true; // Có in đậm hay không
var username = "PhBaoThang"; // Nội dung tên người dùng

// ------------ configuring ------------
username_html.textContent = username;
username_html.style.position = "absolute";
username_html.style.left = `${posx}px`;
username_html.style.top = `${posy}px`;
username_html.style.fontSize = fontSize;
username_html.style.fontWeight = isBold ? "bold" : "normal";
username_html.style.color = "#333";


// -------------- id configuration ----------------- 
const id_html = document.getElementById("user_id");
const id = "23120416";

id_html.textContent = `${id}`;

// Cấu hình style (nếu cần)
id_html.style.position = "absolute"; // Vị trí tuyệt đối
id_html.style.left = `${posx}px`; // Vị trí X
id_html.style.top = `${posy + username_id_dis}px`; // Vị trí Y
id_html.style.fontSize = "12px"; // Cỡ chữ
id_html.style.color = "#333"; // Màu chữ