// Lấy button chính
const lobbyButton = document.getElementById("lobby-button");
const vs2Button = document.getElementById("vs2-button");

// Hàm tạo 2 tùy chọn (Create Room và Find Room)
function showRoomOptions() {
    // Xóa container cũ nếu tồn tại
    const oldOptions = document.getElementById("room-options");
    if (oldOptions) oldOptions.remove();

    // Tạo container mới
    const optionsContainer = document.createElement("div");
    optionsContainer.id = "room-options";
    optionsContainer.style.position = "absolute";
    optionsContainer.style.top = "50%";
    optionsContainer.style.left = "50%";
    optionsContainer.style.transform = "translate(-50%, -50%)";
    optionsContainer.style.display = "flex";
    optionsContainer.style.flexDirection = "column";
    optionsContainer.style.gap = "15px";
    optionsContainer.style.alignItems = "center";
    optionsContainer.style.padding = "20px";
    optionsContainer.style.backgroundColor = "#f9f9f9";
    optionsContainer.style.border = "1px solid #ddd";
    optionsContainer.style.borderRadius = "8px";
    optionsContainer.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
    optionsContainer.style.width = "220px"; // Giới hạn chiều rộng
    optionsContainer.style.height = "auto"; // Tự điều chỉnh chiều cao
    optionsContainer.style.overflow = "hidden";

    // Tạo nút Close
    const closeButton = document.createElement("button");
    closeButton.textContent = "X";
    closeButton.style.alignSelf = "flex-end";
    closeButton.style.background = "transparent";
    closeButton.style.border = "none";
    closeButton.style.cursor = "pointer";
    closeButton.style.color = "#aaa";
    closeButton.style.fontSize = "20px";
    closeButton.addEventListener("click", () => {
        optionsContainer.remove();
    });

    // Tạo nút Create Room
    const createRoomButton = document.createElement("button");
    createRoomButton.textContent = "Create Room";
    createRoomButton.className = "room-button";

    // Tạo nút Find Room
    const findRoomButton = document.createElement("button");
    findRoomButton.textContent = "Find Room";
    findRoomButton.className = "room-button";

    // Gắn sự kiện khi bấm vào Find Room
    findRoomButton.addEventListener("click", () => {
        showInputBox(optionsContainer);
    });

    // Thêm các phần tử vào container
    optionsContainer.appendChild(closeButton);
    optionsContainer.appendChild(createRoomButton);
    optionsContainer.appendChild(findRoomButton);

    // Thêm container vào body
    document.body.appendChild(optionsContainer);
}

// Hàm hiển thị ô nhập liệu
function showInputBox(container) {
    // Ẩn các nút Create Room và Find Room
    const buttons = container.querySelectorAll(".room-button");
    buttons.forEach(button => button.style.display = "none");

    // Xóa ô nhập liệu cũ nếu có
    const oldInput = document.getElementById("input-box");
    const oldCancel = document.getElementById("cancel-button");
    if (oldInput) oldInput.remove();
    if (oldCancel) oldCancel.remove();

    // Tạo ô nhập
    const inputBox = document.createElement("input");
    inputBox.id = "input-box";
    inputBox.type = "text";
    inputBox.placeholder = "Enter room code...";
    inputBox.style.padding = "8px";
    inputBox.style.border = "1px solid #ccc";
    inputBox.style.borderRadius = "5px";
    inputBox.style.width = "100%";
    inputBox.style.marginTop = "10px";

    // Tạo nút Cancel
    const cancelButton = document.createElement("button");
    cancelButton.id = "cancel-button";
    cancelButton.textContent = "Cancel";
    cancelButton.className = "room-button";
    cancelButton.style.marginTop = "10px";
    cancelButton.style.backgroundColor = "#e74c3c";
    cancelButton.style.color = "white";

    // Gắn sự kiện khi bấm Cancel
    cancelButton.addEventListener("click", () => {
        // Xóa ô nhập và nút Cancel
        inputBox.remove();
        cancelButton.remove();
        // Hiển thị lại các nút Create Room và Find Room
        buttons.forEach(button => button.style.display = "block");
    });

    // Thêm ô nhập và nút Cancel vào container
    container.appendChild(inputBox);
    container.appendChild(cancelButton);
}


// Gắn sự kiện click cho button Lobby và 2 vs 2
lobbyButton.addEventListener("click", showRoomOptions);
vs2Button.addEventListener("click", showRoomOptions);
