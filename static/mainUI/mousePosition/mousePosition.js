const positionDisplay = document.getElementById('position');
let isMouseDown = false; // Biến kiểm tra chuột có được giữ không

// Sự kiện khi nhấn giữ chuột
document.addEventListener('mousedown', (event) => {
	isMouseDown = true; // Đánh dấu chuột đang được giữ
	positionDisplay.style.display = 'block'; // Hiện box tọa độ
	updatePosition(event); // Cập nhật tọa độ ngay lập tức
});

// Sự kiện khi thả chuột
document.addEventListener('mouseup', () => {
	isMouseDown = false; // Đánh dấu chuột đã thả
	positionDisplay.style.display = 'none'; // Ẩn box tọa độ
});

// Sự kiện khi di chuyển chuột
document.addEventListener('mousemove', (event) => {
	if (isMouseDown) {
		updatePosition(event); // Cập nhật tọa độ nếu chuột đang được giữ
	}
});

// Hàm cập nhật tọa độ chuột
function updatePosition(event) {
	const x = event.clientX; // Tọa độ X (ngang)
	const y = event.clientY; // Tọa độ Y (dọc)

	positionDisplay.textContent = `X: ${x}px, Y: ${y}px`;
	positionDisplay.style.left = `${x + 10}px`; // Di chuyển box bên phải con trỏ
	positionDisplay.style.top = `${y + 10}px`;  // Di chuyển box phía dưới con trỏ
}