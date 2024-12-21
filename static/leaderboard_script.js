document.addEventListener("DOMContentLoaded", async () => {
    const tableBody = document.querySelector("table tbody");

    // Lấy dữ liệu từ Firebase
    async function fetchLeaderboardData() {
        try {
            const response = await fetch("https://beatball-18492-default-rtdb.asia-southeast1.firebasedatabase.app/users.json");
            const data = await response.json();

            const players = Object.entries(data).map(([id, playerData]) => ({
                avatar: playerData.profile_picture || "/static/images/default-avatar.png",
                username: playerData.username,
                matches: playerData.stats?.matches || 0,
                winMatches: playerData.stats?.win_matches || 0,
                point: playerData.stats?.point || 0,
                winrate: playerData.stats?.matches
                    ? ((playerData.stats.win_matches / playerData.stats.matches) * 100).toFixed(2)
                    : "0.00",
            }));

            // Sắp xếp theo `point` giảm dần và thêm rank
            players.sort((a, b) => b.point - a.point);
            players.forEach((player, index) => {
                player.rank = index + 1; // Bắt đầu từ 1
            });

            return players;
        } catch (error) {
            console.error("Error fetching leaderboard data:", error);
            return [];
        }
    }

    // Hiển thị dữ liệu trong bảng
    function renderLeaderboard(players) {
        tableBody.innerHTML = players
            .map(
                (player) => `
                <tr>
                    <td>${player.rank}</td>
                    <td class="player">
                        <img src="${player.avatar}" alt="Avatar">
                        ${player.username}
                    </td>
                    <td>${player.matches}</td>
                    <td>${player.winrate}</td>
                    <td>${player.point}</td>
                </tr>
            `
            )
            .join("");
    }

    // Load và hiển thị bảng leaderboard
    const players = await fetchLeaderboardData();
    renderLeaderboard(players);
});
