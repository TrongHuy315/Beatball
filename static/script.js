document.addEventListener("DOMContentLoaded", () => {
    const anonymousBtn = document.getElementById("anonymous-btn");
    const usernameField = document.getElementById("username-field");

    // Xử lý khi nhấn nút Anonymous
    anonymousBtn.addEventListener("click", async () => {
        const username = usernameField.value.trim();
        if (!username) {
            alert("Please enter a username before proceeding!");
            usernameField.focus();
            return;
        }

        try {
            const response = await fetch("/anonymous-login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username }),
            });

            if (response.ok) {
                window.location.href = "/home";
            } else {
                const errorData = await response.json();
                alert(errorData.error || "Failed to log in as anonymous.");
            }
        } catch (error) {
            console.error("Error logging in as anonymous:", error);
            alert("An unexpected error occurred.");
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
