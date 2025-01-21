class WaitingScreen {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.spinnerAngle = 0;
        this.mockData = {
            redTeam: [
                {
                    name: "Red Player 1",
                    elo: 1500,
                    matches: 150,
                    winrate: "65%",
                    goalRatio: "1.2",
                    assistRatio: "0.8",
                    gaRatio: "2.0"
                },
                {
                    name: "Red Player 2",
                    elo: 1600,
                    matches: 200,
                    winrate: "70%",
                    goalRatio: "1.5",
                    assistRatio: "0.9",
                    gaRatio: "2.4"
                }
            ],
            blueTeam: [
                {
                    name: "Blue Player 1",
                    elo: 1450,
                    matches: 120,
                    winrate: "60%",
                    goalRatio: "1.1",
                    assistRatio: "0.7",
                    gaRatio: "1.8"
                },
                {
                    name: "Blue Player 2",
                    elo: 1550,
                    matches: 180,
                    winrate: "68%",
                    goalRatio: "1.3",
                    assistRatio: "1.0",
                    gaRatio: "2.3"
                }
            ]
        };
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
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
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }

            .player-card {
                transition: all 0.3s ease;
            }

            .player-card:hover {
                transform: scale(1.02);
                box-shadow: 0 8px 30px rgba(0,0,0,0.3);
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
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: white;
            overflow-y: auto;
            padding: 2rem 0;
        `;

        const mainContent = document.createElement('div');
        mainContent.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 2fr 1fr;
            gap: 2rem;
            width: 95%;
            max-width: 1600px;
            min-height: 80vh;
            padding: 2rem;
        `;

        const redTeamContainer = this.createTeamContainer(this.mockData.redTeam, 'red');
        const centerContainer = this.createCenterContainer();
        const blueTeamContainer = this.createTeamContainer(this.mockData.blueTeam, 'blue');

        mainContent.appendChild(redTeamContainer);
        mainContent.appendChild(centerContainer);
        mainContent.appendChild(blueTeamContainer);
        this.container.appendChild(mainContent);
        document.body.appendChild(this.container);

        this.animate();
        this.startStatsRotation();
    }

    createTeamContainer(team, side) {
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 1rem;
        `;

        const playersSection = document.createElement('div');
        playersSection.style.cssText = `
            flex: 1;
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
            flex: 2;
            background: rgba(25, 25, 25, 0.95);
            border-radius: 15px;
            padding: 1rem;
            backdrop-filter: blur(5px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255,255,255,0.05);
            animation: borderGlow 2s infinite;
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
        
        card.style.cssText = `
            background: linear-gradient(135deg, 
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
            margin-bottom: 0.5rem;
            background: linear-gradient(45deg, #fff, #aaa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            position: relative;
        `;
        nameDiv.textContent = player.name;

        const eloDiv = document.createElement('div');
        eloDiv.style.cssText = `
            font-size: 1.2rem;
            color: #ffd700;
            text-shadow: 0 0 10px rgba(255,215,0,0.3);
            position: relative;
        `;
        eloDiv.textContent = player.elo;

        card.appendChild(nameDiv);
        card.appendChild(eloDiv);

        // Add hover effect
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
            animation: borderGlow 2s infinite;
        `;

        // Add background effect
        const bgEffect = document.createElement('div');
        bgEffect.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
                radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(255,255,255,0.05) 0%, transparent 50%);
            pointer-events: none;
        `;
        statusSection.appendChild(bgEffect);

        const statusText = document.createElement('div');
        statusText.style.cssText = `
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 1.5rem;
            background: linear-gradient(135deg, #fff 30%, #a8a8a8 70%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 2px 10px rgba(255,255,255,0.1);
            position: relative;
        `;
        statusText.textContent = 'Creating Match...';

        // Enhanced spinner with multiple layers
        const spinnerContainer = document.createElement('div');
        spinnerContainer.style.cssText = `
            position: relative;
            width: 80px;
            height: 80px;
            margin: 0 auto;
        `;

        const createSpinnerLayer = (size, color, duration, reverse = false) => {
            const spinner = document.createElement('div');
            spinner.style.cssText = `
                position: absolute;
                top: ${(80 - size) / 2}px;
                left: ${(80 - size) / 2}px;
                width: ${size}px;
                height: ${size}px;
                border: 3px solid transparent;
                border-top-color: ${color};
                border-radius: 50%;
                animation: spin ${duration}s linear infinite ${reverse ? 'reverse' : ''};
            `;
            return spinner;
        };

        spinnerContainer.appendChild(createSpinnerLayer(80, 'rgba(255,255,255,0.8)', 1));
        spinnerContainer.appendChild(createSpinnerLayer(60, 'rgba(255,255,255,0.6)', 0.8, true));
        spinnerContainer.appendChild(createSpinnerLayer(40, 'rgba(255,255,255,0.4)', 0.6));

        statusSection.appendChild(statusText);
        statusSection.appendChild(spinnerContainer);

        // Enhanced chat section
        const chatSection = document.createElement('div');
        chatSection.style.cssText = `
            flex: 1;
            background: rgba(25, 25, 25, 0.95);
            border-radius: 15px;
            display: flex;
            flex-direction: column;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255,255,255,0.05);
            overflow: hidden;
            animation: borderGlow 2s infinite;
        `;

        const chatMessages = document.createElement('div');
        chatMessages.style.cssText = `
            flex: 1;
            padding: 1rem;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            background: linear-gradient(to bottom,
                rgba(255,255,255,0.02),
                rgba(255,255,255,0.01)
            );
        `;

        const messages = [
            "Welcome to the game!",
            "Get ready for an exciting match!",
            "Good luck to both teams!"
        ];

        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message';
            messageDiv.style.cssText = `
                padding: 0.8rem 1.2rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
                font-size: 0.9rem;
                border: 1px solid rgba(255,255,255,0.05);
                backdrop-filter: blur(5px);
                position: relative;
                overflow: hidden;
            `;

            // Add subtle shine effect
            const shine = document.createElement('div');
            shine.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: linear-gradient(90deg,
                    transparent,
                    rgba(255,255,255,0.2),
                    transparent
                );
            `;
            messageDiv.appendChild(shine);
            messageDiv.textContent = msg;
            chatMessages.appendChild(messageDiv);
        });

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
        input.placeholder = 'Type a message...';

        input.addEventListener('focus', () => {
            input.style.borderColor = 'rgba(255,255,255,0.2)';
            input.style.background = 'rgba(255,255,255,0.08)';
            input.style.boxShadow = '0 0 15px rgba(255,255,255,0.1)';
        });

        input.addEventListener('blur', () => {
            input.style.borderColor = 'rgba(255,255,255,0.1)';
            input.style.background = 'rgba(255,255,255,0.05)';
            input.style.boxShadow = 'none';
        });

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
            backdrop-filter: blur(5px);
            position: relative;
            overflow: hidden;
        `;
        sendButton.textContent = 'Send';

        // Add button shine effect
        const buttonShine = document.createElement('div');
        buttonShine.style.cssText = `
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                90deg,
                transparent,
                rgba(255,255,255,0.2),
                transparent
            );
            transition: 0.5s;
        `;
        sendButton.appendChild(buttonShine);

        sendButton.addEventListener('mouseover', () => {
            sendButton.style.background = 'linear-gradient(45deg, rgba(255,255,255,0.15), rgba(255,255,255,0.1))';
            sendButton.style.transform = 'translateY(-2px)';
            buttonShine.style.left = '100%';
        });

        sendButton.addEventListener('mouseout', () => {
            sendButton.style.background = 'linear-gradient(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))';
            sendButton.style.transform = 'translateY(0)';
            buttonShine.style.left = '-100%';
        });

        chatInput.appendChild(input);
        chatInput.appendChild(sendButton);
        chatSection.appendChild(chatMessages);
        chatSection.appendChild(chatInput);

        container.appendChild(statusSection);
        container.appendChild(chatSection);

        return container;
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
                    position: relative;
                    overflow: hidden;
                ">
                    <div style="font-size: 0.9rem; opacity: 0.7;">${label}</div>
                    <div style="font-size: 1.4rem; color: ${color}; font-weight: bold;">${value}</div>
                    <div style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 1px;
                        background: linear-gradient(90deg, transparent, ${color}40, transparent);
                    "></div>
                </div>
            `;

            const createStatsHTML = (player, side) => `
                <div style="
                    animation: fadeIn 0.5s ease;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 1rem;
                    padding: 1.5rem;
                    position: relative;
                ">
                    <div style="
                        font-size: 1.4rem;
                        font-weight: bold;
                        margin-bottom: 0.5rem;
                        background: linear-gradient(45deg, #fff, #aaa);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        text-shadow: 0 2px 10px rgba(255,255,255,0.1);
                        text-align: ${side === 'blue' ? 'right' : 'left'};
                    ">
                        ${player.name} - ${player.elo}
                    </div>

                    <div class="stats-grid" style="
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 1rem;
                    ">
                        ${createStatsBox('Matches', player.matches, '#ffd700')}
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
        setInterval(updateStats, 7000);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
    }

    hide() {
        if (this.container) {
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

export { WaitingScreen };