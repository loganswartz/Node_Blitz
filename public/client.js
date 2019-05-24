let socket = io.connect();

let players = [];
players.push(document.querySelector('#player')); // index 0
players.push(document.querySelector('#opponent-left')) // index 1;
players.push(document.querySelector('#opponent-top')) // index 2;
players.push(document.querySelector('#opponent-right')) // index 3;

socket.on('display_hands', (hands) => {
	for(let i=0; i<hands.length; i++) {
		display_hand(players[i], hands[i]);
	}
});

socket.on('join_game_failed', () => {
	console.log('Game is full, you cannot join.');
});

function display_hand(element, cards) {
	for(let i=0; i<4; i++) {
		// children[0] is the blitz pile, 1-3 are post piles
		display_card(element.children[i], cards[i]);
	}
}

function display_card(element, card) {
	element.className = `${card.color} card`;
	element.innerHTML = `<span>${card.number}</span><div></div><span>${card.number}</span>`
}
