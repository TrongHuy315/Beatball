document.addEventListener("DOMContentLoaded", async () => {
    const socket = io();
    const roomId = document.getElementById("room-id").value; // Lấy room_id từ input hidden

    // Thêm flag để đánh dấu reload
    let isReloading = false;
    window.onbeforeunload = function() {
        isReloading = true;
    };

    const playerCardsContainer = document.getElementById("player-cards");
    let currentPlayers = [];

    // Tham gia phòng qua Socket.IO
    socket.emit("join_room", { room_id: roomId });

    // Lấy dữ liệu người chơi từ server
    async function fetchPlayerData() {
        try {
            const response = await fetch(`/room-data/${roomId}`);
            if (response.ok) {
                const players = await response.json();
                console.log("Fetched players:", players);
                currentPlayers = players;
                renderPlayerCards(players);
                return players;
            } else {
                console.error("Failed to fetch player data");
                return [];
            }
        } catch (error) {
            console.error("Error fetching player data:", error);
            return [];
        }
    }

    // Hiển thị player cards
    function renderPlayerCards(players) {
        console.log("Rendering players:", players);
        playerCardsContainer.innerHTML = "";

        const team1 = document.createElement("div");
        team1.className = "team";
        const team2 = document.createElement("div");
        team2.className = "team";

        const vsDiv = document.createElement("div");
        vsDiv.className = "vs-divider";
        vsDiv.innerHTML = '<img src="/static/vs-icon.png" class="vs-icon" alt="VS">';

        // Tạo 4 card trống
        for (let i = 0; i < 4; i++) {
            const card = document.createElement("div");
            card.className = "player-card";
            
            // Kiểm tra xem vị trí này có người chơi không
            const player = players[i];
            
            card.innerHTML = player ? `
                <div class="avatar" style="background-image: url('${player.avatar || "/static/images/default-avatar.png"}')"></div>
                <p class="player-name">${player.username}</p>
                <p class="player-score">${player.score ? `Rating: ${player.score}` : ""}</p>
            ` : `
                <div class="avatar" style="background-image: url('/static/images/default-avatar.png')"></div>
                <p class="player-name">Waiting...</p>
                <p class="player-score"></p>
            `;

            // Phân chia vào các team
            if (i < 2) {
                team1.appendChild(card);
            } else {
                team2.appendChild(card);
            }
        }

        playerCardsContainer.appendChild(team1);
        playerCardsContainer.appendChild(vsDiv);
        playerCardsContainer.appendChild(team2);
    }

    // Xử lý các sự kiện Socket.IO
    socket.on("player_joined", (data) => {
        console.log("Player joined:", data);
        fetchPlayerData(); // Cập nhật lại dữ liệu khi có người chơi mới
    });

    socket.on("player_left", (data) => {
        console.log("Player left:", data);
        fetchPlayerData(); // Cập nhật lại dữ liệu khi có người chơi rời đi
    });

    socket.on("update_room", (data) => {
        console.log("Room updated:", data);
        fetchPlayerData(); // Cập nhật lại dữ liệu khi phòng được cập nhật
    });

    socket.on("room_deleted", (data) => {
        if (data.room_id === roomId) {
            alert("Room has been deleted!");
            window.location.href = "/home"; // Chuyển về trang chủ
        }
    });

    socket.on("disconnect", () => {
        if (!isReloading) {
            // Chỉ gửi yêu cầu rời phòng khi thực sự rời trang
            fetch(`/leave-room/${roomId}`, {
                method: "POST",
                keepalive: true
            });
        }
    });

    // Khởi tạo ban đầu
    await fetchPlayerData();

    // Kiểm tra phòng định kỳ
    setInterval(async () => {
        try {
            const response = await fetch(`/check-room/${roomId}`);
            const data = await response.json();
            if (!data.exists) {
                alert("Room no longer exists!");
                window.location.href = "/home";
            }
        } catch (error) {
            console.error("Error checking room:", error);
        }
    }, 5000); // Kiểm tra mỗi 5 giây
});
