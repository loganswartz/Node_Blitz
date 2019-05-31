let socket = io.connect();

let players = [];
players.push(document.querySelector('#player')); // index 0
players.push(document.querySelector('#opponent-left')) // index 1;
players.push(document.querySelector('#opponent-top')) // index 2;
players.push(document.querySelector('#opponent-right')) // index 3;

let nickname = document.querySelector('#nickname');
let gameSelect = document.querySelector('#game-select');
let createGame = document.querySelector('#create-game');
let joinGame = document.querySelector('#join-game');
let gameScreen = document.querySelector('#game');
let titleScreen = document.querySelector('#title');
let gamecode = document.querySelector('#gamecode');
let gameTable = document.querySelector('#game-table');

dragula([players[0], gameTable.children], {
	revertOnSpill: true,
	copy: true,
	moves: function(el, source, handle, sibling) {
		return (source.parentNode != gameTable);
	},
	isContainer: function(el) {
		return (el.parentNode === gameTable);
	}
}).on('dragend', function(el) {
	for(let child of gameTable.children) {
		child.style.border = 'unset';
	}
}).on('drop', function(el, target, source) {
	while(target.lastChild && target.children.length > 1) {
		target.removeChild(target.lastChild);
	}
	socket.emit('play_card', el.dataset.index, target.dataset.pos);
}).on('drag', function(el) {
	for(let child of gameTable.children) {
		child.style.border = 'dashed 0.2rem black';
	}
}).on('over', function(el, container, source) {
	if(container.parentNode === gameTable) {
		for(let child of container.children) {
			child.style.display = 'none';
		}
	}
}).on('out', function(el, container, source) {
	if(container.parentNode === gameTable) {
		container.children[0].style.display = 'flex';
	}
});

socket.on('display_hands', (hands) => {
	for(let i=0; i<hands.length; i++) {
		display_hand(players[i], hands[i]);
	}
});

socket.on('display_dutch_piles', (dutchPiles) => {
	display_dutch_piles(gameTable, dutchPiles);
});

socket.on('winner', (nickname) => {
	display_winner(nickname);
});

socket.on('display_remaining_blitz', (cardsRemaining) => {
	if(cardsRemaining === 2) {
		players[0].children[0].classList.add('hide-1st-card');
	} else if(cardsRemaining === 1) {
		players[0].children[0].classList.add('hide-2nd-card');
	} else if(cardsRemaining <= 0) {
		players[0].children[0].classList.add('invisible');
	}
});

nickname.addEventListener('keyup', (e) => {
	if(e.keyCode === 13) {
		socket.emit('set_nickname', nickname.value, function() {
			// if callback is called, nickname was accepted
			nickname.style.display = 'none';
			gameSelect.style.display = 'block';
		});
		nickname.value = '';
	}
});

createGame.addEventListener('click', (e) => {
	socket.emit('create_game', function(resp, gc) { join_game_callback(resp, gc); });
});

joinGame.addEventListener('keyup', (e) => {
	if(e.keyCode === 13) {
		socket.emit('join_game', joinGame.value, function(resp, gc) { join_game_callback(resp, gc); });
	}
});

function join_game_callback(resp, gc) {
	// this is called to handle the server response when a client requests to start or join a game. If $resp === 'success', the title screen is hidden, the game screen is shown, and the gamecode is shown. Otherwise, nothing happens.
	if(resp === true) {
		titleScreen.style.display = 'none';
		gameScreen.style.display = 'block';
		gamecode.innerHTML = gc;
	} else {
		console.log('Game is full, you cannot join.');
	}
}

function display_hand(element, cards) {
	for(let i=0; i<cards.length; i++) {
		// children[0] is the blitz pile, 1-3 are post piles
		display_card(element.children[i], cards[i]);
		element.children[i].dataset.index = i;
	}
}

function display_dutch_piles(element, dutchPiles) {
	for(let i=0; i<dutchPiles.length; i++) {
		display_dutch_card(element.children[i], dutchPiles[i]);
	}
}

function display_dutch_card(element, card) {
	if(card != null && gameTable.contains(element)) {
		if(element.children.length === 0) {
			/* Dragula will copy the dragged card element into the pile container for the player who played it, and then we style it appropriately, but when another player plays a new card, that element may not yet exist in the pile container, so if it's empty, we create it that child element here */
			element.appendChild(document.createElement('div'));
		}
		display_card(element.children[0], card);
	} else {
		element.className = 'clear card';
		element.innerHTML = '';
	}
}

function display_card(element, card) {
	element.className = `${card.color} card`;
	element.innerHTML = `<span>${card.number}</span><div></div><span>${card.number}</span>`
}

function display_winner(nickname) {
	console.log(`${nickname} won!`);
}
