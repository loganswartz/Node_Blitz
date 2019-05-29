const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);
const port = 3000;
const rootPath = 'public'
const deckFile = require('./deck.js');
const Deck = deckFile.Deck;
const Card = deckFile.Card;

server.listen(port);
app.use(express.static(rootPath));
console.log(`Server running on port ${port} and serving files from '${rootPath}/'...`);


let connections = 0;

io.sockets.on('connection', (socket) => {
	connections++;
	console.log(`Connected: ${connections} sockets connected`);

	socket.on('disconnect', () => {
		connections--;
	});

	socket.on('create_game', () => {
		let gamecode = generateGameCode();
		while(roomExists(gamecode)) {
			gamecode = generateGameCode();
		}
		socket.join(gamecode);
		socket.gamecode = gamecode;
		socket.deck = new Deck();

		socket.emit('show_game_screen');
		socket.emit('display_gamecode', gamecode);
		// update card views for everyone in the game
		broadcast_all_cards(gamecode);
		room = getRoom(gamecode);
		room.dutchPiles = [null, null, null, null, null, null, null, null, null, null];
	});

	socket.on('join_game', (gamecode) => {
		// check if game exists, if so, are there 4 players already?
		if(roomExists(gamecode) && getRoomSize(gamecode) >= 4) {
			// game full, reject newbies
			socket.emit('join_game_failed');
		} else {
			// join game
			socket.join(gamecode);
			socket.gamecode = gamecode;
			// deal new deck to player
			socket.deck = new Deck();

			socket.emit('show_game_screen');
			socket.emit('display_gamecode', gamecode);
			// update card views for everyone in the game
			broadcast_all_cards(gamecode);
		}
	});

	socket.on('set_nickname', (nickname) => {
		if(nickname != '') {
			socket.nickname = nickname;
			socket.emit('nickname_accepted');
		}
	});

	socket.on('play_card', (handIndex, tableIndex) => {
		let card = socket.deck.visibleCards()[handIndex];
		let room = getRoom(socket.gamecode);
		if(handIndex > socket.deck.visibleCards().length-1 || tableIndex > room.dutchPiles.length-1 || handIndex < 0 || tableIndex < 0) {
			console.log('Invalid move attempt was disregarded.');
			socket.emit('display_dutch_piles', room.dutchPiles);
		} else if(isValidMove(card, room.dutchPiles[tableIndex])) {
			if(handIndex === 0) {
				// card was played directly from blitz pile
				room.dutchPiles[tableIndex] = card;
				socket.deck.blitzPile.pop();
			} else {
				room.dutchPiles[tableIndex] = card;
				socket.deck.postPile[handIndex-1] = socket.deck.blitzPile.pop();
			}
			// clear completed piles
			if(card.number === 10) {
				room.dutchPiles[tableIndex] = null;
			}
			// broadcast new dutch piles and player hand to everyone else
			io.to(socket.gamecode).emit('display_dutch_piles', room.dutchPiles);
			broadcast_all_cards(socket.gamecode);
		} else {
			// overwrite invalid move with current gameboard.
			socket.emit('display_dutch_piles', room.dutchPiles);
		}
	});
});

function getRandomNumberInRange(min, max) {
	return Math.floor(Math.random() * (max - min) + min);
}

function generateGameCode() {
	return String(getRandomNumberInRange(100000, 999999));
}

function getPlayerIDsByRoom(gamecode) {
	return Object.keys(io.sockets.adapter.rooms[gamecode].sockets);
}

function getSocketByID(socketID) {
	return io.sockets.sockets[socketID]
}

function getSocketsByRoom(gamecode) {
	let players = getPlayerIDsByRoom(gamecode);
	let sockets = [];
	players.forEach(function(player) {
		sockets.push(getSocketByID(player));
	});
	return sockets;
}

function broadcast_all_cards(gamecode) {
	let players = getSocketsByRoom(gamecode);
	players.forEach(function(player) {
		// send all cards to each player in sequence, but with the player's hand always at index 0
		player.emit('display_hands', [player.deck.visibleCards()].concat(get_opponent_visible_cards(player, gamecode)))
	});
}

function get_opponent_visible_cards(player, gamecode) {
	players = getSocketsByRoom(gamecode);
	otherPlayers = players.filter(function(value, index, arr) {
		return value != player;
	});
	let otherHands = [];
	otherPlayers.forEach(function(player) {
		otherHands.push(player.deck.visibleCards());
	});
	// sort to ensure we always return in the same order
	otherHands.sort();
	return otherHands;
}

function getRoomSize(gamecode) {
	return Object.keys(io.sockets.adapter.rooms[gamecode].sockets).length;
}

function roomExists(gamecode) {
	return (io.sockets.adapter.rooms[gamecode] != undefined);
}

function getRoom(gamecode) {
	return io.sockets.adapter.rooms[gamecode];
}

function isValidMove(card, pile) {
	if(card.number === 1 && pile === null) {
		// 1 can only be played on empty spots
		return true;
	} else if(card.number != 1 && pile === null) {
		// cannot play any non-1 cards on empty piles
		return false;
	} else if(card.number === pile.number+1 && card.color === pile.color) {
		return true;
	} else {
		return false;
	}
}

function peek(array) {
	return array[array.length-1];
}
