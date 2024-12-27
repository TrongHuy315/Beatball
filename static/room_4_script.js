document.addEventListener("DOMContentLoaded", async () => {
    const socket = io();
    const roomId = document.getElementById("room-id").value; // Lấy room_id từ input hidden
    const currentRoomId = roomId; // Thêm dòng này

    // Thêm flag để đánh dấu reload
    let isReloading = false;
    window.onbeforeunload = function() {
        isReloading = true;
    };

    window.addEventListener("beforeunload", function(e) {
        const navigationEntries = performance.getEntriesByType("navigation")[0];

        if (navigationEntries && navigationEntries.type === "reload") {
            // Nếu trang được reload, đánh dấu không gửi yêu cầu rời phòng
            isReloading = true;
        } else {
            // Gửi yêu cầu rời phòng nếu không phải reload
            fetch(`/leave-room/${roomId}`, {
                method: "POST",
                keepalive: true
            });
        }
    });

    const playerCardsContainer = document.getElementById("player-cards");
    let currentPlayers = [];

    // Tham gia phòng qua Socket.IO
    socket.emit("join_room", { room_id: roomId });

    // Thêm listener cho host_sync event
    socket.on("host_sync", (data) => {
        console.log("Host sync received:", data);
        currentHostId = data.host_id;
        renderPlayerCards(data.player_slots);
    });

    // Sửa lại hàm fetchPlayerData
    async function fetchPlayerData() {
        try {
            const response = await fetch(`/room-data/${roomId}`);
            if (!response.ok) {
                console.error("Failed to fetch player data:", response.status);
                return [];
            }
            const data = await response.json();
            if (!data.success) {
                console.error("Failed to fetch room data:", data.error);
                return [];
            }
    
            // Đồng bộ thông tin người chơi
            renderPlayerCards(data.player_slots);
        } catch (error) {
            console.error("Error fetching player data:", error);
        }
    }

    // Hiển thị player cards
    function renderPlayerCards(playerSlots) {
        const playerCardsContainer = document.getElementById("player-cards");
        if (!playerCardsContainer) return;
    
        playerCardsContainer.innerHTML = "";
    
        // Render các slot người chơi
        playerSlots.forEach((slot, index) => {
            const card = document.createElement("div");
            card.className = "player-card";
            card.dataset.slot = index;
    
            if (slot && slot.username) {
                card.innerHTML = `
                    <div class="avatar" style="background-image: url('${slot.avatar || "/static/images/default-avatar.png"}')"></div>
                    <p class="player-name">${slot.username}</p>
                    <p class="player-score">Rating: ${slot.score || 1000}</p>
                    ${slot.is_host ? '<div class="host-marker">Host</div>' : ''}
                `;
            } else {
                card.innerHTML = `
                    <div class="avatar" style="background-image: url('/static/images/default-avatar.png')"></div>
                    <p class="player-name">Waiting...</p>
                    <p class="player-score"></p>
                `;
            }
    
            playerCardsContainer.appendChild(card);
        });
    }    

    // Thêm biến để lưu host_id
    let currentHostId = null;

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
    socket.on("disconnect", () => {
        if (!isReloading) {
            fetch(`/leave-room/${roomId}`, {
                method: "POST",
                keepalive: true
            });
        }
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
        
        sessionStorage.setItem('game_state', JSON.stringify(game_state));
        showGameLoadingScreen();
        
        setTimeout(() => {
            window.location.href = `/game/${roomId}`; // Sửa currentRoomId thành roomId
        }, 1500);
    });

    // Thêm event listener cho host_update
    socket.on("host_update", (data) => {
        console.log("Host update event:", data);
        currentHostId = data.host_id;
        renderPlayerCards(data.player_slots);
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
