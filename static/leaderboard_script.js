const dataRanking = {
	elo_2vs2: [], 
    goal_ratio: [], // Data cho Goal Ratio
    winrate: [],    // Data cho Winrate
    assist_ratio: [], // Data cho Assist Ratio
    ga_match: []    // Data cho G/A Match
};

// Hàm để thêm data vào mảng tương ứng
function addData(category, rank, player, match, stats) {
    const statsScore = calculateStatsScore(category, stats, match);
    const newData = {
        rank: rank,
        player: player,
        match: match,
        stats: stats,
        score: statsScore
    };
    dataRanking[category].push(newData); // Thêm vào mảng tương ứng
}

// Hàm tính Stats_Score dựa trên category
function calculateStatsScore(category, stats, match) {
    switch (category) {
        case "elo_2vs2":
            return stats; 

        case "goal_ratio":
            return stats + match / 1e4; 

        case "winrate":
            return stats + match / 1e4; 

        case "assist_ratio":
            return stats + match / 1e4;

        case "ga_match":
            return stats + match / 1e4;

        default:
            console.warn("Unknown category:", category);
            return 0; 
    }
}


const tableBody = document.querySelector("table tbody");

function corresponding_category_name(category) {
    const categoryMapping = {
        goal_ratio: "Goal Ratio",
        winrate: "Winrate",
        assist_ratio: "Assist Ratio",
        ga_match: "G/A Ratio",
        elo_2vs2: "Elo"
    };

    // Trả về tên tương ứng hoặc giá trị mặc định
    return categoryMapping[category] || "Unknown Category";
}
// Hàm hiển thị data
function showData(category, eliminate = false) {
    tableBody.innerHTML = ""; // Xóa nội dung cũ
    
    // Render tiêu đề bảng
    tableBody.innerHTML += `
        <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Match</th>
            <th>${corresponding_category_name(category)}</th>
            ${eliminate ? "" : "<th>Score</th>"} <!-- Bỏ cột Score nếu eliminate = true -->
        </tr>
    `;
    
    // Render dữ liệu
    dataRanking[category].forEach((item) => {
        tableBody.innerHTML += `
            <tr>
                <td>${item.rank}</td>
                <td>${item.player}</td>
                <td>${item.match}</td>
                <td>${item.stats}</td>
                ${eliminate ? "" : `<td>${item.score.toFixed(2)}</td>`} <!-- Bỏ cột Score -->
            </tr>
        `;
    });
}



// Gán sự kiện click cho các button
document.querySelectorAll(".button-group button").forEach((btn) => {
    btn.addEventListener("click", (e) => {
        const buttonText = e.target.innerText;

        // Xác định mảng tương ứng với button
        if (buttonText.includes("Goal")) showData("goal_ratio");
        else if (buttonText.includes("Winrate")) showData("winrate");
        else if (buttonText.includes("Assist")) showData("assist_ratio");
        else if (buttonText.includes("G/A")) showData("ga_match");
		else if (buttonText.includes("2 vs 2")) showData("elo_2vs2", true); 

        // Thêm hiệu ứng active cho button
        document.querySelectorAll(".button-group button").forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
    });
});

function processRankingData(fileContent) {
    const lines = fileContent.split("\n");

    lines.forEach((line, index) => {
        if (!line.trim()) return;

        const [player, match, stats] = line.split(",").map(item => item.trim());

		let category;
        if (index >= 0 && index < 10) category = 'goal_ratio';
        else if (index >= 10 && index < 20) category = 'winrate';
        else if (index >= 20 && index < 30) category = 'assist_ratio';
        else if (index >= 30 && index < 40) category = 'ga_match';
        else if (index >= 40) category = 'elo_2vs2';

        const data = {
            rank: index % 10,
            player: player,
            match: parseInt(match),
            stats: parseFloat(stats),
            score: calculateStatsScore(category, parseFloat(stats), parseInt(match))
        };

        // Phân chia vào mảng tương ứng
        if (index >= 0 && index < 10) dataRanking.goal_ratio.push(data);
        else if (index >= 10 && index < 20) dataRanking.winrate.push(data);
        else if (index >= 20 && index < 30) dataRanking.assist_ratio.push(data);
        else if (index >= 30 && index < 40) dataRanking.ga_match.push(data);
        else if (index >= 40) dataRanking.elo_2vs2.push(data);
    });
}

// Hàm gọi Fetch API để load file txt
async function loadRankingFile() {
    try {
        const response = await fetch("/data"); // Đổi đường dẫn tới file của bạn
        const fileContent = await response.text();
        processRankingData(fileContent); // Xử lý nội dung file
        console.log("Data Ranking Loaded:", dataRanking); // In ra mảng đã phân loại
    } catch (error) {
        console.error("Error loading file:", error);
    }
}
function sortRankingData(order = "asc") {
    for (const category in dataRanking) {
        dataRanking[category].sort((a, b) => {
            if (order === "asc") {
                return a.score - b.score; // Sắp xếp tăng dần
            } else {
                return b.score - a.score; // Sắp xếp giảm dần
            }
        });
		dataRanking[category].forEach((item, index) => {
            item.rank = index + 1; // Cập nhật rank (bắt đầu từ 1)
        });
    }
}
// Gọi hàm sắp xếp khi cần
sortRankingData("asc"); // Sắp xếp tăng dần
document.addEventListener("DOMContentLoaded", async () => {
	await loadRankingFile(); 
	sortRankingData("dsc"); // Sắp xếp giảm dần 
    showData("elo_2vs2", true);
    document.querySelector(".button-group button").classList.add("active");
});
