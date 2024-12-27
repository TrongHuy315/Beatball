document.addEventListener("DOMContentLoaded", () => {
    const username = document.querySelector(".username")?.textContent?.trim();
    if (!username) {
        console.error("Username not found");
        return;
    }

    // Lấy reference đến các elements
    const uploadButton = document.querySelector(".avatar-upload button");
    const avatarInput = document.querySelector(".avatar-upload input[type='file']");
    const logoutButton = document.getElementById("logout-btn");
    const profilePicture = document.querySelector(".avatar-container img");

    if (sessionStorage.getItem("is_anonymous") === "true") {
        uploadButton.style.display = "none"; // Ẩn nút Upload Photo
    }

    uploadButton?.addEventListener("click", () => {
        avatarInput?.click();
    });

    avatarInput?.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
    
        const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validImageTypes.includes(file.type)) {
            alert("Please upload a valid image file (JPEG, PNG, or GIF)");
            return;
        }
    
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            alert("File size must be less than 5MB");
            return;
        }
    
        try {
            uploadButton.disabled = true;
            uploadButton.textContent = "Uploading...";
    
            const formData = new FormData();
            formData.append('avatar', file);
    
            const response = await fetch('/upload-avatar', {
                method: 'POST',
                body: formData
            });
    
            const result = await response.json();
    
            if (result.success) {
                document.getElementById('profilePicture').src = result.profilePicture; // Update image on UI
                alert("Avatar updated successfully!");
            } else {
                throw new Error(result.error || 'Failed to upload avatar');
            }
        } catch (error) {
            console.error("Error uploading avatar:", error);
            alert("Failed to upload avatar: " + error.message);
        } finally {
            uploadButton.disabled = false;
            uploadButton.textContent = "Upload Photo";
        }
    });
    
    // Xử lý sự kiện click cho nút Logout
    logoutButton?.addEventListener("click", async () => {
        try {
            const response = await fetch("/logout", { method: "GET" });
            if (response.ok) {
                window.location.href = "/"; // Quay lại trang chủ
            } else {
                alert("Failed to log out. Please try again.");
            }
        } catch (error) {
            console.error("Error during logout:", error);
            alert("An unexpected error occurred during logout.");
        }
    });
});

document.addEventListener("DOMContentLoaded", async () => {
    const currentRoom = sessionStorage.getItem("current_room");
    if (currentRoom) {
        try {
            const response = await fetch(`/check-room/${currentRoom}`);
            const data = await response.json();

            if (response.ok && data.exists) {
                // Chỉ điều hướng nếu phòng tồn tại
                window.location.href = `/room/${currentRoom}`;
            } else {
                // Xóa thông tin phòng khỏi sessionStorage nếu phòng không tồn tại
                sessionStorage.removeItem("current_room");
            }
        } catch (error) {
            console.error("Error checking room:", error);
            sessionStorage.removeItem("current_room");
        }
    }
});

