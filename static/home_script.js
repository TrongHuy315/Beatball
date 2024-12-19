document.addEventListener("DOMContentLoaded", () => {
    const leaderboardButton = document.getElementById("leaderboard-btn");

    // Redirect to the leaderboard page when the button is clicked
    leaderboardButton.addEventListener("click", () => {
        window.location.href = "/leaderboard";
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const leaderboardButton = document.getElementById("leaderboard-btn");

    // Redirect to the leaderboard page when the button is clicked
    leaderboardButton.addEventListener("click", () => {
        window.location.href = "/leaderboard";
    });

    // Room Management Elements
    const createRoomButton = document.getElementById("create-room-btn");
    const createRoomModal = document.getElementById("create-room-modal");
    const closeRoomModal = document.getElementById("close-room-modal");
    const createLobbyButton = document.getElementById("create-lobby-btn");
    const createVsButton = document.getElementById("create-vs-btn");
    const findRoomButton = document.getElementById("find-room-btn");
    const roomIdInput = document.getElementById("room-id-input");

    // Open Modal for Room Creation
    createRoomButton.addEventListener("click", () => {
        createRoomModal.style.display = "flex";
    });

    // Close Modal
    closeRoomModal.addEventListener("click", () => {
        createRoomModal.style.display = "none";
    });

    // Create Lobby Room
    createLobbyButton.addEventListener("click", () => {
        fetch("/create-room", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_type: "lobby" }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.room_id) {
                    window.location.href = `/room/${data.room_id}`;
                } else {
                    alert("Error creating room: " + data.error);
                }
            })
            .catch((error) => {
                console.error("Error creating room:", error);
            });
    });

    // Create 2 vs 2 Room
    createVsButton.addEventListener("click", () => {
        fetch("/create-room", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_type: "vs" }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.room_id) {
                    window.location.href = `/room/${data.room_id}`;
                } else {
                    alert("Error creating room: " + data.error);
                }
            })
            .catch((error) => {
                console.error("Error creating room:", error);
            });
    });

    // Find Room
    findRoomButton.addEventListener("click", () => {
        const roomId = roomIdInput.value.trim();
        if (roomId) {
            fetch(`/check-room/${roomId}`, {
                method: "GET",
            })
                .then((response) => {
                    if (response.ok) {
                        return response.json();
                    } else {
                        throw new Error("Room does not exist.");
                    }
                })
                .then((data) => {
                    if (data.exists) {
                        window.location.href = `/room/${roomId}`;
                    } else {
                        alert("Room does not exist.");
                    }
                })
                .catch((error) => {
                    console.error("Error checking room:", error);
                    alert("Room does not exist.");
                });
        } else {
            alert("Please enter a room ID.");
        }
    });
});
