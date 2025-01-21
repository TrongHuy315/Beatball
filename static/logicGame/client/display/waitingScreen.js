class WaitingScreen {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.mockData = {
            redTeam: [{
                name: "Kylian Mbappe",
                elo: 1500,
                matches: 150,
                winrate: "65%",
                goalRatio: "1.2",
                assistRatio: "0.8",
                gaRatio: "2.0"
            }, {
                name: "Lionel Messi",
                elo: 1600,
                matches: 200,
                winrate: "70%",
                goalRatio: "1.5",
                assistRatio: "0.9",
                gaRatio: "2.4"
            }],
            blueTeam: [{
                name: "Cristiano Ronaldo",
                elo: 1450,
                matches: 120,
                winrate: "60%",
                goalRatio: "1.1",
                assistRatio: "0.7",
                gaRatio: "1.8"
            }, {
                name: "Neymar Junior",
                elo: 1550,
                matches: 180,
                winrate: "68%",
                goalRatio: "1.3",
                assistRatio: "1.0",
                gaRatio: "2.3"
            }]
        };
        this.statsInterval = null;
    }
    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            ${style.textContent}
    
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .loading-circle {
                width: 50px;
                height: 50px;
                border: 3px solid rgba(255, 255, 255, 0.1);
                border-top: 2px solid white;
                border-radius: 50%;
                animation: spin 0.75s linear infinite;
                margin: 0 auto;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            @keyframes pulse {
                0% { transform: scale(1); opacity: 0.5; }
                50% { transform: scale(1.05); opacity: 1; }
                100% { transform: scale(1); opacity: 0.5; }
            }

            @keyframes glowPulse {
                0% { box-shadow: 0 0 5px rgba(255,255,255,0.1); }
                50% { box-shadow: 0 0 20px rgba(255,255,255,0.2); }
                100% { box-shadow: 0 0 5px rgba(255,255,255,0.1); }
            }

            @keyframes borderGlow {
                0% { border-color: rgba(255,255,255,0.1); }
                50% { border-color: rgba(255,255,255,0.3); }
                100% { border-color: rgba(255,255,255,0.1); }
            }

            .stat-box {
                transition: all 0.3s ease;
                animation: glowPulse 2s infinite;
            }
            
            .stat-box:hover {
                transform: translateY(-2px) scale(1.02);
                background: rgba(255,255,255,0.08) !important;
            }

            .player-card {
                transition: all 0.3s ease;
            }

            .player-card:hover {
                transform: scale(1.02);
            }

            .message {
                transition: all 0.3s ease;
            }

            .message:hover {
                transform: translateX(5px);
                background: rgba(255,255,255,0.08) !important;
            }

            ::-webkit-scrollbar {
                width: 6px;
            }

            ::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 3px;
            }

            ::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 3px;
            }

            ::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .loading-dot {
                width: 12px;
                height: 12px;
                background: white;
                border-radius: 50%;
                display: inline-block;
                margin: 0 3px;
                animation: pulse 1.5s infinite;
            }

            .loading-dot:nth-child(2) {
                animation-delay: 0.5s;
            }

            .loading-dot:nth-child(3) {
                animation-delay: 1s;
            }
        `;
        document.head.appendChild(style);
    }
    show() {
        this.injectStyles();
        this.container = document.createElement('div');
        this.container.id = 'waiting-screen';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            background: linear-gradient(135deg, rgba(0,0,0,0.97) 0%, rgba(20,20,20,0.95) 100%);
            backdrop-filter: blur(10px);
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
            z-index: 1000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: white;
            padding-top: 3rem;
        `;
        const mainContent = document.createElement('div');
        mainContent.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 2fr 1fr;
            gap: 2rem;
            width: 95%;
            max-width: 1600px;
            height: 90vh;
        `;
        const redTeamContainer = this.createTeamContainer(this.mockData.redTeam, 'red');
        const centerContainer = this.createCenterContainer();
        const blueTeamContainer = this.createTeamContainer(this.mockData.blueTeam, 'blue');
        mainContent.appendChild(redTeamContainer);
        mainContent.appendChild(centerContainer);
        mainContent.appendChild(blueTeamContainer);
        this.container.appendChild(mainContent);
        document.body.appendChild(this.container);
        this.startStatsRotation();
    }
    createTeamContainer(team, side) {
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            background: ${side === 'red' 
                ? 'linear-gradient(135deg, rgba(255,0,0,0.1), transparent 70%)'
                : 'linear-gradient(-135deg, rgba(0,0,255,0.1), transparent 70%)'
            };
            padding: 1rem;
            border-radius: 20px;
            position: relative;
            overflow: hidden;
        `;
        // Add glowing border effect
        const borderGlow = document.createElement('div');
        borderGlow.style.cssText = `
            position: absolute;
            top: 0;
            ${side === 'red' ? 'left: 0' : 'right: 0'};
            width: 3px;
            height: 100%;
            background: ${side === 'red' 
                ? 'linear-gradient(to bottom, rgba(255,0,0,0.5), transparent)'
                : 'linear-gradient(to bottom, rgba(0,0,255,0.5), transparent)'
            };
            filter: blur(2px);
        `;
        container.appendChild(borderGlow);
        const playersSection = document.createElement('div');
        playersSection.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 1rem;
        `;
        team.forEach(player => {
            const playerCard = this.createPlayerCard(player, side);
            playersSection.appendChild(playerCard);
        });
        const statsSection = document.createElement('div');
        statsSection.style.cssText = `
            flex: 1;
            background: rgba(25, 25, 25, 0.95);
            border-radius: 15px;
            padding: 1.5rem;
            backdrop-filter: blur(5px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255,255,255,0.05);
        `;
        statsSection.id = `${side}-stats`;
        container.appendChild(playersSection);
        container.appendChild(statsSection);
        return container;
    }
    createPlayerCard(player, side) {
        const card = document.createElement('div');
        card.className = 'player-card';
        const isBlue = side === 'blue';
        const borderStyle = isBlue ? 'border-right' : 'border-left';
        const textAlign = isBlue ? 'right' : 'left';
        const gradientDirection = isBlue ? '-135deg' : '135deg';
        card.style.cssText = `
            background: linear-gradient(${gradientDirection}, 
                rgba(45, 45, 45, 0.95), 
                rgba(35, 35, 35, 0.98));
            ${borderStyle}: 4px solid ${side === 'red' ? '#ff4444' : '#4444ff'};
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            text-align: ${textAlign};
            position: relative;
            overflow: hidden;
        `;
        // Add subtle background pattern
        const pattern = document.createElement('div');
        pattern.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            opacity: 0.03;
            background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0);
            background-size: 10px 10px;
            pointer-events: none;
        `;
        card.appendChild(pattern);
        const nameDiv = document.createElement('div');
        nameDiv.style.cssText = `
            font-size: 1.5rem;
            font-weight: bold;
            color: ${side === 'red' ? '#ff8888' : '#8888ff'};
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            position: relative;
        `;
        nameDiv.textContent = player.name;
        card.appendChild(nameDiv);
        // Enhance hover effects
        card.addEventListener('mouseover', () => {
            card.style.transform = 'scale(1.02)';
            card.style.boxShadow = `
                0 10px 30px rgba(0,0,0,0.4),
                0 0 20px ${side === 'red' ? 'rgba(255,68,68,0.3)' : 'rgba(68,68,255,0.3)'}
            `;
            pattern.style.opacity = '0.06';
        });
        card.addEventListener('mouseout', () => {
            card.style.transform = 'scale(1)';
            card.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
            pattern.style.opacity = '0.03';
        });
        return card;
    }
    createCenterContainer() {
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 2rem;
        `;
        // Enhanced status section
        const statusSection = document.createElement('div');
        statusSection.style.cssText = `
            text-align: center;
            padding: 2rem;
            background: rgba(25, 25, 25, 0.95);
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255,255,255,0.05);
            position: relative;
            overflow: hidden;
        `;
        const statusText = document.createElement('div');
        statusText.style.cssText = `
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 2rem;
            background: linear-gradient(135deg, #fff 30%, #a8a8a8 70%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 2px 10px rgba(255,255,255,0.1);
        `;
        statusText.textContent = 'Creating Match';
        const loadingCircle = document.createElement('div');
        loadingCircle.className = 'loading-circle';
        statusSection.appendChild(statusText);
        statusSection.appendChild(loadingCircle);
        // Chat section
        const chatSection = document.createElement('div');
        chatSection.style.cssText = `
            flex: 1;
            background: rgba(25, 25, 25, 0.95);
            border-radius: 15px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255,255,255,0.05);
            overflow: hidden;
            max-height: calc(100vh - 300px); /* Thêm max-height */
        `;
        const chatMessages = document.createElement('div');
        chatMessages.style.cssText = `
            flex: 1;
            padding: 1rem;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        `;
        const messages = ["Welcome to the game!", "Get ready for an exciting match!", "Good luck to both teams!"];
        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message';
            messageDiv.style.cssText = `
                padding: 0.8rem 1.2rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
                font-size: 0.9rem;
                border: 1px solid rgba(255,255,255,0.05);
            `;
            messageDiv.textContent = msg;
            chatMessages.appendChild(messageDiv);
        });
        chatSection.appendChild(chatMessages);
        chatSection.appendChild(this.createChatInput());
        container.appendChild(statusSection);
        container.appendChild(chatSection);
        return container;
    }
    createChatInput() {
        const chatInput = document.createElement('div');
        chatInput.style.cssText = `
            padding: 1rem;
            border-top: 1px solid rgba(255,255,255,0.05);
            display: flex;
            gap: 1rem;
            background: rgba(20, 20, 20, 0.95);
        `;
        const input = document.createElement('input');
        input.style.cssText = `
            flex: 1;
            padding: 0.8rem 1.2rem;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255, 255, 255, 0.05);
            color: white;
            font-size: 0.9rem;
            outline: none;
            transition: all 0.3s ease;
        `;
        input.type = 'text';
        input.spellcheck = false;
        input.autocomplete = 'off';
        input.placeholder = 'Type a message...';
        const keydownHandler = (e) => {
            e.stopPropagation();
        };
        const keypressHandler = (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                sendMessage();
            }
        };
        input.addEventListener('keydown', keydownHandler);
        input.addEventListener('keypress', keypressHandler);
        const sendButton = document.createElement('button');
        sendButton.style.cssText = `
            padding: 0.8rem 1.5rem;
            border-radius: 10px;
            border: none;
            background: linear-gradient(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
            color: white;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        sendButton.textContent = 'Send';
        const mouseoverHandler = () => {
            sendButton.style.background = 'linear-gradient(45deg, rgba(255,255,255,0.15), rgba(255,255,255,0.1))';
        };
        const mouseoutHandler = () => {
            sendButton.style.background = 'linear-gradient(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))';
        };
        sendButton.addEventListener('mouseover', mouseoverHandler);
        sendButton.addEventListener('mouseout', mouseoutHandler);
        const sendMessage = () => {
            const messageText = input.value.trim();
            if (messageText) {
                const chatMessages = document.querySelector('div[style*="overflow-y: auto"]');
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message';
                messageDiv.style.cssText = `
                    padding: 0.8rem 1.2rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                    font-size: 0.9rem;
                    border: 1px solid rgba(255,255,255,0.05);
                    animation: fadeIn 0.3s ease;
                `;
                messageDiv.textContent = messageText;
                chatMessages.appendChild(messageDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                input.value = '';
            }
        };
        const clickHandler = () => sendMessage();
        sendButton.addEventListener('click', clickHandler);
        // Lưu tất cả handlers vào element để có thể remove sau này
        input.cleanupHandlers = {
            keydown: keydownHandler,
            keypress: keypressHandler
        };
        sendButton.cleanupHandlers = {
            click: clickHandler,
            mouseover: mouseoverHandler,
            mouseout: mouseoutHandler
        };
        chatInput.appendChild(input);
        chatInput.appendChild(sendButton);
        // Lưu references của các elements để cleanup
        chatInput.elements = {
            input,
            sendButton
        };
        return chatInput;
    }
    startStatsRotation() {
        let currentPlayerIndex = 0;
        const updateStats = () => {
            const redPlayer = this.mockData.redTeam[currentPlayerIndex];
            const bluePlayer = this.mockData.blueTeam[currentPlayerIndex];
            const createStatsBox = (label, value, color) => `
                <div class="stat-box" style="
                    background: rgba(255,255,255,0.05);
                    padding: 1rem;
                    border-radius: 8px;
                    text-align: center;
                ">
                    <div style="font-size: 0.9rem; opacity: 0.7;">${label}</div>
                    <div style="font-size: 1.4rem; color: ${color}; font-weight: bold;">${value}</div>
                </div>
            `;
            const createStatsHTML = (player, side) => `
                <div style="
                    animation: fadeIn 0.5s ease;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    position: relative;  /* Thêm position relative cho container */
                ">
                    <div style="
                        font-size: 1.4rem;
                        font-weight: bold;
                        color: ${side === 'red' ? '#ff8888' : '#8888ff'};
                        text-align: center;
                        position: absolute;  /* Position absolute để có thể di chuyển độc lập */
                        width: 100%;
                        top: -10 rem;  /* Điều chỉnh khoảng cách từ trên xuống */
                    ">
                        ${player.name}
                    </div>

                    <div class="stats-grid" style="
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 1rem;
                        margin-top: 3rem;  /* Thêm margin-top để tạo chỗ cho heading */
                    ">
                        ${createStatsBox('ELO', player.elo, '#ffd700')}
                        ${createStatsBox('Matches', player.matches, '#ff9900')}
                        ${createStatsBox('Winrate', player.winrate, '#00ff95')}
                        ${createStatsBox('Goal Ratio', player.goalRatio, '#ff6b6b')}
                        ${createStatsBox('Assist Ratio', player.assistRatio, '#5c9dff')}
                        ${createStatsBox('G/A Ratio', player.gaRatio, '#bd93f9')}
                    </div>
                </div>
            `;
            const redStatsDiv = document.getElementById('red-stats');
            const blueStatsDiv = document.getElementById('blue-stats');
            if (redStatsDiv && blueStatsDiv) {
                redStatsDiv.innerHTML = createStatsHTML(redPlayer, 'red');
                blueStatsDiv.innerHTML = createStatsHTML(bluePlayer, 'blue');
            }
            currentPlayerIndex = (currentPlayerIndex + 1) % this.mockData.redTeam.length;
        };
        updateStats();
        this.statsInterval = setInterval(updateStats, 7000);
    }
    hide() {
        if (this.container) {
            // Tìm chat input container
            const chatInput = this.container.querySelector('div[style*="border-top"]');
            if (chatInput && chatInput.elements) {
                const {
                    input,
                    sendButton
                } = chatInput.elements;
                // Cleanup input handlers
                if (input && input.cleanupHandlers) {
                    for (const [event, handler] of Object.entries(input.cleanupHandlers)) {
                        input.removeEventListener(event, handler);
                    }
                }
                // Cleanup button handlers
                if (sendButton && sendButton.cleanupHandlers) {
                    for (const [event, handler] of Object.entries(sendButton.cleanupHandlers)) {
                        sendButton.removeEventListener(event, handler);
                    }
                }
            }
            // Clear interval và xóa component
            if (this.statsInterval) {
                clearInterval(this.statsInterval);
                this.statsInterval = null;
            }
            this.container.style.opacity = '0';
            this.container.style.transform = 'scale(1.1)';
            this.container.style.transition = 'all 0.5s ease';
            setTimeout(() => {
                this.container.remove();
                this.container = null;
            }, 500);
        }
    }
}
export {
    WaitingScreen
};