document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const leaderboardButton = document.getElementById("leaderboard-btn");
    const createRoomButton = document.getElementById("create-room-btn");
    const createRoomModal = document.getElementById("create-room-modal");
    const closeRoomModal = document.getElementById("close-room-modal");
    const createLobbyButton = document.getElementById("create-lobby-btn");
    const createVsButton = document.getElementById("create-vs-btn");
    const findRoomButton = document.getElementById("find-room-btn");
    const roomIdInput = document.getElementById("room-id-input");

    // Leaderboard Navigation
    leaderboardButton.addEventListener("click", () => {
        window.location.href = "/leaderboard";
    });

    // Modal Management
    createRoomButton.addEventListener("click", () => {
        createRoomModal.style.display = "flex";
    });

    closeRoomModal.addEventListener("click", () => {
        createRoomModal.style.display = "none";
    });

    // Click outside modal to close
    window.addEventListener("click", (event) => {
        if (event.target === createRoomModal) {
            createRoomModal.style.display = "none";
        }
    });

    // Room Creation
    const createRoom = (roomType) => {
        fetch("/create-room", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_type: roomType }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.room_id) {
                window.location.href = `/room/${data.room_id}`;
            } else {
                alert("Error creating room: " + data.error);
            }
        })
        .catch(error => {
            console.error("Error creating room:", error);
            alert("Failed to create room. Please try again.");
        });
    };

    createLobbyButton.addEventListener("click", () => createRoom("lobby"));
    createVsButton.addEventListener("click", () => createRoom("vs"));

    // Find Room
    findRoomButton.addEventListener("click", () => {
        const roomId = roomIdInput.value.trim();
        if (!roomId) {
            alert("Please enter a room ID");
            return;
        }

        fetch(`/check-room/${roomId}`)
        .then(response => {
            if (!response.ok) throw new Error("Room not found");
            return response.json();
        })
        .then(data => {
            if (data.exists) {
                window.location.href = `/room/${roomId}`;
            } else {
                alert("Room does not exist");
            }
        })
        .catch(error => {
            console.error("Error finding room:", error);
            alert("Room does not exist");
        });
    });

    // Enter key for room ID input
    roomIdInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            findRoomButton.click();
        }
    });

    async function findRoom(roomId) {
        try {
            console.log(`Checking room: ${roomId}`);
            const response = await fetch(`/check-room/${roomId}`);
            const data = await response.json();
            
            console.log('Response:', response.status, data);
            
            if (!response.ok) {
                if (response.status === 404) {
                    showMessage("Phòng không tồn tại", "error");
                    return;
                }
                throw new Error(data.error || "Server error");
            }
    
            if (data.exists) {
                if (data.status === "playing") {
                    showMessage("Phòng đang trong trận đấu", "warning");
                    return;
                }
    
                if (!data.can_join) {
                    showMessage("Không thể tham gia phòng này", "warning");
                    return;
                }
    
                // Hiển thị thông tin phòng và nút tham gia
                showMessage(`Đã tìm thấy phòng ${roomId} (${data.player_count}/${data.max_players})`, "success");
                
                // Thêm nút tham gia
                const joinButton = document.createElement('button');
                joinButton.textContent = 'Tham gia phòng';
                joinButton.onclick = () => joinRoom(roomId);
                document.getElementById('room-info').appendChild(joinButton);
                
            } else {
                showMessage("Phòng không tồn tại", "error");
            }
        } catch (error) {
            console.error("Error finding room:", error);
            showMessage("Lỗi khi tìm phòng", "error");
        }
    }
    
    function showMessage(message, type = "info") {
        const messageEl = document.getElementById('message');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `message ${type}`;
        }
    }
    
    async function joinRoom(roomId) {
        try {
            const response = await fetch(`/join-room/${roomId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Chuyển hướng đến trang phòng
                window.location.href = `/room/${roomId}`;
            } else {
                showMessage(data.error || "Không thể tham gia phòng", "error");
            }
        } catch (error) {
            console.error("Error joining room:", error);
            showMessage("Lỗi khi tham gia phòng", "error");
        }
    }

    // Stats Update
    const updateStats = () => {
        fetch('/get-user-stats')
        .then(response => response.json())
        .then(stats => {
            // Update rating
            document.querySelector('.rating-value').textContent = stats.rating;
            const ratingChange = document.querySelector('.rating-change');
            if (ratingChange) {
                ratingChange.textContent = (stats.rating_change > 0 ? '+' : '') + stats.rating_change;
                ratingChange.className = `rating-change ${stats.rating_change > 0 ? 'positive' : 'negative'}`;
            }

            // Update stats
            document.querySelectorAll('.stats-item').forEach(item => {
                const statType = item.dataset.stat;
                const valueElement = item.querySelector('.stats-value');
                if (valueElement && stats[statType] !== undefined) {
                    let value = stats[statType];
                    if (statType.includes('ratio')) {
                        value = value.toFixed(2);
                    }
                    if (statType === 'winrate') {
                        value = value + '%';
                    }
                    valueElement.textContent = value;
                }
            });
        })
        .catch(error => console.error('Error updating stats:', error));
    };

    // Initial stats update and interval
    updateStats();
    setInterval(updateStats, 30000);
});
