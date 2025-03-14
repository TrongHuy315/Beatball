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
        const currentUserId = document.getElementById("current-user-id")?.value;
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
    
                // Thêm nút Kick nếu user hiện tại là host và không phải tự kick chính mình
                if (currentUserId === currentHostId && playerData.user_id !== currentHostId) {
                    const kickButton = document.createElement("button");
                    kickButton.className = "kick-btn";
                    kickButton.textContent = "Kick";
                    kickButton.addEventListener("click", () => {
                        if (confirm(`Are you sure you want to kick ${playerData.username}?`)) {
                            socket.emit("kick_player", {
                                room_id: currentRoomId,
                                user_id: playerData.user_id
                            });
                        }
                    });
                    card.appendChild(kickButton);
                }
    
                // Set draggable attribute cho tất cả card có người chơi
                card.setAttribute("draggable", "true");
            } else {
                // Slot trống
                card.innerHTML = `
                    <div class="avatar" style="background-image: url('/static/images/default-avatar.png')"></div>
                    <p class="player-name">Waiting...</p>
                    <p class="player-score"></p>
                `;
                // Set draggable cho cả slot trống để có thể drop vào
                card.setAttribute("draggable", "true");
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

    // Trong file room_4.js
    socket.on('game_created', (data) => {
        const { room_id, game_state, message } = data;
        
        // Lưu game state vào sessionStorage để có thể truy cập ở trang game
        sessionStorage.setItem('game_state', JSON.stringify(game_state));
        
        // Hiển thị loading screen
        showGameLoadingScreen();
        
        // Redirect sau 1.5s
        setTimeout(() => {
            window.location.href = `/game/${room_id}`;
        }, 1500);
    });
    
    function showGameLoadingScreen() {
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
            // Dragstart event
            card.addEventListener('dragstart', (e) => {
                console.log('Drag started');
                const playerName = card.querySelector('.player-name')?.textContent;
                if (playerName === 'Waiting...') {
                    e.preventDefault();
                    return;
                }
                draggedCard = card;
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', card.dataset.slot);
            });
    
            // Dragover event
            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (draggedCard && draggedCard !== card) {
                    card.classList.add('drag-over');
                }
            });
    
            // Dragleave event
            card.addEventListener('dragleave', (e) => {
                card.classList.remove('drag-over');
            });
    
            // Drop event
            card.addEventListener('drop', (e) => {
                e.preventDefault();
                console.log('Drop event triggered');
                card.classList.remove('drag-over');
    
                if (draggedCard && draggedCard !== card) {
                    const fromSlot = parseInt(draggedCard.dataset.slot);
                    const toSlot = parseInt(card.dataset.slot);
    
                    console.log('Swapping slots:', { fromSlot, toSlot });
    
                    if (!isNaN(fromSlot) && !isNaN(toSlot) && fromSlot !== toSlot) {
                        socket.emit('swap_slots', {
                            room_id: roomId,
                            from_slot: fromSlot,
                            to_slot: toSlot
                        });
                    }
                }
            });
    
            // Dragend event
            card.addEventListener('dragend', (e) => {
                card.classList.remove('dragging');
                draggedCard = null;
                // Remove drag-over class from all cards
                document.querySelectorAll('.player-card').forEach(c => {
                    c.classList.remove('drag-over');
                });
            });
        });
    }       

    // Thêm xử lý sự kiện ready button
    document.getElementById('ready-btn')?.addEventListener('click', function() {
        const isReady = this.classList.toggle('ready');
        socket.emit('player_ready', {
            room_id: roomId,
            username: document.getElementById('current-username').value,
            is_ready: isReady
        });
    });

    // Lắng nghe sự kiện player_ready_update từ server
    socket.on('player_ready_update', (data) => {
        console.log('Ready update received:', data);
        const playerCards = document.querySelectorAll('.player-card');
        
        playerCards.forEach(card => {
            const playerName = card.querySelector('.player-name');
            if (playerName && playerName.textContent === data.username) {
                const readyMarker = card.querySelector('.ready-marker');
                if (data.is_ready) {
                    if (!readyMarker) {
                        const marker = document.createElement('div');
                        marker.className = 'ready-marker';
                        marker.textContent = 'Ready';
                        card.appendChild(marker);
                    }
                } else if (readyMarker) {
                    readyMarker.remove();
                }
            }
        });
        
        // Cập nhật trạng thái nút Start Game
        if (data.can_start) {
            const startBtn = document.getElementById('start-game-btn');
            if (startBtn) {
                startBtn.disabled = false;
            }
        }
    });

    // Sửa lại hàm updateControlButtons
    function updateControlButtons() {
        const currentUserId = document.getElementById("current-user-id")?.value;
        const isHost = currentUserId === currentHostId;
        console.log("Checking host status:", {currentUserId, currentHostId, isHost});
    
        const readyBtn = document.getElementById("ready-btn");
        const startBtn = document.getElementById("start-game-btn");
    
        if (readyBtn && startBtn) {
            if (isHost) {
                readyBtn.style.display = "none"; 
                startBtn.style.display = "block";
    
                // Convert NodeList to Array before using filter
                const team1 = Array.from(document.querySelectorAll('.team-1 .player-card'))
                    .filter(card => card.querySelector('.player-name')?.textContent !== 'Waiting...');
                const team2 = Array.from(document.querySelectorAll('.team-2 .player-card'))
                    .filter(card => card.querySelector('.player-name')?.textContent !== 'Waiting...');
    
                // Đếm tổng số người chơi và số người ready
                const totalPlayers = team1.length + team2.length;
                const readyPlayers = document.querySelectorAll('.player-card .ready-marker').length;
                const expectedReadyCount = totalPlayers - 1; // Trừ host
    
                console.log("Game conditions:", {
                    team1Count: team1.length,
                    team2Count: team2.length,
                    totalPlayers,
                    readyPlayers,
                    expectedReadyCount
                });
    
                // Check điều kiện start game
                const eachTeamHasPlayer = team1.length > 0 && team2.length > 0;
                const allNonHostReady = (totalPlayers === 1) || (readyPlayers === expectedReadyCount);
    
                startBtn.disabled = !(eachTeamHasPlayer && allNonHostReady);
                startBtn.style.opacity = startBtn.disabled ? "0.5" : "1";
                
                console.log("Start button state:", {
                    eachTeamHasPlayer,
                    allNonHostReady,
                    disabled: startBtn.disabled
                });
            } else {
                readyBtn.style.display = "block";
                startBtn.style.display = "none";
            }
        }
    }

    // Thêm xử lý nút Start Game
    document.getElementById('start-game-btn')?.addEventListener('click', function() {
        if (!this.disabled) {
            console.log("Checking game conditions...");
            
            // Convert NodeList to Array before using filter
            const team1 = Array.from(document.querySelectorAll('.team-1 .player-card'))
                .filter(card => card.querySelector('.player-name')?.textContent !== 'Waiting...');
            const team2 = Array.from(document.querySelectorAll('.team-2 .player-card'))
                .filter(card => card.querySelector('.player-name')?.textContent !== 'Waiting...');
            
            console.log("Team counts:", {
                team1: team1.length,
                team2: team2.length
            });
    
            const readyMarkers = document.querySelectorAll('.player-card .ready-marker');
            console.log("Ready players:", readyMarkers.length);
    
            if (team1.length > 0 && team2.length > 0) {
                console.log("Starting game...");
                socket.emit('start_game', { 
                    room_id: roomId,
                    teams: {
                        team1: team1.length,
                        team2: team2.length
                    }
                });
            } else {
                alert("Each team must have at least one player.");
            }
        }
    });

    function canStartGame() {
        const team1 = Array.from(document.querySelectorAll('.team-1 .player-card:not(:empty)'));
        const team2 = Array.from(document.querySelectorAll('.team-2 .player-card:not(:empty)'));
        const readyPlayers = document.querySelectorAll('.player-card.ready');
    
        // Mỗi đội phải có ít nhất 1 người
        if (team1.length === 0 || team2.length === 0) {
            alert("Each team must have at least 1 player.");
            return false;
        }
    
        // Tất cả người chơi (trừ host) phải sẵn sàng
        const totalPlayers = team1.length + team2.length;
        if (readyPlayers.length < totalPlayers - 1) {
            alert("All players must be ready.");
            return false;
        }
    
        return true;
    }    

    // Lắng nghe sự kiện cập nhật vị trí từ server
    socket.on('slots_swapped', (data) => {
        renderPlayerCards(data.player_slots);
        initializeDragAndDrop();  // Khởi tạo lại drag & drop sau khi render
    });

    socket.on('game_error', (data) => {
        alert(data.message);
    });

    socket.on("player_kicked", (data) => {
        if (data.user_id === currentUserId) {
            alert("You have been kicked from the room.");
            window.location.href = "/home";
        } else {
            renderPlayerCards(data.player_slots);
        }
    });

    // Thêm xử lý sự kiện click Join Room
    async function joinRoom(roomId) {
        try {
            console.log(`Attempting to join room ${roomId}`);
            
            const response = await fetch(`/join-room/${roomId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            console.log('Join room response:', data);

            if (response.ok) {
                // Redirect to room page on success
                window.location.href = `/room/${roomId}`;
            } else {
                // Show error message
                alert(data.error || 'Failed to join room');
            }
        } catch (error) {
            console.error('Error joining room:', error);
            alert('Failed to join room. Please try again.');
        }
    }
});
