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
            // Kiểm tra roomId có tồn tại
            if (!roomId) {
                console.error("roomId is not defined.");
                return [];
            }
    
            // Gửi yêu cầu tới server
            const response = await fetch(`/room-data/${roomId}`);
            if (!response.ok) {
                console.error(`Failed to fetch player data: ${response.status} ${response.statusText}`);
                return [];
            }
    
            // Phân tích dữ liệu JSON
            const players = await response.json();
            console.log("Fetched players:", players);
    
            // Kiểm tra dữ liệu trả về
            if (!Array.isArray(players)) {
                console.error("Invalid player data received:", players);
                return [];
            }
    
            // Gán dữ liệu và render giao diện
            currentPlayers = players; // Giả định currentPlayers là biến toàn cục
            renderPlayerCards(players);
            return players;
    
        } catch (error) {
            console.error("Error fetching player data:", error);
            return [];
        }
    }    

    // Hiển thị player cards
    function renderPlayerCards(playerSlots) {
        console.log("Rendering player slots:", playerSlots);
        const playerCards = document.querySelectorAll(".player-card");

        playerSlots.forEach((player, index) => {
            const card = playerCards[index];
            if (player) {
                const username = player.username || "Unknown User";
                const point = player.score || "Waiting stats";
                const avatar = player.avatar || "/static/images/default-avatar.png";

                card.innerHTML = `
                    <div class="avatar" style="background-image: url('${avatar}')"></div>
                    <p class="player-name">${username}</p>
                    <p class="player-score">${point}</p>
                `;
            } else {
                card.innerHTML = `
                    <div class="avatar" style="background-image: url('/static/images/default-avatar.png')"></div>
                    <p class="player-name">Waiting...</p>
                    <p class="player-score"></p>
                `;
            }
        });
    }

    // Xử lý các sự kiện Socket.IO
    socket.on("player_joined", (data) => {
        console.log("Player joined:", data);
        renderPlayerCards(data.player_slots);
    });    

    socket.on("player_left", (data) => {
        console.log("Player left:", data);
        renderPlayerCards(data.player_slots);
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
