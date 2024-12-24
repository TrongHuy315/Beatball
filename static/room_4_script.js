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
                const currentUserId = session.get("user_id"); // Lấy user_id từ session
                console.log("Current user ID:", currentUserId);
                console.log("New host ID:", data.new_host_id);
                
                // Kiểm tra xem người chơi hiện tại có phải là host mới không
                const isNewHost = data.new_host_id === currentUserId;
                console.log("Is new host:", isNewHost);
    
                // Cập nhật UI dựa trên vai trò mới
                const hostControls = document.querySelectorAll('.host-only');
                hostControls.forEach(el => {
                    el.style.display = isNewHost ? 'block' : 'none';
                });
    
                // Cập nhật các nút Start/Ready nếu cần
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
                // Cập nhật số lượng người chơi
                const playerCount = document.getElementById('player-count');
                if (playerCount) {
                    playerCount.textContent = `${data.current_players.length}/${data.player_slots.length}`;
                }
    
                // Cập nhật danh sách người chơi trong UI
                const playerList = document.getElementById('player-list');
                if (playerList) {
                    playerList.innerHTML = '';
                    data.current_players.forEach(player => {
                        const playerElement = document.createElement('div');
                        playerElement.className = 'player-item';
                        playerElement.textContent = player;
                        
                        // Đánh dấu host nếu có
                        if (data.new_host_id && player === getCurrentUsername()) {
                            playerElement.classList.add('host');
                            playerElement.innerHTML += ' (Chủ phòng)';
                        }
                        
                        playerList.appendChild(playerElement);
                    });
                }
    
                // Cập nhật trạng thái sẵn sàng của game nếu cần
                const startButton = document.getElementById('start-game-btn');
                if (startButton && data.current_players.length >= 2) {
                    startButton.disabled = false;
                } else if (startButton) {
                    startButton.disabled = true;
                }
            }
    
            // Cập nhật các card slots
            updatePlayerCards(data.player_slots);
        }
    });
    
    // Hàm cập nhật card slots
    function updatePlayerCards(playerSlots) {
        const cardContainer = document.querySelector('.card-container');
        if (!cardContainer) return;
    
        playerSlots.forEach((slot, index) => {
            const cardElement = cardContainer.children[index];
            if (!cardElement) return;
    
            if (slot) {
                cardElement.querySelector('.player-name').textContent = slot.username;
                cardElement.classList.add('occupied');
                
                // Đánh dấu host
                const hostMarker = cardElement.querySelector('.host-marker');
                if (hostMarker) {
                    hostMarker.style.display = slot.is_host ? 'block' : 'none';
                }
            } else {
                cardElement.querySelector('.player-name').textContent = 'Trống';
                cardElement.classList.remove('occupied');
                
                const hostMarker = cardElement.querySelector('.host-marker');
                if (hostMarker) {
                    hostMarker.style.display = 'none';
                }
            }
        });
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
