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

    // Thêm flag để đánh dấu reload
    let isReloading = false;
    window.addEventListener("beforeunload", function (e) {
        isReloading = performance.getEntriesByType("navigation")[0]?.type === "reload";
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
    
        const team1 = document.createElement("div");
        team1.className = "team team-1";
        const team2 = document.createElement("div");
        team2.className = "team team-2";
    
        const vsDiv = document.createElement("div");
        vsDiv.className = "vs-divider";
        vsDiv.innerHTML = '<img src="/static/vs-icon.png" class="vs-icon" alt="VS">';
    
        // Duyệt qua playerSlots để hiển thị mỗi slot
        for (let i = 0; i < 4; i++) {
            const card = document.createElement("div");
            card.className = "player-card";
            card.dataset.slot = i;
            
            const playerData = playerSlots[i];
            
            if (playerData && playerData.username) {
                // Xác định host dựa trên currentHostId
                const isHost = playerData.user_id === currentHostId;
                console.log(`Card ${i}:`, {
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
    
                // Cho phép kéo thả nếu người chơi hiện tại là user này
                if (playerData.username === currentUsername) {
                    card.setAttribute('draggable', 'true');
                }
            } else {
                // Slot trống
                card.innerHTML = `
                    <div class="avatar" style="background-image: url('/static/images/default-avatar.png')"></div>
                    <p class="player-name">Waiting...</p>
                    <p class="player-score"></p>
                `;
            }
    
            // Thêm card vào team1 hoặc team2
            if (i < 2) {
                team1.appendChild(card);
            } else {
                team2.appendChild(card);
            }
        }
    
        // Thêm các đội và biểu tượng VS vào container
        playerCardsContainer.appendChild(team1);
        playerCardsContainer.appendChild(vsDiv);
        playerCardsContainer.appendChild(team2);
    
        // Khởi tạo lại drag & drop
        initializeDragAndDrop();
    }

    function updateHost(data) {
        currentHostId = data.host_id;
        renderPlayerCards(data.player_slots);
        updateControlButtons();
    }
    
    socket.on("player_left", updateHost);
    socket.on("host_update", updateHost);
    

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
            playerCount.textContent = `${players.length}/4`;
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
    
    // Hàm lấy username hiện tại
    function getCurrentUsername() {
        return session.get("username");
    }
    
    // Thêm listener cho room_deleted
    socket.on('room_deleted', (data) => {
        console.log('Room deleted:', data);
        alert('Phòng đã bị xóa!');
        // Chuyển về trang danh sách phòng
        window.location.href = '/rooms';
    });

    // Trong file room_4.js
    socket.on('game_started', (data) => {
        const { game_state, message } = data;
        
        sessionStorage.setItem('game_state', JSON.stringify(game_state));
        showGameLoadingScreen();
        
        setTimeout(() => {
            window.location.href = `/game/${roomId}`; // Sửa currentRoomId thành roomId
        }, 1500);
    });

    function showGameLoadingScreen() {
        // Tạo và hiển thị màn hình loading
        const loadingScreen = document.createElement('div');
        loadingScreen.className = 'loading-screen';
        loadingScreen.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <h2>Game is starting...</h2>
                <p>Preparing game session...</p>
            </div>
        `;
        document.body.appendChild(loadingScreen);
    }

    let isDragging = false;
    let draggedCard = null;

    function initializeDragAndDrop() {
        const playerCards = document.querySelectorAll('.player-card');
        
        playerCards.forEach(card => {
            // Chỉ cho phép kéo thả card có người chơi
            if (card.querySelector('.player-name').textContent !== 'Waiting...') {
                card.setAttribute('draggable', true);
                
                card.addEventListener('dragstart', (e) => {
                    isDragging = true;
                    draggedCard = card;
                    e.dataTransfer.setData('text/plain', card.dataset.slot);
                    card.classList.add('dragging');
                });

                card.addEventListener('dragend', () => {
                    isDragging = false;
                    draggedCard = null;
                    card.classList.remove('dragging');
                });

                card.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    if (isDragging && draggedCard !== card) {
                        card.classList.add('drag-over');
                    }
                });

                card.addEventListener('dragleave', () => {
                    card.classList.remove('drag-over');
                });

                card.addEventListener('drop', (e) => {
                    e.preventDefault();
                    card.classList.remove('drag-over');

                    if (draggedCard) {
                        const fromSlot = parseInt(draggedCard.dataset.slot);
                        const toSlot = parseInt(card.dataset.slot);
                        
                        // Gửi yêu cầu swap slots lên server
                        socket.emit('swap_slots', {
                            room_id: currentRoomId,
                            from_slot: fromSlot,
                            to_slot: toSlot
                        });
                    }
                });
            }
        });
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

    // Lắng nghe sự kiện cập nhật vị trí từ server
    socket.on('slots_swapped', (data) => {
        renderPlayerCards(data.player_slots);
        initializeDragAndDrop();  // Khởi tạo lại drag & drop sau khi render
    });

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
