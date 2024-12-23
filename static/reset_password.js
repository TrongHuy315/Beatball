document.getElementById("reset-password-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById("new-password").value.trim();
    const confirmPassword = document.getElementById("confirm-password").value.trim();

    if (!newPassword || !confirmPassword) {
        alert("Please fill out all fields.");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    // Băm mật khẩu bằng SHA256
    const hashedPassword = CryptoJS.SHA256(newPassword).toString();

    try {
        const response = await fetch(location.href, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: hashedPassword }),
        });

        console.log("Request sent:", { password: hashedPassword });

        const result = await response.json();
        console.log("Response received:", result);

        if (result.success) {
            alert("Password updated successfully!");
            window.location.href = result.redirect; // Chuyển hướng đến /login
        } else {
            alert(result.error || "Failed to reset password.");
        }
    } catch (error) {
        console.error("Error resetting password:", error);
        alert("An error occurred. Please try again later.");
    }
});
