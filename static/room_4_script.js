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
        playerCardsContainer.innerHTML = "";
    
        const team1 = document.createElement("div");
        team1.className = "team";
        const team2 = document.createElement("div");
        team2.className = "team";
    
        const vsDiv = document.createElement("div");
        vsDiv.className = "vs-divider";
        vsDiv.innerHTML = '<img src="/static/vs-icon.png" class="vs-icon" alt="VS">';
    
        // Render mỗi slot theo vị trí cố định
        for (let i = 0; i < 4; i++) {
            const card = document.createElement("div");
            card.className = "player-card";
            
            const playerData = playerSlots[i];
            
            if (playerData) {
                // Nếu có thông tin người chơi ở slot này
                card.innerHTML = `
                    <div class="avatar" style="background-image: url('${playerData.avatar}')"></div>
                    <p class="player-name">${playerData.username}</p>
                    <p class="player-score">Rating: ${playerData.score}</p>
                `;
            } else {
                // Slot trống
                card.innerHTML = `
                    <div class="avatar" style="background-image: url('/static/images/default-avatar.png')"></div>
                    <p class="player-name">Waiting...</p>
                    <p class="player-score"></p>
                `;
            }
    
            // Phân chia team theo vị trí
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
        renderPlayerCards(data.player_slots);
    });    

    socket.on("player_left", (data) => {
        console.log("Player left event:", data);
        
        if (data.player_slots) {
            renderPlayerCards(data.player_slots);
            
            // Cập nhật thông tin chủ phòng nếu có thay đổi
            if (data.new_host_id) {
                updateRoomHost(data.new_host_id);
            }
            
            // Cập nhật danh sách người chơi
            if (data.current_players) {
                updatePlayerList(data.current_players);
            }
        }
    });
    
    function updateRoomHost(newHostId) {
        // Cập nhật UI để hiển thị chủ phòng mới
        const currentUserId = getUserId(); // Hàm để lấy ID người dùng hiện tại
        const isHost = newHostId === currentUserId;
        
        // Cập nhật UI dựa trên vai trò mới
        if (isHost) {
            // Hiển thị các controls dành cho chủ phòng
            document.querySelectorAll('.host-only').forEach(el => el.style.display = 'block');
        } else {
            // Ẩn các controls dành cho chủ phòng
            document.querySelectorAll('.host-only').forEach(el => el.style.display = 'none');
        }
    }
    
    function updatePlayerList(players) {
        // Cập nhật danh sách người chơi trong UI
        console.log("Updating player list:", players);
        // Thêm code cập nhật UI ở đây
    }   

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
