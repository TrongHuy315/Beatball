document.addEventListener("DOMContentLoaded", () => {
    const anonymousBtn = document.getElementById("anonymous-btn");
    const usernameField = document.getElementById("username-field");

    // Xử lý khi nhấn nút Anonymous
    anonymousBtn.addEventListener("click", () => {
        const username = usernameField.value.trim();
        if (username) {
            window.location.href = `/home`;
        } else {
            // Cảnh báo nếu không nhập username
            alert("Please enter a username before proceeding!");
            // Đặt lại focus vào ô nhập username
            usernameField.focus();
        }
    });

    // Lắng nghe sự kiện khi nhấn phím Enter trong ô username
    usernameField.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            // Khi nhấn Enter, gọi lại sự kiện click của nút Anonymous
            anonymousBtn.click();
        }
    });

    // Lấy nút Login Menu
    const loginMenuBtn = document.getElementById('login-menu-btn');

    // Thêm sự kiện click để chuyển hướng người dùng tới trang /login
    loginMenuBtn.addEventListener('click', () => {
        window.location.href = "/login";  // Chuyển hướng tới trang /login
    });
});
