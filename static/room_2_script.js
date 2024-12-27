document.addEventListener("DOMContentLoaded", async () => {
    const socket = io();
    const roomId = document.getElementById("room-id").value; // Lấy room_id từ input hidden
    const currentRoomId = roomId; // Thêm dòng này
    const sessionRoom = sessionStorage.getItem("current_room");

    if (sessionRoom && sessionRoom !== roomId) {
        console.warn("Inconsistent room detected. Updating to current room.");
        sessionStorage.setItem("current_room", roomId);
    }

    // Tham gia phòng qua Socket.IO
    socket.emit("join_room", { room_id: roomId });

    // Đánh dấu cờ reload trên localStorage
    // Ta sẽ dùng localStorage hoặc biến cục bộ để nhận biết reload
    let isReloading = false;

    // 1) Lắng nghe beforeunload để xác định có phải reload không
    window.addEventListener("beforeunload", function (e) {
        const nav = performance.getEntriesByType("navigation");
        const navType = nav.length > 0 ? nav[0].type : null;
        
        // Kiểm tra kiểu điều hướng (reload, back_forward, navigate)
        if (navType === "reload") {
            // Người dùng bấm nút reload
            isReloading = true;
            localStorage.setItem("is_reloading", "true");
        } else {
            isReloading = false;
            localStorage.setItem("is_reloading", "false");
        }
    });

    // 2) Khi socket bị disconnect (tab đóng hoặc reload đều ngắt socket),
    // ta quyết định có gọi /leave-room hay không.
    socket.on("disconnect", () => {
        // Đọc lại cờ is_reloading từ localStorage
        const checkReload = localStorage.getItem("is_reloading") === "true";
        console.log("Socket disconnected, isReloading =", checkReload);

        if (!checkReload) {
            // Nếu không phải reload => gọi /leave-room
            fetch(`/leave-room/${roomId}`, {
                method: "POST",
                keepalive: true
            });
        } else {
            // Nếu là reload => KHÔNG gọi /leave-room
            console.log("Reload detected -> skip leave-room");
        }
    });

    // 3) Sau khi load xong trang mới, đặt lại cờ is_reloading = false
    // để tránh ảnh hưởng lần sau
    window.addEventListener("load", () => {
        localStorage.setItem("is_reloading", "false");
    });

    const playerCardsContainer = document.getElementById("player-cards");
    let currentPlayers = [];
    let currentHostId = null; // Khởi tạo biến

    await fetchPlayerData();

    // Thêm listener cho host_sync event
    socket.on("host_sync", (data) => {
        console.log("Host sync received:", data);
        currentHostId = data.host_id;
        renderPlayerCards(data.player_slots);
        updateControlButtons();
    });

    // Sửa lại hàm fetchPlayerData
    async function fetchPlayerData() {
        try {
            const response = await fetch(`/room-data/${roomId}`);
            const data = await response.json();
            if (!data.success) return;
    
            // Đảm bảo currentHostId luôn đồng bộ với dữ liệu từ backend
            if (data.host_id) {
                currentHostId = data.host_id;
            }
    
            renderPlayerCards(data.player_slots);
            updateControlButtons();
        } catch (error) {
            console.error("Error fetching player data:", error);
        }
    }        

    // Hiển thị player cards
    function renderPlayerCards(playerSlots) {
        if (!playerCardsContainer) return;
    
        const currentUsername = document.getElementById("current-username")?.value;
        console.log("Rendering cards for current user:", currentUsername);
        console.log("Current host ID:", currentHostId);
    
        playerCardsContainer.innerHTML = "";
    
        // Duyệt qua playerSlots để hiển thị mỗi slot
        playerSlots.forEach((playerData, index) => {
            const card = document.createElement("div");
            card.className = "player-card";
            card.dataset.slot = index;
            
            if (playerData && playerData.username) {
                const isHost = playerData.user_id === currentHostId;
                console.log(`Card ${index}:`, {
                    user_id: playerData.user_id,
                    currentHostId: currentHostId,
                    isHost: isHost
                });

                card.innerHTML = `
                    <div class="avatar" style="background-image: url('${playerData.avatar || "/static/images/default-avatar.png"}')"></div>
                    <p class="player-name">${playerData.username}</p>
                    <p class="player-score">Rating: ${playerData.score || 1000}</p>
                    ${isHost ? '<div class="host-marker">Host</div>' : ''}
                    ${playerData.is_ready ? '<div class="ready-marker">Ready</div>' : ''}
                `;
            } else {
                // Slot trống
                card.innerHTML = `
                    <div class="avatar" style="background-image: url('/static/images/default-avatar.png')"></div>
                    <p class="player-name">Waiting...</p>
                    <p class="player-score"></p>
                `;
            }

            playerCardsContainer.appendChild(card);
        });
    }

    socket.on("player_left", (data) => {
        console.log("Player left:", data);
    
        // Cập nhật host ID từ server
        currentHostId = data.new_host_id;
    
        // Cập nhật lại giao diện thẻ người chơi
        renderPlayerCards(data.player_slots);
    
        // Cập nhật các nút điều khiển (Ready/Start)
        updateControlButtons();
    });
    
    socket.on("host_update", (data) => {
        console.log("Host updated:", data);
    
        // Cập nhật host ID và UI
        currentHostId = data.host_id;
        renderPlayerCards(data.player_slots);
        updateControlButtons();
    }); 

    socket.on("player_joined", (data) => {
        console.log("Player joined:", data);
        currentHostId = data.host_id; // Cập nhật host_id từ backend
    
        const playerSlots = data.player_slots.map(slot => {
            if (slot) {
                // Không thay đổi is_host trong slot data
                return { ...slot };
            }
            return slot;
        });
    
        renderPlayerCards(playerSlots);
        updateControlButtons();
    });                   
    
    // Hàm cập nhật danh sách người chơi
    function updatePlayerList(players, newHostId) {
        const playerCount = document.getElementById('player-count');
        if (playerCount) {
            playerCount.textContent = `${players.length}/2`;
        }
    
        const playerList = document.getElementById('player-list');
        if (playerList) {
            playerList.innerHTML = '';
            players.forEach(player => {
                const playerElement = document.createElement('div');
                playerElement.className = 'player-item';
                playerElement.textContent = player;
                
                // Đánh dấu host nếu có
                if (newHostId && player === document.getElementById("current-username").value) {
                    playerElement.classList.add('host');
                    playerElement.innerHTML += ' (Chủ phòng)';
                }
                
                playerList.appendChild(playerElement);
            });
        }
    }

    function updateControlButtons() {
        const currentUserId = document.getElementById("current-user-id")?.value;
        const isHost = currentUserId === currentHostId;
        console.log("Updating control buttons:", { currentUserId, currentHostId, isHost });
    
        const readyBtn = document.getElementById("ready-btn");
        const startBtn = document.getElementById("start-game-btn");
    
        if (readyBtn && startBtn) {
            if (isHost) {
                readyBtn.style.display = "none";
                startBtn.style.display = "block";
                console.log("Showing Start button for host");
            } else {
                readyBtn.style.display = "block";
                startBtn.style.display = "none";
                console.log("Showing Ready button for non-host");
            }
        }
    }

    socket.on('slots_swapped', (data) => {
        renderPlayerCards(data.player_slots);
        initializeDragAndDrop();  // Khởi tạo lại drag & drop sau khi render
    });
});
