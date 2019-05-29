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

socket.on('join_game_failed', () => {
	console.log('Game is full, you cannot join.');
});

socket.on('nickname_accepted', () => {
	nickname.style.display = 'none';
	gameSelect.style.display = 'block';
});

socket.on('show_game_screen', () => {
	titleScreen.style.display = 'none';
	gameScreen.style.display = 'block';
});

socket.on('show_title_screen', () => {
	gameScreen.style.display = 'none';
	titleScreen.style.display = 'block';
});

socket.on('display_gamecode', (gc) => {
	gamecode.innerHTML = gc;
});

socket.on('display_dutch_piles', (dutchPiles) => {
	display_dutch_piles(gameTable, dutchPiles);
});

nickname.addEventListener('keyup', (e) => {
	if(e.keyCode === 13) {
		socket.emit('set_nickname', nickname.value);
		nickname.value = '';
	}
});

createGame.addEventListener('click', (e) => {
	socket.emit('create_game');
});

joinGame.addEventListener('keyup', (e) => {
	if(e.keyCode === 13) {
		socket.emit('join_game', joinGame.value);
	}
});

function display_hand(element, cards) {
	for(let i=0; i<4; i++) {
		// children[0] is the blitz pile, 1-3 are post piles
		display_hand_card(element.children[i], cards[i]);
		element.children[i].dataset.index = i;
	}
}

function display_dutch_piles(element, dutchPiles) {
	for(let i=0; i<10; i++) {
		display_pile_card(element.children[i], dutchPiles[i]);
	}
}

function display_pile_card(element, card) {
	if(card != null && gameTable.contains(element)) {
		if(element.children.length === 0) {
			element.appendChild(document.createElement('div'));
		}
		element.children[0].className = `${card.color} card`;
		element.children[0].innerHTML = `<span>${card.number}</span><div></div><span>${card.number}</span>`
	} else {
		element.className = 'clear card';
		element.innerHTML = '';
	}
}

function display_hand_card(element, card) {
	element.className = `${card.color} card`;
	element.innerHTML = `<span>${card.number}</span><div></div><span>${card.number}</span>`
}

