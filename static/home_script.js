document.addEventListener("DOMContentLoaded", () => {
    const username = document.querySelector(".username")?.textContent?.trim();
    if (!username) {
        console.error("Username not found");
        return;
    }

    // Lấy reference đến các elements
    const uploadButton = document.querySelector(".avatar-upload button");
    const avatarInput = document.querySelector(".avatar-upload input[type='file']");
    const profilePicture = document.querySelector(".avatar-container img");

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
