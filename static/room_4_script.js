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
            if (!roomId) {
                console.error("roomId is not defined.");
                return [];
            }
    
            const response = await fetch(`/room-data/${roomId}`);
            if (!response.ok) {
                console.error(`Failed to fetch player data: ${response.status} ${response.statusText}`);
                return [];
            }
    
            const playerSlots = await response.json();
            console.log("Fetched player slots:", playerSlots);
    
            if (Array.isArray(playerSlots)) {
                currentPlayers = playerSlots.filter(slot => slot !== null).map(slot => slot.username);
                renderPlayerCards(playerSlots);
                
                // Kiểm tra và cập nhật UI cho host
                const currentUsername = document.getElementById("current-username").value;
                const currentPlayerSlot = playerSlots.find(slot => slot && slot.username === currentUsername);
                if (currentPlayerSlot && currentPlayerSlot.is_host) {
                    const hostControls = document.querySelectorAll('.host-only');
                    hostControls.forEach(el => {
                        el.style.display = 'block';
                    });
                    
                    const startButton = document.getElementById('start-game-btn');
                    const readyButton = document.getElementById('ready-btn');
                    if (startButton && readyButton) {
                        startButton.style.display = 'block';
                        readyButton.style.display = 'none';
                    }
                }
            }
            return playerSlots;
    
        } catch (error) {
            console.error("Error fetching player data:", error);
            return [];
        }
    }

    // Hiển thị player cards
    function renderPlayerCards(playerSlots) {
        const playerCardsContainer = document.getElementById("player-cards");
        if (!playerCardsContainer) return;
    
        const currentUsername = document.getElementById("current-username").value;
        
        playerCardsContainer.innerHTML = "";
        
        const team1 = document.createElement("div");
        team1.className = "team team-1";
        const team2 = document.createElement("div");
        team2.className = "team team-2";
        
        const vsDiv = document.createElement("div");
        vsDiv.className = "vs-divider";
        vsDiv.innerHTML = '<img src="/static/vs-icon.png" class="vs-icon" alt="VS">';
    
        // Render mỗi slot theo vị trí cố định
        for (let i = 0; i < 4; i++) {
            const card = document.createElement("div");
            card.className = "player-card";
            card.dataset.slot = i;
            
            const playerData = playerSlots[i];
            
            if (playerData && playerData.username) {
                // Slot có người chơi
                card.innerHTML = `
                    <div class="avatar" style="background-image: url('${playerData.avatar || "/static/images/default-avatar.png"}')"></div>
                    <p class="player-name">${playerData.username}</p>
                    <p class="player-score">Rating: ${playerData.score || 1000}</p>
                    ${playerData.is_host ? '<div class="host-marker">Host</div>' : ''}
                    ${playerData.is_ready ? '<div class="ready-marker">Ready</div>' : ''}
                `;
                
                // Chỉ cho phép kéo thả nếu là người chơi hiện tại
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
    
            if (i < 2) {
                team1.appendChild(card);
            } else {
                team2.appendChild(card);
            }
        }
    
        playerCardsContainer.appendChild(team1);
        playerCardsContainer.appendChild(vsDiv);
        playerCardsContainer.appendChild(team2);
    
        // Khởi tạo lại drag & drop
        initializeDragAndDrop();
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
                const currentUsername = document.getElementById("current-username").value;
                // Tìm username của host mới
                let newHostUsername = null;
                for (const slot of data.player_slots) {
                    if (slot && slot.user_id === data.new_host_id) {
                        newHostUsername = slot.username;
                        break;
                    }
                }
                
                // Kiểm tra xem người chơi hiện tại có phải là host mới không
                const isNewHost = currentUsername === newHostUsername;
                console.log("Is new host:", isNewHost);
    
                // Cập nhật UI dựa trên vai trò mới
                const hostControls = document.querySelectorAll('.host-only');
                hostControls.forEach(el => {
                    el.style.display = isNewHost ? 'block' : 'none';
                });
    
                // Cập nhật các nút Start/Ready
                const startButton = document.getElementById('start-game-btn');
                const readyButton = document.getElementById('ready-btn');
                
                if (startButton && readyButton) {
                    if (isNewHost) {
                        startButton.style.display = 'block';
                        readyButton.style.display = 'none';
                    } else {
                        startButton.style.display = 'none';
                        readyButton.style.display = 'block';
                    }
                }
    
                // Hiển thị thông báo về việc thay đổi host
                if (isNewHost) {
                    alert("Bạn đã trở thành chủ phòng mới!");
                }
            }
            
            // Cập nhật danh sách người chơi
            if (data.current_players) {
                updatePlayerList(data.current_players, data.new_host_id);
            }
        }
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
    
    // Thêm listener cho socket disconnect
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        // Có thể thêm xử lý khi mất kết nối
    });
    
    // Thêm listener cho room_deleted
    socket.on('room_deleted', (data) => {
        console.log('Room deleted:', data);
        alert('Phòng đã bị xóa!');
        // Chuyển về trang danh sách phòng
        window.location.href = '/rooms';
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

    // Trong file room_4.js
    socket.on('game_started', (data) => {
        const { game_state, message } = data;
        
        // Lưu game state vào session storage để có thể sử dụng ở trang game
        sessionStorage.setItem('game_state', JSON.stringify(game_state));
        
        // Hiển thị animation loading
        showGameLoadingScreen();
        
        // Chuyển hướng đến trang game sau khi animation hoàn tất
        setTimeout(() => {
            window.location.href = `/game/${currentRoomId}`;
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

    // Lắng nghe sự kiện cập nhật vị trí từ server
    socket.on('slots_swapped', (data) => {
        renderPlayerCards(data.player_slots);
        initializeDragAndDrop();  // Khởi tạo lại drag & drop sau khi render
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
